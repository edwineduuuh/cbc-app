"""StadiSpace Trivia - a game inside the student portal.

Deliberately separate from academic quizzes: its own questions, games, XP and
badges. Nothing here reads or writes quiz attempts, marks or progress.

Every number a player sees (score, XP, streaks, ranks) is computed on the
server from TriviaAnswer rows; the browser only ever sends "I chose option 2".
"""
from django.conf import settings
from django.db import models
from django.db.models import Q

from library.models import image_storage

EASY, MEDIUM, HARD, EXPERT = "easy", "medium", "hard", "expert"
DIFFICULTIES = [(EASY, "Easy"), (MEDIUM, "Medium"), (HARD, "Hard"), (EXPERT, "Expert")]


class TriviaCategory(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    description = models.CharField(max_length=200, blank=True, default="")
    # A short emoji shown on the card; an uploaded image wins when present.
    icon = models.CharField(max_length=8, blank=True, default="")
    image = models.ImageField(upload_to="trivia/categories/", storage=image_storage,
                              null=True, blank=True, max_length=300)
    color = models.CharField(max_length=9, default="#20B8A6", help_text="Card accent, e.g. #20B8A6")
    group = models.CharField(max_length=20, default="learn",
                             choices=[("learn", "Learn & Play"), ("fun", "Just for Fun")])
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "trivia_categories"
        ordering = ["order", "name"]
        verbose_name_plural = "trivia categories"

    def __str__(self):
        return self.name


class TriviaQuestion(models.Model):
    MCQ, TRUE_FALSE, PICTURE, SHORT = "mcq", "true_false", "picture", "short"
    TYPES = [(MCQ, "Multiple choice"), (TRUE_FALSE, "True or false"),
             (PICTURE, "Picture"), (SHORT, "Type the answer")]
    DRAFT, PUBLISHED = "draft", "published"
    STATUSES = [(DRAFT, "Draft"), (PUBLISHED, "Published")]

    category = models.ForeignKey(TriviaCategory, on_delete=models.PROTECT, related_name="questions")
    qtype = models.CharField(max_length=12, choices=TYPES, default=MCQ)
    difficulty = models.CharField(max_length=8, choices=DIFFICULTIES, default=MEDIUM, db_index=True)
    # Brain teasers are any question flagged as a teaser (riddles, logic, patterns).
    is_teaser = models.BooleanField(default=False)
    text = models.TextField()
    image = models.ImageField(upload_to="trivia/questions/", storage=image_storage,
                              null=True, blank=True, max_length=300)
    image_alt = models.CharField(max_length=200, blank=True, default="")
    # MCQ / picture: 2-6 choices. True/false: ["True", "False"].
    options = models.JSONField(default=list, blank=True)
    correct_index = models.IntegerField(null=True, blank=True)
    # Short answer: every accepted spelling.
    accepted_answers = models.JSONField(default=list, blank=True)
    explanation = models.TextField(blank=True, default="")
    source = models.CharField(max_length=300, blank=True, default="")
    time_limit = models.PositiveIntegerField(null=True, blank=True,
                                             help_text="Seconds; empty = the default for its difficulty")
    min_grade = models.PositiveIntegerField(null=True, blank=True)
    max_grade = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default=DRAFT, db_index=True)
    fingerprint = models.CharField(max_length=64, db_index=True, blank=True, default="")
    times_answered = models.PositiveIntegerField(default=0)
    times_correct = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trivia_questions"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "category", "difficulty"])]

    def __str__(self):
        return self.text[:60]


class TriviaSettings(models.Model):
    """One row. `config` holds only what the admin changed; trivia.config
    merges it over the defaults, so new settings never need a migration."""
    config = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trivia_settings"
        verbose_name_plural = "trivia settings"


class TriviaDailyChallenge(models.Model):
    date = models.DateField(unique=True)
    question_ids = models.JSONField(default=list)
    difficulty = models.CharField(max_length=8, default="mixed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trivia_daily_challenges"
        ordering = ["-date"]


class TriviaGame(models.Model):
    QUICK, DAILY, PICTURE, TRUE_FALSE, TEASERS, CATEGORY, SURVIVAL = (
        "quick", "daily", "picture", "true_false", "teasers", "category", "survival")
    MODES = [(QUICK, "Quick Play"), (DAILY, "Daily Challenge"), (PICTURE, "Picture Trivia"),
             (TRUE_FALSE, "True or False"), (TEASERS, "Brain Teasers"),
             (CATEGORY, "Category Challenge"), (SURVIVAL, "Survival")]
    ACTIVE, FINISHED, ABANDONED = "active", "finished", "abandoned"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trivia_games")
    mode = models.CharField(max_length=12, choices=MODES, db_index=True)
    category = models.ForeignKey(TriviaCategory, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="games")
    difficulty = models.CharField(max_length=8, default="mixed")
    status = models.CharField(max_length=10, default=ACTIVE, db_index=True)
    daily_date = models.DateField(null=True, blank=True, db_index=True)
    question_ids = models.JSONField(default=list)        # the planned order
    total = models.PositiveIntegerField(null=True, blank=True)   # null = survival (open-ended)
    # The question now on screen: its position, when it was served, and the
    # option order this player was shown (so "I chose 2" means the same thing
    # to the server as it did on screen).
    current = models.IntegerField(default=-1)
    served_at = models.DateTimeField(null=True, blank=True)
    shown_order = models.JSONField(default=list, blank=True)
    score = models.IntegerField(default=0)
    correct = models.PositiveIntegerField(default=0)
    answered = models.PositiveIntegerField(default=0)
    streak = models.PositiveIntegerField(default=0)
    best_streak = models.PositiveIntegerField(default=0)
    xp_earned = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "trivia_games"
        ordering = ["-started_at"]
        constraints = [
            # One official Daily Challenge per player per day.
            models.UniqueConstraint(fields=["user", "daily_date"], condition=Q(mode="daily"),
                                    name="trivia_one_daily_per_day"),
        ]
        indexes = [models.Index(fields=["user", "status"]), models.Index(fields=["mode", "finished_at"])]


class TriviaAnswer(models.Model):
    """One question in one game. `snapshot` keeps what the player saw, so a
    later edit or deletion of the question never changes an old review."""
    game = models.ForeignKey(TriviaGame, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(TriviaQuestion, null=True, on_delete=models.SET_NULL, related_name="answers")
    position = models.PositiveIntegerField()
    snapshot = models.JSONField(default=dict)
    given = models.CharField(max_length=300, blank=True, default="")
    is_correct = models.BooleanField(default=False)
    timed_out = models.BooleanField(default=False)
    points = models.IntegerField(default=0)
    ms = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trivia_answers"
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["game", "position"], name="trivia_one_answer_per_slot")]


class TriviaProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trivia")
    xp = models.PositiveIntegerField(default=0, db_index=True)
    games_played = models.PositiveIntegerField(default=0)
    answered = models.PositiveIntegerField(default=0)
    correct = models.PositiveIntegerField(default=0)
    best_score = models.PositiveIntegerField(default=0)
    best_streak = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    best_survival = models.PositiveIntegerField(default=0)
    daily_done = models.PositiveIntegerField(default=0)
    show_on_leaderboard = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trivia_profiles"


class TriviaAchievement(models.Model):
    GAMES, PERFECT, FAST, CATEGORY, MODE, DAILY, SURVIVAL, STREAK, COLLECTOR, LEVEL = (
        "games", "perfect", "fast", "category", "mode", "daily", "survival", "streak", "collector", "level")
    CONDITIONS = [
        (GAMES, "Games finished ≥ N"),
        (PERFECT, "A perfect round (all correct, at least N questions)"),
        (FAST, "N correct answers in one game, each under 5 seconds"),
        (CATEGORY, "Correct answers in a category ≥ N"),
        (MODE, "Games finished in a mode ≥ N"),
        (DAILY, "Daily Challenges completed ≥ N"),
        (SURVIVAL, "Survival run of N correct"),
        (STREAK, "N correct in a row"),
        (COLLECTOR, "Badges unlocked ≥ N"),
        (LEVEL, "Reach level N"),
    ]
    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=200)
    icon = models.CharField(max_length=8, default="🏅")
    condition = models.CharField(max_length=12, choices=CONDITIONS)
    threshold = models.PositiveIntegerField(default=1)
    category = models.ForeignKey(TriviaCategory, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="+")
    mode = models.CharField(max_length=12, blank=True, default="", choices=TriviaGame.MODES)
    xp_reward = models.PositiveIntegerField(default=50)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "trivia_achievements"
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class TriviaPlayerAchievement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trivia_badges")
    achievement = models.ForeignKey(TriviaAchievement, on_delete=models.CASCADE, related_name="earned_by")
    game = models.ForeignKey(TriviaGame, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trivia_player_achievements"
        constraints = [models.UniqueConstraint(fields=["user", "achievement"], name="trivia_badge_once")]


class TriviaXP(models.Model):
    """Every XP award, with a unique key so the same reward can never be paid twice."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trivia_xp")
    amount = models.PositiveIntegerField()
    reason = models.CharField(max_length=40)
    key = models.CharField(max_length=80, unique=True)     # e.g. "game:41:answers", "badge:7:3"
    game = models.ForeignKey(TriviaGame, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "trivia_xp"
        ordering = ["-created_at"]
