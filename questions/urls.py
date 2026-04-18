from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views
from .authoring_analytics_views import QuestionAnalyticsView, AISuggestionsView
from .admin_analytics_extended_views import (
    AdminUserStatsView,
    AdminUserListView,
    AdminRevenueStatsView,
    AdminQuizPerformanceView,
    AdminEngagementView,
)
from .authoring_quiz_views import (
    QuizListCreateView,
    QuizDetailView as AdminQuizDetailView,
    QuizPublishView,
    TeacherQuizLibraryView,
    AssignQuizToClassroomView,
)
from .authoring_sets_views import QuestionSetListCreateView, QuestionSetDetailView
from .authoring_views import (
    QuestionCreateView,
    QuestionListManageView,
    QuestionUpdateView,
    BulkQuestionImportView,
    AdminQuizLibraryView,
)
from .bulk_upload import BulkUploadView
from .views import (
    SubjectListView,
    TopicListView,
    QuizListView,
    QuizDetailView,
    AttemptListView,
    AttemptDetailView,
    AdminStatsView,
    QuestionGroupStatsView,
    TeacherAnalyticsView,
    submit_quiz,
    get_attempt_results,
    StudentAnalyticsView,
    TeacherClassroomAnalyticsView,
    TeacherQuizResultsView,
    SubscriptionPlanListView,
    SubscriptionStatusView,
    SubmitPaymentView,
    MyPaymentsView,
    AdminPaymentListView,
    AdminRejectPaymentView,
    AdminVerifyPaymentView,
    credits_status,
    start_guest_session,
    check_guest_quota,
    generate_quiz_questions,
)

urlpatterns = [
    # ── Public / Student ─────────────────────────────────────────
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('topics/', TopicListView.as_view(), name='topic-list'),
    path('quizzes/', QuizListView.as_view(), name='quiz-list'),
    path('quizzes/<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('quizzes/submit/', submit_quiz, name='submit_quiz'),
    path('attempts/', AttemptListView.as_view(), name='attempt-list'),
    path('attempts/<int:pk>/', AttemptDetailView.as_view(), name='attempt-detail'),
    path('attempts/<int:attempt_id>/', get_attempt_results, name='attempt_results'),

    # ── Guest Session ────────────────────────────────────────────
    path('guest/session/', start_guest_session, name='guest-session'),
    path('guest/quota/', check_guest_quota, name='guest-quota'),

    # ── Analytics ────────────────────────────────────────────────
    path('analytics/teacher/', TeacherAnalyticsView.as_view(), name='teacher-analytics'),
    path('analytics/student/', StudentAnalyticsView.as_view(), name='student-analytics'),

    # ── Credits & Subscription ───────────────────────────────────
    path('credits/status/', credits_status, name='credits_status'),
    path('plans/', SubscriptionPlanListView.as_view(), name='subscription-plans'),
    path('payments/submit/', SubmitPaymentView.as_view(), name='submit-payment'),
    path('payments/my/', MyPaymentsView.as_view(), name='my-payments'),
    path('payments/status/', SubscriptionStatusView.as_view(), name='subscription-status'),

    # ── Admin — Questions ─────────────────────────────────────────
    path('admin/questions/', QuestionListManageView.as_view(), name='admin-question-list'),
    path('admin/questions/create/', QuestionCreateView.as_view(), name='question-create'),
    path('admin/questions/manage/', QuestionListManageView.as_view(), name='question-manage'),
    path('admin/questions/stats/', QuestionGroupStatsView.as_view(), name='question-stats'),
    path('admin/questions/bulk-import/', BulkQuestionImportView.as_view(), name='bulk-import'),
    path('admin/questions/<int:pk>/', QuestionUpdateView.as_view(), name='question-update'),

    # ── Admin — Quizzes ───────────────────────────────────────────
    path('admin/quizzes/', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('admin/quizzes/<int:pk>/', AdminQuizDetailView.as_view(), name='admin-quiz-detail'),
    path('admin/quizzes/<int:pk>/publish/', QuizPublishView.as_view(), name='quiz-publish'),
    path('admin/quiz-library/', AdminQuizLibraryView.as_view(), name='admin-quiz-library'),

    # ── Admin — Stats & Analytics ─────────────────────────────────
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/analytics/questions/', QuestionAnalyticsView.as_view(), name='question-analytics'),
    path('admin/analytics/suggestions/', AISuggestionsView.as_view(), name='ai-suggestions'),
    path('admin/analytics/quizzes/', AdminQuizPerformanceView.as_view(), name='admin-quiz-performance'),
    path('admin/analytics/engagement/', AdminEngagementView.as_view(), name='admin-engagement'),
    path('admin/users/stats/', AdminUserStatsView.as_view(), name='admin-user-stats'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/revenue/stats/', AdminRevenueStatsView.as_view(), name='admin-revenue-stats'),

    # ── Admin — Question Sets ─────────────────────────────────────
    path('admin/question-sets/', QuestionSetListCreateView.as_view(), name='question-set-list'),
    path('admin/question-sets/<int:pk>/', QuestionSetDetailView.as_view(), name='question-set-detail'),

    # ── Admin — Payments ──────────────────────────────────────────
    path('admin/payments/', AdminPaymentListView.as_view(), name='admin-payments'),
    path('admin/payments/<int:pk>/verify/', AdminVerifyPaymentView.as_view(), name='admin-verify-payment'),
    path('admin/payments/<int:pk>/reject/', AdminRejectPaymentView.as_view(), name='admin-reject-payment'),

    # ── Admin — Bulk Upload ───────────────────────────────────────
    path('admin/bulk-upload/', BulkUploadView.as_view(), name='bulk_upload'),

    # ── Teacher ───────────────────────────────────────────────────
    path('teacher/quiz-library/', TeacherQuizLibraryView.as_view(), name='teacher-quiz-library'),
    path('teacher/assign-quiz/', AssignQuizToClassroomView.as_view(), name='assign-quiz'),
    path('teacher/classrooms/<int:pk>/analytics/', TeacherClassroomAnalyticsView.as_view(), name='teacher-classroom-analytics'),
    path('teacher/classrooms/<int:classroom_id>/quizzes/<int:quiz_id>/results/', TeacherQuizResultsView.as_view(), name='teacher-quiz-results'),

    # ── LESSON PLANS ──────────────────────────────────────────────
    path("lessons/", views.list_lesson_plans, name="lesson-list"),
    path("lessons/generate/", views.generate_lesson, name="lesson-generate"),
    path("lessons/generate-questions/", generate_quiz_questions, name="generate-quiz-questions"),
    path("lessons/<int:pk>/", views.lesson_plan_detail, name="lesson-detail"),

    # ── CLASSROOMS (teacher, requires auth) ──────────────────────
    path("classrooms/", views.classrooms, name="classroom-list"),
    path("classrooms/<int:pk>/", views.classroom_detail, name="classroom-detail"),
    path("classrooms/<int:pk>/start/", views.start_classroom, name="classroom-start"),
    path("classrooms/<int:pk>/end/", views.end_classroom, name="classroom-end"),
    path("classrooms/<int:pk>/next/", views.next_question, name="classroom-next"),
    path("classrooms/<int:pk>/report/", views.classroom_report, name="classroom-report"),
    path("classrooms/<int:classroom_id>/leaderboard/", views.leaderboard, name="classroom-leaderboard"),

    # ── STUDENT JOIN (no auth) ────────────────────────────────────
    path("join/<str:code>/", views.join_classroom, name="student-join"),
    path("join/<str:code>/register/", views.student_register, name="student-register"),

    # ── STUDENT ANSWERS (no auth) ─────────────────────────────────
    path("sessions/<int:session_id>/answer/", views.submit_answer, name="submit-answer"),
    path("sessions/<int:session_id>/results/", views.session_results, name="session-results"),

    # ── M-Pesa STK Push & Callback ──────────────────────────────
    path('payments/stk-push/', views.initiate_stk_push, name='stk-push'),
    path('payments/callback/', views.mpesa_callback, name='mpesa-callback'),
    path('payments/status/<int:payment_request_id>/', views.check_payment_status, name='check-payment-status'),

    # ── Free Trial Access Check ──────────────────────────────────
    path('quiz-access/', views.check_quiz_access, name='quiz-access'),
    path('quiz/<int:quiz_id>/start/', views.start_quiz_with_check, name='start-quiz-check'),

# ── Motivational Content ──────────────────────────────────────
path('motivational/', views.MotivationalContentListView.as_view(), name='motivational-content'),
path('admin/motivational/', views.MotivationalContentAdminListCreateView.as_view(), name='motivational-admin-list'),
path('admin/motivational/<int:pk>/', views.MotivationalContentAdminDetailView.as_view(), name='motivational-admin-detail'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)