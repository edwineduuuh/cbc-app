"""Student library, facilitator Revision Notes, and admin management.

    Students     GET  /api/library/?kind=pdf|book|video&category=&grade=&subject=&topic=&q=
                 GET  /api/library/<id>/open/[?download=1]
    Facilitators GET  /api/facilitator/revision-notes/?grade=&subject=&topic=&substrand=&q=
                 GET  /api/facilitator/revision-notes/<id>/open/[?download=1]
    Admin        GET/POST          /api/admin/library/
                 GET/PATCH/DELETE  /api/admin/library/<id>/
                 POST              /api/admin/library/<id>/publish/ | archive/
                 GET               /api/admin/library/meta/

Files are never linked directly. /open/ checks the rule in entitlements.py,
then streams the PDF with the footer stamped on, or returns the video link.
"""
import logging
import mimetypes

from django.db.models import Q
from django.http import HttpResponse
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from questions.permissions import IsAdminUser

from . import entitlements as ent
from .models import Resource, ResourceAuditLog, read_file
from .stamp import page_count, stamp_pdf

logger = logging.getLogger(__name__)

UPGRADE = {
    "code": "premium_required",
    "error": "This resource is part of StadiSpace Premium.",
    "message": "Upgrade to Premium to open every PDF, book and video.",
    "redirect": "/subscribe",
}


def _url(field, request):
    try:
        if not field:
            return None
        u = field.url
        return request.build_absolute_uri(u) if u.startswith("/") else u
    except Exception:
        return None


def _item(r: Resource, request, *, locked=False, admin=False):
    d = {
        "id": r.id,
        "kind": r.kind,
        "category": r.category,
        "category_label": dict(Resource.ALL_CATEGORIES).get(r.category, r.category),
        "title": r.title,
        "description": r.description,
        "grade": r.grade,
        "subject": {"id": r.subject_id, "name": r.subject.name} if r.subject_id else None,
        "topic": {"id": r.topic_id, "name": r.topic.name} if r.topic_id else None,
        "substrand": {"id": r.substrand_id, "name": r.substrand.name} if r.substrand_id else None,
        "access": r.access,
        "locked": locked,
        "thumbnail": _url(r.thumbnail, request),
        "page_count": r.page_count,
        "allow_download": r.allow_download,
        "published_at": r.published_at,
    }
    if admin:
        d.update({
            "status": r.status,
            "extraction_eligible": r.extraction_eligible,
            "has_file": bool(r.file),
            "has_video": bool(r.video_file or r.video_url),
            "video_url": r.video_url,
            "file_size": r.file_size,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "publish_problems": r.publish_problems(),
        })
    return d


def _filtered(qs, params):
    for key in ("kind", "category", "grade"):
        v = params.get(key)
        if v:
            qs = qs.filter(**{key: v})
    for key in ("subject", "topic", "substrand"):
        v = params.get(key)
        if v:
            qs = qs.filter(**{f"{key}_id": v})
    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
    return qs.select_related("subject", "topic", "substrand")


def _open_response(r: Resource, request):
    if r.kind == Resource.KIND_VIDEO:
        return Response({"kind": "video", "url": r.video_url or _url(r.video_file, request)})
    if not r.file:
        return Response({"error": "This resource has no file yet."}, status=404)
    try:
        raw = read_file(r.file)
    except Exception:
        logger.exception("Library file %s could not be fetched", r.pk)
        return Response({"error": "This file couldn't be fetched. Please try again shortly."}, status=502)
    try:
        body = stamp_pdf(raw)
    except Exception:
        return Response({"error": "This file could not be prepared. Please tell StadiSpace."}, status=500)
    resp = HttpResponse(body, content_type="application/pdf")
    disposition = "attachment" if (request.query_params.get("download") and r.allow_download) else "inline"
    resp["Content-Disposition"] = f'{disposition}; filename="{slugify(r.title) or "stadispace"}.pdf"'
    resp["Cache-Control"] = "private, no-store"
    resp["X-Allow-Download"] = "1" if r.allow_download else "0"
    resp["Access-Control-Expose-Headers"] = "Content-Disposition, X-Allow-Download"
    return resp


# ── Students ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_library(request):
    if not ent.student_can_browse(request.user):
        return Response({"error": "The library is part of the student portal."}, status=403)
    qs = Resource.objects.filter(status=Resource.PUBLISHED).exclude(access=Resource.ACCESS_UNSET)
    qs = _filtered(qs, request.query_params)
    premium = ent.has_student_premium(request.user) or not ent.is_student(request.user)
    rows = [_item(r, request, locked=(r.access == Resource.ACCESS_PREMIUM and not premium))
            for r in qs[:300]]
    return Response({"results": rows, "has_premium": premium})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_open(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r or not ent.student_can_browse(request.user):
        return Response({"error": "Not found."}, status=404)
    ok, why = ent.can_open(request.user, r, portal="student")
    if not ok:
        if why == "premium_required":
            return Response(UPGRADE, status=402)
        return Response({"error": "Not found."}, status=404)
    return _open_response(r, request)


# ── Facilitators: Revision Notes only ───────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def facilitator_notes(request):
    if not ent.facilitator_can_browse_notes(request.user):
        return Response({"error": "Revision Notes here are for facilitators."}, status=403)
    qs = Resource.objects.filter(status=Resource.PUBLISHED, category=Resource.REVISION_NOTES) \
        .exclude(access=Resource.ACCESS_UNSET)
    params = request.query_params.copy()
    params.pop("kind", None)
    params.pop("category", None)
    rows = [_item(r, request) for r in _filtered(qs, params)[:300]]
    return Response({"results": rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def facilitator_note_open(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r or not ent.facilitator_can_browse_notes(request.user):
        return Response({"error": "Not found."}, status=404)
    ok, _ = ent.can_open(request.user, r, portal="facilitator")
    if not ok:
        return Response({"error": "Not found."}, status=404)
    return _open_response(r, request)


# ── Admin ───────────────────────────────────────────────────────────────────

EDITABLE = ("kind", "category", "title", "description", "grade", "subject", "topic",
            "substrand", "access", "allow_download", "extraction_eligible", "video_url")


def _bool(v):
    return str(v).lower() in ("1", "true", "yes", "on")


def _apply(r: Resource, data, files):
    changes = {}
    for f in EDITABLE:
        if f not in data:
            continue
        v = data.get(f)
        if f in ("subject", "topic", "substrand"):
            v = int(v) if v not in (None, "", "null") else None
            attr = f"{f}_id"
        elif f == "grade":
            v = int(v) if v not in (None, "", "null") else None
            attr = f
        elif f in ("allow_download", "extraction_eligible"):
            v = _bool(v)
            attr = f
        else:
            v = (v or "").strip() if isinstance(v, str) else (v or "")
            attr = f
        if getattr(r, attr) != v:
            changes[f] = [getattr(r, attr), v]
            setattr(r, attr, v)
    if "file" in files:
        up = files["file"]
        ctype = getattr(up, "content_type", "") or mimetypes.guess_type(up.name)[0] or ""
        if "pdf" not in ctype and not up.name.lower().endswith(".pdf"):
            raise ValueError("Only PDF files can be uploaded here.")
        data_bytes = up.read()
        up.seek(0)
        r.file = up
        r.file_size = len(data_bytes)
        r.page_count = page_count(data_bytes)
        changes["file"] = up.name
    if "video_file" in files:
        r.video_file = files["video_file"]
        changes["video_file"] = files["video_file"].name
    if "thumbnail" in files:
        r.thumbnail = files["thumbnail"]
        changes["thumbnail"] = files["thumbnail"].name
    # Only listed categories may ever feed the Assessment Generator.
    if r.extraction_eligible and (r.kind != Resource.KIND_PDF or r.category not in Resource.EXTRACTABLE):
        r.extraction_eligible = False
    return changes


def _log(r, user, action, changes=None):
    ResourceAuditLog.objects.create(resource=r, resource_title=r.title, actor=user,
                                    action=action, changes=_jsonable(changes or {}))


def _jsonable(d):
    return {k: [str(x) if x is not None else None for x in v] if isinstance(v, list) else str(v)
            for k, v in d.items()}


def _auto_analyse(r, user, changes):
    """A new or replaced PDF is read and mapped straight away, so the
    proposals are waiting by the time the admin opens the review page."""
    if "file" not in changes or r.kind != Resource.KIND_PDF:
        return
    from .extraction import start_extraction
    try:
        start_extraction(r, user)
    except Exception:
        pass   # the upload itself succeeded; the admin can press Analyse


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_meta(request):
    return Response({
        "kinds": Resource.KINDS,
        "categories": Resource.CATEGORIES,
        "extractable": sorted(Resource.EXTRACTABLE),
        "access": [a for a in Resource.ACCESS if a[0]],
    })


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_list(request):
    if request.method == "GET":
        qs = _filtered(Resource.objects.all(), request.query_params)
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        return Response({"results": [_item(r, request, admin=True) for r in qs[:500]]})

    r = Resource(created_by=request.user, status=Resource.DRAFT)
    try:
        changes = _apply(r, request.data, request.FILES)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    if not r.title or r.kind not in dict(Resource.KINDS):
        return Response({"error": "Title and type are required."}, status=400)
    if r.category not in {c for c, _ in Resource.CATEGORIES[r.kind]}:
        return Response({"error": "Pick a category that matches the resource type."}, status=400)
    r.save()
    _log(r, request.user, "created", changes)
    _auto_analyse(r, request.user, changes)
    return Response(_item(r, request, admin=True), status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_detail(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    if request.method == "GET":
        d = _item(r, request, admin=True)
        d["audit"] = [{"action": a.action, "changes": a.changes, "at": a.created_at,
                       "by": getattr(a.actor, "username", None)} for a in r.audit.all()[:50]]
        return Response(d)
    if request.method == "DELETE":
        if r.status == Resource.PUBLISHED:
            return Response({"error": "Archive a published resource instead of deleting it."}, status=409)
        _log(r, request.user, "deleted")
        r.delete()
        return Response(status=204)
    try:
        changes = _apply(r, request.data, request.FILES)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    if r.status == Resource.PUBLISHED and r.publish_problems():
        return Response({"error": " ".join(r.publish_problems())}, status=400)
    r.save()
    if changes:
        _log(r, request.user, "updated", changes)
    _auto_analyse(r, request.user, changes)
    return Response(_item(r, request, admin=True))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_publish(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    problems = r.publish_problems()
    if problems:
        return Response({"error": " ".join(problems), "problems": problems}, status=400)
    r.mark_published()
    r.save()
    _log(r, request.user, "published", {"access": r.access})
    return Response(_item(r, request, admin=True))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_archive(request, pk):
    r = Resource.objects.filter(pk=pk).first()
    if not r:
        return Response({"error": "Not found."}, status=404)
    r.status = Resource.ARCHIVED
    r.save(update_fields=["status", "updated_at"])
    _log(r, request.user, "archived")
    return Response(_item(r, request, admin=True))
