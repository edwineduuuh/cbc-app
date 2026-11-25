"""Trivia settings: defaults here, admin changes in TriviaSettings.config.

get_config() deep-merges the admin's values over DEFAULTS, so a setting added
later works at once with its default and the admin can override it.
"""
import copy

DEFAULTS = {
    "timezone": "Africa/Nairobi",            # whose midnight starts a new Daily Challenge
    "timers": {"easy": 20, "medium": 15, "hard": 12, "expert": 12},
    "points": {"easy": 100, "medium": 200, "hard": 300, "expert": 500},
    "speed_bonus_max": 50,                    # extra points for an instant correct answer
    "xp": {"easy": 10, "medium": 15, "hard": 20, "expert": 30},
    "xp_daily_bonus": 50,                     # finishing the Daily Challenge
    "xp_daily_cap": 1500,                     # most XP one player can earn from answers per day
    "grace_seconds": 2,                       # network allowance on top of each timer
    "feedback_ms": 2200,                      # how long the answer + fact stay up
    "modes": {
        "quick":      {"enabled": True, "questions": 10},
        "daily":      {"enabled": True, "questions": 10, "difficulty": "mixed"},
        "picture":    {"enabled": True, "questions": 8},
        "true_false": {"enabled": True, "questions": 10},
        "teasers":    {"enabled": True, "questions": 8},
        "category":   {"enabled": True, "questions": 10},
        "survival":   {"enabled": True, "questions": 30},   # most a survival run can last
    },
    # Mixed games: share of each difficulty. Younger learners (grade <= 6) never get "expert".
    "mix": {"easy": 0.4, "medium": 0.35, "hard": 0.2, "expert": 0.05},
    "levels": [
        {"xp": 0, "name": "Curious Mind"},
        {"xp": 100, "name": "Explorer"},
        {"xp": 250, "name": "Thinker"},
        {"xp": 500, "name": "Knowledge Seeker"},
        {"xp": 900, "name": "Brain Challenger"},
        {"xp": 1400, "name": "Master Explorer"},
        {"xp": 2100, "name": "Genius in Training"},
        {"xp": 3000, "name": "Trivia Champion"},
        {"xp": 4200, "name": "Knowledge Master"},
        {"xp": 6000, "name": "Legend"},
    ],
    "streak_milestones": [3, 5, 10],
    # One-use helpers, earned by playing (never bought). "earn_streak": one more
    # each time a player reaches N in a row in a game; "earn_daily": one more for
    # finishing the Daily Challenge. "max": most a player can hold.
    "powerups": {
        "enabled": True,
        "in_daily": False,            # the Daily Challenge stays equal for everyone
        "per_game": 3,                # most power-ups one game can use
        "fifty":  {"enabled": True, "start": 1, "max": 3, "earn_streak": 5, "earn_daily": False},
        "time":   {"enabled": True, "start": 1, "max": 3, "earn_streak": 3, "earn_daily": False, "seconds": 10},
        "second": {"enabled": True, "start": 1, "max": 3, "earn_streak": 10, "earn_daily": True},
        "double": {"enabled": True, "start": 1, "max": 3, "earn_streak": 7, "earn_daily": False},
    },
    "leaderboards": {"enabled": True, "overall": True, "weekly": True, "daily": True, "category": True},
    # Most questions one player gets per day outside the Daily Challenge, so the
    # bank isn't played through in one sitting. 0 = no limit.
    "daily_questions": 50,
    "daily_questions_premium": 150,           # students with a paid subscription
    "avoid_repeat_last": 300,                  # skip a player's last N questions when the bank allows
}


def _merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def get_config() -> dict:
    from .models import TriviaSettings
    row = TriviaSettings.objects.first()
    return _merge(DEFAULTS, row.config if row else {})


def save_config(changes: dict) -> dict:
    """Store the admin's changes (merged onto what they changed before)."""
    from .models import TriviaSettings
    row = TriviaSettings.objects.first() or TriviaSettings()
    row.config = _merge(row.config or {}, changes or {})
    row.save()
    return get_config()


def level_for(xp: int, cfg=None) -> dict:
    levels = sorted((cfg or get_config())["levels"], key=lambda lv: lv["xp"])
    idx = 0
    for i, lv in enumerate(levels):
        if xp >= lv["xp"]:
            idx = i
    cur = levels[idx]
    nxt = levels[idx + 1] if idx + 1 < len(levels) else None
    span = (nxt["xp"] - cur["xp"]) if nxt else 1
    return {
        "level": idx + 1, "name": cur["name"], "xp": xp,
        "level_xp": cur["xp"], "next_xp": nxt["xp"] if nxt else None,
        "next_name": nxt["name"] if nxt else None,
        "progress": 1.0 if not nxt else round(min(1.0, (xp - cur["xp"]) / span), 3),
    }
