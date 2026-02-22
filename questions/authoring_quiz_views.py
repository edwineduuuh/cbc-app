from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Quiz, Subject, Topic, Question, ClassQuizAssignment  # ← ADD ClassQuizAssignment
from users.models import Classroom  # ← ADD THIS LINE
from .serializers import QuizDetailSerializer, QuizListSerializer, QuizCreateUpdateSerializer
from .permissions import IsAdminOrTeacher, IsTeacherUser

class QuizListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/quizzes/ - List all quizzes (with filters)
    POST /api/admin/quizzes/ - Create new quiz
    """
    permission_classes = [IsAdminOrTeacher]
    
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
    permission_classes = [IsAdminOrTeacher]
    queryset = Quiz.objects.all()
    
    def get_serializer_class(self):
        return QuizDetailSerializer


class QuizPublishView(generics.GenericAPIView):
    """
    POST /api/admin/quizzes/<id>/publish/
    Toggle quiz active status
    """
    permission_classes = [IsAdminOrTeacher]
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
    
class TeacherQuizLibraryView(generics.ListAPIView):
    """
    GET /api/teacher/quiz-library/ - Teachers browse admin-made quizzes
    """
    permission_classes = [IsTeacherUser]
    serializer_class = QuizListSerializer
    
    def get_queryset(self):
        return Quiz.objects.filter(
            available_to_teachers=True,
            is_active=True
        ).order_by('-created_at')
    

class AssignQuizToClassroomView(generics.CreateAPIView):
    """
    POST /api/teacher/assign-quiz/
    {
        "quiz_id": 123,
        "classroom_ids": [1, 2, 3],
        "deadline": "2026-03-01T23:59:00Z"
    }
    """
    permission_classes = [IsTeacherUser]
    
    def post(self, request):
        quiz_id = request.data.get('quiz_id')
        classroom_ids = request.data.get('classroom_ids', [])
        deadline = request.data.get('deadline')
        
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=404)
        
        assignments = []
        for classroom_id in classroom_ids:
            try:
                classroom = Classroom.objects.get(
                    id=classroom_id,
                    teacher=request.user,
                    is_active=True
                )
                assignment, created = ClassQuizAssignment.objects.get_or_create(
                    quiz=quiz,
                    classroom=classroom,
                    defaults={
                        'assigned_by': request.user,
                        'deadline': deadline
                    }
                )
                if created:
                    assignments.append(classroom.name)
            except Classroom.DoesNotExist:
                continue
        
        return Response({
            'message': f'Quiz assigned to: {", ".join(assignments)}',
            'assigned_count': len(assignments)
        })