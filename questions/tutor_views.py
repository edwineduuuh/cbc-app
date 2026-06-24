"""
questions/tutor_views.py
Endpoints for the AI Tutor (pre-quiz "teacher") and the Reels feed.

- Tutor lessons are cached on Topic.cached_ai_lesson (generated once via Claude).
- Reels are built purely from existing question content (NO AI) and ranked by
  the student's weak topics, reusing Quiz.topic + Attempt.score.
"""
import random

from django.db.models import Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Topic, Question, Attempt
from . import tutor


# ─────────────────────────────────────────────────────────────
#  AI TUTOR — teach a topic + follow-up chat
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teach_topic(request, topic_id):
    """Return the cached lesson for a topic, generating it on first request."""
    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
    except Topic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    force = request.query_params.get("refresh") == "1" and (
        request.user.is_staff or getattr(request.user, "role", "") in
        ("admin", "superadmin", "teacher", "school_admin")
    )

    try:
        lesson = tutor.get_or_create_topic_lesson(topic, force=force)
    except Exception as e:
        return Response(
            {"error": f"Could not generate lesson: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "topic": {
            "id": topic.id,
            "name": topic.name,
            "grade": topic.grade,
            "subject": topic.subject.name,
        },
        "lesson": lesson,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tutor_chat(request):
    """Follow-up Q&A with the tutor about a specific topic.

    Body: { "topic_id": int, "messages": [{"role","content"}, ...] }
    """
    topic_id = request.data.get("topic_id")
    messages = request.data.get("messages", [])

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
        reply = tutor.tutor_chat(topic, messages)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": f"Tutor unavailable: {type(e).__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"reply": reply})


# ─────────────────────────────────────────────────────────────
#  REELS — swipeable micro-lessons from existing content (NO AI)
# ─────────────────────────────────────────────────────────────

REELS_DEFAULT_LIMIT = 20
REELS_CANDIDATE_POOL = 300


def _weak_topic_rank(user):
    """Return {topic_id: rank} where rank 0 = the student's weakest topic.
    Based on average quiz score per topic for completed attempts."""
    rows = (
        Attempt.objects
        .filter(student=user, status="completed", quiz__topic__isnull=False)
        .values("quiz__topic")
        .annotate(avg=Avg("score"))
        .order_by("avg")  # weakest (lowest avg) first
    )
    return {row["quiz__topic"]: i for i, row in enumerate(rows)}


def _reel_from_question(q):
    return {
        "id": q.id,
        "subject": q.topic.subject.name,
        "topic": q.topic.name,
        "topic_id": q.topic_id,
        "grade": q.topic.grade,
        "hook": q.question_text,
        "concept": q.explanation,
        "answer": q.correct_answer,
        "type": q.question_type,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reels_feed(request):
    """A personalized feed of micro-lesson reels, weakest topics first."""
    user = request.user
    subject_id = request.query_params.get("subject")
    grade = request.query_params.get("grade")
    try:
        limit = min(int(request.query_params.get("limit", REELS_DEFAULT_LIMIT)), 50)
    except (TypeError, ValueError):
        limit = REELS_DEFAULT_LIMIT

    qs = (
        Question.objects
        .exclude(explanation="")
        .select_related("topic", "topic__subject")
    )
    if subject_id:
        qs = qs.filter(topic__subject_id=subject_id)
    if grade:
        qs = qs.filter(topic__grade=grade)

    candidates = list(qs.order_by("-created_at")[:REELS_CANDIDATE_POOL])
    if not candidates:
        return Response({"reels": []})

    rank = _weak_topic_rank(user)
    big = len(rank) + 1
    # weak topics first (by rank), then everything else; shuffle within a tier
    random.shuffle(candidates)
    candidates.sort(key=lambda q: rank.get(q.topic_id, big))

    reels = [_reel_from_question(q) for q in candidates[:limit]]
    return Response({"reels": reels, "personalized": bool(rank)})
