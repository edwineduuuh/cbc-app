"""
questions/tutor_views.py
Endpoints for the AI Tutor (pre-quiz "teacher") and the Reels feed.

- Tutor lessons are cached on Topic.cached_ai_lesson (generated once via Claude).
- Flash cards are built purely from existing question content (NO AI), selected
  by Grade -> Learning area (Subject) -> Strand (Topic).
"""
from django.db import IntegrityError
from django.utils.text import slugify
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Topic, Question, Substrand
from .permissions import IsAdminOrTeacher
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
#  FLASH CARDS — front=question, back=answer+explanation (NO AI)
#  Selected by Grade → Learning area (Subject) → Strand (Topic).
# ─────────────────────────────────────────────────────────────

FLASHCARDS_LIMIT = 60


def _resolve_answer(q):
    """For MCQs, turn a bare letter (A/B/C/D) into the full option text so the
    card back is meaningful. Other types already store the model answer."""
    ans = (q.correct_answer or "").strip()
    if q.question_type == "mcq" and len(ans) == 1 and ans.upper() in "ABCD":
        option = getattr(q, f"option_{ans.lower()}", "") or ""
        return f"{ans.upper()}. {option}".strip(". ") if option else ans.upper()
    return ans


def _card_from_question(q):
    return {
        "id": q.id,
        "front": q.question_text,
        "answer": _resolve_answer(q),
        "explanation": q.explanation,
        "subject": q.topic.subject.name,
        "topic": q.topic.name,
        "topic_id": q.topic_id,
        "grade": q.topic.grade,
        "type": q.question_type,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def flashcards_feed(request):
    """Flash cards for a strand. Params: grade, subject, topic (topic preferred).

    Cards are built from questions that have an answer to study from. The
    explanation (if present) shows on the back as the "why".
    """
    subject_id = request.query_params.get("subject")
    grade = request.query_params.get("grade")
    topic_id = request.query_params.get("topic")

    qs = (
        Question.objects
        .select_related("topic", "topic__subject")
        .exclude(correct_answer="")
    )
    if topic_id:
        qs = qs.filter(topic_id=topic_id)
    else:
        if subject_id:
            qs = qs.filter(topic__subject_id=subject_id)
        if grade:
            qs = qs.filter(topic__grade=grade)

    if not topic_id and not subject_id and not grade:
        return Response(
            {"error": "Choose a grade and learning area first"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cards = [_card_from_question(q) for q in qs.order_by("difficulty", "id")[:FLASHCARDS_LIMIT]]
    return Response({"cards": cards, "count": len(cards)})
