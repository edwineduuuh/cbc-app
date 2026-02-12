from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from .models import Subject, Topic, Question, Quiz, Attempt
from .serializers import (
    SubjectSerializer, TopicSerializer, QuestionSerializer,
    QuestionDetailSerializer,  # ADD THIS
    QuizListSerializer, QuizDetailSerializer, SubmitQuizSerializer,
    AttemptSerializer, AttemptDetailSerializer
)
# Create your views here.
class SubjectListView(generics.ListAPIView):
    """
    GET /api/subjects/
    List all subjects
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]

class TopicListView(generics.ListAPIView):
    """
    GET /api/topics/?subject=<subject_id>
    List topics, optionally filtered by subject
    """
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Topic.objects.all()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset
    
class QuizListView(generics.ListAPIView):
    """
    GET /api/quizzes/?subject=<id>&topic=<id>&grade=<num>
    List quizzes with optional filters
    """
    serializer_class = QuizListSerializer  # This is correct - doesn't include questions
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Quiz.objects.filter(is_active=True)
        
        # Filter by subject
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        # Filter by topic
        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        
        # Filter by grade
        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(grade=grade)
        
        return queryset


class QuizDetailView(generics.RetrieveAPIView):
    """
    GET /api/quizzes/<id>/
    Get quiz details with questions (but not answers)
    """
    queryset = Quiz.objects.filter(is_active=True)
    serializer_class = QuizDetailSerializer
    permission_classes = [IsAuthenticated]


class SubmitQuizView(APIView):
    """
    POST /api/quizzes/submit/
    Submit quiz answers and get score
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SubmitQuizSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        quiz_id = serializer.validated_data['quiz_id']
        answers = serializer.validated_data['answers']
        
        # Get quiz
        try:
            quiz = Quiz.objects.get(id=quiz_id, is_active=True)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create attempt
        attempt = Attempt.objects.create(
            quiz=quiz,
            student=request.user,
            answers=answers,
            status='completed',
            completed_at=timezone.now()
        )
        
        # Calculate score
        attempt.calculate_score()
        
        # Return result
        result_serializer = AttemptDetailSerializer(attempt)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class AttemptListView(generics.ListAPIView):
    """
    GET /api/attempts/
    List current user's quiz attempts
    """
    serializer_class = AttemptSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Attempt.objects.filter(student=self.request.user)


class AttemptDetailView(generics.RetrieveAPIView):
    """
    GET /api/attempts/<id>/
    Get detailed attempt with review
    """
    serializer_class = AttemptDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own attempts
        return Attempt.objects.filter(student=self.request.user)
    
class QuestionUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/DELETE /api/admin/questions/<id>/
    """
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Teachers can only edit/delete their own questions
        return Question.objects.filter(created_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': 'Question deleted successfully'},
            status=status.HTTP_200_OK
        )
    

