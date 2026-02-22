"""
Save as: users/adapters.py

Handles OAuth account creation and user linking
"""

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.utils import perform_login
from allauth.exceptions import ImmediateHttpResponse
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter to handle OAuth login
    Creates student accounts by default
    """
    
    def pre_social_login(self, request, sociallogin):
        """
        Check if user exists with this email
        If yes, connect the social account
        If no, create new user
        """
        
        # Get email from social account
        email = sociallogin.account.extra_data.get('email')
        
        if not email:
            return
        
        # Check if user with this email exists
        try:
            user = User.objects.get(email=email)
            
            # Connect social account to existing user
            if not sociallogin.is_existing:
                sociallogin.connect(request, user)
                
        except User.DoesNotExist:
            # Will create new user in populate_user
            pass
    
    def populate_user(self, request, sociallogin, data):
        """
        Create user from social login data
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Set default role as student
        user.role = 'student'
        
        # Get name from social provider
        if 'name' in data:
            names = data['name'].split(' ', 1)
            user.first_name = names[0]
            user.last_name = names[1] if len(names) > 1 else ''
        elif 'given_name' in data:
            user.first_name = data.get('given_name', '')
            user.last_name = data.get('family_name', '')
        
        return user
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save the user after OAuth login
        """
        user = super().save_user(request, sociallogin, form)
        
        # Ensure role is set
        if not user.role:
            user.role = 'student'
            user.save()
        
        return user