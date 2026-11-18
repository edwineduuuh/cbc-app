from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Quiz, Subject, Topic, Question, ClassQuizAssignment  # ← ADD ClassQuizAssignment
from users.models import Classroom  # ← ADD THIS LINE
from .serializers import QuizDetailSerializer, QuizListSerializer, QuizCreateUpdateSerializer
from .permissions import IsContentStaff, IsTeacherUser

class QuizListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/quizzes/ - List all quizzes (with filters)
    POST /api/admin/quizzes/ - Create new quiz
    """
    permission_classes = [IsContentStaff]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuizCreateUpdateSerializer
        return QuizListSerializer
    
    def get_queryset(self):
        queryset = Quiz.objects.all()
        
        # Filters
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        
        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(grade=grade)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        print("=== RECEIVED DATA ===")
        print(self.request.data)
        
        # Get question_ids from request data BEFORE validation
        question_ids = self.request.data.get('question_ids', [])
        
        print(f"=== QUESTION IDS: {question_ids} ===")
        
        # Save quiz
        quiz = serializer.save(created_by=self.request.user)
        
        # FORCE attach questions
        if question_ids:
            quiz.questions.set(question_ids)
            quiz.save()
        
        print(f"=== QUIZ CREATED WITH {quiz.questions.count()} QUESTIONS ===")

class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/admin/quizzes/<id>/
    PUT    /api/admin/quizzes/<id>/
    DELETE /api/admin/quizzes/<id>/
    """
    permission_classes = [IsContentStaff]
    queryset = Quiz.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return QuizCreateUpdateSerializer
        return QuizDetailSerializer

    def perform_update(self, serializer):
        question_ids = self.request.data.get('question_ids')
        quiz = serializer.save()
        if question_ids is not None:
            quiz.questions.set(question_ids)
            quiz.save()


class QuizPublishView(generics.GenericAPIView):
    """
    POST /api/admin/quizzes/<id>/publish/
    Toggle quiz active status
    """
    permission_classes = [IsContentStaff]
    queryset = Quiz.objects.all()
    
    def post(self, request, pk):
        quiz = self.get_object()
        quiz.is_active = not quiz.is_active
        quiz.save()
        
        return Response({
            'id': quiz.id,
            'is_active': quiz.is_active,
            'message': f'Quiz {"published" if quiz.is_active else "unpublished"} successfully'
        })
    
    
