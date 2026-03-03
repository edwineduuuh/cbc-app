from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Classroom, ClassroomInvitation, User
from .serializers import (
    ClassroomSerializer, ClassroomCreateSerializer, ClassroomDetailSerializer,
    JoinClassroomSerializer, UpdateClassroomSerializer, RegenerateJoinCodeSerializer,
    UserSerializer
)
from questions.permissions import IsTeacherUser, IsAdminOrTeacher
# Create your views here.
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    API ENDPOINT FOR USER REGISTRATION
    POST / api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens':{
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            },
            'message': 'User registered successfully'
        }, status.HTTP_201_CREATED)
    


class LoginView(generics.GenericAPIView):
    """
    Docstring for LoginView
    API endpoint for user login
    POST /api/auth/login
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({
                'error': 'Please provide both username and password'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate user
        user = authenticate(username= username, password=password)

        if user is None:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'error': 'Account is disabled'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user':UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    

    
class UserDetailView(generics.RetrieveAPIView):
    """
    Docstring for UserDetailView
    APU endpoint to get current user details
    GET / api/auth/me/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
        



# ============= TEACHER CLASSROOM MANAGEMENT =============

class TeacherClassroomListView(generics.ListCreateAPIView):
    """
    GET    /api/classrooms/     - List ALL classrooms teacher teaches
    POST   /api/classrooms/     - Create new classroom
    """
    permission_classes = [IsAuthenticated, IsTeacherUser]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClassroomCreateSerializer
        return ClassroomSerializer
    
    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class TeacherClassroomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/classrooms/<id>/     - Get classroom details with students
    PUT    /api/classrooms/<id>/     - Update classroom
    DELETE /api/classrooms/<id>/     - Delete classroom
    """
    permission_classes = [IsAuthenticated, IsTeacherUser]
    
    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ClassroomDetailSerializer
        return UpdateClassroomSerializer


class RegenerateJoinCodeView(generics.GenericAPIView):
    """
    POST /api/classrooms/<id>/regenerate-code/
    Generate a NEW unique join code (invalidates old one)
    """
    permission_classes = [IsAuthenticated, IsTeacherUser]
    serializer_class = RegenerateJoinCodeSerializer
    
    def post(self, request, pk):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            classroom = Classroom.objects.get(id=pk, teacher=request.user)
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Generate new unique code
        old_code = classroom.join_code
        classroom.join_code = classroom.generate_unique_code()
        classroom.save()
        
        return Response({
            'message': 'Join code regenerated successfully',
            'old_code': old_code,
            'new_code': classroom.join_code
        })


class RemoveStudentFromClassroomView(generics.GenericAPIView):
    """
    DELETE /api/classrooms/<id>/students/<student_id>/
    Remove a student from classroom
    """
    permission_classes = [IsAuthenticated, IsTeacherUser]
    
    def delete(self, request, pk, student_id):
        try:
            classroom = Classroom.objects.get(id=pk, teacher=request.user)
            student = User.objects.get(id=student_id, role='student')
            
            classroom.students.remove(student)
            
            return Response({
                'message': f'{student.username} removed from class',
                'student_count': classroom.student_count
            })
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)


# ============= STUDENT CLASSROOM ACTIONS =============

class JoinClassroomView(generics.GenericAPIView):
    """
    POST /api/classrooms/join/
    Student joins a classroom using join code
    """
    permission_classes = [IsAuthenticated]
    serializer_class = JoinClassroomSerializer
    
    def post(self, request):
        # Only students can join classrooms
        if request.user.role != 'student':
            return Response({
                'error': 'Only students can join classrooms'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        join_code = serializer.validated_data['join_code']
        
        with transaction.atomic():
            classroom = Classroom.objects.get(join_code=join_code, is_active=True)
            
            # Add student to classroom
            classroom.students.add(request.user)
            
            # Create invitation record
            ClassroomInvitation.objects.create(
                classroom=classroom,
                student=request.user
            )
        
        return Response({
            'message': f'🎉 Successfully joined {classroom.subject.name} - Grade {classroom.grade}{classroom.name}',
            'classroom': ClassroomSerializer(classroom).data
        }, status=status.HTTP_200_OK)


class LeaveClassroomView(generics.GenericAPIView):
    """
    DELETE /api/classrooms/leave/<id>/
    Student leaves a classroom
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        if request.user.role != 'student':
            return Response({'error': 'Only students can leave classrooms'}, status=403)
        
        try:
            classroom = Classroom.objects.get(id=pk, students=request.user)
            classroom.students.remove(request.user)
            
            return Response({
                'message': f'You have left {classroom.subject.name} - Grade {classroom.grade}{classroom.name}'
            })
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found or you are not a member'}, status=404)


class MyClassroomsView(generics.ListAPIView):
    """
    GET /api/my-classrooms/
    List all classrooms the current student is enrolled in
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClassroomSerializer
    
    def get_queryset(self):
        if self.request.user.role == 'student':
            return Classroom.objects.filter(
                students=self.request.user,
                is_active=True
            ).order_by('-created_at')
        return Classroom.objects.none()


# ============= DISCOVERY & SEARCH =============

class SearchClassroomsView(generics.ListAPIView):
    """
    GET /api/classrooms/search/?q=math&grade=9
    Public search for classrooms (for students to find by code/name)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClassroomSerializer
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        grade = self.request.query_params.get('grade')
        
        queryset = Classroom.objects.filter(is_active=True)
        
        if query:
            queryset = queryset.filter(
                models.Q(subject__name__icontains=query) |
                models.Q(name__icontains=query) |
                models.Q(teacher__username__icontains=query) |
                models.Q(join_code__icontains=query)
            )
        
        if grade:
            queryset = queryset.filter(grade=grade)
        
        return queryset[:20]  # Limit results
    
"""
Add to users/views.py

OAuth login endpoints
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework_simplejwt.tokens import RefreshToken


class GoogleLogin(SocialLoginView):
    """
    Google OAuth login endpoint
    POST /api/auth/google/
    Body: { "access_token": "..." }
    """
    adapter_class = GoogleOAuth2Adapter
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            user = self.user
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                }
            })
        
        return response


class MicrosoftLogin(SocialLoginView):
    """
    Microsoft OAuth login endpoint
    POST /api/auth/microsoft/
    Body: { "access_token": "..." }
    """
    adapter_class = MicrosoftGraphOAuth2Adapter
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            user = self.user
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                }
            })
        
        return response
    
    from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        user.email = data['email']
    if 'grade' in data and hasattr(user, 'grade'):
        user.grade = data['grade']
    
    user.save()
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'grade': getattr(user, 'grade', None),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credits_status(request):
    user = request.user
    is_premium = user.has_active_trial or user.quiz_credits > 100  #Will remove later
    
    return Response({
        "has_subscription": is_premium,
        "quiz_credits": user.quiz_credits,
        "trial_active": user.has_active_trial,
        "trial_end": user.trial_end,
        "is_premium": is_premium,
        "has_access": user.has_access
    })