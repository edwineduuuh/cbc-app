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

from django.db import IntegrityError
from django.utils.text import slugify
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Topic, Substrand
from .permissions import IsAdminOrTeacher
from . import tutor


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

    raw = request.query_params.get("substrands", "").strip()
    substrands = []
    if raw:
        ids = [int(x) for x in raw.split(",") if x.strip().isdigit()]
        substrands = list(topic.substrands.filter(id__in=ids).order_by("order", "name"))

    try:
        if substrands:
            lessons = [
                {"substrand": {"id": s.id, "name": s.name},
                 "lesson": tutor.get_or_create_lesson(topic, substrand=s)}
                for s in substrands
            ]
        else:
            lessons = [
                {"substrand": None,
                 "lesson": tutor.get_or_create_lesson(topic)}
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
#  ADMIN — AI-suggested KICD sub-strands (propose, admin approves)
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminOrTeacher])
def suggest_substrands(request, topic_id):
    """Propose official KICD sub-strands for a strand. Saves NOTHING — returns
    a list the admin reviews and approves on the frontend."""
    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    existing = set(
        topic.substrands.values_list("name", flat=True)
    )
    try:
        suggestions = tutor.suggest_substrands(topic)
    except Exception as e:
        return Response(
            {"error": f"Could not get suggestions: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # flag which ones the topic already has so the UI can pre-skip them
    for s in suggestions:
        s["already_exists"] = s["name"] in existing

    return Response({
        "topic": {"id": topic.id, "name": topic.name, "grade": topic.grade,
                   "subject": topic.subject.name},
        "suggestions": suggestions,
    })


@api_view(["POST"])
@permission_classes([IsAdminOrTeacher])
def bulk_create_substrands(request):
    """Create the admin-approved sub-strands.
    Body: { "topic": <id>, "substrands": [{"name", "order"}, ...] }"""
    topic_id = request.data.get("topic")
    items = request.data.get("substrands", [])
    if not topic_id or not isinstance(items, list) or not items:
        return Response(
            {"error": "topic and a non-empty substrands list are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        topic = Topic.objects.get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    created, skipped = [], []
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        try:
            sub = Substrand.objects.create(
                topic=topic,
                name=name,
                slug=slugify(name),
                order=it.get("order", 0),
            )
            created.append({"id": sub.id, "name": sub.name, "order": sub.order})
        except IntegrityError:
            skipped.append(name)  # duplicate (topic, name)

    return Response({"created": created, "skipped": skipped}, status=status.HTTP_201_CREATED)


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

    try:
        cards = []
        if substrands:
            for s in substrands:
                for c in tutor.get_or_create_flashcards(topic, substrand=s):
                    cards.append({**c, "substrand": s.name})
        else:
            for c in tutor.get_or_create_flashcards(topic):
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
