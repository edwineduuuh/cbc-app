from django.urls import path
from .views import RegisterView, LoginView, UserDetailView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns =[
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh')
]