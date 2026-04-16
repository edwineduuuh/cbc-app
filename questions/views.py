from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from .models import (
    Subject, Topic, Question, Quiz, Attempt, Subscription,
    LessonPlan, LiveSession, LiveQuestion, StudentSession, StudentAnswer,
    SubscriptionPlan, PaymentRequest, ClassQuizAssignment, UserProfile
)
from users.models import Classroom as UsersClassroom
from django.contrib.auth import get_user_model
from .serializers import (
    SubjectSerializer, TopicSerializer, QuestionSerializer,
    QuestionDetailSerializer,
    QuizListSerializer, QuizDetailSerializer, SubmitQuizSerializer,
    AttemptSerializer, AttemptDetailSerializer, SubscriptionPlanSerializer, PaymentRequestSerializer,
    LessonPlanSerializer, ClassroomSerializer, LiveQuestionSerializer,
    StudentSessionSerializer, StudentAnswerSerializer, LeaderboardSerializer,
)
from .permissions import IsAdminUser, IsTeacherUser, IsAdminOrTeacher
from .ai_service import generate_lesson_plan, mark_open_answer, generate_student_report
import csv
import io
import json
import string
import random
from django.db import transaction

from questions.decorators import requires_subscription
User = get_user_model()

from datetime import timedelta

import re

def clean_correct_answer(text):
    if not text:
        return ""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^-{3,}$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\*?Answer:?\*?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^Step\s+\d+:.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
class AdminQuestionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # ADD THIS
    serializer_class = QuestionDetailSerializer
    queryset = Question.objects.all()

    def get_queryset(self):
        queryset = Question.objects.all().select_related('topic__subject')

        subject_id = self.request.query_params.get('subject')
        topic_id   = self.request.query_params.get('topic')
        grade      = self.request.query_params.get('grade')
        difficulty = self.request.query_params.get('difficulty')
        search     = self.request.query_params.get('search')

        if subject_id:
            queryset = queryset.filter(topic__subject_id=subject_id)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        if grade:
            queryset = queryset.filter(topic__grade=grade)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if search:
            queryset = queryset.filter(question_text__icontains=search)

        return queryset

    def perform_create(self, serializer):
        # Handle image upload on creation
        if 'question_image' in self.request.FILES:
            serializer.save(created_by=self.request.user, question_image=self.request.FILES['question_image'])
        else:
            serializer.save(created_by=self.request.user)


class AdminQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # ADD THIS
    serializer_class = QuestionDetailSerializer
    queryset = Question.objects.all()
    
    def perform_update(self, serializer):
        # Handle image deletion
        if self.request.data.get('delete_image') == 'true':
            instance = self.get_object()
            if instance.question_image:
                instance.question_image.delete(save=False)
            serializer.save(question_image=None)
        # Handle image upload
        elif 'question_image' in self.request.FILES:
            serializer.save(question_image=self.request.FILES['question_image'])
        else:
            serializer.save()


class AdminBulkImportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Download CSV templates"""
        template_type = request.query_params.get('template', 'mcq')
        
        if template_type == 'mcq':
            csv_content = (
                "subject_name,topic_name,grade,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty,max_marks\n"
                "Mathematics,Algebra,8,Solve: 2x + 5 = 15,x=5,x=10,x=15,x=20,A,Subtract 5 from both sides then divide by 2,medium,1\n"
                "Science,Physics,9,What is the SI unit of force?,Newton,Joule,Watt,Pascal,A,Force is measured in Newtons (N),easy,1"
            )
        else:  # structured/essay/math
            csv_content = (
                'subject_name,topic_name,grade,question_type,question_text,model_answer,marking_scheme,max_marks,difficulty,explanation\n'
                'Science,Plants,7,structured,"State 3 characteristics of metals","Hard, Good conductors, Dense","{""points"":[{""description"":""Physical property"",""marks"":1},{""description"":""Conductivity"",""marks"":1},{""description"":""Another property"",""marks"":1}]}",3,medium,"Metals have multiple distinguishing properties"\n'
                'Mathematics,Algebra,8,math,"Solve: 3x + 7 = 22","x = 5","{}",2,medium,"Subtract 7 from both sides then divide by 3"\n'
                'English,Composition,9,essay,"Write about your favorite season","[Essay answer]","{}",5,medium,"Full essay expected"'
            )
        
        response = Response(csv_content, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="template_{template_type}.csv"'
        return response

    def post(self, request):
        action = request.data.get('action', 'preview')  # 'preview' or 'confirm'
        
        if action == 'preview':
            # Extract and preview (don't save yet)
            file = request.FILES.get('file')
            subject_id = request.data.get('subject')
            grade = request.data.get('grade')
            
            if not file or not subject_id or not grade:
                return Response({'error': 'file, subject, and grade required'}, status=400)
            
            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist:
                return Response({'error': 'Subject not found'}, status=404)
            
            # Extract questions (don't save)
            from .bulk_upload import BulkExamUploader
            uploader = BulkExamUploader()
            
            text = uploader._extract_text_from_file(file)
            questions_data = uploader._parse_questions_with_ai(text, subject_id, grade)
            
            # Convert images to base64 for preview
            preview_questions = []
            for q in questions_data:
                q_preview = {**q}
                
                # Add base64 image if exists
                image_index = q.get('image_index')
                if image_index is not None and image_index < len(uploader.extracted_images):
                    img_data = uploader.extracted_images[image_index]
                    import base64
                    q_preview['image_base64'] = base64.b64encode(img_data['bytes']).decode('utf-8')
                    q_preview['image_ext'] = img_data['ext']
                
                preview_questions.append(q_preview)
            
            # Store in session or cache (for confirm step)
            request.session[f'preview_{subject_id}_{grade}'] = {
                'questions': questions_data,
                'images': [
                    {
                        'base64': base64.b64encode(img['bytes']).decode('utf-8'),
                        'ext': img['ext']
                    }
                    for img in uploader.extracted_images
                ]
            }
            
            return Response({
                'action': 'preview',
                'questions': preview_questions,
                'total': len(preview_questions)
            })
        
        elif action == 'confirm':
            # Save to database with modifications
            questions_data = request.data.get('questions', [])
            subject_id = request.data.get('subject')
            grade = request.data.get('grade')
            
            if not questions_data:
                return Response({'error': 'No questions to save'}, status=400)
            
            try:
                subject = Subject.objects.get(id=subject_id)
                topic, _ = Topic.objects.get_or_create(
                    subject=subject,
                    grade=grade,
                    name=f"Imported Questions - Grade {grade}",
                    defaults={'slug': f'imported-grade-{grade}'}
                )
            except Subject.DoesNotExist:
                return Response({'error': 'Subject not found'}, status=404)
            
            created_questions = []
            
            for q_data in questions_data:
                question = Question.objects.create(
                    topic=topic,
                    question_type=q_data.get('question_type', 'mcq'),
                    question_text=q_data.get('question_text', ''),
                    option_a=q_data.get('option_a', ''),
                    option_b=q_data.get('option_b', ''),
                    option_c=q_data.get('option_c', ''),
                    option_d=q_data.get('option_d', ''),
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    difficulty=q_data.get('difficulty', 'medium'),
                    max_marks=q_data.get('max_marks', 1),
                    created_by=request.user
                )
                
                # Handle image (base64 from frontend)
                if q_data.get('image_base64'):
                    import base64
                    from django.core.files.base import ContentFile
                    
                    image_data = base64.b64decode(q_data['image_base64'])
                    ext = q_data.get('image_ext', 'png')
                    question.question_image.save(
                        f'question_{question.id}.{ext}',
                        ContentFile(image_data),
                        save=True
                    )
                
                created_questions.append({
                    'id': question.id,
                    'question_text': question.question_text[:100],
                    'type': question.question_type,
                    'has_image': bool(question.question_image)
                })
            
            return Response({
                'action': 'confirmed',
                'questions_created': len(created_questions),
                'questions': created_questions
            }, status=201)

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count, Avg

        stats = {
            'total_questions': Question.objects.all().count(),
            'questions_by_subject': list(
                Question.objects.all()
                .values('topic__subject__name')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            'questions_by_grade': list(
                Question.objects.all()
                .values('topic__grade')
                .annotate(count=Count('id'))
                .order_by('topic__grade')
            ),
            'questions_by_difficulty': list(
                Question.objects.all()
                .values('difficulty')
                .annotate(count=Count('id'))
            ),
            'total_students': User.objects.filter(role='student').count(),
            'total_teachers': User.objects.filter(role='teacher').count(),
            'subscribed_students': User.objects.filter(role='student').count(),
            'total_quizzes': Quiz.objects.filter(is_active=True).count(),
            'total_attempts': Attempt.objects.filter(status='completed').count(),
            'average_score': Attempt.objects.filter(
                status='completed'
            ).aggregate(avg=Avg('score'))['avg'] or 0,
        }

        return Response(stats)


class SubjectListView(generics.ListAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        grade = self.request.query_params.get('grade')
        if grade:
            # Only return subjects that have at least one topic
            # with at least one question at this grade
            return Subject.objects.filter(
                topics__grade=grade,
                # topics__questions__isnull=False
            ).distinct()
        return Subject.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        grade = self.request.query_params.get('grade')
        if grade:
            context['grade'] = int(grade)
        return context



class TopicListView(generics.ListAPIView):
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Topic.objects.all()
        subject_id = self.request.query_params.get('subject')
        grade = self.request.query_params.get('grade')
        
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        if grade:
            queryset = queryset.filter(grade=grade)
        
        return queryset


class QuizListView(generics.ListAPIView):
    serializer_class = QuizListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Quiz.objects.filter(is_active=True)

        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(grade=grade)

        quiz_type = self.request.query_params.get('quiz_type')
        if quiz_type:
            queryset = queryset.filter(quiz_type=quiz_type)

        return queryset
    
    def get_serializer_context(self):
        """Pass request to serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class QuizDetailView(generics.RetrieveAPIView):
    queryset = Quiz.objects.filter(is_active=True)
    serializer_class = QuizDetailSerializer
    permission_classes = [AllowAny]
    # @requires_subscription


class AttemptListView(generics.ListAPIView):
    serializer_class = AttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Attempt.objects.filter(student=self.request.user).select_related('quiz', 'quiz__subject', 'student')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('-completed_at')


class AttemptDetailView(generics.RetrieveAPIView):
    serializer_class = AttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Attempt.objects.filter(student=self.request.user)


class QuestionUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Question.objects.filter(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'Question deleted successfully'}, status=status.HTTP_200_OK)


class QuestionGroupStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from datetime import timedelta
        from django.db.models import Count

        grouped = (
            Question.objects
            .values(
                'topic__subject__id',
                'topic__subject__name',
                'topic__subject__icon',
                'topic__grade',
            )
            .annotate(count=Count('id'))
            .order_by('topic__subject__name', 'topic__grade')
        )

        subjects = {}
        for row in grouped:
            sid = row['topic__subject__id']
            if sid not in subjects:
                subjects[sid] = {
                    'id':     sid,
                    'name':   row['topic__subject__name'],
                    'icon':   row['topic__subject__icon'],
                    'grades': []
                }
            subjects[sid]['grades'].append({
                'grade': row['topic__grade'],
                'count': row['count']
            })

        now = timezone.now()
        recent = {
            'today':        Question.objects.filter(created_at__date=now.date()).count(),
            'last_7_days':  Question.objects.filter(created_at__gte=now - timedelta(days=7)).count(),
            'last_30_days': Question.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            'total':        Question.objects.count(),
        }

        return Response({
            'by_subject': list(subjects.values()),
            'recent':     recent,
        })


class TeacherAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        stats = {
            'questions_created':   Question.objects.filter(created_by=user).count(),
            'quizzes_created':     Quiz.objects.filter(created_by=user).count(),
            'classes_created':     UsersClassroom.objects.filter(teacher=user, is_active=True).count(),
            'students_managed':    User.objects.filter(
                                       classrooms_enrolled__teacher=user,
                                       classrooms_enrolled__is_active=True
                                   ).distinct().count(),
            # New teacher panel fields
            'lesson_plans_created': LessonPlan.objects.filter(teacher=user).count(),
            'classrooms_created':   LiveSession.objects.filter(teacher=user).count(),
            'students_in_quizzes':  StudentSession.objects.filter(classroom__teacher=user).count(),
        }
        return Response(stats)


class TeacherClassroomAnalyticsView(APIView):
    """
    GET /api/teacher/classrooms/<id>/analytics/
    Detailed analytics for a specific classroom
    
    SECURITY: Verifies teacher owns the classroom
    PERFORMANCE: Uses optimized queries with annotations to avoid N+1
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.db.models import Avg, Count, Max, Min, Q, Prefetch
        
        # Security: Verify ownership with explicit error message
        try:
            classroom = UsersClassroom.objects.select_related('teacher').get(
                pk=pk, 
                teacher=request.user
            )
        except UsersClassroom.DoesNotExist:
            return Response(
                {'error': 'Classroom not found or access denied'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Optimized: Prefetch students with their attempt statistics
        students = classroom.students.annotate(
            total_attempts=Count('attempts', filter=Q(attempts__status='completed')),
            avg_score=Avg('attempts__score', filter=Q(attempts__status='completed')),
            total_quizzes=Count('attempts__quiz', distinct=True, filter=Q(attempts__status='completed')),
        ).order_by('-avg_score')

        student_ids = students.values_list('id', flat=True)

        # All completed attempts by students in this class
        attempts = Attempt.objects.filter(
            student_id__in=student_ids, status='completed'
        )

        # Assigned quizzes with prefetched data
        assignments = ClassQuizAssignment.objects.filter(
            classroom=classroom, is_active=True
        ).select_related('quiz').prefetch_related(
            Prefetch(
                'quiz__attempts',
                queryset=Attempt.objects.filter(
                    student_id__in=student_ids,
                    status='completed'
                ),
                to_attr='classroom_attempts'
            )
        )

        # Per-quiz breakdown (optimized)
        quiz_stats = []
        for assignment in assignments:
            quiz = assignment.quiz
            quiz_attempts = attempts.filter(quiz=quiz)
            completed_count = quiz_attempts.values('student').distinct().count()
            agg = quiz_attempts.aggregate(
                avg_score=Avg('score'),
                best_score=Max('score'),
                lowest_score=Min('score'),
            )
            quiz_stats.append({
                'quiz_id': quiz.id,
                'quiz_title': quiz.title,
                'deadline': assignment.deadline,
                'assigned_at': assignment.assigned_at,
                'total_students': students.count(),
                'completed_count': completed_count,
                'completion_rate': round(completed_count / max(students.count(), 1) * 100, 1),
                'avg_score': round(agg['avg_score'] or 0, 1),
                'best_score': round(agg['best_score'] or 0, 1),
                'lowest_score': round(agg['lowest_score'] or 0, 1),
            })

        # Per-student performance (optimized - uses annotations from above)
        student_stats = []
        for student in students:
            student_stats.append({
                'id': student.id,
                'username': student.username,
                'email': student.email,
                'quizzes_completed': student.total_quizzes or 0,
                'avg_score': round(student.avg_score or 0, 1),
                'current_streak': getattr(student, 'current_streak', 0),
                'total_attempts': student.total_attempts or 0,
            })

        # Already sorted by avg_score DESC due to order_by in query

        return Response({
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'join_code': classroom.join_code,
                'grade': classroom.grade,
                'total_students': students.count(),
            },
            'quiz_stats': quiz_stats,
            'leaderboard': student_stats,
            'overall': {
                'avg_score': round(attempts.aggregate(avg=Avg('score'))['avg'] or 0, 1),
                'total_attempts': attempts.count(),
                'quizzes_assigned': assignments.count(),
            }
        })


class TeacherQuizResultsView(APIView):
    """
    GET /api/teacher/classrooms/<classroom_id>/quizzes/<quiz_id>/results/
    Detailed per-student results for a specific quiz in a classroom
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, classroom_id, quiz_id):
        try:
            classroom = UsersClassroom.objects.get(pk=classroom_id, teacher=request.user)
        except UsersClassroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)

        try:
            quiz = Quiz.objects.get(pk=quiz_id)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=404)

        students = classroom.students.all()
        results = []
        for student in students:
            attempt = Attempt.objects.filter(
                student=student, quiz=quiz, status='completed'
            ).order_by('-completed_at').first()

            results.append({
                'student_id': student.id,
                'username': student.username,
                'attempted': attempt is not None,
                'score': round(attempt.score, 1) if attempt else None,
                'total_marks': attempt.total_marks_awarded if attempt else None,
                'max_marks': attempt.total_max_marks if attempt else None,
                'completed_at': attempt.completed_at if attempt else None,
                'correct_answers': attempt.correct_answers if attempt else None,
                'total_questions': attempt.total_questions if attempt else None,
            })

        results.sort(key=lambda r: r['score'] or 0, reverse=True)

        return Response({
            'quiz': {'id': quiz.id, 'title': quiz.title},
            'classroom': {'id': classroom.id, 'name': classroom.name},
            'total_students': students.count(),
            'completed_count': sum(1 for r in results if r['attempted']),
            'results': results,
        })
        
        # Build response with deadline info
        result = []
        for assignment in assignments:
            quiz_data = QuizDetailSerializer(assignment.quiz).data
            quiz_data['assigned_to'] = assignment.classroom.name
            quiz_data['deadline'] = assignment.deadline
            quiz_data['assigned_at'] = assignment.assigned_at
            result.append(quiz_data)
        
        return result


class SubmitQuizView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SubmitQuizSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        quiz_id = serializer.validated_data['quiz_id']
        answers = serializer.validated_data['answers']
        
        try:
            quiz = Quiz.objects.get(id=quiz_id, is_active=True)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=404)
        
        attempt = Attempt.objects.create(
            quiz=quiz,
            student=request.user,
            answers=answers,
            status='completed',
            completed_at=timezone.now()
        )
        # Update started_at if frontend provided it
        raw_started_at = request.data.get('started_at')
        if raw_started_at:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(raw_started_at)
            if parsed:
                Attempt.objects.filter(pk=attempt.pk).update(started_at=parsed)
        
        # Mark each question based on type
        total_score = 0
        total_possible = len(quiz.questions.all())
        question_results = []

        for question in quiz.questions.all():
            student_answer = answers.get(str(question.id), '')
            
            if question.question_type == 'mcq':
                is_correct = student_answer == question.correct_answer
                score = 1 if is_correct else 0
                feedback = 'Correct!' if is_correct else f'Correct answer is {question.correct_answer}'
                
            else:
                score = 0
                feedback = 'Not implemented'
            
            total_score += score
            question_results.append({
                'question_id': question.id,
                'correct': score >= 1,
                'score': score,
                'feedback': feedback
            })
        
        attempt.score = (total_score / total_possible) * 100 if total_possible > 0 else 0
        attempt.correct_answers = total_score
        attempt.total_questions = total_possible
        attempt.save()

        # Update streak
        request.user.update_streak()
        
        return Response({
            'id': attempt.id,
            'score': attempt.score,
            'correct_answers': attempt.correct_answers,
            'total_questions': attempt.total_questions,
            'question_results': question_results
        }, status=201)


class StudentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Avg, Max, Sum, F, ExpressionWrapper, DurationField
        from django.db.models.functions import TruncDate
        from datetime import timedelta
        from django.utils import timezone
        import datetime

        user = request.user
        attempts = Attempt.objects.filter(student=user, status='completed')

        # Unique quizzes attempted (distinct quiz_ids)
        unique_quizzes = attempts.values('quiz').distinct().count()

        # Total sessions including retakes
        total_sessions = attempts.count()

        avg_score = attempts.aggregate(avg=Avg('score'))['avg'] or 0
        best_score = attempts.aggregate(best=Max('score'))['best'] or 0

        # Total questions answered across all sessions
        total_questions_answered = attempts.aggregate(
            total=Sum('total_questions')
        )['total'] or 0

        # Best score per unique quiz
        from django.db.models import Max as DMax
        quiz_best_scores = (
            attempts
            .values('quiz')
            .annotate(best=DMax('score'))
        )

        # Perfect scores: quizzes where best score is 100%
        perfect_scores = sum(1 for q in quiz_best_scores if q['best'] >= 99.9)

        # Quizzes passed: best score >= 75%
        quizzes_passed = sum(1 for q in quiz_best_scores if q['best'] >= 75)

        # Study time: use DB aggregation for tracked durations, estimate for old data
        timed_attempts = attempts.filter(
            completed_at__isnull=False, started_at__isnull=False
        ).annotate(
            duration=ExpressionWrapper(
                F('completed_at') - F('started_at'), output_field=DurationField()
            )
        )
        # Sum real tracked durations (between 10s and 2h)
        tracked = timed_attempts.filter(
            duration__gt=timedelta(seconds=10),
            duration__lt=timedelta(hours=2)
        ).aggregate(total=Sum('duration'))['total'] or timedelta()
        # Estimate untracked: ~1.5 min per question
        untracked_questions = timed_attempts.exclude(
            duration__gt=timedelta(seconds=10),
            duration__lt=timedelta(hours=2)
        ).aggregate(total=Sum('total_questions'))['total'] or 0
        # Also count attempts with no timestamps
        no_time_questions = attempts.filter(
            completed_at__isnull=True
        ).aggregate(total=Sum('total_questions'))['total'] or 0
        estimated = timedelta(minutes=1.5 * (untracked_questions + no_time_questions))
        total_duration = tracked + estimated
        time_studied_hours = total_duration.total_seconds() / 3600

        # Current streak: consecutive days (up to today) with at least 1 completed attempt
        current_streak = 0
        attempt_dates = (
            attempts
            .filter(completed_at__isnull=False)
            .annotate(day=TruncDate('completed_at'))
            .values_list('day', flat=True)
            .distinct()
            .order_by('-day')
        )
        unique_days = sorted(set(d for d in attempt_dates if d), reverse=True)
        today = timezone.now().date()
        if unique_days:
            # Allow streak to start from today or yesterday
            expected = today
            if unique_days[0] == today or unique_days[0] == today - datetime.timedelta(days=1):
                expected = unique_days[0]
                for day in unique_days:
                    if day == expected:
                        current_streak += 1
                        expected -= datetime.timedelta(days=1)
                    elif day < expected:
                        break

        # Last active date
        last_active = None
        if unique_days:
            last_active = unique_days[0].isoformat()

        return Response({
            'quizzes_completed':       unique_quizzes,
            'total_sessions':          total_sessions,
            'total_retakes':           max(0, total_sessions - unique_quizzes),
            'total_questions_answered': total_questions_answered,
            'quizzes_passed':          quizzes_passed,
            'perfect_scores':          perfect_scores,
            'average_score':           round(avg_score, 1),
            'best_score':              round(best_score, 1),
            'time_studied_hours':      round(time_studied_hours, 2),
            'current_streak':          current_streak,
            'longest_streak':          getattr(user, 'longest_streak', current_streak),
            'last_active':             last_active,
        })
    
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai_grading import grade_answer
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import Quiz, Question, Attempt, GuestUsage
from .ai_grading import grade_answer
from .parallel_grading import grade_quiz_fast
from django.db import transaction
import uuid


# ============== GUEST SESSION TRACKING ==============


@api_view(['POST'])
@permission_classes([AllowAny])
def start_guest_session(request):
    """
    POST /api/guest/session/
    Creates guest session ID for tracking free quizzes
    """
    session_id = str(uuid.uuid4())
    GuestUsage.objects.create(session_id=session_id, quizzes_taken=0)
    
    return Response({
        'session_id': session_id,
        'quizzes_remaining': GuestUsage.GUEST_LIMIT
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def check_guest_quota(request):
    """
    GET /api/guest/quota/?session_id=xxx
    Check how many free quizzes guest has left
    """
    session_id = request.query_params.get('session_id')
    
    if not session_id:
        return Response({'error': 'session_id required'}, status=400)
    
    try:
        guest = GuestUsage.objects.get(session_id=session_id)
        taken = guest.quizzes_taken
    except GuestUsage.DoesNotExist:
        taken = 0
    
    remaining = max(0, GuestUsage.GUEST_LIMIT - taken)
    
    return Response({
        'quizzes_taken': taken,
        'quizzes_remaining': remaining,
        'can_take_quiz': remaining > 0
    })


# ============== QUIZ SUBMISSION (Guest + Authenticated) ==============

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow both guest and authenticated
def submit_quiz(request):
    """
    POST /api/quizzes/submit/
    
    Handles BOTH:
    - Guest users (with session_id in body)
    - Authenticated users (with credits system)
    
    Body: {
        "quiz_id": 1,
        "answers": {...},
        "session_id": "xxx"  // For guests only
    }
    """
    data = request.data
    quiz_id = data.get('quiz_id')
    answers = data.get('answers', {})
    session_id = data.get('session_id')  # For guests
    raw_started_at = data.get('started_at')  # ISO timestamp from frontend
    
    if not quiz_id:
        return Response({'error': 'quiz_id required'}, status=400)
    
    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)
    
    # ========== GUEST USER FLOW ==========
    if not request.user.is_authenticated:
        if not session_id:
            return Response({'error': 'session_id required for guests'}, status=400)
        
        # Atomic check and increment guest quota (prevents race conditions)
        from django.db.models import F
        
        with transaction.atomic():
            guest, created = GuestUsage.objects.select_for_update().get_or_create(
                session_id=session_id,
                defaults={'quizzes_taken': 0}
            )
            
            if guest.quizzes_taken >= GuestUsage.GUEST_LIMIT:
                return Response({
                    'error': 'Guest quota exceeded',
                    'message': 'Sign up to unlock 4 more free quizzes!',
                    'quota_exceeded': True,
                    'quizzes_taken': guest.quizzes_taken
                }, status=402)  # Payment Required
            
            # Increment immediately to prevent concurrent abuse
            GuestUsage.objects.filter(pk=guest.pk).update(
                quizzes_taken=F('quizzes_taken') + 1
            )
            guest.refresh_from_db()
        
        # Grade quiz for guest
        working_images_raw = data.get('working_images', {})
        questions = list(quiz.questions.all())
        # Map working images by question ID (support both ID and index lookups)
        working_images = {}
        for idx, q in enumerate(questions):
            img = working_images_raw.get(str(q.id)) or working_images_raw.get(str(idx))
            if img:
                working_images[str(q.id)] = img
        results = grade_quiz_fast(questions, answers, working_images=working_images)
        
        total_marks_awarded = sum(r['marks_awarded'] for r in results)
        total_max_marks = sum(r['max_marks'] for r in results)
        score_percentage = (total_marks_awarded / total_max_marks * 100) if total_max_marks > 0 else 0
        
        # Build feedback
        detailed_feedback = {}
        for question, result in zip(questions, results):
            display_correct = question.correct_answer
            display_student = answers.get(str(question.id), "")
            
            # If no text answer but working image provided, show that
            if not display_student and str(question.id) in working_images:
                display_student = "📸 Working image provided"
            
            if question.question_type == 'mcq':
                options_map = {
                    'A': question.option_a,
                    'B': question.option_b,
                    'C': question.option_c,
                    'D': question.option_d
                }
                correct_text = options_map.get(str(question.correct_answer).upper(), '')
                student_text = options_map.get(str(display_student).upper(), '')
                
                if correct_text:
                    display_correct = f"{question.correct_answer}: {correct_text}"
                if student_text:
                    display_student = f"{display_student.upper()}: {student_text}"
            
            detailed_feedback[str(question.id)] = {
                'question_text': question.question_text,
                'question_type': question.question_type,
                'option_a': question.option_a,
                'option_b': question.option_b,
                'option_c': question.option_c,
                'option_d': question.option_d,
                'student_answer': display_student,
                'marks_awarded': result['marks_awarded'],
                'max_marks': result['max_marks'],
                'feedback': result['feedback'],
                'is_correct': result['is_correct'],
                'correct_answer': clean_correct_answer(display_correct) if not result['is_correct'] else None,
                'explanation': question.explanation if not result['is_correct'] else None,
                'points_earned': result.get('points_earned', []),
                'points_missed': result.get('points_missed', []),
                'personalized_message': result.get('personalized_message', ''),
                'study_tip': result.get('study_tip', ''),
            }
        
        # Guest counter already incremented atomically above
        remaining = guest.remaining()
        
        return Response({
            'id': None,  # No saved attempt for guests
            'score': round(score_percentage, 1),
            'total_marks_awarded': total_marks_awarded,
            'total_max_marks': total_max_marks,
            'total_questions': len(questions),
            'correct_answers': sum(1 for r in results if r['is_correct']),
            'passed': score_percentage >= quiz.passing_score,
            'detailed_feedback': detailed_feedback,
            'results': [
                {
                    'question_id': q.id,
                    'marks_awarded': r['marks_awarded'],
                    'max_marks': r['max_marks'],
                    'is_correct': r['is_correct']
                }
                for q, r in zip(questions, results)
            ],
            'message': 'Quiz completed! ✅',
            
            # Guest quota info
            'is_guest': True,
            'guest_quizzes_taken': guest.quizzes_taken,
            'guest_quizzes_remaining': remaining,
            'show_signup_prompt': remaining == 0,
            
        }, status=200)
    
    # ========== AUTHENTICATED USER FLOW ==========
    else:
        # Check credits
        user = request.user
        credits = getattr(user, 'quiz_credits', 0)
        
        # Check subscription
        has_subscription = False
        try:
            from .models import Subscription
            subscription = Subscription.objects.get(user=user)
            has_subscription = subscription.is_valid
        except:
            pass
        
        if not has_subscription and credits <= 0:
            return Response({
                'error': 'No quiz credits remaining',
                'message': 'Subscribe to unlock unlimited quizzes!',
                'credits_exhausted': True,
                'redirect': '/student/payments'
            }, status=402)
        
# Grade quiz
        questions = list(quiz.questions.all())
        working_images_raw = data.get('working_images', {})
        # Map working images by question ID (support both ID and index lookups)
        working_images = {}
        for idx, q in enumerate(questions):
            img = working_images_raw.get(str(q.id)) or working_images_raw.get(str(idx))
            if img:
                working_images[str(q.id)] = img
        results = grade_quiz_fast(questions, answers, working_images=working_images)
        
        total_marks_awarded = sum(r['marks_awarded'] for r in results)
        total_max_marks = sum(r['max_marks'] for r in results)
        score_percentage = (total_marks_awarded / total_max_marks * 100) if total_max_marks > 0 else 0
        
        # Build feedback
        detailed_feedback = {}
        for question, result in zip(questions, results):
            display_correct = question.correct_answer
            display_student = answers.get(str(question.id), "")
            
            # If no text answer but working image provided, show that
            if not display_student and str(question.id) in working_images:
                display_student = "📸 Working image provided"
            
            if question.question_type == 'mcq':
                options_map = {
                    'A': question.option_a,
                    'B': question.option_b,
                    'C': question.option_c,
                    'D': question.option_d
                }
                correct_text = options_map.get(str(question.correct_answer).upper(), '')
                student_text = options_map.get(str(display_student).upper(), '')
                
                if correct_text:
                    display_correct = f"{question.correct_answer}: {correct_text}"
                if student_text:
                    display_student = f"{display_student.upper()}: {student_text}"
            
            detailed_feedback[str(question.id)] = {
                'question_text': question.question_text,
                'question_type': question.question_type,
                'option_a': question.option_a,
                'option_b': question.option_b,
                'option_c': question.option_c,
                'option_d': question.option_d,
                'student_answer': display_student,
                'marks_awarded': result['marks_awarded'],
                'max_marks': result['max_marks'],
                'feedback': result['feedback'],
                'is_correct': result['is_correct'],
                'correct_answer': clean_correct_answer(display_correct) if not result['is_correct'] else None,
                'explanation': question.explanation if not result['is_correct'] else None,
                'worked_solution': question.worked_solution,
                'points_earned': result.get('points_earned', []),
                'points_missed': result.get('points_missed', []),
                'personalized_message': result.get('personalized_message', ''),
                'study_tip': result.get('study_tip', ''),
            }
        
        # Save attempt
        # Parse the frontend-provided start time
        parsed_started_at = None
        if raw_started_at:
            from django.utils.dateparse import parse_datetime
            parsed_started_at = parse_datetime(raw_started_at)

        with transaction.atomic():
            attempt = Attempt.objects.create(
                student=user,
                quiz=quiz,
                score=score_percentage,
                total_questions=len(questions),
                correct_answers=sum(1 for r in results if r['is_correct']),
                total_marks_awarded=total_marks_awarded,
                total_max_marks=total_max_marks,
                status='completed',
                completed_at=timezone.now(),
                detailed_feedback=detailed_feedback,
                answers=answers
            )
            if parsed_started_at:
                Attempt.objects.filter(pk=attempt.pk).update(started_at=parsed_started_at)
            
            # Deduct credit (if not subscribed)
            if not has_subscription:
                    user.use_quiz_credit()

            # Update streak
            user.update_streak()
                        
        # Get updated credits
        new_credits = user.quiz_credits if not has_subscription else 'unlimited'
        
        return Response({
            'id': attempt.id,
            'score': round(score_percentage, 1),
            'total_marks_awarded': total_marks_awarded,
            'total_max_marks': total_max_marks,
            'total_questions': len(questions),
            'correct_answers': sum(1 for r in results if r['is_correct']),
            'passed': score_percentage >= quiz.passing_score,
            'results': [
                {
                    'question_id': q.id,
                    'marks_awarded': r['marks_awarded'],
                    'max_marks': r['max_marks'],
                    'is_correct': r['is_correct']
                }
                for q, r in zip(questions, results)
            ],
            'message': 'Quiz submitted successfully! ✅',
            
            # Credits info
            'is_guest': False,
            'quiz_credits': new_credits,
            'show_payment_prompt': new_credits == 0,
            
        }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credits_status(request):
    user = request.user

    # Check subscription first
    try:
        subscription = Subscription.objects.get(user=user)
        if subscription.is_valid:
            return Response({
                'has_access': True,
                'quiz_credits': 'unlimited',
                'has_subscription': True,
                'subscription_status': 'active',
                'subscription_plan': subscription.plan.name,
                'subscription_expires': subscription.end_date,
                'message': f'✨ {subscription.plan.name} - Unlimited access'
            })
    except Subscription.DoesNotExist:
        pass

    # Free quiz credits — from User model (single source of truth)
    credits = user.quiz_credits

    return Response({
        'has_access': credits > 0,
        'quiz_credits': credits,
        'has_subscription': False,
        'subscription_status': 'free_trial',
        'subscription_plan': None,
        'subscription_expires': None,
        'message': (
            f'🎓 {credits} free quiz{"zes" if credits != 1 else ""} remaining'
            if credits > 0
            else '💳 Subscribe to unlock unlimited quizzes'
        )
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attempt_results(request, attempt_id):
    """
    Get detailed results for an attempt
    
    GET /api/attempts/{attempt_id}/
    """
    
    try:
        attempt = Attempt.objects.get(id=attempt_id, student=request.user)
    except Attempt.DoesNotExist:
        return Response({'error': 'Attempt not found'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
    'id': attempt.id,
    'quiz_title': attempt.quiz.title,
    'score': attempt.score,
    'total_questions': attempt.total_questions,
    'correct_answers': attempt.correct_answers,
    'total_marks_awarded': attempt.total_marks_awarded,  # ADD
    'total_max_marks': attempt.total_max_marks,  # ADD
    'passed': attempt.score >= attempt.quiz.passing_score,
    'passing_score': attempt.quiz.passing_score,
    'completed_at': attempt.completed_at,
    'detailed_feedback': attempt.detailed_feedback or {},
    'quiz_id': attempt.quiz.id  # ADD - for "Try Again" button
})

# ─── Student Views ────────────────────────────────────────────

class SubscriptionPlanListView(generics.ListAPIView):
    """GET /api/plans/ — list active plans (public)"""
    permission_classes = [AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer


class SubmitPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id    = request.data.get('plan_id')
        mpesa_code = request.data.get('mpesa_code', '').strip().upper()
        phone      = request.data.get('phone_number', '').strip()
        amount     = request.data.get('amount_paid')

        if not all([plan_id, mpesa_code, phone, amount]):
            return Response({'error': 'All fields required'}, status=400)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found'}, status=404)

        if PaymentRequest.objects.filter(mpesa_code=mpesa_code).exists():
            return Response({'error': 'This M-Pesa code has already been submitted'}, status=400)

        PaymentRequest.objects.create(
            user=request.user,
            plan=plan,
            mpesa_code=mpesa_code,
            phone_number=phone,
            amount_paid=amount,
        )

        return Response({
            'message': 'Payment submitted! We will verify within 30 minutes.',
            'mpesa_code': mpesa_code,
            'status': 'pending',
        }, status=201)
class MyPaymentsView(generics.ListAPIView):
    """GET /api/payments/my/ — student's own payment history"""
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentRequestSerializer

    def get_queryset(self):
        return PaymentRequest.objects.filter(user=self.request.user)


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Check active subscription first
        try:
            sub = Subscription.objects.get(user=user)
            if sub.is_valid:
                return Response({
                    'status': 'subscribed',
                    'has_access': True,
                    'plan': sub.plan.name,
                    'end_date': sub.end_date,
                    'days_remaining': sub.days_remaining,
                    'trial': False,
                })
        except Exception:
            pass

        # Check free quiz credits
        credits = user.quiz_credits
        if credits > 0:
            return Response({
                'status': 'free_trial',
                'has_access': True,
                'plan': 'Free Trial',
                'quiz_credits': credits,
                'trial': True,
            })

        # No credits, no subscription
        return Response({
            'status': 'expired',
            'has_access': False,
            'plan': None,
            'quiz_credits': 0,
            'trial': False,
        })

# ─── Admin Views ──────────────────────────────────────────────

class AdminPaymentListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = PaymentRequestSerializer

    def get_queryset(self):
        qs = PaymentRequest.objects.all().select_related('user', 'plan')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
class AdminVerifyPaymentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            payment = PaymentRequest.objects.get(pk=pk)
        except PaymentRequest.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=404)

        if payment.status != 'pending':
            return Response({'error': f'Payment is already {payment.status}'}, status=400)

        subscription = payment.approve(admin_user=request.user)
        try:
            from .sms import send_payment_confirmation
            send_payment_confirmation(
                phone_number=payment.phone_number,
                username=payment.user.username,
                plan_name=payment.plan.name,
                days=payment.plan.duration_days,
    )
        except Exception as e:
            print(f"SMS error: {e}")
        return Response({
            'message': 'Payment verified. Subscription activated.',
            'subscription_expires': subscription.end_date,
        })


class AdminRejectPaymentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        reason = request.data.get('reason', '')
        try:
            payment = PaymentRequest.objects.get(pk=pk)
        except PaymentRequest.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=404)
        payment.reject(admin_user=request.user, reason=reason)
        return Response({'message': 'Payment rejected.'})
import random
import string
from datetime import datetime

from django.utils import timezone
from django.db.models import Avg, Count, Sum
from django.shortcuts import get_object_or_404

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────

def make_join_code(length=6):
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(chars, k=length))
        if not LiveSession.objects.filter(join_code=code).exists():
            return code


# ─────────────────────────────────────────────────────────────
#  LESSON PLANS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_lesson_plans(request):
    """GET /api/lessons/ — list teacher's lesson plans"""
    plans = LessonPlan.objects.filter(teacher=request.user).order_by("-created_at")
    # optional filters
    grade   = request.query_params.get("grade")
    subject = request.query_params.get("subject")
    term    = request.query_params.get("term")
    if grade:   plans = plans.filter(grade=grade)
    if subject: plans = plans.filter(subject=subject)
    if term:    plans = plans.filter(term=term)
    results = []
    for p in plans:
        results.append({
            "id": p.id,
            "plan": p.generated_plan,
            "meta": LessonPlanSerializer(p).data,
        })
    return Response(results)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_lesson(request):
    required = ["grade", "subject", "term", "week", "lesson_number", "strand", "duration"]  # ← CHANGED topic to strand
    for field in required:
        if not request.data.get(field):
            return Response({"error": f"'{field}' is required."}, status=400)

    plan_data = {
        "grade":          request.data["grade"],
        "subject":        request.data["subject"],
        "term":           request.data["term"],
        "week":           int(request.data["week"]),
        "lesson_number":  int(request.data["lesson_number"]),
        "strand":         request.data["strand"],  # ← CHANGED topic to strand
        "substrand":      request.data.get("substrand", ""),  # ← CHANGED subtopic to substrand
        "duration":       request.data["duration"],
        "learner_level":  request.data.get("learner_level", "Mixed ability"),
        "prior_knowledge":request.data.get("prior_knowledge", ""),
        "resources":      request.data.get("resources", ""),
        "is_practical":   bool(request.data.get("is_practical", False)),
        "practical_area": request.data.get("practical_area", ""),
    }

    plan = LessonPlan.objects.create(teacher=request.user, **plan_data)

    try:
        ai_output = generate_lesson_plan(plan_data)
        plan.generated_plan = ai_output
        plan.save()
        return Response({
            "id":   plan.id,
            "plan": ai_output,
            "meta": LessonPlanSerializer(plan).data,
        }, status=201)
    except Exception as e:
        plan.delete()
        return Response({"error": f"AI generation failed: {str(e)}"}, status=500)

@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def lesson_plan_detail(request, pk):
    """GET/DELETE /api/lessons/<pk>/"""
    plan = get_object_or_404(LessonPlan, pk=pk, teacher=request.user)
    if request.method == "DELETE":
        plan.delete()
        return Response(status=204)
    return Response({
        "id":   plan.id,
        "plan": plan.generated_plan,
        "meta": LessonPlanSerializer(plan).data,
    })


# ─────────────────────────────────────────────────────────────
#  CLASSROOMS
# ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def classrooms(request):
    """
    GET  /api/classrooms/        — list teacher's classrooms
    POST /api/classrooms/        — create new classroom + questions
    Body for POST:
    {
      "name": "...", "subject": "...", "grade": "...",
      "time_per_question": 30,
      "questions": [
        { "text":"...", "question_type":"mcq", "options":["A","B","C","D"],
          "correct_index":1, "points":10, "order":1 }
      ]
    }
    """
    if request.method == "GET":
        qs = LiveSession.objects.filter(teacher=request.user).prefetch_related("questions","sessions")
        return Response(ClassroomSerializer(qs, many=True).data)

    # POST — create classroom
    data = request.data
    required = ["name", "subject", "grade"]
    for f in required:
        if not data.get(f):
            return Response({"error": f"'{f}' is required."}, status=400)

    questions_data = data.get("questions", [])
    if not questions_data:
        return Response({"error": "At least one question is required."}, status=400)

    classroom = LiveSession.objects.create(
        teacher=request.user,
        name=data["name"],
        subject=data["subject"],
        grade=data["grade"],
        time_per_question=int(data.get("time_per_question", 30)),
        join_code=make_join_code(),
    )

    for i, qdata in enumerate(questions_data):
        LiveQuestion.objects.create(  # ← CORRECT MODEL
            classroom=classroom,
            order=qdata.get("order", i + 1),
            text=qdata["text"],
            question_type=qdata.get("question_type", "mcq"),
            options=qdata.get("options", []),
            correct_index=qdata.get("correct_index"),
            points=int(qdata.get("points", 10)),
        )

    return Response(ClassroomSerializer(classroom).data, status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def classroom_detail(request, pk):
    """GET/PATCH/DELETE /api/classrooms/<pk>/"""
    classroom = get_object_or_404(LiveSession, pk=pk, teacher=request.user)

    if request.method == "DELETE":
        classroom.delete()
        return Response(status=204)

    if request.method == "PATCH":
        for field in ["name", "status", "current_question_index"]:
            if field in request.data:
                setattr(classroom, field, request.data[field])
        if request.data.get("status") == "live" and not classroom.started_at:
            classroom.started_at = timezone.now()
        if request.data.get("status") == "ended" and not classroom.ended_at:
            classroom.ended_at = timezone.now()
        classroom.save()
        return Response(ClassroomSerializer(classroom).data)

    return Response(ClassroomSerializer(classroom).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_classroom(request, pk):
    """POST /api/classrooms/<pk>/start/ — set status to live"""
    classroom = get_object_or_404(LiveSession, pk=pk, teacher=request.user)
    classroom.status = "live"
    classroom.started_at = timezone.now()
    classroom.current_question_index = 0
    classroom.save()
    return Response({"status": "live", "join_code": classroom.join_code})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_classroom(request, pk):
    """POST /api/classrooms/<pk>/end/ — set status to ended, trigger AI reports"""
    classroom = get_object_or_404(LiveSession, pk=pk, teacher=request.user)
    classroom.status = "ended"
    classroom.ended_at = timezone.now()
    classroom.save()

    # Generate AI report summaries for every student session
    sessions = classroom.sessions.prefetch_related("answers__question").all()
    for session in sessions:
        wrong_qs = [
            a.question.text
            for a in session.answers.all()
            if a.is_correct is False
        ]
        total_points = classroom.questions.aggregate(t=Sum("points"))["t"] or 0
        try:
            report = generate_student_report(
                student_name=session.student_name,
                subject=classroom.subject,
                grade=classroom.grade,
                score=session.total_score,
                total=total_points,
                wrong_questions=wrong_qs[:6],   # limit to 6 for token budget
            )
            # Store as JSON on the session (add ai_report field — see migration note below)
            session.ai_report = report
            session.save(update_fields=["ai_report"])
        except Exception:
            pass    # don't fail if AI is down

    return Response({"status": "ended"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def next_question(request, pk):
    """POST /api/classrooms/<pk>/next/ — advance current_question_index"""
    classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
    total_qs = classroom.questions.count()
    if classroom.current_question_index + 1 >= total_qs:
        return Response({"error": "Already on last question."}, status=400)
    classroom.current_question_index += 1
    classroom.save()
    return Response({"current_question_index": classroom.current_question_index})


# ─────────────────────────────────────────────────────────────
#  STUDENT JOIN & ANSWER (no auth required)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def join_classroom(request, code):
    """
    GET /api/join/<code>/
    Returns classroom info + questions (without correct answers).
    Students use this to join by code — no auth needed.
    """
    classroom = get_object_or_404(Classroom, join_code=code.upper())
    if classroom.status == "ended":
        return Response({"error": "This quiz has ended."}, status=400)

    questions = []
    for q in classroom.questions.all():
        questions.append({
            "id":            q.id,
            "order":         q.order,
            "text":          q.text,
            "question_type": q.question_type,
            "options":       q.options,
            "points":        q.points,
            # Never expose correct_index to student
        })

    return Response({
        "classroom_id":     classroom.id,
        "name":             classroom.name,
        "subject":          classroom.subject,
        "grade":            classroom.grade,
        "time_per_question":classroom.time_per_question,
        "status":           classroom.status,
        "current_question_index": classroom.current_question_index,
        "questions":        questions,
    })


@api_view(["POST"])
def student_register(request, code):
    """
    POST /api/join/<code>/register/
    Body: { "student_name": "Amina" }
    Creates (or retrieves) a StudentSession and returns session_id.
    """
    classroom = get_object_or_404(Classroom, join_code=code.upper())
    if classroom.status == "ended":
        return Response({"error": "This quiz has ended."}, status=400)

    name = request.data.get("student_name", "").strip()
    if not name:
        return Response({"error": "student_name is required."}, status=400)

    session, created = StudentSession.objects.get_or_create(
        classroom=classroom,
        student_name=name,
    )
    return Response({
        "session_id":   session.id,
        "student_name": session.student_name,
        "classroom":    classroom.name,
        "created":      created,
    }, status=201 if created else 200)


@api_view(["POST"])
def submit_answer(request, session_id):
    """
    POST /api/sessions/<session_id>/answer/
    Body: { "question_id": int, "answer_text": "...", "selected_index": int|null }

    For MCQ/TF: marks instantly.
    For open-ended: calls Gemini AI to mark and give feedback.
    Updates session total_score.
    """
    session = get_object_or_404(StudentSession, pk=session_id)
    classroom = session.classroom

    if classroom.status == "ended":
        return Response({"error": "Quiz has ended."}, status=400)

    question_id   = request.data.get("question_id")
    answer_text   = request.data.get("answer_text", "")
    selected_index = request.data.get("selected_index")

    question = get_object_or_404(LiveQuestion, pk=question_id, classroom=classroom)

    # Prevent double-submission
    if StudentAnswer.objects.filter(session=session, question=question).exists():
        return Response({"error": "Already answered this question."}, status=400)

    is_correct     = None
    points_awarded = 0
    ai_feedback    = ""

    if question.question_type in ("mcq", "truefalse"):
        is_correct = (selected_index == question.correct_index)
        points_awarded = question.points if is_correct else 0

    elif question.question_type == "open":
        try:
            result = mark_open_answer(
                question_text=question.text,
                student_answer=answer_text,
                subject=classroom.subject,
                grade=classroom.grade,
                max_points=question.points,
                student_name=session.student_name,
            )
            points_awarded = result.get("score", 0)
            is_correct     = result.get("is_correct", False)
            ai_feedback    = result.get("feedback", "")
        except Exception as e:
            # Fallback — don't crash the student's session
            ai_feedback = "Your answer has been recorded and will be reviewed."

    answer = StudentAnswer.objects.create(
        session=session,
        question=question,
        answer_text=answer_text,
        selected_index=selected_index,
        is_correct=is_correct,
        points_awarded=points_awarded,
        ai_feedback=ai_feedback,
        marked_at=timezone.now(),
    )

    # Update session total
    session.total_score += points_awarded
    session.save(update_fields=["total_score"])

    return Response({
        "is_correct":     is_correct,
        "points_awarded": points_awarded,
        "ai_feedback":    ai_feedback,
        "correct_index":  question.correct_index,  # reveal after answering
        "total_score":    session.total_score,
    })


@api_view(["GET"])
def session_results(request, session_id):
    """GET /api/sessions/<session_id>/results/ — student's full result"""
    session = get_object_or_404(StudentSession, pk=session_id)
    return Response(StudentSessionSerializer(session).data)


# ─────────────────────────────────────────────────────────────
#  LEADERBOARD
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def leaderboard(request, classroom_id):
    """GET /api/classrooms/<classroom_id>/leaderboard/ — sorted by score"""
    classroom = get_object_or_404(Classroom, pk=classroom_id)
    sessions  = classroom.sessions.order_by("-total_score")
    return Response(LeaderboardSerializer(sessions, many=True).data)


# ─────────────────────────────────────────────────────────────
#  REPORTS (teacher view)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def classroom_report(request, pk):
    """
    GET /api/classrooms/<pk>/report/
    Full class report: all students, scores, question-level heatmap, AI insights.
    """
    classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
    questions = list(classroom.questions.values("id","order","text","points","question_type"))
    sessions  = classroom.sessions.prefetch_related("answers__question").order_by("-total_score")

    total_possible = sum(q["points"] for q in questions)
    class_avg = sessions.aggregate(a=Avg("total_score"))["a"] or 0

    students = []
    question_stats = {q["id"]: {"correct": 0, "total": 0} for q in questions}

    for session in sessions:
        answers_map = {a.question_id: a for a in session.answers.all()}
        row = {
            "session_id":   session.id,
            "student_name": session.student_name,
            "total_score":  session.total_score,
            "total_possible": total_possible,
            "percentage":   round((session.total_score / total_possible * 100)) if total_possible else 0,
            "ai_report":    getattr(session, "ai_report", None),
            "answers": [],
        }
        for q in questions:
            ans = answers_map.get(q["id"])
            question_stats[q["id"]]["total"] += 1
            if ans and ans.is_correct:
                question_stats[q["id"]]["correct"] += 1
            row["answers"].append({
                "question_id":  q["id"],
                "is_correct":   ans.is_correct if ans else None,
                "points_awarded": ans.points_awarded if ans else 0,
                "ai_feedback":  ans.ai_feedback if ans else "",
                "answer_text":  ans.answer_text if ans else "",
            })
        students.append(row)

    # Question difficulty (% correct)
    heatmap = []
    for q in questions:
        stats = question_stats[q["id"]]
        pct = round(stats["correct"] / stats["total"] * 100) if stats["total"] else 0
        heatmap.append({
            "question_id":   q["id"],
            "order":         q["order"],
            "text":          q["text"],
            "percent_correct": pct,
            "difficulty": "easy" if pct >= 70 else "medium" if pct >= 40 else "hard",
        })

    return Response({
        "classroom": {
            "id":      classroom.id,
            "name":    classroom.name,
            "subject": classroom.subject,
            "grade":   classroom.grade,
            "status":  classroom.status,
            "join_code": classroom.join_code,
        },
        "summary": {
            "total_students":  sessions.count(),
            "class_average":   round(class_avg),
            "total_possible":  total_possible,
            "class_percent":   round(class_avg / total_possible * 100) if total_possible else 0,
        },
        "students": students,
        "question_heatmap": heatmap,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_analytics(request):
    """GET /api/analytics/teacher/ — comprehensive dashboard stats"""
    teacher = request.user

    # Basic counts
    lesson_count = LessonPlan.objects.filter(teacher=teacher).count()
    classrooms = Classroom.objects.filter(teacher=teacher)
    classroom_count = classrooms.count()
    live_count = classrooms.filter(status="live").count()
    ended_count = classrooms.filter(status="ended").count()

    # Student sessions across all teacher's classrooms
    sessions = StudentSession.objects.filter(classroom__teacher=teacher)
    total_students = sessions.values("student_name").distinct().count()

    # Overall quiz performance
    answers = StudentAnswer.objects.filter(session__classroom__teacher=teacher)
    total_attempts = sessions.count()
    avg_score_data = sessions.aggregate(avg=Avg("total_score"))
    average_score = round(avg_score_data["avg"] or 0, 1)

    # Subject performance — average score per subject across classrooms
    subject_performance = []
    subject_classrooms = classrooms.filter(status="ended").values("subject").annotate(
        count=Count("id"),
    )
    for sc in subject_classrooms:
        subj = sc["subject"]
        subj_sessions = sessions.filter(classroom__subject=subj, classroom__status="ended")
        subj_avg = subj_sessions.aggregate(avg=Avg("total_score"))["avg"] or 0
        subject_performance.append({
            "subject": subj,
            "average_score": round(subj_avg, 1),
            "total_quizzes": sc["count"],
            "total_students": subj_sessions.values("student_name").distinct().count(),
        })

    # Top students — by total_score across all the teacher's ended classrooms
    top_students = list(
        sessions.filter(classroom__status="ended")
        .values("student_name")
        .annotate(
            avg_score=Avg("total_score"),
            quizzes_taken=Count("id"),
        )
        .order_by("-avg_score")[:10]
    )
    for s in top_students:
        s["avg_score"] = round(s["avg_score"], 1)

    # Struggling students — below average or bottom performers
    struggling_students = list(
        sessions.filter(classroom__status="ended")
        .values("student_name")
        .annotate(
            avg_score=Avg("total_score"),
            quizzes_taken=Count("id"),
        )
        .filter(avg_score__lt=average_score * 0.7 if average_score else 50)
        .order_by("avg_score")[:10]
    )
    for s in struggling_students:
        s["avg_score"] = round(s["avg_score"], 1)

    # Recent classrooms
    recent_classrooms = list(
        classrooms.order_by("-created_at")[:5].values(
            "id", "name", "subject", "grade", "status", "created_at"
        )
    )

    return Response({
        "lesson_plans_created": lesson_count,
        "classrooms_created": classroom_count,
        "classrooms_live": live_count,
        "quizzes_ended": ended_count,
        "total_students": total_students,
        "total_attempts": total_attempts,
        "average_score": average_score,
        "subject_performance": subject_performance,
        "top_students": top_students,
        "struggling_students": struggling_students,
        "recent_classrooms": recent_classrooms,
    })

@api_view(['POST'])
# @permission_classes([IsAuthenticated])
def generate_quiz_questions(request):
    """
    POST /api/lessons/generate-questions/
    Generate quiz questions with AI for Kahoot-style classrooms
    Body: { grade, subject, topic, count }
    """
    from .ai_service import _get_gemini, GEMINI_MODEL, parse_ai_json
    
    grade = request.data.get('grade', 'Grade 7')
    subject = request.data.get('subject', 'Mathematics')
    topic = request.data.get('topic', '')
    count = int(request.data.get('count', 5))
    
    if not topic:
        return Response({'error': 'Topic is required'}, status=400)
    
    prompt = f"""Generate {count} multiple-choice quiz questions for a {grade} {subject} quiz on: {topic}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "text": "Question text?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 2,
      "points": 10
    }}
  ]
}}

Make questions appropriate for {grade} level."""

    try:
        response = _get_gemini().models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        
        result = parse_ai_json(response.text)
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════
# M-PESA STK PUSH & FREE TRIAL
# ═══════════════════════════════════════════════════════════════

import logging
from django.views.decorators.csrf import csrf_exempt
from .mpesa_api import MpesaAPI

mpesa_logger = logging.getLogger('mpesa')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_stk_push(request):
    """Initiate M-Pesa STK Push payment"""
    plan_id = request.data.get('plan_id')
    raw_phone = request.data.get('phone_number', '').strip()
    
    if not plan_id or not raw_phone:
        return Response({'error': 'plan_id and phone_number required'}, status=400)
    
    # Validate & normalize phone via MpesaAPI helper
    phone_number, phone_err = MpesaAPI.normalize_phone(raw_phone)
    if phone_err:
        return Response({'error': phone_err}, status=400)
    
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Plan not found'}, status=404)
    
    # Idempotency: block duplicate STK pushes for same user+plan within 3 minutes
    recent_cutoff = timezone.now() - timedelta(minutes=3)
    existing = PaymentRequest.objects.filter(
        user=request.user,
        plan=plan,
        status='pending',
        submitted_at__gte=recent_cutoff,
    ).first()
    if existing:
        return Response({
            'success': True,
            'message': 'Payment already initiated. Check your phone for the M-Pesa prompt.',
            'checkout_request_id': existing.checkout_request_id,
            'payment_request_id': existing.id,
        })
    
    mpesa = MpesaAPI()
    response = mpesa.stk_push(
        phone_number=phone_number,
        amount=plan.price_kes,
        account_reference=f'StadiSpace {plan.name}',
        transaction_desc=f'StadiSpace {plan.name} Plan'
    )
    
    if response.get('ResponseCode') == '0':
        payment_request = PaymentRequest.objects.create(
            user=request.user,
            plan=plan,
            phone_number=phone_number,
            amount_paid=plan.price_kes,
            mpesa_code='',
            checkout_request_id=response.get('CheckoutRequestID'),
            merchant_request_id=response.get('MerchantRequestID'),
            status='pending',
        )
        mpesa_logger.info(
            "STK push initiated: user=%s plan=%s amount=%s checkout=%s",
            request.user.username, plan.name, plan.price_kes,
            response.get('CheckoutRequestID'),
        )
        
        return Response({
            'success': True,
            'message': 'STK Push sent. Enter your M-Pesa PIN.',
            'checkout_request_id': response.get('CheckoutRequestID'),
            'payment_request_id': payment_request.id,
        })
    else:
        mpesa_logger.warning("STK push failed: %s", response)
        return Response({'error': response.get('errorMessage', 'Failed to initiate payment')}, status=400)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """M-Pesa callback endpoint — called by Safaricom servers.
    Validates payment, activates subscription automatically.
    
    SECURITY FEATURES:
    - IP whitelisting for Safaricom servers
    - Atomic transaction handling to prevent race conditions
    - Amount validation before status update
    """
    # Security: IP Whitelisting for Safaricom callback servers
    SAFARICOM_CALLBACK_IPS = [
        '196.201.214.206',
        '196.201.214.207',
        '196.201.214.208',
        '127.0.0.1',  # For testing
        'localhost',  # For testing
    ]
    
    client_ip = request.META.get('REMOTE_ADDR')
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    
    # Get real IP if behind proxy
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(',')[0].strip()
    
    # Security: IP Whitelisting enabled
    # Add more Safaricom IPs as you confirm them from logs
    if client_ip not in SAFARICOM_CALLBACK_IPS:
        mpesa_logger.error("Unauthorized callback IP: %s", client_ip)
        return Response({'error': 'Unauthorized IP'}, status=403)
    
    mpesa_logger.info("M-Pesa callback received from IP %s: %s", client_ip, json.dumps(request.data, default=str))
    
    try:
        stk_callback = request.data.get('Body', {}).get('stkCallback', {})
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc', '')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        
        if not checkout_request_id:
            mpesa_logger.warning("Callback missing CheckoutRequestID")
            return Response({'message': 'Invalid callback data'}, status=400)
        
        # Use atomic transaction to prevent race conditions
        with transaction.atomic():
            try:
                # Lock the row to prevent concurrent processing
                payment_request = PaymentRequest.objects.select_for_update().select_related('plan', 'user').get(
                    checkout_request_id=checkout_request_id
                )
            except PaymentRequest.DoesNotExist:
                mpesa_logger.warning("No PaymentRequest for checkout_request_id=%s", checkout_request_id)
                return Response({'message': 'Payment request not found'}, status=404)
            
            # Guard: don't process already-handled callbacks (atomic check)
            if payment_request.status != 'pending':
                mpesa_logger.info("Duplicate callback for payment %s (status=%s)", payment_request.id, payment_request.status)
                return Response({'message': 'Already processed'})
            
            if result_code == 0:
                # ── Extract metadata from callback ──
                callback_items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
                meta = {}
                for item in callback_items:
                    meta[item.get('Name')] = item.get('Value')
                
                mpesa_receipt = meta.get('MpesaReceiptNumber')
                amount_paid = meta.get('Amount')
                plan = payment_request.plan
                
                # ── Validate amount BEFORE updating status ──
                if amount_paid is not None and int(amount_paid) < int(plan.price_kes):
                    mpesa_logger.error(
                        "Amount mismatch: paid=%s expected=%s checkout=%s user=%s",
                        amount_paid, plan.price_kes, checkout_request_id,
                        payment_request.user.username,
                    )
                    payment_request.status = 'rejected'
                    payment_request.rejection_reason = (
                        f'Amount paid ({amount_paid}) is less than plan price ({plan.price_kes})'
                    )
                    payment_request.save()
                    return Response({'message': 'Amount mismatch — payment rejected'}, status=400)
                
                # ── Mark payment verified (now that validation passed) ──
                payment_request.mpesa_code = mpesa_receipt or 'AUTO_CONFIRMED'
                payment_request.status = 'verified'
                payment_request.verified_at = timezone.now()
                payment_request.amount_paid = amount_paid
                payment_request.admin_notes = 'Auto-verified via STK callback'
                payment_request.save()
                
                # ── Activate / extend subscription ──
                user = payment_request.user
                start_date = timezone.now()
                end_date = start_date + timedelta(days=plan.duration_days)
                
                subscription, created = Subscription.objects.get_or_create(
                    user=user,
                    defaults={
                        'plan': plan,
                        'payment': payment_request,
                        'start_date': start_date,
                        'end_date': end_date,
                        'is_active': True,
                    }
                )
                
                if not created:
                    subscription.plan = plan
                    subscription.payment = payment_request
                    # Extend from whichever is later: current end_date or now
                    base_date = max(subscription.end_date, timezone.now())
                    subscription.end_date = base_date + timedelta(days=plan.duration_days)
                    subscription.is_active = True
                    subscription.save()
                
                mpesa_logger.info(
                    "Subscription activated: user=%s plan=%s until=%s receipt=%s",
                    user.username, plan.name, subscription.end_date, mpesa_receipt,
                )
                
                # Send SMS confirmation (best effort - outside transaction)
                try:
                    from .sms import send_payment_confirmation, send_payment_confirmation_to_parent
                    send_payment_confirmation(
                        phone_number=payment_request.phone_number,
                        username=user.username,
                        plan_name=plan.name,
                        days=plan.duration_days,
                    )
                    # Also notify parent if phone available
                    if getattr(user, 'parent_phone', None):
                        send_payment_confirmation_to_parent(
                            parent_phone=user.parent_phone,
                            parent_name=getattr(user, 'parent_name', ''),
                            child_name=user.first_name or user.username,
                            plan_name=plan.name,
                            amount=amount_paid,
                            mpesa_code=mpesa_receipt or 'N/A',
                        )
                except Exception as e:
                    mpesa_logger.warning("SMS send failed: %s", e)

                # Send payment receipt email (best effort)
                try:
                    from .emails import send_payment_receipt_email
                    send_payment_receipt_email(
                        user=user,
                        plan_name=plan.name,
                        amount=amount_paid,
                        mpesa_code=mpesa_receipt or 'N/A',
                        days=plan.duration_days,
                    )
                except Exception as e:
                    mpesa_logger.warning("Email send failed: %s", e)
            else:
                payment_request.status = 'rejected'
                payment_request.rejection_reason = f'M-Pesa ResultCode={result_code}: {result_desc}'
                payment_request.save()
                mpesa_logger.info(
                    "Payment rejected: user=%s code=%s desc=%s",
                    payment_request.user.username, result_code, result_desc,
                )
        
        return Response({'message': 'Callback processed'})
    except Exception as e:
        mpesa_logger.exception("Unhandled error in mpesa_callback: %s", e)
        return Response({'error': 'Internal error'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_status(request, payment_request_id):
    """Check payment status for polling"""
    try:
        payment_request = PaymentRequest.objects.get(id=payment_request_id, user=request.user)
        return Response({
            'status': payment_request.status,
            'plan': payment_request.plan.name,
            'amount': payment_request.amount_paid,
            'created_at': payment_request.submitted_at,
        })
    except PaymentRequest.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_quiz_access(request):
    """Check if user can start a quiz (credits + subscription)"""
    user = request.user
    
    has_subscription = False
    subscription_details = None
    
    try:
        subscription = Subscription.objects.get(user=user, is_active=True)
        if subscription.end_date >= timezone.now():
            has_subscription = True
            subscription_details = {
                'plan': subscription.plan.name,
                'days_remaining': (subscription.end_date - timezone.now()).days,
            }
    except Subscription.DoesNotExist:
        pass
    
    credits = user.quiz_credits
    can_access = has_subscription or credits > 0
    if has_subscription:
        message = 'Unlimited access (Subscribed)'
    elif credits > 0:
        message = f'{credits} free quiz{"zes" if credits != 1 else ""} remaining'
    else:
        message = 'You have used all 4 free quizzes. Subscribe to continue!'
    
    return Response({
        'can_access': can_access,
        'message': message,
        'has_subscription': has_subscription,
        'subscription': subscription_details,
        'free_quizzes_remaining': credits,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_quiz_with_check(request, quiz_id):
    """Start quiz - checks access and decrements credit"""
    user = request.user
    
    has_subscription = False
    try:
        subscription = Subscription.objects.get(user=user, is_active=True)
        if subscription.end_date >= timezone.now():
            has_subscription = True
    except Subscription.DoesNotExist:
        pass
    
    credits = user.quiz_credits
    if not has_subscription and credits <= 0:
        return Response({
            'error': 'Payment required',
            'message': 'You have used all 4 free quizzes. Subscribe to continue!',
            'redirect': '/subscribe',
        }, status=402)
    
    if not has_subscription:
        user.use_quiz_credit()
    
    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)
    
    attempt = Attempt.objects.create(
        student=user,
        quiz=quiz,
        start_time=timezone.now(),
    )
    
    return Response({
        'success': True,
        'attempt_id': attempt.id,
        'free_quizzes_remaining': user.quiz_credits,
    })


# ── Motivational Content ──────────────────────────────────────
from .models import MotivationalContent
from .serializers import MotivationalContentSerializer

class MotivationalContentListView(generics.ListAPIView):
    """Public endpoint — returns active motivational content, optionally filtered."""
    serializer_class = MotivationalContentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = MotivationalContent.objects.filter(is_active=True)
        content_type = self.request.query_params.get('type')
        category = self.request.query_params.get('category')
        grade = self.request.query_params.get('grade')

        if content_type:
            qs = qs.filter(content_type=content_type)
        if category:
            qs = qs.filter(category=category)
        if grade:
            try:
                g = int(grade)
                qs = qs.filter(grade_min__lte=g, grade_max__gte=g)
            except ValueError:
                pass
        return qs


from .serializers import MotivationalContentAdminSerializer

class MotivationalContentAdminListCreateView(generics.ListCreateAPIView):
    """Admin endpoint — list all (incl. inactive) & create motivational content."""
    serializer_class = MotivationalContentAdminSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not (self.request.user.is_staff or getattr(self.request.user, 'role', '') in ('teacher', 'admin', 'superadmin', 'school_admin')):
            return MotivationalContent.objects.none()
        return MotivationalContent.objects.all()

    def perform_create(self, serializer):
        serializer.save()


class MotivationalContentAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint — retrieve / update / delete a single motivational item."""
    serializer_class = MotivationalContentAdminSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not (self.request.user.is_staff or getattr(self.request.user, 'role', '') in ('teacher', 'admin', 'superadmin', 'school_admin')):
            return MotivationalContent.objects.none()
        return MotivationalContent.objects.all()