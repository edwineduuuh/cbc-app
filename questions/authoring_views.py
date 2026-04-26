from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination


class QuestionPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500
from django.db import transaction
from .models import Subject, Topic, Question
from .serializers import QuestionDetailSerializer, QuizDetailSerializer, QuizListSerializer
from .permissions import IsAdminUser, IsTeacherUser, IsAdminOrTeacher  # ← ADD THIS LINE
import csv
import io


class QuestionCreateView(generics.CreateAPIView):
    """
    POST /api/admin/questions/create/
    Create a new question
    """
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuestionListManageView(generics.ListAPIView):
    """
    GET /api/admin/questions/manage/
    List all questions with filters — paginated (100 per page)
    """
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = QuestionPagination

    def get_queryset(self):
        queryset = Question.objects.select_related(
            'topic', 'topic__subject', 'created_by'
        ).prefetch_related('parts')

        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(topic__subject_id=subject_id)

        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        substrand_id = self.request.query_params.get('substrand')
        if substrand_id:
            queryset = queryset.filter(substrand_id=substrand_id)

        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(topic__grade=grade)

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        q_type = self.request.query_params.get('type')
        if q_type:
            queryset = queryset.filter(question_type=q_type)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(question_text__icontains=search)

        return queryset.order_by('topic__grade', 'topic__subject__name', 'topic__order', 'topic__name', '-created_at')


class QuestionUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE /api/admin/questions/<id>/
    """
    queryset = Question.objects.all()
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_update(self, serializer):
        kwargs = {}
        # Normalize empty-string substrand (FormData can't send null) to None
        substrand_raw = self.request.data.get('substrand', None)
        if substrand_raw == '' or substrand_raw == 'null':
            kwargs['substrand'] = None
        if self.request.data.get('delete_image') in ('true', True, '1'):
            instance = self.get_object()
            if instance.question_image:
                instance.question_image.delete(save=False)
            kwargs['question_image'] = None
            serializer.save(**kwargs)
        elif 'question_image' in self.request.FILES:
            kwargs['question_image'] = self.request.FILES['question_image']
            serializer.save(**kwargs)
        else:
            serializer.save(**kwargs)


class BulkQuestionImportView(generics.CreateAPIView):
    """
    POST /api/admin/questions/bulk-import/
    Import questions from CSV - creates subjects/topics automatically
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get('file')

        if not csv_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = csv_file.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            created_count = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):
                try:
                    with transaction.atomic():
                        # -----------------------------
                        # 1. Extract & Clean Fields
                        # -----------------------------
                        subject_name = row.get('subject_name', '').strip()
                        topic_name = row.get('topic_name', '').strip()
                        grade_str = row.get('grade', '').strip()

                        question_text = row.get('question_text', '').strip()
                        option_a = row.get('option_a', '').strip()
                        option_b = row.get('option_b', '').strip()
                        option_c = row.get('option_c', '').strip()
                        option_d = row.get('option_d', '').strip()

                        correct_answer = row.get('correct_answer', '').strip().upper()
                        explanation = row.get('explanation', '').strip()
                        difficulty = row.get('difficulty', 'medium').strip().lower()

                        # -----------------------------
                        # 2. Field Validation
                        # -----------------------------
                        if not subject_name:
                            raise ValueError("subject_name is required")
                        if not topic_name:
                            raise ValueError("topic_name is required")
                        if not grade_str:
                            raise ValueError("grade is required")
                        if not question_text:
                            raise ValueError("question_text is required")
                        if not option_a:
                            raise ValueError("option_a is required")
                        if not option_b:
                            raise ValueError("option_b is required")
                        if not option_c:
                            raise ValueError("option_c is required")
                        if not option_d:
                            raise ValueError("option_d is required")
                        if not correct_answer:
                            raise ValueError("correct_answer is required")

                        # Grade must be valid
                        try:
                            grade = int(grade_str)
                            if grade < 4 or grade > 12:
                                raise ValueError(f"Grade must be between 4 and 12. Got {grade}")
                        except ValueError:
                            raise ValueError(f"Invalid grade value: '{grade_str}'. Must be a number.")

                        # Correct answer validation
                        if correct_answer not in ['A', 'B', 'C', 'D']:
                            raise ValueError(
                                f"correct_answer must be A, B, C, or D. Got: '{correct_answer}'"
                            )

                        # -----------------------------
                        # 3. CREATE OR GET SUBJECT - SIMPLE
                        # -----------------------------
                        subject, created_subj = Subject.objects.get_or_create(
                            name__iexact=subject_name,
                            defaults={
                                'name': subject_name,
                                'slug': subject_name.lower().replace(' ', '-').replace('(', '').replace(')', ''),
                                'description': f"{subject_name}",
                                'icon': "📚",
                            }
                        )

                        # -----------------------------
                        # 4. CREATE OR GET TOPIC - SIMPLE
                        # -----------------------------
                        topic, created_topic = Topic.objects.get_or_create(
                            name__iexact=topic_name,
                            subject=subject,
                            grade=grade,
                            defaults={
                                'name': topic_name,
                                'subject': subject,
                                'grade': grade,
                                'slug': topic_name.lower().replace(' ', '-').replace('(', '').replace(')', ''),
                                'description': f"{topic_name}",
                                'order': 0
                            }
                        )

                        # -----------------------------
                        # 5. Create Question
                        # -----------------------------
                        Question.objects.create(
    topic=topic,           # subject + grade come from topic automatically
    question_text=question_text,
    option_a=option_a,
    option_b=option_b,
    option_c=option_c,
    option_d=option_d,
    correct_answer=correct_answer,
    explanation=explanation,
    difficulty=difficulty,
    created_by=request.user
)
                        created_count += 1

                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    errors.append(f"Row {row_num}: {str(e)}")

            # -----------------------------
            # Final Response
            # -----------------------------
            message = f"Successfully imported {created_count} question"
            if created_count != 1:
                message += "s"
            if errors:
                message += f" with {len(errors)} error(s)"

            return Response({
                'message': message,
                'created': created_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error processing file: {str(e)}'},
                            status=status.HTTP_400_BAD_REQUEST)
        

class AdminQuizLibraryView(generics.ListCreateAPIView):
    """
    GET  /api/admin/quiz-library/    - List quizzes available to teachers
    POST /api/admin/quiz-library/    - Add quiz to library (mark available)
    """
    permission_classes = [IsAdminUser]
    serializer_class = QuizListSerializer
    
    def get_queryset(self):
        return Quiz.objects.filter(available_to_teachers=True)
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            owner_type='admin',
            available_to_teachers=True
        )