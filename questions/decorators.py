# PAYWALL - Add to questions/decorators.py (create if doesn't exist)

from functools import wraps
from rest_framework.response import Response
from rest_framework import status

def requires_subscription(view_func):
    """
    Decorator to block access unless user has active trial or subscription
    Usage: @requires_subscription on any view
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = request.user
        
        if not user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'paywall': True
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Admins and teachers always have access
        if user.role in ['admin', 'superadmin', 'teacher', 'school_admin'] or user.is_staff:
            return view_func(request, *args, **kwargs)
        
        # Check if student has access (credits or subscription)
        if not user.has_access:
            return Response({
                'error': 'No free quizzes remaining',
                'paywall': True,
                'quiz_credits': 0,
                'message': 'You have used all 4 free quizzes. Subscribe to unlock unlimited access!',
                'redirect': '/subscribe'
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


# USAGE IN VIEWS:
# from questions.decorators import requires_subscription
#
# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @requires_subscription  # ← ADD THIS
# def submit_quiz(request):
#     ...