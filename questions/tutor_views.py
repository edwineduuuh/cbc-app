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

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Topic
from . import tutor


STAFF_ROLES = ("admin", "superadmin", "teacher", "school_admin")


def _can_force(user):
    """Only admins/teachers may force a (paid) regeneration, bypassing cache."""
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "role", "") in STAFF_ROLES
    )


def _wants_force(request):
    return request.query_params.get("refresh") == "1" and _can_force(request.user)


# Kiswahili is BLOCKED from AI generation — Claude/Opus invents wrong grammar
# (ngeli), so we don't let the tutor or flash cards author Kiswahili content.
def _is_kiswahili(topic):
    name = getattr(getattr(topic, "subject", None), "name", "") or ""
    return name.strip().lower() == "kiswahili"


_KISWAHILI_BLOCKED = {
    "error": "Kiswahili isn't available for AI lessons and flash cards yet — "
             "its content is teacher-authored to keep the grammar correct.",
    "blocked_subject": "kiswahili",
}


# The AI Tutor and Flash Cards cost live AI on every use, so they're a subscriber
# perk — free-trial quiz credits do NOT unlock them. Staff/teachers always pass.
def _has_paid_access(user):
    if getattr(user, "is_staff", False) or getattr(user, "role", "") in STAFF_ROLES:
        return True
    try:
        return user.subscription.is_valid
    except Exception:
        return False


# Free taste: non-subscribers get FREE_AI_PREVIEWS distinct strands of Tutor
# lessons / Flash Cards (shared allowance). Re-opening an already-previewed strand
# is free, so a page refresh never burns the allowance. Tutor CHAT is excluded —
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
    "error": "You've used your free previews. Subscribe to unlock the AI Tutor and Flash Cards.",
    "paywall": True,
    "feature": "ai_tools",
    "redirect": "/subscribe",
}

_CHAT_PAYWALL = {
    "error": "The AI tutor chat is for subscribers. Subscribe to ask unlimited questions.",
    "paywall": True,
    "feature": "ai_chat",
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
#  AI TUTOR — teach a topic + follow-up chat
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

    try:
        if substrands:
            lessons = [
                {"substrand": {"id": s.id, "name": s.name},
                 "lesson": tutor.get_or_create_lesson(topic, substrand=s, force=force)}
                for s in substrands
            ]
        else:
            lessons = [
                {"substrand": None,
                 "lesson": tutor.get_or_create_lesson(topic, force=force)}
            ]
    except Exception as e:
        return Response(
            {"error": f"Could not generate lesson: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "topic": {"id": topic.id, "name": topic.name, "grade": topic.grade,
                  "subject": topic.subject.name},
        "lessons": lessons,
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

    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    if _is_kiswahili(topic):
        return Response(_KISWAHILI_BLOCKED, status=status.HTTP_403_FORBIDDEN)

    try:
        reply = tutor.tutor_chat(topic, messages, attachment=attachment)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": f"Tutor unavailable: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"reply": reply})


# ─────────────────────────────────────────────────────────────
#  FLASH CARDS — hybrid AI deck, grounded in the strand's questions,
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

    try:
        cards = []
        if substrands:
            for s in substrands:
                for c in tutor.get_or_create_flashcards(topic, substrand=s, force=force):
                    cards.append({**c, "substrand": s.name})
        else:
            for c in tutor.get_or_create_flashcards(topic, force=force):
                cards.append({**c, "substrand": None})
    except Exception as e:
        return Response(
            {"error": f"Could not generate cards: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    random.shuffle(cards)  # shuffle across all selected sub-strands
    return Response({
        "topic": {"id": topic.id, "name": topic.name, "grade": topic.grade,
                  "subject": topic.subject.name},
        "cards": cards,
        "count": len(cards),
    })
