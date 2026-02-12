from django.urls import path
from .views import (
    SubjectListView, TopicListView,
    QuizListView, QuizDetailView, SubmitQuizView,
    AttemptListView, AttemptDetailView
)
from .authoring_views import (
    QuestionCreateView, QuestionListManageView,
    QuestionUpdateView, BulkQuestionImportView
)

urlpatterns = [
    # Public endpoints
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('topics/', TopicListView.as_view(), name='topic-list'),
    path('quizzes/', QuizListView.as_view(), name='quiz-list'),
    path('quizzes/<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('quizzes/submit/', SubmitQuizView.as_view(), name='quiz-submit'),
    path('attempts/', AttemptListView.as_view(), name='attempt-list'),
    path('attempts/<int:pk>/', AttemptDetailView.as_view(), name='attempt-detail'),
    
    # Admin/Authoring endpoints
    path('admin/questions/create/', QuestionCreateView.as_view(), name='question-create'),
    path('admin/questions/manage/', QuestionListManageView.as_view(), name='question-manage'),
    path('admin/questions/<int:pk>/', QuestionUpdateView.as_view(), name='question-update'),
    path('admin/questions/bulk-import/', BulkQuestionImportView.as_view(), name='bulk-import'),
]