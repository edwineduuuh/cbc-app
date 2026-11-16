"""
questions/credits.py
Free tier helpers - ONE FREE QUIZ PER DAY.

NOTE: `check_quiz_credits` below is not wired to any view. The live gate is
inline in `views.submit_quiz`, and the claim happens in
`views._run_grading_task`. This module is kept because it is referenced in
docs//history; it was updated alongside the daily-allowance change so that
re-enabling it cannot reintroduce the old counter-based gate.
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

        # Today's free quiz
        if not user.free_quiz_available_today:
            return Response({
                'error': 'You have used today\'s free quiz! Subscribe for unlimited access.',
                'credits_exhausted': True,
                'free_quiz_used_today': True,
                'redirect': '/subscribe',
                'quiz_credits': 0,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Available - proceed, then claim it on success.
        response = view_func(request, *args, **kwargs)

        if response.status_code in [200, 201]:
            user.claim_free_quiz_today()

            if hasattr(response, 'data'):
                response.data['quiz_credits'] = 0
                response.data['credits_message'] = (
                    'Quiz submitted! That was today\'s free quiz - another one '
                    'unlocks tomorrow, or subscribe for unlimited quizzes.'
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
            'message': 'Sign up to get a free quiz every day'
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
                'message': f'{subscription.plan.name} - Unlimited access'
            }
    except Exception:
        pass

    # Free tier: one quiz per day
    available = user.free_quiz_available_today

    return {
        'has_access': available,
        'quiz_credits': 1 if available else 0,
        'free_quiz_available_today': available,
        'subscription_status': 'free_trial',
        'message': (
            'Your free quiz for today is ready'
            if available
            else 'You have used today\'s free quiz - come back tomorrow, or subscribe'
        )
    }
