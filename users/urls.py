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
    GoogleLogin, MicrosoftLogin, update_profile, credits_status, forgot_password, reset_password,
    streak_status, send_parent_report, email_diagnostic, change_password,
    verify_email, resend_verification,
)
from rest_framework_simplejwt.views import TokenRefreshView
from . import admin_accounts

urlpatterns = [
    # Admin: facilitator approval / account status (users/admin_accounts.py)
    path('admin/accounts/', admin_accounts.list_accounts, name='admin-accounts'),
    path('admin/accounts/<int:pk>/action/', admin_accounts.account_action, name='admin-account-action'),
    path('admin/accounts/<int:pk>/history/', admin_accounts.account_history, name='admin-account-history'),

    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    

    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auth/microsoft/', MicrosoftLogin.as_view(), name='microsoft_login'),

    path('auth/me/', update_profile, name='update-profile'),

    path('credits/status/', credits_status, name='credits-status'),
    path('streak/', streak_status, name='streak-status'),
    path('parent-report/', send_parent_report, name='parent-report'),

    path('change-password/', change_password, name='change-password'),
    path('verify-email/', verify_email, name='verify-email'),
    path('resend-verification/', resend_verification, name='resend-verification'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/', reset_password, name='reset-password'),
    path('email-diagnostic/', email_diagnostic, name='email-diagnostic'),

]

