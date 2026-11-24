"""
Facilitators Portal API: generate from the KICD design, and My Library.

"Facilitator" is the CBC term for the teacher, so the portal uses it.

My Library is one table across every tool (GeneratedOutput) rather than one
per tool, so a facilitator's work can be listed together, reopened, edited
and chained - lesson notes from a lesson plan, a record of work from a
scheme.
"""
import logging
import threading
from datetime import timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .permissions import IsFacilitator
from rest_framework.response import Response

from .assessments import generate_assessment
from .generation import GenerationError
from .models import GeneratedOutput, Subject, Substrand, Topic

logger = logging.getLogger("generation")

MAX_QUESTIONS = 40

# Past this many sub-strands the design text alone crowds out the questions,
# and a paper spread that thin tests nothing properly.
MAX_SUBSTRANDS = 25


def _as_id_list(value):
    out = []
    for v in (value if isinstance(value, (list, tuple)) else [value]):
        try:
            out.append(int(v))
        except (TypeError, ValueError):
            continue
    return out


def _resolve_substrands(data):
    """Work out which sub-strands a request means. Returns (list, error).

    A strand with none of its sub-strands ticked means all of them: that is
    how the picker presents it, and it saves ticking fourteen boxes to say
    "the whole strand".
    """
    qs = (Substrand.objects
          .select_related("topic", "topic__subject")
          .exclude(learning_outcomes=[]))

    ids = _as_id_list(data.get("substrands") or data.get("substrand") or [])
    strand_ids = _as_id_list(data.get("strands") or [])

    chosen = list(qs.filter(id__in=ids)) if ids else []

    # Strands whose sub-strands were not individually ticked.
    covered = {s.topic_id for s in chosen}
    rest = [t for t in strand_ids if t not in covered]
    if rest:
        chosen += list(qs.filter(topic_id__in=rest))

    if not chosen:
        if ids or strand_ids:
            return [], ("Nothing selected has KICD learning outcomes loaded, "
                        "so an assessment cannot be grounded in the design.")
        return [], "Select at least one strand or sub-strand."

    # De-duplicate, then put them in curriculum order so the paper reads the
    # way the design does.
    seen, unique = set(), []
    for s in chosen:
        if s.id not in seen:
            seen.add(s.id)
            unique.append(s)
    unique.sort(key=lambda s: (s.topic.kicd_code or "", s.topic.name,
                               s.order or 0, s.kicd_code or "", s.name))

    grades = {s.topic.grade for s in unique}
    subjects = {s.topic.subject_id for s in unique}
    if len(grades) > 1 or len(subjects) > 1:
        return [], "All sub-strands must come from the same grade and learning area."

    return unique[:MAX_SUBSTRANDS], ""


def _is_facilitator(user):
    # Kept for the existing call site; IsFacilitator guards every view now.
    from .permissions import IsFacilitator
    return IsFacilitator().has_permission(type("R", (), {"user": user})(), None)


# A paper takes about two minutes. Past this, the container was redeployed or
# restarted mid-generation and the thread went with it - the row would say
# "generating" forever, so it is reported as failed instead.
STALE_AFTER = timedelta(minutes=20)   # hard cap, resumes included


# A running job touches updated_at every HEARTBEAT seconds. No touch for
# DEAD_AFTER means the worker was killed (a deploy or restart) - say so in
# about a minute and a half instead of leaving a spinner up for ten.
HEARTBEAT = 20
DEAD_AFTER = timedelta(seconds=90)


MAX_ATTEMPTS = 3


def _status_of(o: GeneratedOutput) -> str:
    if o.status == GeneratedOutput.STATUS_RUNNING:
        if timezone.now() - o.created_at > STALE_AFTER:
            return GeneratedOutput.STATUS_FAILED
        if _is_dead(o) and (o.inputs or {}).get("_attempts", 1) >= MAX_ATTEMPTS:
            return GeneratedOutput.STATUS_FAILED
    return o.status


def _is_dead(o) -> bool:
    return bool(o.status == GeneratedOutput.STATUS_RUNNING and o.updated_at
                and timezone.now() - o.updated_at > DEAD_AFTER)


def _launch(output_id, substrand_ids, inputs, user_id):
    threading.Thread(
        target=_build_assessment,
        args=(output_id, substrand_ids, inputs, user_id),
        daemon=True,
        name=f"assessment-{output_id}",
    ).start()


def revive(o) -> bool:
    """Start a paper again if the worker writing it died (a deploy or a
    restart). Claimed with a conditional update, so when several workers
    notice at once only one of them restarts it. Returns True if restarted."""
    if not _is_dead(o):
        return False
    inputs = dict(o.inputs or {})
    attempts = inputs.get("_attempts", 1)
    if attempts >= MAX_ATTEMPTS:
        return False
    inputs["_attempts"] = attempts + 1
    claimed = GeneratedOutput.objects.filter(
        pk=o.pk, status=GeneratedOutput.STATUS_RUNNING, updated_at=o.updated_at,
    ).update(updated_at=timezone.now(), inputs=inputs)
    if not claimed:
        return False
    logger.warning("restarting assessment %s after its worker died (attempt %s)",
                   o.pk, attempts + 1)
    if o.tool != "assessment":
        from .studio_views import launch as studio_launch
        studio_launch(o.pk)
    else:
        _launch(o.pk, inputs.get("substrands") or ([o.substrand_id] if o.substrand_id else []),
                inputs, o.teacher_id)
    return True


def revive_dead_jobs():
    """Pick up every paper whose worker died. Run by the watchdog."""
    cutoff = timezone.now() - DEAD_AFTER
    for o in GeneratedOutput.objects.filter(status=GeneratedOutput.STATUS_RUNNING,
                                            updated_at__lt=cutoff):
        try:
            revive(o)
        except Exception:
            logger.exception("could not restart assessment %s", o.pk)


def _heartbeat(output_id, stop):
    """Touch the output while it is being built, from its own thread."""
    from django.db import connection
    try:
        while not stop.wait(HEARTBEAT):
            GeneratedOutput.objects.filter(
                pk=output_id, status=GeneratedOutput.STATUS_RUNNING
            ).update(updated_at=timezone.now())
    finally:
        connection.close()


def _summarise(o: GeneratedOutput) -> dict:
    """Row shape for the My Library list - no payload, keeps it light."""
    state = _status_of(o)
    return {
        "status": state,
        "error": (o.error or ("The server restarted while this was being "
                              "generated." if state == "failed" and not o.error
                              else "")),
        "id": o.id,
        "tool": o.tool,
        "tool_display": o.get_tool_display(),
        "title": o.title,
        "grade": o.grade,
        "subject": o.subject.name if o.subject else "",
        "strand": o.topic.name if o.topic else "",
        "substrand": o.substrand.name if o.substrand else "",
        # What the paper actually covers, which for a multi-strand paper is
        # the only honest answer to "what is this?".
        "covers": (o.payload or {}).get("covers", ""),
        "bookmarked": o.bookmarked,
        "created_at": o.created_at,
        "edited_at": o.edited_at,
        "model_used": o.model_used,
    }


# ── curriculum pickers ────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsFacilitator])
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
        # tree=1 returns every strand with its sub-strands nested, so the
        # picker can offer tick boxes for all of them at once instead of one
        # request per strand opened.
        if request.query_params.get("tree"):
            topics = (Topic.objects
                      .filter(subject_id=subject_id, grade=grade)
                      .prefetch_related("substrands")
                      .order_by("kicd_code", "order", "name"))
            strands = []
            for t in topics:
                subs = sorted(
                    (s for s in t.substrands.all() if s.learning_outcomes),
                    key=lambda s: (s.order or 0, s.kicd_code or "", s.name))
                if not subs:
                    continue
                strands.append({
                    "id": t.id, "name": t.name, "kicd_code": t.kicd_code,
                    "has_rubric": bool(t.assessment_rubric),
                    "substrand_count": len(subs),
                    "substrands": [{
                        "id": s.id, "name": s.name, "kicd_code": s.kicd_code,
                        "suggested_duration": s.suggested_duration,
                        "outcome_count": len(s.learning_outcomes or []),
                        "learning_outcomes": s.learning_outcomes,
                        "inquiry_questions": s.inquiry_questions,
                    } for s in subs],
                })
            return Response({"strands": strands})

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
@permission_classes([IsFacilitator])
def generate_assessment_view(request):
    """POST -> a saved assessment.

    Takes {substrands: [id, ...]} - a paper usually covers several sub-strands,
    which is how an end-of-term test is actually set. {strands: [id, ...]}
    means every sub-strand of those strands, so a facilitator can tick a whole
    strand without ticking its children. {substrand: id} is still accepted.
    """
    if not _is_facilitator(request.user):
        return Response({"error": "Facilitator access required"},
                        status=status.HTTP_403_FORBIDDEN)

    data = request.data or {}
    chosen, err = _resolve_substrands(data)
    if err:
        return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

    try:
        count = int(data.get("count") or 10)
    except (TypeError, ValueError):
        count = 10
    count = max(1, min(count, MAX_QUESTIONS))

    from django.conf import settings
    first = chosen[0]
    topics = {s.topic_id for s in chosen}
    inputs = {"count": count,
              "description": (data.get("description") or "")[:1000],
              # None means nobody fixed the mix, so what the facilitator
              # typed in the box decides it.
              "mcq_ratio": (float(data["mcq_ratio"])
                            if data.get("mcq_ratio") not in (None, "")
                            else None),
              # Diagrams cost far more than the questions do, so they are the
              # facilitator's choice rather than something that happens to them.
              "diagrams": bool(data.get("diagrams", True)),
              "substrands": [s.id for s in chosen],
              "strands": sorted(topics)}

    out = GeneratedOutput.objects.create(
        teacher=request.user,
        tool="assessment",
        title=f"{first.name} assessment",      # the paper renames itself
        # Only pin the row to one strand or sub-strand when it really is
        # about one. A paper across four strands filed under the first would
        # be a lie in the library listing.
        substrand=first if len(chosen) == 1 else None,
        topic=first.topic if len(topics) == 1 else None,
        grade=first.topic.grade,
        subject=first.topic.subject,
        payload={},
        inputs=inputs,
        status=GeneratedOutput.STATUS_RUNNING,
        model_used=getattr(settings, "GEN_MODEL", "") or "",
    )

    # Hand the work to a thread and answer now. Holding the request open for
    # two minutes is what made this fail: the worker was killed at 120s and
    # the browser reported "Failed to fetch" for a paper that had actually
    # been written. Nothing now depends on the connection staying up - the
    # facilitator can close the tab and the paper still lands in My Library.
    _launch(out.id, [s.id for s in chosen], inputs, request.user.id)

    return Response({"id": out.id, **_summarise(out)},
                    status=status.HTTP_202_ACCEPTED)


def _build_assessment(output_id, substrand_ids, inputs, user_id):
    """Generate the paper off the request. Runs in its own thread."""
    from django.contrib.auth import get_user_model
    from django.db import connection

    stop = threading.Event()
    threading.Thread(target=_heartbeat, args=(output_id, stop), daemon=True,
                     name=f"heartbeat-{output_id}").start()
    try:
        order = {sid: i for i, sid in enumerate(substrand_ids)}
        subs = sorted(
            Substrand.objects.select_related("topic", "topic__subject")
                             .filter(id__in=substrand_ids),
            key=lambda s: order.get(s.id, 0))
        user = get_user_model().objects.filter(pk=user_id).first()

        def build():
            return generate_assessment(
                subs,
                count=inputs["count"],
                description=inputs["description"],
                mcq_ratio=inputs["mcq_ratio"],
                user=user,
                diagrams=inputs["diagrams"],
                # Hand the paper over as soon as it is written. A drawn
                # picture takes most of a minute, and nobody should watch a
                # spinner with a finished paper behind it.
                defer_images=True,
            )

        try:
            payload = build()
        except Exception as first:
            # Providers have bad seconds (rate limits, timeouts, overload).
            # One more try costs a minute; a failed paper costs a facilitator.
            logger.warning("assessment %s failed once (%s); trying again", output_id, first)
            payload = build()
        GeneratedOutput.objects.filter(pk=output_id).update(
            payload=payload,
            title=(payload.get("title") or "").strip()[:200] or "Assessment",
            status=GeneratedOutput.STATUS_READY,
            error="")

        if payload.get("diagrams_pending"):
            from questions.diagrams import draw_pending
            draw_pending(output_id, user=user)
    except Exception as e:
        logger.exception("assessment generation failed (output %s)", output_id)
        GeneratedOutput.objects.filter(pk=output_id).update(
            status=GeneratedOutput.STATUS_FAILED,
            error=f"{type(e).__name__}: {e}"[:500])
    finally:
        stop.set()
        # A thread gets its own connection; leaving it open leaks one per
        # paper until the pool is exhausted.
        connection.close()


# ── output history ────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsFacilitator])
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
@permission_classes([IsFacilitator])
def library_item(request, pk):
    """Open, edit or delete one item. A facilitator only ever sees their own."""
    out = get_object_or_404(GeneratedOutput, pk=pk, teacher=request.user)

    if request.method == "GET":
        if revive(out):
            out.refresh_from_db()
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


# ── talk to the paper: "make Q3 harder", "change Q5's choices" ────────────
REVISE_SYSTEM = """You are editing a school assessment paper for a Kenyan \
teacher. You are given the whole paper as JSON and the teacher's instruction. \
Change ONLY the questions the instruction is about; leave every other \
question exactly as it is. Follow the instruction exactly.

Every question you return must be complete and correct, in the same shape as \
the paper's questions: a multiple-choice question has four options A-D, \
exactly one correct "correct_answer", and is worth 1 mark - work any \
calculation out in full and make sure the marked option is right. A \
structured question has its parts and a full "marking_scheme" whose marks add \
up to the question's marks. Keep the question's "number". Keep its "sub" / \
"substrand" unless told to change the topic. Use $...$ LaTeX for maths, plain \
text otherwise (no markdown). A measurable figure is a "plot" (types \
cartesian, number_line, geometry - see the paper for the shape), a picture of \
a real thing is a "diagram" with "subject", "labels", "alt". A table is \
"table": {"headers": [...], "rows": [[...]]}.

Return ONLY JSON: {"questions": [ the changed or new questions, complete ], \
"remove": [numbers of questions to delete, if asked], \
"summary": "one short sentence saying what you changed"}"""


@api_view(["POST"])
@permission_classes([IsFacilitator])
def revise_paper(request, pk):
    """POST /facilitator/library/<pk>/revise/ {"instruction": "..."}

    The teacher says what to change in plain words; only those questions are
    rewritten (with answer keys and marking schemes), figures are drawn, and
    the paper is saved."""
    import json as _json
    from .assessments import SYSTEM, tidy_paper
    from .diagrams import attach_plots, mark_image_pending
    from .generation import generate_json

    out = get_object_or_404(GeneratedOutput, pk=pk, teacher=request.user)
    instruction = str((request.data or {}).get("instruction") or "").strip()[:2000]
    if not instruction:
        return Response({"error": "Say what you want changed."}, status=400)
    payload = dict(out.payload or {})
    questions = [q for q in payload.get("questions", []) if isinstance(q, dict)]
    if not questions:
        return Response({"error": "This paper has no questions to edit."}, status=400)

    paper = {"title": payload.get("title"), "grade": out.grade,
             "subject": getattr(out.subject, "name", ""), "questions": questions}
    prompt = (f"THE PAPER:\n{_json.dumps(paper, ensure_ascii=False, default=str)}\n\n"
              f"THE TEACHER'S INSTRUCTION:\n{instruction}")
    try:
        result = generate_json(prompt, REVISE_SYSTEM + "\n\n" + SYSTEM,
                               max_tokens=8000, task="assessment-revise",
                               user=request.user)
    except Exception as e:
        logger.warning("revise failed for output %s: %s", pk, e)
        return Response({"error": "Couldn't make that change just now. Try again."}, status=502)

    changed = [q for q in (result or {}).get("questions", []) if isinstance(q, dict)]
    remove = {int(n) for n in (result or {}).get("remove", []) if str(n).isdigit()}
    by_num = {int(q.get("number") or 0): q for q in questions}
    for q in changed:
        if isinstance(q.get("plot"), dict):
            q.pop("diagram", None)          # an exact plot replaces a picture
        try:
            by_num[int(q.get("number") or 0) or max(by_num, default=0) + 1] = q
        except (TypeError, ValueError):
            continue
    merged = [by_num[n] for n in sorted(by_num) if n not in remove]
    for i, q in enumerate(merged, start=1):
        q["number"] = i
        if q.get("type") == "mcq":
            q["marks"] = 1
        try:
            q["marks"] = int(q.get("marks") or 0)
        except (TypeError, ValueError):
            q["marks"] = 0

    payload["questions"] = merged
    payload = attach_plots(payload)          # maths figures: exact, instant
    payload = mark_image_pending(payload)    # pictures: drawn in the background
    payload = tidy_paper(payload)
    payload["total_marks"] = sum(q["marks"] for q in merged)

    out.payload = payload
    out.edited_at = timezone.now()
    out.save(update_fields=["payload", "edited_at"])
    if payload.get("diagrams_pending"):
        from .diagrams import draw_pending
        user = request.user

        def draw():
            from django.db import connection
            try:
                draw_pending(out.id, user=user)
            finally:
                connection.close()
        threading.Thread(target=draw, daemon=True).start()
    return Response({**_summarise(out), "payload": out.payload,
                     "summary": str((result or {}).get("summary") or "Done.")[:300]})
