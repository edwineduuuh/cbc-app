from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from .models import Subject, Topic, Question
from .serializers import QuestionDetailSerializer, QuizDetailSerializer  # Add this import
import csv
import io


class QuestionCreateView(generics.CreateAPIView):
    """
    POST /api/admin/questions/create/
    Create a new question
    """
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuestionListManageView(generics.ListAPIView):
    """
    GET /api/admin/questions/manage/
    List all questions with filters
    """
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Question.objects.all()
        
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
            queryset = queryset.filter(question_text__icontains=search)
        
        return queryset.order_by('-created_at')


class QuestionUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/DELETE /api/admin/questions/<id>/
    """
    queryset = Question.objects.all()
    serializer_class = QuestionDetailSerializer
    permission_classes = [IsAuthenticated]


class BulkQuestionImportView(generics.CreateAPIView):
    """
    POST /api/admin/questions/bulk-import/
    Import questions from CSV
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
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            errors = []
            
            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        subject = Subject.objects.get(id=row['subject_id'])
                        topic = Topic.objects.get(id=row['topic_id'])
                        
                        Question.objects.create(
                            subject=subject,
                            topic=topic,
                            grade=int(row['grade']),
                            question_text=row['question_text'],
                            option_a=row['option_a'],
                            option_b=row['option_b'],
                            option_c=row['option_c'],
                            option_d=row['option_d'],
                            correct_answer=row['correct_answer'].upper(),
                            explanation=row.get('explanation', ''),
                            difficulty=row.get('difficulty', 'medium'),
                            created_by=request.user
                        )
                        created_count += 1
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
            
            return Response({
                'message': f'Successfully imported {created_count} questions',
                'created': created_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Error processing file: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)