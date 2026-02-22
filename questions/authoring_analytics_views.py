from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, FloatField, Q
from django.db.models.functions import Coalesce
from .models import Question, Attempt, Quiz
from .permissions import IsAdminOrTeacher

class QuestionAnalyticsView(generics.GenericAPIView):
    permission_classes = [IsAdminOrTeacher]
    
    def get(self, request):
        total = Question.objects.count()
        
        # Questions with low scores - correct path: quizzes__attempts
        high_miss = Question.objects.filter(
            quizzes__attempts__score__lt=40
        ).distinct().count()
        
        # Questions with high scores
        mastered = Question.objects.filter(
            quizzes__attempts__score__gt=80
        ).distinct().count()
        
        # Questions not in any quiz
        unused = Question.objects.filter(
            quizzes__isnull=True
        ).count()
        
        return Response({
            'total': total,
            'highMissRate': high_miss,
            'mastered': mastered,
            'unused': unused,
        })

class AISuggestionsView(generics.GenericAPIView):
    permission_classes = [IsAdminOrTeacher]
    
    def get(self, request):
        subject_id = request.query_params.get('subject')
        grade = request.query_params.get('grade')
        
        if not subject_id or not grade:
            return Response({
                'totalStudents': 0,
                'questions': []
            })
        
        # Get questions filtered by subject and grade
        questions = Question.objects.filter(
            topic__subject_id=subject_id,
            topic__grade=grade
        )
        
        # Annotate with attempt count and success rate - FIXED PATH
        questions = questions.annotate(
            attempt_count=Count('quizzes__attempts', distinct=True),
            avg_score=Coalesce(
                Avg('quizzes__attempts__score'), 
                0.0, 
                output_field=FloatField()
            )
        ).order_by('avg_score')[:5]
        
        suggestions = []
        for q in questions:
            miss_rate = 100 - q.avg_score if q.attempt_count > 0 else 0
            
            if miss_rate > 60:
                reason = f"{int(miss_rate)}% miss rate"
            elif q.attempt_count == 0:
                reason = "Never attempted"
            else:
                reason = "Students struggle with this topic"
            
            suggestions.append({
                'id': q.id,
                'text': q.question_text[:60] + ('...' if len(q.question_text) > 60 else ''),
                'reason': reason,
                'difficulty': q.difficulty,
                'topic': q.topic.name
            })
        
        # Count unique students - FIXED PATH
        total_students = Attempt.objects.filter(
            quiz__subject_id=subject_id,
            quiz__grade=grade
        ).values('student').distinct().count()
        
        return Response({
            'totalStudents': total_students,
            'questions': suggestions
        })