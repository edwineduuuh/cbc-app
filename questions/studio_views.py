"""Facilitator tools: schemes of work, lesson plans, records of work.

    POST /api/facilitator/schemes/generate/   build a term's scheme (background)
    POST /api/facilitator/plans/generate/     build one lesson plan (background)
    POST /api/facilitator/records/            start a record of work (instant)

All three are saved as GeneratedOutput rows and opened, edited, printed and
exported through My Library, like assessments. Background builds share the
assessment generator's heartbeat and auto-resume after a restart.
"""
import logging
import threading

from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import facilitator_views as fv
from .models import GeneratedOutput, Subject, Substrand
from .permissions import IsFacilitator
from .studio import build_lesson_plan, build_record, build_scheme

logger = logging.getLogger("generation")

MINUTES = (30, 35, 40, 60, 70, 80)


def _int(v, default, lo, hi):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def _text(data, key, n=200):
    return str(data.get(key) or "").strip()[:n]


def _ids(v):
    out = []
    for x in v or []:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            pass
    return out


def _breaks(v):
    """{week: label} from {"6": "Half-term"} or [{"week": 6, "label": "..."}]."""
    out = {}
    items = v.items() if isinstance(v, dict) else [(d.get("week"), d.get("label")) for d in (v or []) if isinstance(d, dict)]
    for w, label in items:
        try:
            out[str(int(w))] = str(label or "No lessons")[:60]
        except (TypeError, ValueError):
            pass
    return out


# ── background build (shared with assessment heartbeat/revive) ──────────────

BUILDERS = {"scheme_of_work": build_scheme, "lesson_plan": build_lesson_plan}


def _build(output_id):
    from django.contrib.auth import get_user_model
    stop = threading.Event()
    threading.Thread(target=fv._heartbeat, args=(output_id, stop), daemon=True).start()
    try:
        out = GeneratedOutput.objects.get(pk=output_id)
        user = get_user_model().objects.filter(pk=out.teacher_id).first()
        builder = BUILDERS[out.tool]
        try:
            payload = builder(out.inputs, user=user)
        except ValueError:
            raise
        except Exception as first:
            logger.warning("%s %s failed once (%s); trying again", out.tool, output_id, first)
            payload = builder(out.inputs, user=user)
        GeneratedOutput.objects.filter(pk=output_id).update(
            payload=payload, title=(payload.get("title") or out.title)[:200],
            status=GeneratedOutput.STATUS_READY, error="")
    except Exception as e:
        logger.exception("studio build failed (output %s)", output_id)
        GeneratedOutput.objects.filter(pk=output_id).update(
            status=GeneratedOutput.STATUS_FAILED, error=f"{type(e).__name__}: {e}"[:500])
    finally:
        stop.set()
        connection.close()


def launch(output_id):
    threading.Thread(target=_build, args=(output_id,), daemon=True,
                     name=f"studio-{output_id}").start()


def _create(request, tool, title, inputs, **fields):
    from django.conf import settings
    out = GeneratedOutput.objects.create(
        teacher=request.user, tool=tool, title=title[:200], payload={}, inputs=inputs,
        status=GeneratedOutput.STATUS_RUNNING,
        model_used=getattr(settings, "GEN_MODEL", "") or "", **fields)
    launch(out.id)
    return Response({"id": out.id, **fv._summarise(out)}, status=status.HTTP_202_ACCEPTED)


# ── endpoints ───────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsFacilitator])
def generate_scheme(request):
    d = request.data or {}
    grade = _int(d.get("grade"), None, 1, 12)
    subject = Subject.objects.filter(pk=d.get("subject")).first()
    if not grade or not subject:
        return Response({"error": "Choose a grade and learning area."}, status=400)
    inputs = {
        "grade": grade, "subject": subject.id, "strands": _ids(d.get("strands")),
        "term": _int(d.get("term"), 1, 1, 3), "year": _text(d, "year", 10),
        "weeks": _int(d.get("weeks"), 12, 1, 16), "lessons_per_week": _int(d.get("lessons_per_week"), 5, 1, 10),
        "start_date": _text(d, "start_date", 10), "break_weeks": _breaks(d.get("break_weeks")),
        "school": _text(d, "school"), "teacher": _text(d, "teacher"), "class_name": _text(d, "class_name", 60),
        "first_week": _int(d.get("first_week"), 1, 1, 52), "notes": _text(d, "notes", 600),
    }
    return _create(request, "scheme_of_work",
                   f"Grade {grade} {subject.name} - Term {inputs['term']} Scheme of Work",
                   inputs, grade=grade, subject=subject)


@api_view(["POST"])
@permission_classes([IsFacilitator])
def generate_plan(request):
    d = request.data or {}
    scheme_row = None
    sub_id = d.get("substrand")
    # From a scheme: take the row the teacher clicked.
    if d.get("scheme_id") is not None and d.get("row") is not None:
        scheme = GeneratedOutput.objects.filter(pk=d["scheme_id"], teacher=request.user,
                                                tool="scheme_of_work").first()
        rows = (scheme.payload or {}).get("rows", []) if scheme else []
        idx = _int(d.get("row"), -1, -1, 10_000)
        if not scheme or not (0 <= idx < len(rows)) or not rows[idx].get("substrand_id"):
            return Response({"error": "That scheme row has no sub-strand to plan."}, status=400)
        scheme_row = rows[idx]
        sub_id = scheme_row["substrand_id"]
        meta = scheme.payload.get("meta") or {}
        d = {**{k: meta.get(k) for k in ("school", "teacher", "class_name", "term")},
             "week": scheme_row.get("week"), "lesson": scheme_row.get("lesson"), **d}
    s = Substrand.objects.select_related("topic", "topic__subject").filter(pk=sub_id).first()
    if not s:
        return Response({"error": "Choose a sub-strand."}, status=400)
    minutes = _int(d.get("minutes"), 40, 20, 120)
    inputs = {
        "substrand": s.id, "minutes": minutes, "date": _text(d, "date", 10),
        "term": _text(d, "term", 4), "week": _text(d, "week", 4), "lesson": _text(d, "lesson", 4),
        "focus": _text(d, "focus", 600), "school": _text(d, "school"), "teacher": _text(d, "teacher"),
        "class_name": _text(d, "class_name", 60), "roll": _text(d, "roll", 10),
        "scheme_row": scheme_row,
    }
    return _create(request, "lesson_plan", f"{s.name} - lesson plan", inputs,
                   grade=s.topic.grade, subject=s.topic.subject, topic=s.topic, substrand=s)


@api_view(["POST"])
@permission_classes([IsFacilitator])
def create_record(request):
    d = request.data or {}
    scheme = None
    if d.get("scheme_id"):
        scheme = GeneratedOutput.objects.filter(pk=d["scheme_id"], teacher=request.user,
                                                tool="scheme_of_work", status="ready").first()
        if not scheme:
            return Response({"error": "That scheme of work wasn't found."}, status=400)
    inputs = {
        "school": _text(d, "school"), "teacher": _text(d, "teacher"),
        "tsc_number": _text(d, "tsc_number", 30), "class_name": _text(d, "class_name", 60),
        "start_date": _text(d, "start_date", 10),
    }
    fields = {}
    if scheme:
        inputs["scheme_id"] = scheme.id
        fields = {"grade": scheme.grade, "subject": scheme.subject, "source": scheme}
    else:
        grade = _int(d.get("grade"), None, 1, 12)
        subject = Subject.objects.filter(pk=d.get("subject")).first()
        if not grade or not subject:
            return Response({"error": "Choose a scheme, or a grade and learning area."}, status=400)
        inputs.update({"grade": grade, "subject": subject.id, "strands": _ids(d.get("strands")),
                       "term": _int(d.get("term"), 1, 1, 3), "year": _text(d, "year", 10),
                       "weeks": _int(d.get("weeks"), 12, 1, 16),
                       "lessons_per_week": _int(d.get("lessons_per_week"), 5, 1, 10),
                       "break_weeks": _breaks(d.get("break_weeks")),
                       "first_week": _int(d.get("first_week"), 1, 1, 52)})
        fields = {"grade": grade, "subject": subject}
    try:
        payload = build_record(inputs, scheme)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    out = GeneratedOutput.objects.create(
        teacher=request.user, tool="record_of_work", title=payload["title"][:200],
        payload=payload, inputs=inputs, status=GeneratedOutput.STATUS_READY, **fields)
    return Response({"id": out.id, **fv._summarise(out)}, status=status.HTTP_201_CREATED)
