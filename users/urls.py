from django.urls import path
from .views import RegisterView, LoginView, UserDetailView
from rest_framework_simplejwt.views import TokenRefreshView

# urlpatterns =[
#     path('register/', RegisterView.as_view(), name='register'),
#     path('login/', LoginView.as_view(), name='login'),
#     path('me/', UserDetailView.as_view(), name='user-detail'),
#     path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

from django.urls import path
from .views import (
    RegisterView, LoginView, UserDetailView,
    TeacherClassroomListView, TeacherClassroomDetailView,
    RegenerateJoinCodeView, RemoveStudentFromClassroomView,
    JoinClassroomView, LeaveClassroomView, MyClassroomsView,
    SearchClassroomsView, GoogleLogin, MicrosoftLogin, update_profile
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # ===== CLASSROOM ENDPOINTS =====
    
    # Teacher endpoints
    path('classrooms/', TeacherClassroomListView.as_view(), name='teacher-classrooms'),
    path('classrooms/<int:pk>/', TeacherClassroomDetailView.as_view(), name='teacher-classroom-detail'),
    path('classrooms/<int:pk>/regenerate-code/', RegenerateJoinCodeView.as_view(), name='regenerate-code'),
    path('classrooms/<int:pk>/students/<int:student_id>/', RemoveStudentFromClassroomView.as_view(), name='remove-student'),
    
    # Student endpoints
    path('classrooms/join/', JoinClassroomView.as_view(), name='join-classroom'),
    path('classrooms/leave/<int:pk>/', LeaveClassroomView.as_view(), name='leave-classroom'),
    path('my-classrooms/', MyClassroomsView.as_view(), name='my-classrooms'),
    
    # Public search
    path('classrooms/search/', SearchClassroomsView.as_view(), name='search-classrooms'),

    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auth/microsoft/', MicrosoftLogin.as_view(), name='microsoft_login'),

    path('auth/me/', update_profile, name='update-profile'),

]

