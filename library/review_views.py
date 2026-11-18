"""Admin review of AI curriculum mappings for questions found in PDFs.

    POST /api/admin/library/<id>/analyse/                      start (or redo) an analysis
    GET  /api/admin/library/<id>/extraction/?review=&flagged=1 run status + questions
    POST /api/admin/library/<id>/extraction/approve-confident/ approve clean, confident ones
    POST /api/admin/library/questions/<qid>/review/            approve | reject | reopen | edit

The admin has the final say: nothing is usable by the Assessment Generator
until it is approved here, and approval needs a real curriculum sub-strand.
"""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from questions.models import Substrand
from questions.permissions import IsAdminUser

from .extraction import CONFIDENT, FLAG_TEXT, is_stale, start_extraction
from .models import ExtractedQuestion, Resource
from .views import _item, _log


def _sub_label(s):
    if not s:
        return None
    return {"id": s.id, "name": s.name, "strand": s.topic.name, "strand_id": s.topic_id,
            "grade": s.topic.grade, "subject_id": s.topic.subject_id,
            "subject": s.topic.subject.name if s.topic.subject_id else None}


def _eq_item(q, subs=None):
    subs = subs or {}

    def alt(a):
        s = subs.get(a.get("substrand_id")) or Substrand.objects.select_related(
            "topic", "topic__subject").filter(pk=a.get("substrand_id")).first()
        return {**_sub_label(s), "confidence": a.get("confidence")} if s else None

    return {
        "id": q.id, "page": q.page, "label": q.label,
        "text": q.text, "original_text": q.original_text,
        "answer": q.answer, "original_answer": q.original_answer,
        "edited": bool(q.edited_text or q.edited_answer),
        "options": q.options, "marks": q.marks, "question_type": q.question_type,
        "refers_to_figure": q.refers_to_figure, "text_verified": q.text_verified,
        "from_scan": q.from_scan, "figure": _figure_url(q),
        "proposed": _sub_label(q.proposed_substrand),
        "confidence": q.confidence,
        "alternatives": [x for x in (alt(a) for a in q.alternatives) if x],
        "reason": q.reason,
        "flags": [{"code": f, "text": FLAG_TEXT.get(f, f)} for f in q.flags],
        "review_status": q.review_status,
        "approved": _sub_label(q.substrand),
        "corrected": q.corrected,
    }


def _figure_url(q):
    try:
        return q.figure.url if q.figure else None
    except Exception:
        return None


def _run_item(run):
    if not run:
        return None
    status = "failed" if is_stale(run) else run.status
    return {"id": run.id, "status": status,
            "error": run.error or ("Stopped before finishing - press Analyse again." if status != run.status else ""),
            "pages_read": run.pages_read, "pages_total": run.pages_total,
            "scanned_pages": run.scanned_pages,
            "document_guess": run.document_guess, "notes": run.notes,
            "created_at": run.created_at, "finished_at": run.finished_at}


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_analyse(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    if r.kind != Resource.KIND_PDF or not r.file:
        return Response({"error": "Only uploaded PDFs can be analysed."}, status=400)
    if any(not is_stale(x) for x in r.extraction_runs.filter(status__in=["queued", "running"])):
        return Response({"error": "An analysis is already running."}, status=409)
    run = start_extraction(r, request.user)
    _log(r, request.user, "analysed")
    return Response(_run_item(run), status=202)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_extraction(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    all_q = list(r.extracted_questions.select_related(
        "proposed_substrand__topic__subject", "substrand__topic__subject"))
    alt_ids = {a.get("substrand_id") for q in all_q for a in q.alternatives}
    subs = {s.id: s for s in Substrand.objects.select_related("topic", "topic__subject")
            .filter(id__in=alt_ids)}

    shown = all_q
    st = request.query_params.get("review")
    if st:
        shown = [q for q in shown if q.review_status == st]
    if request.query_params.get("flagged") == "1":
        shown = [q for q in shown if q.flags]

    counts = {s: sum(1 for q in all_q if q.review_status == s) for s, _ in ExtractedQuestion.REVIEW}
    counts["flagged_open"] = sum(1 for q in all_q if q.review_status == "proposed" and q.flags)
    counts["confident_open"] = sum(1 for q in all_q if q.review_status == "proposed"
                                   and not q.flags and q.proposed_substrand_id
                                   and q.confidence >= CONFIDENT)
    return Response({
        "resource": _item(r, request, admin=True),
        "run": _run_item(r.extraction_runs.first()),
        "counts": counts,
        "questions": [_eq_item(q, subs) for q in shown],
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_review_question(request, qid):
    q = ExtractedQuestion.objects.select_related(
        "proposed_substrand__topic__subject").filter(pk=qid).first()
    if not q:
        return Response({"error": "Not found."}, status=404)
    action = request.data.get("action") or "edit"

    # Edits are kept beside the original, never over it.
    if "text" in request.data:
        t = (request.data.get("text") or "").strip()
        q.edited_text = "" if t == q.original_text else t
    if "answer" in request.data:
        a = (request.data.get("answer") or "").strip()
        q.edited_answer = "" if a == q.original_answer else a

    if action == "approve":
        sid = request.data.get("substrand_id") or q.proposed_substrand_id
        sub = Substrand.objects.select_related("topic").filter(pk=sid).first() if sid else None
        if not sub:
            return Response({"error": "Choose a sub-strand from the curriculum before approving."},
                            status=400)
        q.approve(sub, request.user, corrected=sub.id != q.proposed_substrand_id)
    elif action == "reject":
        q.review_status = ExtractedQuestion.REJECTED
        q.reviewed_by, q.reviewed_at = request.user, timezone.now()
    elif action == "reopen":
        q.review_status = ExtractedQuestion.PROPOSED
        q.substrand = q.topic = q.subject = None
        q.grade = None
        q.corrected = False
    elif action != "edit":
        return Response({"error": "Unknown action."}, status=400)
    q.save()
    q = ExtractedQuestion.objects.select_related(
        "proposed_substrand__topic__subject", "substrand__topic__subject").get(pk=q.pk)
    return Response(_eq_item(q))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_approve_confident(request, pk):
    """Approve, in one go, proposals with a confident mapping and no flags at
    all. Anything uncertain stays for a person to decide."""
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    n = 0
    for q in r.extracted_questions.select_related("proposed_substrand__topic").filter(
            review_status=ExtractedQuestion.PROPOSED, proposed_substrand__isnull=False,
            confidence__gte=CONFIDENT):
        if q.flags:
            continue
        q.approve(q.proposed_substrand, request.user)
        q.save()
        n += 1
    _log(r, request.user, "approved_confident", {"count": [n, n]})
    return Response({"approved": n})
