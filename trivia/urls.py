from django.urls import path

from . import admin_views, views

urlpatterns = [
    # Players
    path("trivia/home/", views.home, name="trivia-home"),
    path("trivia/games/", views.history, name="trivia-history"),
    path("trivia/games/start/", views.start, name="trivia-start"),
    path("trivia/games/<int:pk>/", views.game_detail, name="trivia-game"),
    path("trivia/games/<int:pk>/question/", views.question, name="trivia-question"),
    path("trivia/games/<int:pk>/answer/", views.answer, name="trivia-answer"),
    path("trivia/games/<int:pk>/finish/", views.finish, name="trivia-finish"),
    path("trivia/games/<int:pk>/powerup/", views.powerup, name="trivia-powerup"),
    path("trivia/achievements/", views.achievements, name="trivia-achievements"),
    path("trivia/leaderboard/", views.leaderboard, name="trivia-leaderboard"),
    path("trivia/profile/", views.profile, name="trivia-profile"),
    # Admin
    path("admin/trivia/categories/", admin_views.categories, name="trivia-admin-categories"),
    path("admin/trivia/categories/<int:pk>/", admin_views.category_detail, name="trivia-admin-category"),
    path("admin/trivia/questions/", admin_views.questions, name="trivia-admin-questions"),
    path("admin/trivia/questions/bulk/", admin_views.questions_bulk, name="trivia-admin-questions-bulk"),
    path("admin/trivia/questions/import/", admin_views.import_csv, name="trivia-admin-import"),
    path("admin/trivia/questions/<int:pk>/", admin_views.question_detail, name="trivia-admin-question"),
    path("admin/trivia/achievements/", admin_views.achievements, name="trivia-admin-achievements"),
    path("admin/trivia/achievements/<int:pk>/", admin_views.achievement_detail, name="trivia-admin-achievement"),
    path("admin/trivia/settings/", admin_views.settings_view, name="trivia-admin-settings"),
    path("admin/trivia/daily/reset/", admin_views.daily_reset, name="trivia-admin-daily-reset"),
    path("admin/trivia/analytics/", admin_views.analytics, name="trivia-admin-analytics"),
]
