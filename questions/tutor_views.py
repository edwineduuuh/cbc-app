"""
questions/tutor_views.py
Endpoints for the AI Tutor and AI Flash Cards.

Both are selected by Grade -> Learning area -> Strand (Topic) -> Sub-strand(s).
Content is hybrid AI, grounded in the strand's real questions, and cached per
sub-strand (whole-strand fallback when a strand has no sub-strands). Multi-select
composes already-cached units: flash cards merge into one shuffled deck; lessons
stay a focused series (one per sub-strand).
"""
import random
from datetime import date

from django.core.cache import caches, cache as _default_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Topic
from . import tutor


STAFF_ROLES = ("admin", "superadmin", "teacher", "school_admin")

# ── Anti-spam limits for Tutor CHAT (live per-message cost) ──
# Generous enough that a real learner never hits them - only abuse does. Chat
# is already subscribers-only, so these bound a paying kid's worst-case day.
TUTOR_DAILY_LIMIT = 50          # messages per student per day
MAX_ATTACHMENT_MB = 4           # per uploaded image/PDF (the biggest cost lever)

# Shared, worker-safe counter store. The default cache is per-process locmem
# (4 gunicorn workers = 4 separate counts), so use the DB-backed 'grades' cache
# for a real cross-worker daily cap; fall back to default if it's unavailable.
try:
    _rate_cache = caches["grades"]
except Exception:
    _rate_cache = _default_cache


def _attachment_too_big(attachment) -> bool:
    """True if the uploaded file exceeds MAX_ATTACHMENT_MB. base64 inflates the
    payload ~4/3, so approximate the real byte size back from the string length."""
    if not attachment:
        return False
    data = attachment.get("data") or ""
    approx_bytes = (len(data) * 3) // 4
    return approx_bytes > MAX_ATTACHMENT_MB * 1024 * 1024


def _tutor_quota(user):
    """Count one tutor-chat message against the student's daily cap.
    Returns (allowed: bool, remaining: int|None). Staff/teachers bypass. A cache
    failure fails OPEN - a paying student is never blocked by an infra glitch."""
    if getattr(user, "is_staff", False) or getattr(user, "role", "") in STAFF_ROLES:
        return True, None
    key = f"tutor:chat:{user.pk}:{date.today().isoformat()}"
    try:
        _rate_cache.add(key, 0, 60 * 60 * 26)   # create today's counter if absent
        try:
            used = _rate_cache.incr(key)         # atomic-ish increment
        except ValueError:                        # expired between add and incr
            _rate_cache.add(key, 1, 60 * 60 * 26)
            used = 1
        if used > TUTOR_DAILY_LIMIT:
            return False, 0
        return True, TUTOR_DAILY_LIMIT - used
    except Exception:
        return True, None


def _can_force(user):
    """Only admins/teachers may force a (paid) regeneration, bypassing cache."""
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "role", "") in STAFF_ROLES
    )


def _wants_force(request):
    return request.query_params.get("refresh") == "1" and _can_force(request.user)


# Kiswahili is BLOCKED from AI generation - Claude/Opus invents wrong grammar
# (ngeli), so we don't let the tutor or flash cards author Kiswahili content.
def _is_kiswahili(topic):
    name = getattr(getattr(topic, "subject", None), "name", "") or ""
    return name.strip().lower() == "kiswahili"


_KISWAHILI_BLOCKED = {
    "error": "Kiswahili isn't available for lessons and flash cards yet - "
             "its content is teacher-authored to keep the grammar correct.",
    "blocked_subject": "kiswahili",
}


# The AI Tutor and Flash Cards cost live AI on every use, so they're a subscriber
# perk - free-trial quiz credits do NOT unlock them. Staff/teachers always pass.
def _has_paid_access(user):
    if getattr(user, "is_staff", False) or getattr(user, "role", "") in STAFF_ROLES:
        return True
    try:
        return user.subscription.is_valid
    except Exception:
        return False


# Free taste: non-subscribers get FREE_AI_PREVIEWS distinct strands of Tutor
# lessons / Flash Cards (shared allowance). Re-opening an already-previewed strand
# is free, so a page refresh never burns the allowance. Tutor CHAT is excluded -
# it's live, unbounded cost, and the real upsell.
FREE_AI_PREVIEWS = 2


def _allow_ai_preview(user, strand_key):
    if _has_paid_access(user):
        return True
    used = list(getattr(user, "ai_previews_used", None) or [])
    if strand_key in used:
        return True
    if len(used) < FREE_AI_PREVIEWS:
        used.append(strand_key)
        type(user).objects.filter(pk=user.pk).update(ai_previews_used=used)
        user.ai_previews_used = used  # keep the in-memory object in sync
        return True
    return False


_PAYWALL = {
    "error": "You've used your free previews. Subscribe to unlock the Tutor and Flash Cards.",
    "paywall": True,
    "feature": "tutor_tools",
    "redirect": "/subscribe",
}

_CHAT_PAYWALL = {
    "error": "Tutor chat is for subscribers. Subscribe to ask unlimited questions.",
    "paywall": True,
    "feature": "tutor_chat",
    "redirect": "/subscribe",
}


def _resolve_topic_and_substrands(request):
    """Parse topic + optional substrands CSV. Returns (topic, [substrands]) or
    raises ValueError with a message."""
    topic_id = request.query_params.get("topic")
    if not topic_id:
        raise ValueError("A strand (topic) is required")
    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        raise ValueError("Topic not found")

    raw = request.query_params.get("substrands", "").strip()
    substrands = []
    if raw:
        ids = [int(x) for x in raw.split(",") if x.strip().isdigit()]
        substrands = list(
            topic.substrands.filter(id__in=ids).order_by("order", "name")
        )
    return topic, substrands


# ─────────────────────────────────────────────────────────────
#  AI TUTOR - teach a topic + follow-up chat
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teach_topic(request, topic_id):
    """Tutor lessons for a strand. With ?substrands=1,2 returns a focused SERIES
    (one lesson per sub-strand). Without it, returns a single whole-strand lesson.
    Each unit is cached per sub-strand (composes already-cached units)."""
    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    if _is_kiswahili(topic):
        return Response(_KISWAHILI_BLOCKED, status=status.HTTP_403_FORBIDDEN)

    if not _allow_ai_preview(request.user, f"topic:{topic.id}"):
        return Response(_PAYWALL, status=status.HTTP_402_PAYMENT_REQUIRED)

    raw = request.query_params.get("substrands", "").strip()
    substrands = []
    if raw:
        ids = [int(x) for x in raw.split(",") if x.strip().isdigit()]
        substrands = list(topic.substrands.filter(id__in=ids).order_by("order", "name"))

    force = _wants_force(request)  # admin/teacher + ?refresh=1 → regenerate
    retry = request.query_params.get("retry") == "1"

    # Never wait on the AI here: ready lessons come back at once, missing ones
    # are written in the background and the page polls (see tutor.unit_status).
    lessons = []
    for s in (substrands or [None]):
        content, state = tutor.unit_status("lesson", topic, s, force=force, retry=retry)
        lessons.append({
            "substrand": {"id": s.id, "name": s.name} if s else None,
            "lesson": content,
            "status": state,
        })

    return Response({
        "topic": {"id": topic.id, "name": topic.name, "grade": topic.grade,
                  "subject": topic.subject.name},
        "lessons": lessons,
        "pending": any(l["status"] == "writing" for l in lessons),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tutor_chat(request):
    """Follow-up Q&A with the tutor about a specific topic.

    Body: { "topic_id": int, "messages": [{"role","content"}, ...] }
    """
    if not _has_paid_access(request.user):
        return Response(_CHAT_PAYWALL, status=status.HTTP_402_PAYMENT_REQUIRED)

    topic_id = request.data.get("topic_id")
    messages = request.data.get("messages", [])
    attachment = request.data.get("attachment")

    if not topic_id or not isinstance(messages, list) or not messages:
        return Response(
            {"error": "topic_id and a non-empty messages list are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Reject oversized uploads before spending anything (the biggest cost lever).
    if _attachment_too_big(attachment):
        return Response(
            {"error": f"That file's a bit big - please upload something under "
                      f"{MAX_ATTACHMENT_MB} MB."},
            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    if _is_kiswahili(topic):
        return Response(_KISWAHILI_BLOCKED, status=status.HTTP_403_FORBIDDEN)

    # Daily message cap per student (bounds a paying kid's worst-case day).
    # Counted only once we're about to make the real (paid) call.
    allowed, remaining = _tutor_quota(request.user)
    if not allowed:
        return Response(
            {"error": "That's all your tutor questions for today "
                      "Come back tomorrow - your teacher will be right here.",
             "limit_reached": True},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    try:
        reply = tutor.tutor_chat(topic, messages, attachment=attachment)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": f"Tutor unavailable: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"reply": reply, "remaining": remaining})


# ─────────────────────────────────────────────────────────────
#  FLASH CARDS - hybrid AI deck, grounded in the strand's questions,
#  cached per sub-strand. Multi-select → one merged, shuffled deck.
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def flashcards_feed(request):
    """Flash cards for a strand. With ?substrands=1,2 merges those sub-strands'
    cached decks into ONE shuffled deck. Without it, a whole-strand deck."""
    try:
        topic, substrands = _resolve_topic_and_substrands(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if _is_kiswahili(topic):
        return Response(_KISWAHILI_BLOCKED, status=status.HTTP_403_FORBIDDEN)

    if not _allow_ai_preview(request.user, f"topic:{topic.id}"):
        return Response(_PAYWALL, status=status.HTTP_402_PAYMENT_REQUIRED)

    force = _wants_force(request)  # admin/teacher + ?refresh=1 → regenerate
    retry = request.query_params.get("retry") == "1"

    # Same as lessons: never wait on the AI; decks still being written are
    # reported as pending and the page polls.
    cards, states = [], []
    for s in (substrands or [None]):
        deck, state = tutor.unit_status("cards", topic, s, force=force, retry=retry)
        states.append(state)
        for c in (deck or []):
            cards.append({**c, "substrand": s.name if s else None})

    random.shuffle(cards)  # shuffle across all selected sub-strands
    return Response({
        "topic": {"id": topic.id, "name": topic.name, "grade": topic.grade,
                  "subject": topic.subject.name},
        "cards": cards,
        "count": len(cards),
        "pending": "writing" in states,
        "failed": states.count("failed"),
        "units": len(states),
    })
