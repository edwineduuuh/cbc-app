from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer
from .throttles import AuthRateThrottle, LoginRateThrottle
from rest_framework.decorators import throttle_classes
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Classroom, ClassroomInvitation, User
from .serializers import (
    ClassroomSerializer, ClassroomCreateSerializer, ClassroomDetailSerializer,
    JoinClassroomSerializer, UpdateClassroomSerializer, RegenerateJoinCodeSerializer,
    UserSerializer
)
from questions.permissions import IsTeacherUser, IsAdminOrTeacher, IsAdminUser
# Create your views here.
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    API ENDPOINT FOR USER REGISTRATION
    POST / api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        user = serializer.save()

        # Send welcome SMS to parent (best-effort, never block registration)
        if user.parent_phone:
            try:
                from questions.sms import send_sms
                child_name = user.first_name or user.username
                send_sms(
                    user.parent_phone,
                    f"Hi {user.parent_name or 'there'}! {child_name} just joined StadiSpace. "
                    f"They get a free quiz every day - full feedback included. "
                    f"See their progress at stadispace.co.ke"
                )
            except BaseException:
                pass

        # Send welcome email (best-effort, never block registration)
        try:
            from questions.emails import send_welcome_email
            send_welcome_email(user)
        except BaseException:
            pass

        # Send email verification link (best-effort)
        try:
            _send_verification_email(user)
        except BaseException:
            pass

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
    throttle_classes = [LoginRateThrottle]
    serializer_class = LoginSerializer
    
    def post(self, request):
        identifier = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not identifier or not password:
            return Response({
                'error': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Accept email or username - look up by email if it contains @
        if '@' in identifier:
            try:
                user_obj = User.objects.get(email__iexact=identifier)
                username = user_obj.username
            except User.DoesNotExist:
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            username = identifier

        user = authenticate(username=username, password=password)

        if user is None:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'error': 'Account is disabled'
            }, status=status.HTTP_403_FORBIDDEN)

        # Suspended / rejected accounts get no tokens. Pending ones do, so
        # they can see their status page and resend the verification email;
        # the auth class keeps them out of everything else.
        if user.status in (User.STATUS_SUSPENDED, User.STATUS_REJECTED)                 and not (user.is_staff or user.is_superuser):
            from .auth import account_block_payload
            return Response(account_block_payload(user), status=status.HTTP_403_FORBIDDEN)
        
        # Record the login day for admin analytics (best-effort).
        from .auth import touch_activity
        touch_activity(user)

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









# ============= STUDENT CLASSROOM ACTIONS =============







# ============= DISCOVERY & SEARCH =============

    
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


def _social_login_response(view, response):
    """Shared tail of Google/Microsoft sign-in: same rules as email login.

    The role and status come from the database (set once at sign-up by
    users.adapters), never from this request.
    """
    if response.status_code != 200:
        # e.g. "User is already registered with this e-mail address." when a
        # provider is tried on an email that already has an account.
        return response
    user = view.user
    if user.status in (User.STATUS_SUSPENDED, User.STATUS_REJECTED)             and not (user.is_staff or user.is_superuser):
        from .auth import account_block_payload
        return Response(account_block_payload(user), status=status.HTTP_403_FORBIDDEN)
    from .auth import touch_activity
    touch_activity(user)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
        'user': UserSerializer(user).data,
    })


class GoogleLogin(SocialLoginView):
    """
    Google OAuth login endpoint
    POST /api/auth/google/
    Body: { "access_token": "..." }
    """
    adapter_class = GoogleOAuth2Adapter
    permission_classes = [AllowAny]
    
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        # The adapter sees the plain Django request; hand it the sign-up role
        # (only used if this is a brand-new account, and allow-listed there).
        request._request.stadispace_signup_role = request.data.get("role", "")
        return _social_login_response(self, super().post(request, *args, **kwargs))


class MicrosoftLogin(SocialLoginView):
    """
    Microsoft OAuth login endpoint
    POST /api/auth/microsoft/
    Body: { "access_token": "..." }
    """
    adapter_class = MicrosoftGraphOAuth2Adapter
    permission_classes = [AllowAny]
    
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        # The adapter sees the plain Django request; hand it the sign-up role
        # (only used if this is a brand-new account, and allow-listed there).
        request._request.stadispace_signup_role = request.data.get("role", "")
        return _social_login_response(self, super().post(request, *args, **kwargs))


# This import used to be indented inside MicrosoftLogin, which replaced the
# class's permission_classes with the decorator and broke Microsoft sign-in.
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
    email_changed = False
    if 'email' in data:
        new_email = (data['email'] or '').strip().lower()
        if new_email and new_email != (user.email or '').lower():
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({'error': 'That email belongs to another account.'},
                                status=status.HTTP_400_BAD_REQUEST)
            # A new address has to be proven again before it counts.
            user.email = new_email
            user.email_verified = False
            email_changed = True
    if 'grade' in data and hasattr(user, 'grade'):
        user.grade = data['grade']
    if 'parent_name' in data and hasattr(user, 'parent_name'):
        user.parent_name = data['parent_name']
    if 'school_name' in data and hasattr(user, 'school_name'):
        user.school_name = data['school_name']

    user.save()
    if email_changed:
        try:
            _send_verification_email(user)
        except Exception:
            pass

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'grade': getattr(user, 'grade', None),
    })

from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credits_status(request):
    """PAID SIMULATION MODE"""
    # CHANGE THIS LINE ONLY
    FORCE_PAID = True   # ← Set to False when you want to test FreeExplore again

    return Response({
        "has_subscription": FORCE_PAID,
        "quiz_credits": 0,                    # depleted credits (your edge case)
        "is_premium": FORCE_PAID
    })

import os
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def streak_status(request):
    user = request.user
    return Response({
        'current_streak': user.current_streak,
        'longest_streak': user.longest_streak,
        'last_activity_date': user.last_activity_date,
    })


from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def forgot_password(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email required'}, status=400)

    try:
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

        import logging
        logger = logging.getLogger(__name__)
        resend_key_set = bool(os.getenv('RESEND_KEY', ''))
        frontend_url_set = os.getenv('FRONTEND_URL', '')
        logger.warning(f"[forgot_password] RESEND_KEY set={resend_key_set} | FRONTEND_URL='{frontend_url_set}' | reset_url='{reset_url}'")
        try:
            send_mail(
                subject='Reset your StadiSpace password',
                message=f'Hi {user.first_name or user.email},\n\nClick this link to reset your password:\n{reset_url}\n\nThis link expires in 24 hours.\n\nIf you did not request this, ignore this email.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.warning(f"[forgot_password] Email sent successfully to {email}")
        except Exception as mail_err:
            logger.error(f"[forgot_password] Email FAILED for {email}: {type(mail_err).__name__}: {mail_err}")
            # Still return success - don't expose server config errors to the user
    except User.DoesNotExist:
        pass  # Don't reveal if email exists

    return Response({'message': 'If this email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def email_diagnostic(request):
    """Diagnostic endpoint - returns the exact email send error so we can debug.

    Admin login only. It used to be public behind a header key committed to
    the repo, which let anyone with the key send mail from our domain.
    """

    test_email = request.data.get('email', request.data.get('to'))
    if not test_email:
        return Response({'error': 'Provide email field'}, status=400)

    import logging
    diag = {
        'RESEND_KEY_set': bool(os.getenv('RESEND_KEY', '')),
        'FRONTEND_URL': os.getenv('FRONTEND_URL', '(not set)'),
        'DEFAULT_FROM_EMAIL': settings.DEFAULT_FROM_EMAIL,
        'EMAIL_BACKEND': settings.EMAIL_BACKEND,
        'ANYMAIL_RESEND_API_KEY_set': bool(settings.ANYMAIL.get('RESEND_API_KEY', '')),
        'send_result': None,
        'error': None,
    }
    try:
        send_mail(
            subject='StadiSpace email diagnostic test',
            message='This is a test email from the diagnostic endpoint.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        diag['send_result'] = 'SUCCESS'
    except Exception as e:
        diag['send_result'] = 'FAILED'
        diag['error'] = f'{type(e).__name__}: {e}'
    return Response(diag)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def reset_password(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not all([uid, token, new_password]):
        return Response({'error': 'uid, token and new_password required'}, status=400)
    
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError, Exception):
        return Response({'error': 'Invalid reset link'}, status=400)
    
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Reset link expired or invalid'}, status=400)

    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password, user)
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({'message': 'Password reset successful. You can now log in.'})


def _send_verification_email(user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject='Verify your StadiSpace email',
        message=(
            f"Hi {user.first_name or user.email},\n\n"
            f"Click the link below to verify your email address:\n{verify_url}\n\n"
            f"This link expires in 24 hours. If you didn't create a StadiSpace account, ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthRateThrottle])
def resend_verification(request):
    user = request.user
    if user.email_verified:
        return Response({'message': 'Email already verified'})
    try:
        _send_verification_email(user)
    except Exception as e:
        return Response({'error': f'Failed to send email: {e}'}, status=500)
    return Response({'message': 'Verification email sent'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def verify_email(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    if not uid or not token:
        return Response({'error': 'uid and token are required'}, status=400)
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError, Exception):
        return Response({'error': 'Invalid verification link'}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Verification link expired or invalid'}, status=400)
    user.email_verified = True
    user.save(update_fields=['email_verified'])
    # Verifying activates the account. A facilitator keeps waiting only when
    # manual approval is switched on.
    from users.auth import facilitator_requires_approval
    needs_approval = user.role == User.ROLE_TEACHER and facilitator_requires_approval()
    if user.status == User.STATUS_PENDING and not needs_approval:
        user.set_status(User.STATUS_ACTIVE, reason='email verified')
    return Response({'message': 'Email verified successfully', 'status': user.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not old_password or not new_password:
        return Response({'error': 'old_password and new_password are required'}, status=400)

    if not user.check_password(old_password):
        return Response({'error': 'Current password is incorrect'}, status=400)

    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password, user)
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password changed successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_parent_report(request):
    """
    POST /api/auth/parent-report/
    Send a progress report to the student's parent via email and/or SMS.
    """
    from django.core.mail import send_mail
    from questions.models import Attempt
    from questions.sms import send_sms
    from django.db.models import Avg, Count, Max
    from datetime import timedelta
    from django.utils import timezone
    import os

    user = request.user
    if not user.parent_email and not user.parent_phone:
        return Response({
            'error': 'No parent contact info. Update your profile with parent email or phone.'
        }, status=400)

    # Get last 7 days of attempts
    week_ago = timezone.now() - timedelta(days=7)
    attempts = Attempt.objects.filter(
        student=user, status='completed', completed_at__gte=week_ago
    )
    agg = attempts.aggregate(
        avg_score=Avg('score'),
        total=Count('id'),
        best=Max('score'),
    )

    quizzes_taken = agg['total'] or 0
    avg_score = round(agg['avg_score'] or 0, 1)
    best_score = round(agg['best'] or 0, 1)
    streak = getattr(user, 'current_streak', 0)

    report_text = (
        f"Weekly Progress Report for {user.username}\n\n"
        f"Quizzes taken this week: {quizzes_taken}\n"
        f"Average score: {avg_score}%\n"
        f"Best score: {best_score}%\n"
        f"Current streak: {streak} days\n\n"
        f"Keep encouraging them to study daily on StadiSpace!"
    )

    sent_email = False
    sent_sms = False

    if user.parent_email:
        try:
            send_mail(
                subject=f"StadiSpace Weekly Report - {user.username}",
                message=report_text,
                from_email=os.getenv('EMAIL_HOST_USER'),
                recipient_list=[user.parent_email],
                fail_silently=False,
            )
            sent_email = True
        except Exception as e:
            print(f"Email failed: {e}")

    if user.parent_phone:
        sms_text = (
            f"StadiSpace Report: {user.username} took {quizzes_taken} quizzes "
            f"this week (avg {avg_score}%). Streak: {streak} days. "
            f"Great progress!"
        )
        sent_sms = send_sms(user.parent_phone, sms_text)

    return Response({
        'sent_email': sent_email,
        'sent_sms': sent_sms,
        'report': {
            'quizzes_taken': quizzes_taken,
            'avg_score': avg_score,
            'best_score': best_score,
            'streak': streak,
        }
    })