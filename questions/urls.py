from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.http import JsonResponse
from . import views
from . import facilitator_views
from .diagram_views import diagram_file


def health(request):
    """Lightweight keep-warm endpoint. Touches the DB with a trivial query so a
    cron ping keeps both the web service and the database connection warm,
    avoiding cold-start delays for users.

    It also reports which commit is actually serving and whether the pieces a
    generated paper depends on are present. Without this the only way to tell
    a deployed fix from an undeployed one was to generate a paper and look at
    it, which is slow, costs money, and sent us round in circles more than
    once. Booleans and counts only - never a key, never a value.
    """
    import os

    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        db = "ok"
    except Exception:
        db = "down"

    # Railway and Render both inject the deployed commit.
    commit = (os.environ.get("RAILWAY_GIT_COMMIT_SHA")
              or os.environ.get("RENDER_GIT_COMMIT") or "")

    diagrams = {}
    try:
        from .models import Diagram
        diagrams = {
            "table": True,
            "stored": Diagram.objects.count(),
            "can_draw": bool(getattr(settings, "OPENAI_API_KEY", "")),
        }
    except Exception as e:
        # The migration has not run, so the paper will show descriptions only.
        diagrams = {"table": False, "why": type(e).__name__}

    return JsonResponse({
        "status": "ok",
        "db": db,
        "commit": commit[:12],
        "debug": bool(settings.DEBUG),
        "generation": {
            "provider": getattr(settings, "GEN_PROVIDER", ""),
            "model": getattr(settings, "GEN_MODEL", "") or "(provider default)",
            "key": bool(getattr(settings, "OPENAI_API_KEY", "")),
        },
        "diagrams": diagrams,
        # Payment callbacks are only applied when one of these is set - see
        # mpesa_callback. Booleans only.
        "payments": {
            "intasend_api_token": bool(os.environ.get("INTASEND_API_TOKEN")),
            "intasend_challenge": bool(os.environ.get("INTASEND_CHALLENGE")),
        },
    })
from .authoring_analytics_views import QuestionAnalyticsView, AISuggestionsView
from .admin_analytics_extended_views import (
    AdminUserStatsView,
    AdminUserListView,
    AdminRevenueStatsView,
    AdminQuizPerformanceView,
    AdminEngagementView,
    AdminActiveUsersView,
    AdminStudentDetailView,
    AdminAttemptDetailView,
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
    AdminQuizExportView,
    PassageListCreateView,
    PassageDetailView,
)
from .bulk_upload import BulkUploadView
from .tutor_views import teach_topic, tutor_chat, flashcards_feed
from .live_views import (
    live_availability, my_live_bookings, create_live_booking,
    pay_live_booking, cancel_live_booking,
)
from .views import (
    SubjectListView,
    TopicListView,
    SubstrandListView,
    SubstrandManageView,
    SubstrandDetailView,
    TopicManageView,
    TopicDetailView,
    QuizListView,
    QuizDetailView,
    AttemptListView,
    AttemptDetailView,
    AdminStatsView,
    QuestionGroupStatsView,
    TeacherAnalyticsView,
    submit_quiz,
    grade_one,
    get_attempt_results,
    get_attempt_grading_status,
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
    admin_grading_health,
    admin_grading_health_clear,
    admin_grading_cost,
    admin_prematch_mode,
)

urlpatterns = [
    # ── Health / keep-warm ───────────────────────────────────────
    path('health/', health, name='health'),

    # ── Public / Student ─────────────────────────────────────────
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('topics/', TopicListView.as_view(), name='topic-list'),
    path('substrands/', SubstrandListView.as_view(), name='substrand-list'),
    path('admin/substrands/', SubstrandManageView.as_view(), name='substrand-manage'),
    path('admin/substrands/<int:pk>/', SubstrandDetailView.as_view(), name='substrand-detail'),
    path('admin/topics/', TopicManageView.as_view(), name='topic-manage'),
    path('admin/topics/<int:pk>/', TopicDetailView.as_view(), name='topic-detail'),
    path('quizzes/', QuizListView.as_view(), name='quiz-list'),
    path('quizzes/<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('quizzes/submit/', submit_quiz, name='submit_quiz'),
    path('quizzes/grade-one/', grade_one, name='grade_one'),
    path('attempts/', AttemptListView.as_view(), name='attempt-list'),
    path('attempts/<int:pk>/', AttemptDetailView.as_view(), name='attempt-detail'),
    # (A second 'attempts/<int:attempt_id>/' -> get_attempt_results was here.
    # Django matches the first pattern, so it could never be reached.)
    path('attempts/<int:attempt_id>/grading-status/', get_attempt_grading_status, name='attempt_grading_status'),

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

    # ── Admin - Questions ─────────────────────────────────────────
    path('admin/questions/', QuestionListManageView.as_view(), name='admin-question-list'),
    path('admin/questions/create/', QuestionCreateView.as_view(), name='question-create'),
    path('admin/questions/manage/', QuestionListManageView.as_view(), name='question-manage'),
    path('admin/questions/stats/', QuestionGroupStatsView.as_view(), name='question-stats'),
    path('admin/questions/bulk-import/', BulkQuestionImportView.as_view(), name='bulk-import'),
    path('admin/questions/<int:pk>/', QuestionUpdateView.as_view(), name='question-update'),

    # ── Admin - Quizzes ───────────────────────────────────────────
    path('admin/quizzes/', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('admin/quizzes/<int:pk>/', AdminQuizDetailView.as_view(), name='admin-quiz-detail'),
    path('admin/quizzes/<int:pk>/export/', AdminQuizExportView.as_view(), name='admin-quiz-export'),
    path('admin/quizzes/<int:pk>/publish/', QuizPublishView.as_view(), name='quiz-publish'),
    path('admin/quiz-library/', AdminQuizLibraryView.as_view(), name='admin-quiz-library'),

    # ── Admin - Stats & Analytics ─────────────────────────────────
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/analytics/questions/', QuestionAnalyticsView.as_view(), name='question-analytics'),
    path('admin/analytics/suggestions/', AISuggestionsView.as_view(), name='ai-suggestions'),
    path('admin/analytics/quizzes/', AdminQuizPerformanceView.as_view(), name='admin-quiz-performance'),
    path('admin/analytics/engagement/', AdminEngagementView.as_view(), name='admin-engagement'),
    path('admin/analytics/active-users/', AdminActiveUsersView.as_view(), name='admin-active-users'),
    path('admin/users/<int:user_id>/detail/', AdminStudentDetailView.as_view(), name='admin-student-detail'),
    path('admin/attempts/<int:attempt_id>/detail/', AdminAttemptDetailView.as_view(), name='admin-attempt-detail'),
    path('admin/users/stats/', AdminUserStatsView.as_view(), name='admin-user-stats'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/revenue/stats/', AdminRevenueStatsView.as_view(), name='admin-revenue-stats'),

    # ── Admin - Question Sets ─────────────────────────────────────
    path('admin/question-sets/', QuestionSetListCreateView.as_view(), name='question-set-list'),
    path('admin/question-sets/<int:pk>/', QuestionSetDetailView.as_view(), name='question-set-detail'),

    # ── Admin - Payments ──────────────────────────────────────────
    path('admin/grading-health/', admin_grading_health, name='admin-grading-health'),
    path('admin/grading-health/clear/', admin_grading_health_clear, name='admin-grading-health-clear'),
    path('admin/grading-cost/', admin_grading_cost, name='admin-grading-cost'),
    path('admin/prematch-mode/', admin_prematch_mode, name='admin-prematch-mode'),
    path('admin/payments/', AdminPaymentListView.as_view(), name='admin-payments'),
    path('admin/payments/<int:pk>/verify/', AdminVerifyPaymentView.as_view(), name='admin-verify-payment'),
    path('admin/payments/<int:pk>/reject/', AdminRejectPaymentView.as_view(), name='admin-reject-payment'),

    # ── Admin - Passages ──────────────────────────────────────────
    path('admin/passages/', PassageListCreateView.as_view(), name='passage-list'),
    path('admin/passages/<int:pk>/', PassageDetailView.as_view(), name='passage-detail'),

    # ── Admin - Bulk Upload ───────────────────────────────────────
    path('admin/bulk-upload/', BulkUploadView.as_view(), name='bulk_upload'),

    # ── Teacher ───────────────────────────────────────────────────
    path('teacher/quiz-library/', TeacherQuizLibraryView.as_view(), name='teacher-quiz-library'),
    path('teacher/assign-quiz/', AssignQuizToClassroomView.as_view(), name='assign-quiz'),
    path('teacher/classrooms/<int:pk>/analytics/', TeacherClassroomAnalyticsView.as_view(), name='teacher-classroom-analytics'),
    path('teacher/classrooms/<int:classroom_id>/quizzes/<int:quiz_id>/results/', TeacherQuizResultsView.as_view(), name='teacher-quiz-results'),

    # ── LESSON PLANS ──────────────────────────────────────────────
    path("lessons/generate-questions/", generate_quiz_questions, name="generate-quiz-questions"),

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

    # ── Admin Test ───────────────────────────────────────────────
    path('admin/test-notifications/', views.test_email_sms, name='test-notifications'),

    # ── Free Trial Access Check ──────────────────────────────────
    path('quiz-access/', views.check_quiz_access, name='quiz-access'),

# ── AI Tutor & Flash Cards ────────────────────────────────────
path('tutor/topics/<int:topic_id>/lesson/', teach_topic, name='tutor-teach-topic'),
path('tutor/chat/', tutor_chat, name='tutor-chat'),
path('flashcards/', flashcards_feed, name='flashcards-feed'),

# ── Live Lessons (group Zoom tuition) ─────────────────────────
path('live/availability/', live_availability, name='live-availability'),
path('live/bookings/', my_live_bookings, name='live-my-bookings'),
path('live/bookings/create/', create_live_booking, name='live-create-booking'),
path('live/bookings/<int:booking_id>/pay/', pay_live_booking, name='live-pay-booking'),
path('live/bookings/<int:booking_id>/cancel/', cancel_live_booking, name='live-cancel-booking'),

# ── Motivational Content ──────────────────────────────────────
path('motivational/', views.MotivationalContentListView.as_view(), name='motivational-content'),
path('admin/motivational/', views.MotivationalContentAdminListCreateView.as_view(), name='motivational-admin-list'),
path('admin/motivational/<int:pk>/', views.MotivationalContentAdminDetailView.as_view(), name='motivational-admin-detail'),

# ── Facilitators Portal (generated from the KICD curriculum designs) ──
path('facilitator/curriculum/', facilitator_views.curriculum_tree, name='facilitator-curriculum'),
path('facilitator/assessments/generate/', facilitator_views.generate_assessment_view, name='facilitator-generate-assessment'),
path('facilitator/library/', facilitator_views.my_library, name='facilitator-library'),
path('facilitator/library/<int:pk>/', facilitator_views.library_item, name='facilitator-library-item'),

    # Public on purpose - an <img> cannot carry a token. See diagram_views.
    # The extension is cosmetic: a drawn diagram is a PNG and a plotted one is
    # an SVG, and the response's own content type is what the browser uses.
    path('diagrams/<str:name>', diagram_file, name='diagram-file'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)