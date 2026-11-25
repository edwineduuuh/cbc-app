"""Player endpoints: /api/trivia/..."""
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from questions.permissions import is_platform_admin

from . import engine
from .config import get_config, level_for
from .models import (TriviaAchievement, TriviaAnswer, TriviaCategory, TriviaGame, TriviaPlayerAchievement,
                     TriviaProfile, TriviaQuestion)

MODE_INFO = {
    "quick": ("Quick Play", "Ten questions from anywhere. Pick a category or go random.", "⚡"),
    "daily": ("Daily Challenge", "The same questions for everyone today. One official try.", "📅"),
    "picture": ("Picture Trivia", "Look closely - what do you see?", "🖼️"),
    "true_false": ("True or False", "Fast calls. Fact or myth?", "✅"),
    "teasers": ("Brain Teasers", "Riddles, patterns and logic puzzles.", "🧩"),
    "category": ("Category Challenge", "Go deep on one subject.", "🎯"),
    "survival": ("Survival", "Keep going until you miss one. How far can you get?", "🔥"),
}


class CanPlay(BasePermission):
    """Trivia lives in the student portal; admins may play to check it."""
    message = "Trivia is part of the student portal."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (getattr(u, "role", "") == "student" or is_platform_admin(u)))


class TriviaThrottle(UserRateThrottle):
    scope = "trivia"


def _err(e: engine.GameError):
    return Response({"error": str(e)}, status=e.status)


def _own_game(request, pk):
    return get_object_or_404(TriviaGame, pk=pk, user=request.user)


def display_name(user) -> str:
    """Never an email, phone or admission number: first name + initial."""
    first = (user.first_name or "").strip().split(" ")[0]
    if first:
        last = (user.last_name or "").strip()[:1]
        return f"{first} {last}." if last else first
    name = (user.username or "").split("@")[0]
    if name and not any(ch.isdigit() for ch in name) and len(name) <= 20:
        return name
    return f"Player {user.pk}"


def _stats(user, prof, cfg):
    fav = (TriviaAnswer.objects.filter(game__user=user, is_correct=True)
           .values("snapshot__category").annotate(n=Count("id")).order_by("-n").first())
    return {
        "games_played": prof.games_played, "answered": prof.answered, "correct": prof.correct,
        "accuracy": round(100 * prof.correct / prof.answered) if prof.answered else 0,
        "xp": prof.xp, "best_score": prof.best_score, "best_streak": prof.best_streak,
        "current_streak": prof.current_streak, "best_survival": prof.best_survival,
        "daily_done": prof.daily_done,
        "favourite_category": fav["snapshot__category"] if fav else None,
        "badges": TriviaPlayerAchievement.objects.filter(user=user).count(),
        "badges_total": TriviaAchievement.objects.filter(is_active=True).count(),
        "level": level_for(prof.xp, cfg),
        "show_on_leaderboard": prof.show_on_leaderboard,
    }


def _powerups_home(prof, cfg):
    pc = cfg["powerups"]
    if not pc.get("enabled"):
        return None
    inv = engine.inventory(prof, cfg)
    out = []
    for k, (name, icon, desc) in engine.POWERUPS.items():
        rule = pc.get(k) or {}
        if not rule.get("enabled"):
            continue
        how = []
        if rule.get("earn_streak"):
            how.append(f"{rule['earn_streak']} in a row")
        if rule.get("earn_daily"):
            how.append("finish the Daily Challenge")
        out.append({"key": k, "name": name, "icon": icon, "description": desc, "have": inv[k],
                    "max": rule.get("max", 3), "earn": " or ".join(how) or None})
    return {"items": out, "per_game": pc.get("per_game", 3), "in_daily": bool(pc.get("in_daily"))}


@api_view(["GET"])
@permission_classes([CanPlay])
def home(request):
    cfg = get_config()
    user = request.user
    prof = engine.profile_for(user)
    published = TriviaQuestion.objects.filter(status=TriviaQuestion.PUBLISHED, category__is_active=True)
    counts = {
        "quick": published.count(), "daily": published.count(), "category": published.count(),
        "survival": published.count(),
        "picture": published.filter(qtype=TriviaQuestion.PICTURE).count(),
        "true_false": published.filter(qtype=TriviaQuestion.TRUE_FALSE).count(),
        "teasers": published.filter(is_teaser=True).count(),
    }
    modes = []
    for key, (name, desc, icon) in MODE_INFO.items():
        m = cfg["modes"].get(key) or {}
        if not m.get("enabled", True):
            continue
        modes.append({"key": key, "name": name, "description": desc, "icon": icon,
                      "questions": None if key == "survival" else m.get("questions"),
                      "available": counts.get(key, 0) > 0, "pool": counts.get(key, 0)})

    per_cat = dict(published.values_list("category").annotate(n=Count("id")))
    best_by_cat = dict(TriviaGame.objects.filter(user=user, status=TriviaGame.FINISHED, category__isnull=False)
                       .values_list("category").annotate(b=Sum("score")).order_by())
    categories = [{
        "id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "icon": c.icon,
        "image": engine.image_url(c.image, request), "color": c.color, "group": c.group,
        "questions": per_cat.get(c.id, 0), "your_points": best_by_cat.get(c.id, 0),
    } for c in TriviaCategory.objects.filter(is_active=True)]

    today = engine.local_today(cfg)
    dg = TriviaGame.objects.filter(user=user, mode=TriviaGame.DAILY, daily_date=today).first()
    daily = {
        "date": today.isoformat(), "enabled": cfg["modes"]["daily"].get("enabled", True),
        "questions": cfg["modes"]["daily"].get("questions"),
        "difficulty": cfg["modes"]["daily"].get("difficulty") or "mixed",
        "status": "not_started" if not dg else ("in_progress" if dg.status == TriviaGame.ACTIVE else "done"),
        "score": dg.score if dg else None, "correct": dg.correct if dg else None,
        "total": dg.total if dg else None, "game_id": dg.pk if dg else None,
        "available": counts["daily"] > 0,
    }
    recent = [{"id": g.pk, "mode": g.mode, "mode_label": MODE_INFO.get(g.mode, (g.mode,))[0],
               "score": g.score, "correct": g.correct, "total": g.total, "xp": g.xp_earned,
               "category": g.category.name if g.category_id else None,
               "finished_at": g.finished_at.isoformat() if g.finished_at else None}
              for g in TriviaGame.objects.filter(user=user, status=TriviaGame.FINISHED)
              .select_related("category")[:5]]
    return Response({
        "player": {"name": display_name(user), **_stats(user, prof, cfg)},
        "modes": modes, "categories": categories, "daily": daily, "recent": recent,
        "leaderboards": cfg["leaderboards"], "feedback_ms": cfg.get("feedback_ms", 2200),
        "powerups": _powerups_home(prof, cfg),
        "levels": cfg["levels"],
        "allowance": {"per_day": engine.daily_question_limit(user, cfg) or None,
                      "left": engine.questions_left_today(user, cfg)},
    })


@api_view(["POST"])
@permission_classes([CanPlay])
@throttle_classes([TriviaThrottle])
def start(request):
    d = request.data or {}
    try:
        game = engine.start_game(request.user, str(d.get("mode") or "quick"),
                                 category_id=d.get("category") or None,
                                 difficulty=str(d.get("difficulty") or "mixed"))
        q = engine.serve(game, request)
    except engine.GameError as e:
        return _err(e)
    game.refresh_from_db()
    return Response({"game": {"id": game.pk, "mode": game.mode, "total": game.total,
                              "mode_label": MODE_INFO.get(game.mode, (game.mode,))[0],
                              "category": game.category.name if game.category_id else None},
                     "question": q}, status=201)


@api_view(["GET"])
@permission_classes([CanPlay])
def question(request, pk):
    game = _own_game(request, pk)
    try:
        return Response(engine.serve(game, request))
    except engine.GameError as e:
        return _err(e)


@api_view(["POST"])
@permission_classes([CanPlay])
@throttle_classes([TriviaThrottle])
def answer(request, pk):
    game = _own_game(request, pk)
    d = request.data or {}
    try:
        position = int(d.get("position"))
    except (TypeError, ValueError):
        return Response({"error": "Which question is this answer for?"}, status=400)
    try:
        return Response(engine.submit(game, position, d.get("answer"), request))
    except engine.GameError as e:
        return _err(e)


@api_view(["POST"])
@permission_classes([CanPlay])
@throttle_classes([TriviaThrottle])
def powerup(request, pk):
    game = _own_game(request, pk)
    d = request.data or {}
    try:
        position = int(d.get("position"))
    except (TypeError, ValueError):
        return Response({"error": "Which question is this for?"}, status=400)
    try:
        return Response(engine.use_powerup(game, str(d.get("type") or ""), position))
    except engine.GameError as e:
        return _err(e)


@api_view(["POST"])
@permission_classes([CanPlay])
def finish(request, pk):
    game = _own_game(request, pk)
    abandon = bool((request.data or {}).get("abandon"))
    return Response(engine.finish(game, abandoned=abandon, request=request))


@api_view(["GET"])
@permission_classes([CanPlay])
def game_detail(request, pk):
    game = _own_game(request, pk)
    if game.status == TriviaGame.ACTIVE:
        return Response({"error": "Finish the game to review it."}, status=409)
    return Response(engine.results(game, request=request))


@api_view(["GET"])
@permission_classes([CanPlay])
def history(request):
    qs = TriviaGame.objects.filter(user=request.user, status=TriviaGame.FINISHED).select_related("category")
    page = max(1, int(request.query_params.get("page") or 1))
    size = 20
    rows = qs[(page - 1) * size: page * size]
    return Response({"count": qs.count(), "page": page, "results": [{
        "id": g.pk, "mode": g.mode, "mode_label": MODE_INFO.get(g.mode, (g.mode,))[0],
        "score": g.score, "correct": g.correct, "total": g.total, "xp": g.xp_earned,
        "category": g.category.name if g.category_id else None,
        "finished_at": g.finished_at.isoformat() if g.finished_at else None} for g in rows]})


@api_view(["GET"])
@permission_classes([CanPlay])
def achievements(request):
    earned = {b.achievement_id: b.earned_at for b in TriviaPlayerAchievement.objects.filter(user=request.user)}
    return Response([{
        "code": a.code, "name": a.name, "description": a.description, "icon": a.icon,
        "xp": a.xp_reward, "earned": a.pk in earned,
        "earned_at": earned[a.pk].isoformat() if a.pk in earned else None,
    } for a in TriviaAchievement.objects.filter(is_active=True)])


@api_view(["POST"])
@permission_classes([CanPlay])
def profile(request):
    prof = engine.profile_for(request.user)
    if "show_on_leaderboard" in (request.data or {}):
        prof.show_on_leaderboard = bool(request.data["show_on_leaderboard"])
        prof.save(update_fields=["show_on_leaderboard", "updated_at"])
    return Response({"show_on_leaderboard": prof.show_on_leaderboard})


def _rank_rows(pairs, me_id, user_map, limit=50):
    """pairs: [(user_id, value)] sorted best first."""
    rows, mine = [], None
    for i, (uid, val) in enumerate(pairs, start=1):
        if i <= limit:
            u = user_map.get(uid)
            rows.append({"rank": i, "name": display_name(u) if u else "Player",
                         "grade": getattr(u, "grade", None), "value": val, "you": uid == me_id})
        if uid == me_id:
            mine = {"rank": i, "value": val}
    return rows, mine


@api_view(["GET"])
@permission_classes([CanPlay])
def leaderboard(request):
    cfg = get_config()
    lb = cfg["leaderboards"]
    if not lb.get("enabled", True):
        return Response({"error": "Leaderboards are switched off."}, status=404)
    board = request.query_params.get("board") or "overall"
    if not lb.get(board, False):
        return Response({"error": "That leaderboard is switched off."}, status=404)
    hidden = set(TriviaProfile.objects.filter(show_on_leaderboard=False).values_list("user_id", flat=True))
    me = request.user.pk
    finished = TriviaGame.objects.filter(status=TriviaGame.FINISHED)
    title, unit = "", "XP"

    if board == "overall":
        pairs = list(TriviaProfile.objects.filter(xp__gt=0).order_by("-xp", "updated_at")
                     .values_list("user_id", "xp"))
        title = "All-time XP"
    elif board == "weekly":
        today = engine.local_today(cfg)
        monday = today.fromordinal(today.toordinal() - today.weekday())
        pairs = list(finished.filter(finished_at__gte=engine.local_day_start(monday, cfg))
                     .values("user_id").annotate(v=Sum("score")).order_by("-v")
                     .values_list("user_id", "v"))
        title, unit = "This week's points", "points"
    elif board == "daily":
        day = engine.local_today(cfg)
        pairs = list(finished.filter(mode=TriviaGame.DAILY, daily_date=day)
                     .order_by("-score", "finished_at").values_list("user_id", "score"))
        title, unit = "Today's Daily Challenge", "points"
    elif board == "category":
        cat = get_object_or_404(TriviaCategory, pk=request.query_params.get("category") or 0, is_active=True)
        pairs = list(TriviaAnswer.objects.filter(game__status=TriviaGame.FINISHED, is_correct=True,
                                                 snapshot__category_id=cat.pk)
                     .values("game__user_id").annotate(v=Sum("points")).order_by("-v")
                     .values_list("game__user_id", "v"))
        title, unit = f"{cat.name} points", "points"
    else:
        return Response({"error": "Unknown leaderboard."}, status=400)

    pairs = [(u, v) for u, v in pairs if u not in hidden or u == me]
    from django.contrib.auth import get_user_model
    ids = [u for u, _ in pairs[:50]] + [me]
    users = {u.pk: u for u in get_user_model().objects.filter(pk__in=ids)
             .only("id", "first_name", "last_name", "username", "grade")}
    rows, mine = _rank_rows(pairs, me, users)
    return Response({"board": board, "title": title, "unit": unit, "rows": rows, "you": mine,
                     "hidden": me in hidden})
