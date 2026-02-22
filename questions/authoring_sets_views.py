from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import QuestionSet
from .serializers import QuestionSetSerializer
from .permissions import IsAdminOrTeacher

class QuestionSetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrTeacher]
    serializer_class = QuestionSetSerializer
    
    def get_queryset(self):
        return QuestionSet.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class QuestionSetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrTeacher]
    serializer_class = QuestionSetSerializer
    
    def get_queryset(self):
        return QuestionSet.objects.filter(created_by=self.request.user)