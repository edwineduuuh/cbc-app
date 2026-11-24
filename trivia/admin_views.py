"""Admin endpoints: /api/admin/trivia/... (existing admin permission)."""
import csv
import datetime
import io

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from questions.permissions import IsAdminUser

from . import engine
from .config import DEFAULTS, get_config, save_config
from .models import (TriviaAchievement, TriviaAnswer, TriviaCategory, TriviaDailyChallenge, TriviaGame,
                     TriviaPlayerAchievement, TriviaProfile, TriviaQuestion)

PARSERS = [JSONParser, MultiPartParser, FormParser]
LETTERS = "ABCDEF"


def _bool(v):
    return str(v).strip().lower() in ("1", "true", "yes", "y", "on")


def _int_or_none(v):
    try:
        return int(v) if str(v).strip() not in ("", "None", "null") else None
    except (TypeError, ValueError):
        return None


# ── Categories ───────────────────────────────────────────────

def _cat(c, request):
    return {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "icon": c.icon,
            "image": engine.image_url(c.image, request), "color": c.color, "group": c.group,
            "order": c.order, "is_active": c.is_active,
            "questions": getattr(c, "n", None), "published": getattr(c, "p", None)}


def _apply_cat(c, data, files):
    for f in ("name", "description", "icon", "color", "group"):
        if f in data:
            setattr(c, f, str(data[f]).strip())
    if "order" in data:
        c.order = _int_or_none(data["order"]) or 0
    if "is_active" in data:
        c.is_active = _bool(data["is_active"])
    if files.get("image"):
        c.image = files["image"]
    if "remove_image" in data and _bool(data["remove_image"]):
        c.image = None
    if not c.name:
        raise ValueError("A category needs a name.")
    if not c.slug:
        c.slug = slugify(c.name)[:60] or f"category-{timezone.now().timestamp():.0f}"


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@parser_classes(PARSERS)
def categories(request):
    if request.method == "POST":
        c = TriviaCategory()
        try:
            _apply_cat(c, request.data, request.FILES)
            if TriviaCategory.objects.filter(Q(name__iexact=c.name) | Q(slug=c.slug)).exists():
                return Response({"error": "A category with that name already exists."}, status=400)
            c.save()
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        return Response(_cat(c, request), status=201)
    qs = TriviaCategory.objects.annotate(
        n=Count("questions"), p=Count("questions", filter=Q(questions__status=TriviaQuestion.PUBLISHED))
    ).order_by("order", "name")       # annotate() drops Meta.ordering
    return Response([_cat(c, request) for c in qs])


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminUser])
@parser_classes(PARSERS)
def category_detail(request, pk):
    c = get_object_or_404(TriviaCategory, pk=pk)
    if request.method == "DELETE":
        try:
            c.delete()
        except ProtectedError:
            return Response({"error": "This category has questions. Switch it off instead, "
                                      "or move its questions first."}, status=409)
        return Response(status=204)
    try:
        _apply_cat(c, request.data, request.FILES)
        c.save()
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    return Response(_cat(c, request))


# ── Questions ────────────────────────────────────────────────

def _q(q, request, dupes=None):
    warnings = []
    if not q.explanation.strip():
        warnings.append("No explanation or fun fact yet.")
    if q.qtype == TriviaQuestion.PICTURE and not q.image:
        warnings.append("Picture question without a picture.")
    if dupes and dupes.get(q.fingerprint, 0) > 1:
        warnings.append("Possible duplicate - the same question exists more than once.")
    return {
        "id": q.id, "category": q.category_id, "category_name": q.category.name, "type": q.qtype,
        "difficulty": q.difficulty, "is_teaser": q.is_teaser, "text": q.text,
        "image": engine.image_url(q.image, request), "image_alt": q.image_alt, "options": q.options,
        "correct_index": q.correct_index, "accepted_answers": q.accepted_answers,
        "explanation": q.explanation, "source": q.source, "time_limit": q.time_limit,
        "min_grade": q.min_grade, "max_grade": q.max_grade, "status": q.status,
        "times_answered": q.times_answered, "times_correct": q.times_correct,
        "correct_rate": round(100 * q.times_correct / q.times_answered) if q.times_answered else None,
        "warnings": warnings, "updated_at": q.updated_at.isoformat() if q.updated_at else None,
    }


def _list_field(v):
    if isinstance(v, list):
        return [str(x) for x in v]
    if isinstance(v, str):
        import json
        try:
            got = json.loads(v)
            if isinstance(got, list):
                return [str(x) for x in got]
        except ValueError:
            pass
        return [x for x in (s.strip() for s in v.split("|")) if x]
    return []


def apply_question(q: TriviaQuestion, data, files=None):
    """Validate and copy fields. Raises ValueError with a plain message."""
    files = files or {}
    if "category" in data:
        cat = TriviaCategory.objects.filter(pk=_int_or_none(data["category"])).first()
        if not cat:
            raise ValueError("Choose a category.")
        q.category = cat
    for f in ("text", "explanation", "source", "image_alt"):
        if f in data:
            setattr(q, f, str(data[f] or "").strip())
    if "type" in data:
        q.qtype = str(data["type"])
    if "difficulty" in data:
        q.difficulty = str(data["difficulty"])
    if "is_teaser" in data:
        q.is_teaser = _bool(data["is_teaser"])
    for f in ("time_limit", "min_grade", "max_grade"):
        if f in data:
            setattr(q, f, _int_or_none(data[f]))
    if "options" in data:
        q.options = [o.strip() for o in _list_field(data["options"])]
    if "correct_index" in data:
        q.correct_index = _int_or_none(data["correct_index"])
    if "accepted_answers" in data:
        q.accepted_answers = [a.strip() for a in _list_field(data["accepted_answers"]) if a.strip()]
    if files.get("image"):
        q.image = files["image"]
    if _bool(data.get("remove_image", "")):
        q.image = None
    if "status" in data:
        q.status = str(data["status"])

    if q.qtype not in dict(TriviaQuestion.TYPES):
        raise ValueError("Unknown question type.")
    if q.difficulty not in ("easy", "medium", "hard", "expert"):
        raise ValueError("Difficulty must be easy, medium, hard or expert.")
    if q.status not in ("draft", "published"):
        raise ValueError("Status must be draft or published.")
    if not q.text:
        raise ValueError("Write the question.")
    if not q.category_id:
        raise ValueError("Choose a category.")
    if q.time_limit is not None and not (5 <= q.time_limit <= 120):
        raise ValueError("The timer must be between 5 and 120 seconds.")
    if q.qtype == TriviaQuestion.TRUE_FALSE:
        q.options = ["True", "False"]
        if q.correct_index not in (0, 1):
            raise ValueError("Choose whether the statement is True or False.")
    elif q.qtype in (TriviaQuestion.MCQ, TriviaQuestion.PICTURE):
        q.options = [o for o in q.options if o]
        if not 2 <= len(q.options) <= 6:
            raise ValueError("Give between 2 and 6 answer choices.")
        if len({o.lower() for o in q.options}) != len(q.options):
            raise ValueError("Two answer choices are the same.")
        if q.correct_index is None or not 0 <= q.correct_index < len(q.options):
            raise ValueError("Mark which choice is correct.")
    else:
        q.options, q.correct_index = [], None
        if not q.accepted_answers:
            raise ValueError("Add at least one accepted answer.")
    if q.status == "published" and q.qtype == TriviaQuestion.PICTURE and not q.image:
        raise ValueError("A picture question needs its picture before it can be published.")
    q.fingerprint = engine.fingerprint(q.text)


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@parser_classes(PARSERS)
def questions(request):
    if request.method == "POST":
        q = TriviaQuestion(created_by=request.user)
        try:
            apply_question(q, request.data, request.FILES)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        q.save()
        dup = TriviaQuestion.objects.filter(fingerprint=q.fingerprint).exclude(pk=q.pk).first()
        out = _q(q, request)
        if dup:
            out["warnings"].append(f"Possible duplicate of question #{dup.pk}.")
        return Response(out, status=201)

    p = request.query_params
    qs = TriviaQuestion.objects.select_related("category")
    if p.get("category"):
        qs = qs.filter(category_id=p["category"])
    for f, key in (("status", "status"), ("qtype", "type"), ("difficulty", "difficulty")):
        if p.get(key):
            qs = qs.filter(**{f: p[key]})
    if p.get("teaser"):
        qs = qs.filter(is_teaser=True)
    if p.get("q"):
        qs = qs.filter(text__icontains=p["q"])
    dupe_fps = dict(TriviaQuestion.objects.values_list("fingerprint").annotate(n=Count("id"))
                    .filter(n__gt=1))
    if p.get("duplicates"):
        qs = qs.filter(fingerprint__in=list(dupe_fps))
    if p.get("hard"):
        qs = qs.filter(times_answered__gte=5).order_by(F("times_correct") * 1.0 / F("times_answered"))
    page = max(1, _int_or_none(p.get("page")) or 1)
    size = min(100, _int_or_none(p.get("size")) or 25)
    total = qs.count()
    return Response({"count": total, "page": page, "pages": max(1, -(-total // size)),
                     "results": [_q(q, request, dupe_fps) for q in qs[(page - 1) * size: page * size]],
                     "duplicates": sum(dupe_fps.values())})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
@parser_classes(PARSERS)
def question_detail(request, pk):
    q = get_object_or_404(TriviaQuestion.objects.select_related("category"), pk=pk)
    if request.method == "DELETE":
        q.delete()                     # past games keep their own snapshot
        return Response(status=204)
    if request.method == "PATCH":
        try:
            apply_question(q, request.data, request.FILES)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        q.save()
    return Response(_q(q, request))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def questions_bulk(request):
    ids = [i for i in (request.data.get("ids") or []) if isinstance(i, int)]
    action = request.data.get("action")
    qs = TriviaQuestion.objects.filter(pk__in=ids)
    if action == "publish":
        blocked = list(qs.filter(qtype=TriviaQuestion.PICTURE, image="").values_list("id", flat=True))
        n = qs.exclude(pk__in=blocked).update(status=TriviaQuestion.PUBLISHED)
        return Response({"updated": n, "skipped": blocked,
                         "note": "Picture questions without a picture were left as drafts." if blocked else ""})
    if action == "draft":
        return Response({"updated": qs.update(status=TriviaQuestion.DRAFT)})
    if action == "delete":
        n = qs.count()
        qs.delete()
        return Response({"deleted": n})
    return Response({"error": "Unknown action."}, status=400)


# ── CSV import ───────────────────────────────────────────────
IMPORT_COLUMNS = ["category", "type", "difficulty", "question", "option_a", "option_b", "option_c",
                  "option_d", "option_e", "option_f", "correct", "explanation", "source", "teaser",
                  "time_limit", "min_grade", "max_grade"]


@api_view(["POST"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def import_csv(request):
    f = request.FILES.get("file")
    if not f:
        return Response({"error": "Attach a CSV file."}, status=400)
    publish = _bool(request.data.get("publish", ""))
    try:
        text = f.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return Response({"error": "Save the file as CSV UTF-8 and try again."}, status=400)
    reader = csv.DictReader(io.StringIO(text))
    cols = [c.strip().lower() for c in (reader.fieldnames or [])]
    missing = [c for c in ("category", "type", "question", "correct") if c not in cols]
    if missing:
        return Response({"error": "Missing columns: " + ", ".join(missing)}, status=400)

    cats = {c.name.lower(): c for c in TriviaCategory.objects.all()}
    cats.update({c.slug.lower(): c for c in cats.values()})
    seen = set(TriviaQuestion.objects.values_list("fingerprint", flat=True))
    report = {"imported": 0, "errors": [], "duplicates": [], "warnings": []}
    for n, raw in enumerate(reader, start=2):                   # row 1 is the header
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        if not any(row.values()):
            continue
        label = f"Row {n}"
        cat = cats.get(row.get("category", "").lower())
        if not cat:
            report["errors"].append(f"{label}: unknown category '{row.get('category')}'.")
            continue
        qtype = {"multiple choice": "mcq", "mcq": "mcq", "true/false": "true_false", "true_false": "true_false",
                 "tf": "true_false", "picture": "picture", "short": "short", "short answer": "short",
                 "riddle": "short"}.get(row.get("type", "").lower())
        if not qtype:
            report["errors"].append(f"{label}: type must be mcq, true_false, picture or short.")
            continue
        options = [row.get(f"option_{x}", "") for x in "abcdef"]
        options = [o for o in options if o]
        correct = row.get("correct", "")
        data = {"category": cat.pk, "type": qtype, "difficulty": (row.get("difficulty") or "medium").lower(),
                "text": row.get("question", ""), "explanation": row.get("explanation", ""),
                "source": row.get("source", ""), "is_teaser": row.get("teaser", "") or (qtype == "short"),
                "time_limit": row.get("time_limit", ""), "min_grade": row.get("min_grade", ""),
                "max_grade": row.get("max_grade", ""),
                "status": "published" if (publish and qtype != "picture") else "draft"}
        if qtype == "true_false":
            data["correct_index"] = {"true": 0, "t": 0, "false": 1, "f": 1}.get(correct.lower())
        elif qtype == "short":
            data["accepted_answers"] = [a for a in correct.split("|") if a.strip()]
        else:
            data["options"] = options
            idx = LETTERS.find(correct.upper()[:1]) if len(correct) == 1 else -1
            if idx < 0:   # the answer written out in full
                idx = next((i for i, o in enumerate(options) if o.lower() == correct.lower()), -1)
            data["correct_index"] = idx if idx >= 0 else None
        if not data["text"]:
            report["errors"].append(f"{label}: the question is empty.")
            continue
        if not correct:
            report["errors"].append(f"{label}: no correct answer given.")
            continue
        fp = engine.fingerprint(data["text"])
        if fp in seen:
            report["duplicates"].append(f"{label}: '{data['text'][:70]}' is already in the bank - skipped.")
            continue
        q = TriviaQuestion(created_by=request.user)
        try:
            apply_question(q, data)
        except ValueError as e:
            report["errors"].append(f"{label}: {e}")
            continue
        q.save()
        seen.add(fp)
        report["imported"] += 1
        if qtype == "picture":
            report["warnings"].append(f"{label}: imported as a draft - upload its picture, then publish.")
        if not data["explanation"]:
            report["warnings"].append(f"{label}: no explanation - players learn more with one.")
    return Response(report)


# ── Achievements ─────────────────────────────────────────────

def _ach(a):
    return {"id": a.id, "code": a.code, "name": a.name, "description": a.description, "icon": a.icon,
            "condition": a.condition, "threshold": a.threshold, "category": a.category_id, "mode": a.mode,
            "xp_reward": a.xp_reward, "is_active": a.is_active, "order": a.order,
            "earned": getattr(a, "n", None)}


def _apply_ach(a, d):
    for f in ("name", "description", "icon", "condition", "mode"):
        if f in d:
            setattr(a, f, str(d[f] or "").strip())
    for f in ("threshold", "xp_reward", "order"):
        if f in d:
            setattr(a, f, max(0, _int_or_none(d[f]) or 0))
    if "category" in d:
        a.category_id = _int_or_none(d["category"])
    if "is_active" in d:
        a.is_active = _bool(d["is_active"])
    if not a.name or not a.description:
        raise ValueError("A badge needs a name and a description.")
    if a.condition not in dict(TriviaAchievement.CONDITIONS):
        raise ValueError("Choose how the badge is earned.")
    if a.condition == a.CATEGORY and not a.category_id:
        raise ValueError("Choose the category for this badge.")
    if a.condition == a.MODE and not a.mode:
        raise ValueError("Choose the game mode for this badge.")
    if not a.code:
        base = slugify(a.name)[:34] or "badge"
        code, i = base, 2
        while TriviaAchievement.objects.filter(code=code).exclude(pk=a.pk).exists():
            code, i = f"{base}-{i}", i + 1
        a.code = code


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def achievements(request):
    if request.method == "POST":
        a = TriviaAchievement()
        try:
            _apply_ach(a, request.data)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        a.save()
        return Response(_ach(a), status=201)
    return Response([_ach(a) for a in TriviaAchievement.objects.annotate(n=Count("earned_by")).order_by("order", "id")])


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def achievement_detail(request, pk):
    a = get_object_or_404(TriviaAchievement, pk=pk)
    if request.method == "DELETE":
        if a.earned_by.exists():
            return Response({"error": "Players have earned this badge - switch it off instead."}, status=409)
        a.delete()
        return Response(status=204)
    try:
        _apply_ach(a, request.data)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    a.save()
    return Response(_ach(a))


# ── Settings + daily challenge ───────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAdminUser])
def settings_view(request):
    if request.method == "PATCH":
        changes = {k: v for k, v in (request.data or {}).items() if k in DEFAULTS}
        cfg = save_config(changes)
    else:
        cfg = get_config()
    today = engine.local_today(cfg)
    ch = TriviaDailyChallenge.objects.filter(date=today).first()
    return Response({"config": cfg, "defaults": DEFAULTS, "today": today.isoformat(),
                     "today_challenge": {"questions": len(ch.question_ids)} if ch else None})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def daily_reset(request):
    """Re-pick today's questions - only while nobody has played them yet."""
    cfg = get_config()
    today = engine.local_today(cfg)
    if TriviaGame.objects.filter(mode=TriviaGame.DAILY, daily_date=today).exists():
        return Response({"error": "Players have already started today's challenge, so it stays as it is. "
                                  "Your settings apply from tomorrow."}, status=409)
    TriviaDailyChallenge.objects.filter(date=today).delete()
    try:
        ch = engine.daily_challenge(today, cfg)
    except engine.GameError as e:
        return Response({"error": str(e)}, status=e.status)
    return Response({"questions": len(ch.question_ids)})


# ── Analytics ────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics(request):
    cfg = get_config()
    finished = TriviaGame.objects.filter(status=TriviaGame.FINISHED)
    week_ago = timezone.now() - datetime.timedelta(days=7)
    agg = finished.aggregate(avg=Avg("score"), c=Sum("correct"), a=Sum("answered"))
    by_mode = list(finished.values("mode").annotate(n=Count("id")).order_by("-n"))
    by_cat = list(TriviaAnswer.objects.values("snapshot__category").annotate(n=Count("id"))
                  .order_by("-n")[:10])
    hardest = TriviaQuestion.objects.filter(times_answered__gte=5).annotate(
        rate=F("times_correct") * 100.0 / F("times_answered")).order_by("rate")[:10]
    today = engine.local_today(cfg)
    daily = []
    for i in range(13, -1, -1):
        d = today - datetime.timedelta(days=i)
        daily.append({"date": d.isoformat(),
                      "players": finished.filter(mode=TriviaGame.DAILY, daily_date=d).count()})
    badges = list(TriviaAchievement.objects.annotate(n=Count("earned_by")).values("name", "icon", "n")
                  .order_by("-n"))
    mode_names = {k: v for k, v in TriviaGame.MODES}
    return Response({
        "games": finished.count(),
        "players": TriviaProfile.objects.filter(games_played__gt=0).count(),
        "active_7d": finished.filter(finished_at__gte=week_ago).values("user").distinct().count(),
        "avg_score": round(agg["avg"] or 0),
        "accuracy": round(100 * (agg["c"] or 0) / agg["a"]) if agg["a"] else 0,
        "questions": {"published": TriviaQuestion.objects.filter(status="published").count(),
                      "draft": TriviaQuestion.objects.filter(status="draft").count()},
        "modes": [{"mode": mode_names.get(m["mode"], m["mode"]), "games": m["n"]} for m in by_mode],
        "categories": [{"category": c["snapshot__category"], "answers": c["n"]} for c in by_cat],
        "hardest": [{"id": q.id, "text": q.text[:120], "answered": q.times_answered,
                     "correct_rate": round(q.rate)} for q in hardest],
        "daily": daily,
        "badges": [{"name": b["name"], "icon": b["icon"], "earned": b["n"]} for b in badges],
        "badges_earned": TriviaPlayerAchievement.objects.count(),
    })
