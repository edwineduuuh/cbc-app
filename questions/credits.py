"""
questions/credits.py
Free trial credits system - give users 2 free quizzes
"""

from functools import wraps
from rest_framework.response import Response
from rest_framework import status


def check_quiz_credits(view_func):
    """
    Decorator to check if user has quiz credits remaining
    Apply this to quiz submission endpoints
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = request.user
        
        # Anonymous users get no free attempts
        if not user.is_authenticated:
            return Response({
                'error': 'Please sign up to take quizzes',
                'credits_exhausted': True,
                'redirect': '/auth/register'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user has active subscription
        try:
            from questions.models import Subscription
            subscription = Subscription.objects.get(user=user)
            if subscription.is_valid:
                # Subscribed users have unlimited access
                return view_func(request, *args, **kwargs)
        except Subscription.DoesNotExist:
            pass  # No subscription, check credits
        
        # Check free credits
        credits = getattr(user, 'quiz_credits', 0)
        
        if credits <= 0:
            # No credits left - redirect to payment
            return Response({
                'error': 'You have used your 2 free quizzes! Subscribe to continue.',
                'credits_exhausted': True,
                'redirect': '/pricing',
                'quiz_credits': 0,
                'message': '🎓 Ready to unlock unlimited quizzes? Subscribe now!'
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        # User has credits - proceed and deduct after successful submission
        response = view_func(request, *args, **kwargs)
        
        # Only deduct credit if submission was successful
        if response.status_code in [200, 201]:
            user.quiz_credits -= 1
            user.total_quizzes_taken = getattr(user, 'total_quizzes_taken', 0) + 1
            user.save(update_fields=['quiz_credits', 'total_quizzes_taken'])
            
            # Add credits info to response
            if hasattr(response, 'data'):
                response.data['quiz_credits'] = user.quiz_credits
                response.data['credits_message'] = (
                    f'✅ Quiz submitted! You have {user.quiz_credits} free quiz{"zes" if user.quiz_credits != 1 else ""} remaining.'
                    if user.quiz_credits > 0
                    else '⚠️ This was your last free quiz! Subscribe to continue.'
                )
        
        return response
    
    return wrapper


def get_user_credits_status(user):
    """
    Get user's credit status for API responses
    """
    if not user.is_authenticated:
        return {
            'has_access': False,
            'quiz_credits': 0,
            'subscription_status': 'none',
            'message': 'Sign up to get 2 free quizzes'
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
                'message': f'✨ {subscription.plan.name} - Unlimited access'
            }
    except:
        pass
    
    # Free trial user
    credits = getattr(user, 'quiz_credits', 0)
    
    return {
        'has_access': credits > 0,
        'quiz_credits': credits,
        'subscription_status': 'free_trial',
        'message': (
            f'🎓 {credits} free quiz{"zes" if credits != 1 else ""} remaining' 
            if credits > 0 
            else '💳 Subscribe to unlock unlimited quizzes'
        )
    }