"""
Facilitators Portal API: generate from the KICD design, and My Library.

"Facilitator" is the CBC term for the teacher, so the portal uses it.

My Library is one table across every tool (GeneratedOutput) rather than one
per tool, so a facilitator's work can be listed together, reopened, edited
and chained - lesson notes from a lesson plan, a record of work from a
scheme.
"""
import logging

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .assessments import generate_assessment
from .generation import GenerationError
from .models import GeneratedOutput, Subject, Substrand, Topic

logger = logging.getLogger("generation")

MAX_QUESTIONS = 40


def _is_facilitator(user):
    return (user.role in ("teacher", "admin", "superadmin", "school_admin")
            or user.is_staff)


def _summarise(o: GeneratedOutput) -> dict:
    """Row shape for the My Library list - no payload, keeps it light."""
    return {
        "id": o.id,
        "tool": o.tool,
        "tool_display": o.get_tool_display(),
        "title": o.title,
        "grade": o.grade,
        "subject": o.subject.name if o.subject else "",
        "strand": o.topic.name if o.topic else "",
        "substrand": o.substrand.name if o.substrand else "",
        "bookmarked": o.bookmarked,
        "created_at": o.created_at,
        "edited_at": o.edited_at,
        "model_used": o.model_used,
    }


# ── curriculum pickers ────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def curriculum_tree(request):
    """Grades / subjects / strands / sub-strands that actually have KICD data.

    Only returns sub-strands carrying learning outcomes: offering a facilitator a
    sub-strand we cannot ground a generation in wastes their time and
    produces a paper with no curriculum behind it.
    """
    grade = request.query_params.get("grade")
    subject_id = request.query_params.get("subject")
    topic_id = request.query_params.get("topic")

    grounded = Q(substrands__learning_outcomes__isnull=False)

    if topic_id:
        subs = (Substrand.objects
                .filter(topic_id=topic_id)
                .exclude(learning_outcomes=[])
                .order_by("order", "kicd_code", "name"))
        return Response({"substrands": [{
            "id": s.id, "name": s.name, "kicd_code": s.kicd_code,
            "suggested_duration": s.suggested_duration,
            "outcome_count": len(s.learning_outcomes or []),
            "learning_outcomes": s.learning_outcomes,
            "inquiry_questions": s.inquiry_questions,
        } for s in subs]})

    if subject_id and grade:
        topics = (Topic.objects
                  .filter(subject_id=subject_id, grade=grade)
                  .annotate(n=Count("substrands",
                                    filter=~Q(substrands__learning_outcomes=[])))
                  .filter(n__gt=0)
                  .order_by("kicd_code", "order", "name"))
        return Response({"strands": [{
            "id": t.id, "name": t.name, "kicd_code": t.kicd_code,
            "substrand_count": t.n,
            "has_rubric": bool(t.assessment_rubric),
        } for t in topics]})

    if grade:
        subjects = (Subject.objects
                    .filter(topics__grade=grade)
                    .annotate(n=Count("topics__substrands",
                                      filter=~Q(topics__substrands__learning_outcomes=[])))
                    .filter(n__gt=0).distinct().order_by("name"))
        return Response({"subjects": [
            {"id": s.id, "name": s.name, "slug": s.slug, "substrand_count": s.n}
            for s in subjects]})

    grades = (Topic.objects
              .exclude(substrands__learning_outcomes=[])
              .values_list("grade", flat=True).distinct().order_by("grade"))
    return Response({"grades": sorted(set(grades))})


# ── generate ──────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_assessment_view(request):
    """POST {substrand, count, description, mcq_ratio} -> a saved assessment."""
    if not _is_facilitator(request.user):
        return Response({"error": "Facilitator access required"},
                        status=status.HTTP_403_FORBIDDEN)

    data = request.data or {}
    substrand_id = data.get("substrand")
    if not substrand_id:
        return Response({"error": "substrand is required"},
                        status=status.HTTP_400_BAD_REQUEST)

    substrand = get_object_or_404(
        Substrand.objects.select_related("topic", "topic__subject"),
        pk=substrand_id)

    if not substrand.learning_outcomes:
        return Response(
            {"error": "This sub-strand has no KICD learning outcomes loaded, "
                      "so an assessment cannot be grounded in the design."},
            status=status.HTTP_400_BAD_REQUEST)

    try:
        count = int(data.get("count") or 10)
    except (TypeError, ValueError):
        count = 10
    count = max(1, min(count, MAX_QUESTIONS))

    try:
        payload = generate_assessment(
            substrand,
            count=count,
            description=(data.get("description") or "")[:1000],
            mcq_ratio=float(data.get("mcq_ratio") or 0.6),
            user=request.user,
        )
    except GenerationError as e:
        logger.warning("assessment generation failed: %s", e)
        return Response({"error": f"Could not generate: {e}"},
                        status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        logger.exception("assessment generation crashed")
        return Response({"error": f"Could not generate: {e}"},
                        status=status.HTTP_502_BAD_GATEWAY)

    from django.conf import settings
    out = GeneratedOutput.objects.create(
        teacher=request.user,
        tool="assessment",
        title=payload.get("title") or f"{substrand.name} Assessment",
        substrand=substrand,
        topic=substrand.topic,
        grade=substrand.topic.grade,
        subject=substrand.topic.subject,
        payload=payload,
        inputs={"count": count,
                "description": data.get("description") or "",
                "mcq_ratio": data.get("mcq_ratio") or 0.6},
        model_used=getattr(settings, "GEN_MODEL", "") or "",
    )
    return Response({"id": out.id, **_summarise(out), "payload": payload},
                    status=status.HTTP_201_CREATED)


# ── output history ────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_library(request):
    """GET /facilitator/library/?tool=&bookmarked=&q= - their own saved work."""
    qs = (GeneratedOutput.objects
          .filter(teacher=request.user)
          .select_related("subject", "topic", "substrand"))

    tool = request.query_params.get("tool")
    if tool:
        qs = qs.filter(tool=tool)
    if request.query_params.get("bookmarked") in ("1", "true", "True"):
        qs = qs.filter(bookmarked=True)
    q = request.query_params.get("q")
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(substrand__name__icontains=q))

    try:
        limit = min(int(request.query_params.get("limit") or 50), 200)
    except (TypeError, ValueError):
        limit = 50

    return Response({"count": qs.count(),
                     "results": [_summarise(o) for o in qs[:limit]]})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def library_item(request, pk):
    """Open, edit or delete one item. A facilitator only ever sees their own."""
    out = get_object_or_404(GeneratedOutput, pk=pk, teacher=request.user)

    if request.method == "GET":
        return Response({**_summarise(out), "payload": out.payload,
                         "inputs": out.inputs})

    if request.method == "DELETE":
        out.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data or {}
    changed = []
    if "title" in data:
        out.title = str(data["title"])[:200]
        changed.append("title")
    if "bookmarked" in data:
        out.bookmarked = bool(data["bookmarked"])
        changed.append("bookmarked")
    if "payload" in data and isinstance(data["payload"], dict):
        # The facilitator edited the paper. Recompute the total rather than trust
        # the submitted one - marks that do not add up is the error they would
        # be embarrassed by in front of a class.
        payload = data["payload"]
        qs_ = [q for q in payload.get("questions", []) if isinstance(q, dict)]
        for i, q in enumerate(qs_, start=1):
            q["number"] = i
            try:
                q["marks"] = int(q.get("marks") or 0)
            except (TypeError, ValueError):
                q["marks"] = 0
        payload["questions"] = qs_
        payload["total_marks"] = sum(q["marks"] for q in qs_)
        out.payload = payload
        changed.append("payload")

    if changed:
        out.edited_at = timezone.now()
        changed.append("edited_at")
        out.save(update_fields=changed)
    return Response({**_summarise(out), "payload": out.payload})
