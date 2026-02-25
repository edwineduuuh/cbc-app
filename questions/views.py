from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from .models import (
    Subject, Topic, Question, Quiz, Attempt, Subscription,
    LessonPlan, Classroom, LiveQuestion, StudentSession, StudentAnswer,
    SubscriptionPlan, PaymentRequest, ClassQuizAssignment
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


class AdminQuestionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = QuestionDetailSerializer  # FIXED: use detail serializer for create too
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
        serializer.save(created_by=self.request.user)


class AdminQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = QuestionDetailSerializer
    queryset = Question.objects.all()


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
        csv_file = request.FILES.get('file')

        if not csv_file:
            return Response({'error': 'No CSV file provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = csv_file.read().decode('utf-8')
            reader  = csv.DictReader(io.StringIO(decoded))
        except Exception as e:
            return Response({'error': f'Could not parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        errors  = []

        for row_num, row in enumerate(reader, start=2):
            try:
                with transaction.atomic():
                    # Find subject
                    subject = Subject.objects.filter(
                        name__iexact=row.get('subject_name', '').strip()
                    ).first()

                    if not subject:
                        errors.append({'row': row_num, 'error': f"Subject '{row.get('subject_name')}' not found"})
                        continue

                    # Find topic
                    topic = Topic.objects.filter(
                        name__iexact=row.get('topic_name', '').strip(),
                        subject=subject
                    ).first()

                    if not topic:
                        errors.append({'row': row_num, 'error': f"Topic '{row.get('topic_name')}' not found in {subject.name}"})
                        continue

                    # Validate grade
                    try:
                        grade = int(row.get('grade', 0))
                        if not (4 <= grade <= 12):
                            raise ValueError
                    except (ValueError, TypeError):
                        errors.append({'row': row_num, 'error': f"Grade must be 4-12. Got: '{row.get('grade')}'"})
                        continue

                    # Get difficulty
                    difficulty = row.get('difficulty', 'medium').strip().lower()
                    if difficulty not in ['easy', 'medium', 'hard']:
                        difficulty = 'medium'

                    # Detect question type
                    question_type = row.get('question_type', '').strip().lower()
                    
                    # If question_type not specified, detect from columns
                    if not question_type:
                        if row.get('option_a') and row.get('option_b'):
                            question_type = 'mcq'
                        else:
                            question_type = 'structured'
                    
                    # Validate question type
                    if question_type not in ['mcq', 'structured', 'fill_blank', 'math', 'essay']:
                        errors.append({'row': row_num, 'error': f"Invalid question_type: '{question_type}'"})
                        continue

                    # Get max_marks
                    try:
                        max_marks = int(row.get('max_marks', 1))
                    except (ValueError, TypeError):
                        max_marks = 1

                    # Common fields
                    question_data = {
                        'topic': topic,
                        'difficulty': difficulty,
                        'question_text': row.get('question_text', '').strip(),
                        'question_type': question_type,
                        'max_marks': max_marks,
                        'explanation': row.get('explanation', '').strip(),
                        'created_by': request.user
                    }

                    # Type-specific fields
                    if question_type == 'mcq':
                        # MCQ validation
                        correct_answer = row.get('correct_answer', '').strip().upper()
                        if correct_answer not in ['A', 'B', 'C', 'D']:
                            errors.append({'row': row_num, 'error': f"MCQ correct_answer must be A, B, C or D. Got: '{correct_answer}'"})
                            continue
                        
                        question_data.update({
                            'option_a': row.get('option_a', '').strip(),
                            'option_b': row.get('option_b', '').strip(),
                            'option_c': row.get('option_c', '').strip(),
                            'option_d': row.get('option_d', '').strip(),
                            'correct_answer': correct_answer,
                        })
                    
                    else:
                        # Non-MCQ questions (structured, math, essay, fill_blank)
                        model_answer = row.get('model_answer', '').strip()
                        if not model_answer:
                            errors.append({'row': row_num, 'error': f"model_answer required for {question_type} questions"})
                            continue
                        
                        question_data['correct_answer'] = model_answer
                        
                        # Parse marking scheme if provided
                        marking_scheme_str = row.get('marking_scheme', '').strip()
                        if marking_scheme_str:
                            try:
                                marking_scheme = json.loads(marking_scheme_str)
                                question_data['marking_scheme'] = marking_scheme
                            except json.JSONDecodeError:
                                errors.append({'row': row_num, 'error': f"Invalid JSON in marking_scheme"})
                                continue

                    # Create question
                    Question.objects.create(**question_data)
                    created += 1

            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
                continue

        return Response({
            'created': created,
            'errors': errors,
            'total_rows': created + len(errors),
            'message': f'Successfully imported {created} questions' + (f' with {len(errors)} errors' if errors else '')
        }, status=status.HTTP_201_CREATED)

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
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]


class TopicListView(generics.ListAPIView):
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Topic.objects.all()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
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

        return queryset
    
    def get_serializer_context(self):
        """Pass request to serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class QuizDetailView(generics.RetrieveAPIView):
    queryset = Quiz.objects.filter(is_active=True)
    serializer_class = QuizDetailSerializer
    permission_classes = [IsAuthenticated]
    # @requires_subscription


class AttemptListView(generics.ListAPIView):
    serializer_class = AttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Attempt.objects.filter(student=self.request.user)


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
            'classrooms_created':   Classroom.objects.filter(teacher=user).count(),
            'students_in_quizzes':  StudentSession.objects.filter(classroom__teacher=user).count(),
        }
        return Response(stats)
    
class StudentQuizListView(generics.ListAPIView):
    """
    GET /api/student/quizzes/ - Student sees ONLY quizzes assigned to their classes
    """
    serializer_class = QuizDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Get student's enrolled classrooms
        my_classrooms = user.classrooms_enrolled.filter(is_active=True)
        
        # Get all assignments for those classrooms
        assignments = ClassQuizAssignment.objects.filter(
            classroom__in=my_classrooms,
            is_active=True
        ).select_related('quiz', 'classroom')
        
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
        from django.db.models import Avg, Max
        user = request.user
        attempts = Attempt.objects.filter(student=user, status='completed')

        # Unique quizzes attempted (distinct quiz_ids) — the honest headline number
        unique_quizzes = attempts.values('quiz').distinct().count()

        # Total sessions including retakes — shown as sub-label
        total_sessions = attempts.count()

        avg_score = attempts.aggregate(avg=Avg('score'))['avg'] or 0
        best_score = attempts.aggregate(best=Max('score'))['best'] or 0

        # Best score per unique quiz (first attempt wins for "completed" count)
        # Group by quiz and take the best score for each
        from django.db.models import Max as DMax
        quiz_best_scores = (
            attempts
            .values('quiz')
            .annotate(best=DMax('score'))
        )
        # Count quizzes where best score >= passing threshold (75 by default)
        quizzes_passed = sum(1 for q in quiz_best_scores if q['best'] >= 75)

        return Response({
            # Headline: unique quizzes (not inflated by retakes)
            'quizzes_completed':  unique_quizzes,

            # Sub-label: total attempts including retakes
            'total_sessions':     total_sessions,

            # Retakes = difference between sessions and unique quizzes
            'total_retakes':      max(0, total_sessions - unique_quizzes),

            # Quizzes where student has ever scored >= 75%
            'quizzes_passed':     quizzes_passed,

            'average_score':      round(avg_score, 1),
            'best_score':         round(best_score, 1),
            'time_studied_hours': 0,
            'current_streak':     0,
        })
    
"""
Add this to questions/views.py

Handles quiz submission with AI grading
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai_grading import grade_answer
import json


@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @requires_subscription
def submit_quiz(request):
    """
    Submit quiz answers and get AI-graded results
    
    POST /api/quizzes/submit/
    Body: {
        "quiz_id": 1,
        "answers": {
            "1": "A",           # MCQ
            "2": "photosynthesis",  # Fill blank
            "3": "x=4",         # Math
            "4": "Plants absorb water through roots..."  # Structured
        }
    }
    """
    data = request.data
    quiz_id = request.data.get('quiz_id')
    answers = request.data.get('answers', {})
    
    if not quiz_id:
        return Response({'error': 'quiz_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all questions in quiz
    questions = quiz.questions.all()
    
    # Grade each answer
    results = []
    total_marks_awarded = 0
    total_max_marks = 0
    detailed_feedback = {}
    
    for question in questions:
        student_answer = answers.get(str(question.id), "")
        
        # Grade using AI engine
        grading_result = grade_answer(question, student_answer)
        total_marks_awarded += grading_result['marks_awarded']
        total_max_marks += grading_result['max_marks']
        
        # --- NEW: Map MCQ letters to actual text for better display ---
        display_correct_answer = question.correct_answer
        display_student_answer = student_answer
        
        if question.question_type == 'mcq':
            options_map = {
                'A': question.option_a,
                'B': question.option_b,
                'C': question.option_c,
                'D': question.option_d
            }
            # Format Correct Answer (e.g., "A: Nairobi")
            c_text = options_map.get(str(question.correct_answer).strip().upper(), '')
            if c_text:
                display_correct_answer = f"{str(question.correct_answer).strip().upper()}: {c_text}"
                
            # Format Student Answer (e.g., "C: Kisumu")
            s_text = options_map.get(str(student_answer).strip().upper(), '')
            if s_text:
                display_student_answer = f"{str(student_answer).strip().upper()}: {s_text}"
        # --------------------------------------------------------------

        # Store detailed feedback
        detailed_feedback[str(question.id)] = {
            'question_text': question.question_text,
            'question_type': question.question_type,          
            'option_a': question.option_a,                    
            'option_b': question.option_b,                    
            'option_c': question.option_c,                    
            'option_d': question.option_d,
            'student_answer': display_student_answer,         # <--- Updated to show full text
            'marks_awarded': grading_result['marks_awarded'],
            'max_marks': grading_result['max_marks'],
            'feedback': grading_result['feedback'],
            'is_correct': grading_result['is_correct'],
            'correct_answer': display_correct_answer if not grading_result['is_correct'] else None, # <--- Updated to show full text
            'explanation': question.explanation if not grading_result['is_correct'] else None,
            'points_earned': grading_result.get('points_earned', []),
            'points_missed': grading_result.get('points_missed', []),
            'personalized_message': grading_result.get('personalized_message', ''),  
            'study_tip': grading_result.get('study_tip', ''),  
        }
        
        results.append({
            'question_id': question.id,
            'marks_awarded': grading_result['marks_awarded'],
            'max_marks': grading_result['max_marks'],
            'is_correct': grading_result['is_correct']
        })
    
    # Calculate score percentage
    score_percentage = (total_marks_awarded / total_max_marks * 100) if total_max_marks > 0 else 0
    
    # Create attempt record
    with transaction.atomic():
        attempt = Attempt.objects.create(
            student=request.user,
            quiz=quiz,
            score=score_percentage,
            total_questions=questions.count(),
            correct_answers=sum(1 for r in results if r['is_correct']),
            total_marks_awarded=total_marks_awarded,
            total_max_marks=total_max_marks,
            status='completed',
            detailed_feedback=detailed_feedback
        )
    
    return Response({
        'id': attempt.id,
        'score': round(score_percentage, 1),
        'total_marks_awarded': total_marks_awarded,
        'total_max_marks': total_max_marks,
        'total_questions': questions.count(),
        'correct_answers': sum(1 for r in results if r['is_correct']),
        'passed': score_percentage >= quiz.passing_score,
        'results': results,
        'message': 'Quiz submitted successfully!'
    }, status=status.HTTP_201_CREATED)


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
    # queryset = SubscriptionPlan.objects.filter(is_active=True)
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
        from django.utils import timezone
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

        # Check trial
        if user.trial_end and user.trial_end > timezone.now():
            days_left = (user.trial_end - timezone.now()).days
            return Response({
                'status': 'trial',
                'has_access': True,
                'plan': 'Free Trial',
                'end_date': user.trial_end,
                'days_remaining': days_left,
                'trial': True,
            })

        # Expired
        return Response({
            'status': 'expired',
            'has_access': False,
            'plan': None,
            'end_date': None,
            'days_remaining': 0,
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
"""
views.py — CBC Kenya Teacher Portal Backend
All endpoints for lesson plans, classrooms, quizzes, student sessions, AI marking, reports.
"""
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
        if not Classroom.objects.filter(join_code=code).exists():
            return code


# ─────────────────────────────────────────────────────────────
#  LESSON PLANS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_lesson_plans(request):
    """GET /api/lessons/ — list teacher's lesson plans"""
    plans = LessonPlan.objects.filter(teacher=request.user)
    # optional filters
    grade   = request.query_params.get("grade")
    subject = request.query_params.get("subject")
    term    = request.query_params.get("term")
    if grade:   plans = plans.filter(grade=grade)
    if subject: plans = plans.filter(subject=subject)
    if term:    plans = plans.filter(term=term)
    return Response(LessonPlanSerializer(plans, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_lesson(request):
    """
    POST /api/lessons/generate/
    Body: { grade, subject, term, week, lesson_number, strand, substrand,
            duration, learner_level, prior_knowledge, resources,
            is_practical, practical_area }
    Creates a LessonPlan record + calls Claude + stores + returns result.
    """
    required = ["grade", "subject", "term", "week", "lesson_number", "strand", "duration"]
    for field in required:
        if not request.data.get(field):
            return Response({"error": f"'{field}' is required."}, status=400)

    # Save the plan record first (without AI output)
    plan_data = {
        "grade":          request.data["grade"],
        "subject":        request.data["subject"],
        "term":           request.data["term"],
        "week":           int(request.data["week"]),
        "lesson_number":  int(request.data["lesson_number"]),
        "strand":         request.data["strand"],
        "substrand":      request.data.get("substrand", ""),
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
        plan.delete()   # rollback if AI fails
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
        qs = Classroom.objects.filter(teacher=request.user).prefetch_related("questions","sessions")
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

    classroom = Classroom.objects.create(
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
    classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)

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
    classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
    classroom.status = "live"
    classroom.started_at = timezone.now()
    classroom.current_question_index = 0
    classroom.save()
    return Response({"status": "live", "join_code": classroom.join_code})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_classroom(request, pk):
    """POST /api/classrooms/<pk>/end/ — set status to ended, trigger AI reports"""
    classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
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
    For open-ended: calls Claude AI to mark and give feedback.
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
    """GET /api/analytics/teacher/ — dashboard stats"""
    teacher = request.user
    return Response({
        "lesson_plans_created": LessonPlan.objects.filter(teacher=teacher).count(),
        "classrooms_created":   Classroom.objects.filter(teacher=teacher).count(),
        "classrooms_live":      Classroom.objects.filter(teacher=teacher, status="live").count(),
        "students_managed":     StudentSession.objects.filter(classroom__teacher=teacher).count(),
        "quizzes_ended":        Classroom.objects.filter(teacher=teacher, status="ended").count(),
    })

@api_view(['POST'])
# @permission_classes([IsAuthenticated])
def generate_quiz_questions(request):
    """
    POST /api/lessons/generate-questions/
    Generate quiz questions with AI for Kahoot-style classrooms
    Body: { grade, subject, strand, substrand, count }
    """
    from .ai_service import client, MODEL, parse_ai_json
    
    grade = request.data.get('grade', 'Grade 7')
    subject = request.data.get('subject', 'Mathematics')
    strand = request.data.get('strand', '')
    substrand = request.data.get('substrand', '')
    count = int(request.data.get('count', 5))
    
    if not topic:
        return Response({'error': 'Topic is required'}, status=400)
    
    topic_text = f"{strand}" + (f" - {substrand}" if substrand else "")
    
    prompt = f"""Generate {count} multiple-choice quiz questions for a {grade} {subject} quiz on: {topic_text}

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
        message = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        
        result = parse_ai_json(message.content[0].text)
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)