from django.contrib import admin

from .models import TriviaAchievement, TriviaCategory, TriviaGame, TriviaQuestion


@admin.register(TriviaCategory)
class TriviaCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "order", "is_active")
    list_editable = ("order", "is_active")


@admin.register(TriviaQuestion)
class TriviaQuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "category", "qtype", "difficulty", "status")
    list_filter = ("status", "qtype", "difficulty", "category")
    search_fields = ("text",)


@admin.register(TriviaAchievement)
class TriviaAchievementAdmin(admin.ModelAdmin):
    list_display = ("name", "condition", "threshold", "xp_reward", "is_active")


@admin.register(TriviaGame)
class TriviaGameAdmin(admin.ModelAdmin):
    list_display = ("user", "mode", "status", "score", "correct", "answered", "started_at")
    list_filter = ("mode", "status")
    raw_id_fields = ("user",)
