"""The Trivia game engine: picking questions, serving them, marking answers,
scoring, XP, streaks and badges. Every mode runs through these functions.

Trust rules: the server decides which question is on screen, when it was
served, the order its options were shown in, whether the answer was in time
and how many points it earned. The browser only says which option it chose.
"""
import datetime
import hashlib
import random
import re
import unicodedata
from zoneinfo import ZoneInfo

from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from django.utils import timezone

from .config import get_config, level_for
from .models import (TriviaAchievement, TriviaAnswer, TriviaCategory, TriviaDailyChallenge, TriviaGame,
                     TriviaPlayerAchievement, TriviaProfile, TriviaQuestion, TriviaXP)

DIFF_ORDER = {"easy": 0, "medium": 1, "hard": 2, "expert": 3}
FAST_MS = 5000


class GameError(Exception):
    """Something the player can be told plainly (bad mode, no questions, ...)."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


# ── Small helpers ────────────────────────────────────────────

def _norm(text: str) -> str:
    t = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    t = re.sub(r"\b(the|a|an)\b", " ", t)
    return " ".join(t.split())


def fingerprint(text: str) -> str:
    return hashlib.sha1(_norm(text).encode()).hexdigest()


def _tz(cfg=None):
    """The game's timezone. Kenya is UTC+3 all year, so if the server has no
    timezone database (some slim images don't) that is a safe stand-in."""
    name = (cfg or get_config()).get("timezone") or "Africa/Nairobi"
    try:
        return ZoneInfo(name)
    except Exception:
        return datetime.timezone(datetime.timedelta(hours=3), "EAT")


def local_today(cfg=None) -> datetime.date:
    return timezone.now().astimezone(_tz(cfg)).date()


def local_day_start(day: datetime.date, cfg=None) -> datetime.datetime:
    return datetime.datetime.combine(day, datetime.time.min, tzinfo=_tz(cfg))


def time_limit(q: TriviaQuestion, cfg) -> int:
    return int(q.time_limit or cfg["timers"].get(q.difficulty) or 15)


def profile_for(user) -> TriviaProfile:
    p, _ = TriviaProfile.objects.get_or_create(user=user)
    return p


def image_url(field, request=None):
    try:
        if not field:
            return None
        url = field.url
        return request.build_absolute_uri(url) if (request and url.startswith("/")) else url
    except Exception:
        return None


# ── Picking questions ────────────────────────────────────────

def _pool(mode, category=None, difficulty=None, grade=None):
    qs = TriviaQuestion.objects.filter(status=TriviaQuestion.PUBLISHED, category__is_active=True)
    if mode == TriviaGame.PICTURE:
        qs = qs.filter(qtype=TriviaQuestion.PICTURE)
    elif mode == TriviaGame.TRUE_FALSE:
        qs = qs.filter(qtype=TriviaQuestion.TRUE_FALSE)
    elif mode == TriviaGame.TEASERS:
        qs = qs.filter(is_teaser=True)
    if category is not None:
        qs = qs.filter(category=category)
    if difficulty and difficulty != "mixed":
        qs = qs.filter(difficulty=difficulty)
    if grade:
        qs = qs.exclude(min_grade__gt=grade).exclude(max_grade__lt=grade)
        if grade <= 6:
            qs = qs.exclude(difficulty="expert")
    return qs


def pick_questions(user, mode, n, *, category=None, difficulty="mixed", cfg=None, grade=None) -> list:
    """Up to n question ids for a game, avoiding this player's recent ones
    while the bank allows, and following the difficulty mix for mixed games."""
    cfg = cfg or get_config()
    rows = list(_pool(mode, category, difficulty, grade).values_list("id", "difficulty"))
    if not rows:
        return []
    recent = set()
    if user is not None:
        recent = set(TriviaAnswer.objects.filter(game__user=user)
                     .order_by("-answered_at")
                     .values_list("question_id", flat=True)[: cfg.get("avoid_repeat_last", 300)])
    random.shuffle(rows)
    fresh = [r for r in rows if r[0] not in recent]
    seen = [r for r in rows if r[0] in recent]
    ordered = fresh + seen                       # unseen first, repeats only to fill

    chosen = []
    if difficulty in (None, "", "mixed"):
        mix = cfg.get("mix") or {}
        for diff, share in mix.items():
            want = round(n * float(share))
            chosen += [r for r in ordered if r[1] == diff and r not in chosen][:want]
    taken = {r[0] for r in chosen}
    chosen += [r for r in ordered if r[0] not in taken][: max(0, n - len(chosen))]
    chosen = chosen[:n]
    if mode == TriviaGame.SURVIVAL:
        chosen.sort(key=lambda r: DIFF_ORDER.get(r[1], 1))   # survival gets harder as you go
    else:
        random.shuffle(chosen)
    return [r[0] for r in chosen]


def daily_challenge(day=None, cfg=None) -> TriviaDailyChallenge:
    """The day's shared questions, chosen once (the first time anyone asks)."""
    cfg = cfg or get_config()
    day = day or local_today(cfg)
    found = TriviaDailyChallenge.objects.filter(date=day).first()
    if found:
        return found
    m = cfg["modes"]["daily"]
    ids = pick_questions(None, TriviaGame.DAILY, int(m.get("questions") or 10),
                         difficulty=m.get("difficulty") or "mixed", cfg=cfg)
    if not ids:
        raise GameError("Today's challenge isn't ready yet - there are no trivia questions published.", 404)
    try:
        with transaction.atomic():
            return TriviaDailyChallenge.objects.create(date=day, question_ids=ids,
                                                       difficulty=m.get("difficulty") or "mixed")
    except IntegrityError:
        return TriviaDailyChallenge.objects.get(date=day)


# ── Starting, serving and answering ─────────────────────────

def start_game(user, mode, *, category_id=None, difficulty="mixed") -> TriviaGame:
    cfg = get_config()
    modes = cfg["modes"]
    if mode not in modes:
        raise GameError("That game mode doesn't exist.")
    if not modes[mode].get("enabled", True):
        raise GameError("That game mode is switched off right now.")
    if difficulty not in ("mixed", "easy", "medium", "hard", "expert"):
        difficulty = "mixed"
    category = None
    if category_id:
        category = TriviaCategory.objects.filter(pk=category_id, is_active=True).first()
        if category is None:
            raise GameError("That category isn't available.")
    if mode == TriviaGame.CATEGORY and category is None:
        raise GameError("Pick a category first.")

    # A game left open is closed before another starts (no XP for it).
    TriviaGame.objects.filter(user=user, status=TriviaGame.ACTIVE).exclude(mode=TriviaGame.DAILY) \
        .update(status=TriviaGame.ABANDONED, finished_at=timezone.now())

    n = int(modes[mode].get("questions") or 10)
    if mode == TriviaGame.DAILY:
        day = local_today(cfg)
        existing = TriviaGame.objects.filter(user=user, mode=TriviaGame.DAILY, daily_date=day).first()
        if existing:
            if existing.status == TriviaGame.ACTIVE:
                return existing                    # resume - the clock on the open question kept running
            raise GameError("You've already played today's challenge. A new one starts at midnight.", 409)
        ch = daily_challenge(day, cfg)
        try:
            with transaction.atomic():
                return TriviaGame.objects.create(user=user, mode=mode, difficulty=ch.difficulty,
                                                 daily_date=day, question_ids=list(ch.question_ids),
                                                 total=len(ch.question_ids))
        except IntegrityError:
            raise GameError("You've already played today's challenge.", 409)

    grade = getattr(user, "grade", None) if getattr(user, "role", "") == "student" else None
    ids = pick_questions(user, mode, n, category=category, difficulty=difficulty, cfg=cfg, grade=grade)
    if not ids:
        raise GameError("There are no questions for that choice yet. Try another category or difficulty.", 404)
    return TriviaGame.objects.create(
        user=user, mode=mode, category=category, difficulty=difficulty, question_ids=ids,
        total=None if mode == TriviaGame.SURVIVAL else len(ids))


def public_question(q: TriviaQuestion, order: list, position: int, game: TriviaGame, cfg, request=None):
    """What the player may see before answering: never the answer."""
    data = {
        "position": position,
        "mode": game.mode,
        "number": position + 1,
        "total": game.total,
        "type": q.qtype,
        "text": q.text,
        "category": {"id": q.category_id, "name": q.category.name, "icon": q.category.icon,
                     "color": q.category.color},
        "difficulty": q.difficulty,
        "time_limit": time_limit(q, cfg),
        "image": image_url(q.image, request),
        "image_alt": q.image_alt or "",
    }
    if q.qtype != TriviaQuestion.SHORT:
        data["options"] = [q.options[i] for i in order]
    return data


def serve(game: TriviaGame, request=None) -> dict:
    """The question now on screen; moves on when the current one is answered.
    Calling it twice without answering returns the same question and clock."""
    cfg = get_config()
    with transaction.atomic():
        game = TriviaGame.objects.select_for_update().get(pk=game.pk)
        if game.status != TriviaGame.ACTIVE:
            raise GameError("This game has ended.", 409)
        answered_current = game.current >= 0 and TriviaAnswer.objects.filter(
            game=game, position=game.current).exists()
        if game.current < 0 or answered_current:
            nxt = game.current + 1
            # Skip questions deleted or unpublished since the game was planned.
            while nxt < len(game.question_ids):
                q = TriviaQuestion.objects.select_related("category").filter(pk=game.question_ids[nxt]).first()
                if q and q.status == TriviaQuestion.PUBLISHED:
                    break
                nxt += 1
            else:
                q = None
            if q is None:
                if game.total is not None:
                    game.total = game.answered
                game.save(update_fields=["total"])
                return {"done": True}
            order = list(range(len(q.options or [])))
            if q.qtype in (TriviaQuestion.MCQ, TriviaQuestion.PICTURE):
                random.shuffle(order)               # true/false keeps True first
            game.current, game.served_at, game.shown_order = nxt, timezone.now(), order
            game.save(update_fields=["current", "served_at", "shown_order"])
        else:
            q = TriviaQuestion.objects.select_related("category").get(pk=game.question_ids[game.current])
        out = public_question(q, game.shown_order, game.current, game, cfg, request)
        elapsed = (timezone.now() - game.served_at).total_seconds()
        out["seconds_left"] = max(0, round(out["time_limit"] - elapsed, 1))
        out["score"], out["streak"] = game.score, game.streak
        return out


def _is_right(q: TriviaQuestion, given, order):
    """(correct?, what the player gave as text)."""
    if q.qtype == TriviaQuestion.SHORT:
        text = str(given or "")[:300]
        accepted = {_norm(a) for a in (q.accepted_answers or []) if str(a).strip()}
        return (_norm(text) in accepted and bool(text.strip())), text
    try:
        shown = int(given)
        original = order[shown]
    except (TypeError, ValueError, IndexError):
        return False, ""
    return original == q.correct_index, q.options[original]


def submit(game: TriviaGame, position: int, given, request=None) -> dict:
    """Mark the answer to the question on screen. `given` is the index of the
    option as shown (or typed text); None means the time ran out."""
    cfg = get_config()
    with transaction.atomic():
        game = TriviaGame.objects.select_for_update().get(pk=game.pk)
        if game.status != TriviaGame.ACTIVE:
            raise GameError("This game has ended.", 409)
        if position != game.current or game.served_at is None:
            raise GameError("That isn't the question on screen.", 409)
        if TriviaAnswer.objects.filter(game=game, position=position).exists():
            raise GameError("You've already answered this one.", 409)
        q = TriviaQuestion.objects.select_related("category").filter(pk=game.question_ids[position]).first()
        if q is None:
            raise GameError("This question was removed. Carry on to the next one.", 409)

        now = timezone.now()
        limit = time_limit(q, cfg)
        elapsed = (now - game.served_at).total_seconds()
        timed_out = given is None or elapsed > limit + float(cfg.get("grace_seconds", 2))
        right, given_text = (False, "") if given is None else _is_right(q, given, game.shown_order)
        correct = right and not timed_out
        points = 0
        if correct:
            points = int(cfg["points"].get(q.difficulty, 100))
            frac = max(0.0, 1.0 - min(elapsed, limit) / limit)
            points += round(int(cfg.get("speed_bonus_max", 0)) * frac)

        correct_text = (", ".join(q.accepted_answers[:1]) if q.qtype == TriviaQuestion.SHORT
                        else (q.options[q.correct_index] if q.correct_index is not None else ""))
        snapshot = {
            "text": q.text, "type": q.qtype, "difficulty": q.difficulty,
            "category_id": q.category_id, "category": q.category.name,
            "options": [q.options[i] for i in game.shown_order] if q.qtype != TriviaQuestion.SHORT else [],
            "correct": correct_text, "explanation": q.explanation,
            "image": image_url(q.image, request), "image_alt": q.image_alt,
        }
        TriviaAnswer.objects.create(game=game, question=q, position=position, snapshot=snapshot,
                                    given=given_text, is_correct=correct, timed_out=timed_out,
                                    points=points, ms=int(min(elapsed, 3600) * 1000))
        TriviaQuestion.objects.filter(pk=q.pk).update(
            times_answered=q.times_answered + 1, times_correct=q.times_correct + (1 if correct else 0))

        game.answered += 1
        game.score += points
        if correct:
            game.correct += 1
            game.streak += 1
            game.best_streak = max(game.best_streak, game.streak)
        else:
            game.streak = 0
        game.save(update_fields=["answered", "score", "correct", "streak", "best_streak"])

        prof = TriviaProfile.objects.select_for_update().get_or_create(user=game.user)[0]
        prof.answered += 1
        if correct:
            prof.correct += 1
            prof.current_streak += 1
            prof.best_streak = max(prof.best_streak, prof.current_streak)
        else:
            prof.current_streak = 0
        prof.save(update_fields=["answered", "correct", "current_streak", "best_streak", "updated_at"])

        shown_correct = None
        if q.qtype != TriviaQuestion.SHORT and q.correct_index is not None:
            shown_correct = game.shown_order.index(q.correct_index)
        last = game.total is not None and game.answered >= game.total
        survival_over = game.mode == TriviaGame.SURVIVAL and not correct
        out = {
            "correct": correct, "timed_out": timed_out, "points": points,
            "correct_index": shown_correct, "correct_answer": correct_text,
            "explanation": q.explanation, "score": game.score, "streak": game.streak,
            "milestone": game.streak if (correct and game.streak in cfg.get("streak_milestones", [])) else None,
            "answered": game.answered, "game_over": bool(last or survival_over),
            "feedback_ms": int(cfg.get("feedback_ms", 2200)),
        }
    if out["game_over"]:
        out["results"] = finish(game, request=request)
    return out


# ── Finishing: XP, records, badges ───────────────────────────

def _award(user, amount, reason, key, game=None) -> int:
    """Pay XP once per key. Returns what was actually paid."""
    if amount <= 0:
        return 0
    try:
        with transaction.atomic():
            TriviaXP.objects.create(user=user, amount=amount, reason=reason, key=key, game=game)
    except IntegrityError:
        return 0                                    # already paid
    TriviaProfile.objects.filter(user=user).update(xp=F("xp") + amount)
    return amount


def _xp_today(user, cfg) -> int:
    start = local_day_start(local_today(cfg), cfg)
    return TriviaXP.objects.filter(user=user, reason="answers", created_at__gte=start) \
        .aggregate(s=Sum("amount"))["s"] or 0


def _badge_met(a: TriviaAchievement, user, prof: TriviaProfile, game: TriviaGame, answers) -> bool:
    c, n = a.condition, a.threshold
    if c == a.GAMES:
        return prof.games_played >= n
    if c == a.PERFECT:
        return bool(game.total) and game.correct == game.total and game.total >= n
    if c == a.FAST:
        return sum(1 for x in answers if x.is_correct and x.ms < FAST_MS) >= n
    if c == a.CATEGORY:
        if not a.category_id:
            return False
        return TriviaAnswer.objects.filter(game__user=user, is_correct=True,
                                           snapshot__category_id=a.category_id).count() >= n
    if c == a.MODE:
        return bool(a.mode) and TriviaGame.objects.filter(
            user=user, mode=a.mode, status=TriviaGame.FINISHED).count() >= n
    if c == a.DAILY:
        return prof.daily_done >= n
    if c == a.SURVIVAL:
        return prof.best_survival >= n
    if c == a.STREAK:
        return prof.best_streak >= n
    if c == a.LEVEL:
        return level_for(prof.xp)["level"] >= n
    if c == a.COLLECTOR:
        return TriviaPlayerAchievement.objects.filter(user=user).count() >= n
    return False


def _check_badges(user, game, answers) -> list:
    new = []
    for _ in range(3):                              # collector/level badges can unlock each other
        prof = TriviaProfile.objects.get(user=user)
        have = set(TriviaPlayerAchievement.objects.filter(user=user).values_list("achievement_id", flat=True))
        found = False
        for a in TriviaAchievement.objects.filter(is_active=True).exclude(pk__in=have):
            if _badge_met(a, user, prof, game, answers):
                try:
                    with transaction.atomic():
                        TriviaPlayerAchievement.objects.create(user=user, achievement=a, game=game)
                except IntegrityError:
                    continue
                paid = _award(user, a.xp_reward, "badge", f"badge:{a.pk}:{user.pk}", game)
                new.append({"code": a.code, "name": a.name, "description": a.description,
                            "icon": a.icon, "xp": paid})
                found = True
        if not found:
            break
    return new


def finish(game: TriviaGame, *, abandoned=False, request=None) -> dict:
    """Close a game. Finished games earn XP and badges once; an abandoned
    quick game earns nothing (survival may be ended at any time and counts)."""
    cfg = get_config()
    user = game.user
    with transaction.atomic():
        game = TriviaGame.objects.select_for_update().get(pk=game.pk)
        first_close = game.status == TriviaGame.ACTIVE
        if first_close:
            ends_normally = (not abandoned) or game.mode == TriviaGame.SURVIVAL
            game.status = TriviaGame.FINISHED if (ends_normally and game.answered > 0) else TriviaGame.ABANDONED
            game.finished_at = timezone.now()
            if game.mode == TriviaGame.SURVIVAL:
                game.total = game.answered
            game.save(update_fields=["status", "finished_at", "total"])

    prof = profile_for(user)
    before = level_for(prof.xp, cfg)
    record, new_badges, xp_parts = {}, [], []
    answers = list(game.answers.all())

    if first_close and game.status == TriviaGame.FINISHED:
        with transaction.atomic():
            prof = TriviaProfile.objects.select_for_update().get(user=user)
            record = {
                "best_score": game.score > prof.best_score and game.score > 0,
                "best_survival": game.mode == TriviaGame.SURVIVAL and game.correct > prof.best_survival,
            }
            prof.games_played += 1
            prof.best_score = max(prof.best_score, game.score)
            if game.mode == TriviaGame.SURVIVAL:
                prof.best_survival = max(prof.best_survival, game.correct)
            if game.mode == TriviaGame.DAILY:
                prof.daily_done += 1
            prof.save()

        earned = sum(int(cfg["xp"].get(x.snapshot.get("difficulty"), 10)) for x in answers if x.is_correct)
        room = max(0, int(cfg.get("xp_daily_cap", 10 ** 9)) - _xp_today(user, cfg))
        paid = _award(user, min(earned, room), "answers", f"game:{game.pk}:answers", game)
        if paid:
            xp_parts.append({"label": "Correct answers", "xp": paid})
        if earned > room:
            xp_parts.append({"label": "Daily XP limit reached - play on for fun and records", "xp": 0})
        if game.mode == TriviaGame.DAILY:
            bonus = _award(user, int(cfg.get("xp_daily_bonus", 0)), "daily", f"game:{game.pk}:daily", game)
            if bonus:
                xp_parts.append({"label": "Daily Challenge complete", "xp": bonus})
        new_badges = _check_badges(user, game, answers)
        for b in new_badges:
            if b["xp"]:
                xp_parts.append({"label": f"Badge: {b['name']}", "xp": b["xp"]})
        total_xp = sum(p["xp"] for p in xp_parts)
        TriviaGame.objects.filter(pk=game.pk).update(xp_earned=total_xp)
        game.xp_earned = total_xp

    prof.refresh_from_db()
    after = level_for(prof.xp, cfg)
    return results(game, request=request, extra={
        "xp_breakdown": xp_parts, "new_badges": new_badges, "records": record,
        "level_before": before, "level": after, "level_up": after["level"] > before["level"],
    })


def results(game: TriviaGame, request=None, extra=None) -> dict:
    answers = list(game.answers.all())
    secs = sum(a.ms for a in answers) / 1000
    out = {
        "id": game.pk, "mode": game.mode, "mode_label": dict(TriviaGame.MODES).get(game.mode, game.mode),
        "status": game.status, "category": game.category.name if game.category_id else None,
        "difficulty": game.difficulty, "score": game.score, "correct": game.correct,
        "answered": game.answered, "wrong": game.answered - game.correct,
        "total": game.total if game.total is not None else game.answered,
        "accuracy": round(100 * game.correct / game.answered) if game.answered else 0,
        "seconds": round(secs, 1), "best_streak": game.best_streak, "xp_earned": game.xp_earned,
        "daily_date": game.daily_date.isoformat() if game.daily_date else None,
        "finished_at": game.finished_at.isoformat() if game.finished_at else None,
        "review": [{
            "number": a.position + 1, "text": a.snapshot.get("text"), "type": a.snapshot.get("type"),
            "category": a.snapshot.get("category"), "image": a.snapshot.get("image"),
            "image_alt": a.snapshot.get("image_alt"), "options": a.snapshot.get("options") or [],
            "your_answer": a.given, "correct_answer": a.snapshot.get("correct"),
            "is_correct": a.is_correct, "timed_out": a.timed_out, "points": a.points,
            "seconds": round(a.ms / 1000, 1), "explanation": a.snapshot.get("explanation"),
        } for a in answers],
    }
    if extra:
        out.update(extra)
    else:
        out["level"] = level_for(profile_for(game.user).xp)
    return out
