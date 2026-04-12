"""
questions/credits.py
Free trial credits system — 4 free quizzes per user
"""

from functools import wraps
from rest_framework.response import Response
from rest_framework import status


def check_quiz_credits(view_func):
    """
    Decorator to check if user has quiz credits remaining.
    Apply this to quiz submission endpoints.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = request.user

        # Anonymous users get no free attempts
        if not user.is_authenticated:
            return Response({
                'error': 'Please sign up to take quizzes',
                'credits_exhausted': True,
                'redirect': '/register'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Admins/teachers always have access
        if user.role in ('admin', 'superadmin', 'teacher', 'school_admin') or user.is_staff:
            return view_func(request, *args, **kwargs)

        # Check if user has active subscription
        try:
            from questions.models import Subscription
            subscription = Subscription.objects.get(user=user)
            if subscription.is_valid:
                return view_func(request, *args, **kwargs)
        except Subscription.DoesNotExist:
            pass

        # Check free credits
        credits = getattr(user, 'quiz_credits', 0)

        if credits <= 0:
            return Response({
                'error': 'You have used all 4 free quizzes! Subscribe for unlimited access.',
                'credits_exhausted': True,
                'redirect': '/subscribe',
                'quiz_credits': 0,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # User has credits — proceed and deduct after successful submission
        response = view_func(request, *args, **kwargs)

        if response.status_code in [200, 201]:
            user.use_quiz_credit()

            if hasattr(response, 'data'):
                response.data['quiz_credits'] = user.quiz_credits
                response.data['credits_message'] = (
                    f'Quiz submitted! You have {user.quiz_credits} free quiz{"zes" if user.quiz_credits != 1 else ""} remaining.'
                    if user.quiz_credits > 0
                    else 'This was your last free quiz! Subscribe to continue learning.'
                )

        return response

    return wrapper


def get_user_credits_status(user):
    """Get user's credit status for API responses"""
    if not user.is_authenticated:
        return {
            'has_access': False,
            'quiz_credits': 0,
            'subscription_status': 'none',
            'message': 'Sign up to get 4 free quizzes'
        }

    # Check subscription
    try:
        from questions.models import Subscription
        subscription = Subscription.objects.get(user=user)
        if subscription.is_valid:
            return {
                'has_access': True,
                'quiz_credits': 'unlimited',
                'subscription_status': 'active',
                'subscription_plan': subscription.plan.name,
                'subscription_expires': subscription.end_date,
                'message': f'{subscription.plan.name} — Unlimited access'
            }
    except Exception:
        pass

    # Free trial user
    credits = getattr(user, 'quiz_credits', 0)

    return {
        'has_access': credits > 0,
        'quiz_credits': credits,
        'subscription_status': 'free_trial',
        'message': (
            f'{credits} free quiz{"zes" if credits != 1 else ""} remaining'
            if credits > 0
            else 'Subscribe to unlock unlimited quizzes'
        )
    }
