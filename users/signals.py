# AUTO-ACTIVATE FREE TRIAL ON REGISTRATION
# Add this to users/signals.py (create if doesn't exist)

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def activate_trial_on_signup(sender, instance, created, **kwargs):
    """Auto-grant 7-day trial when user registers"""
    if created and instance.role == 'student':  # Only for students
        instance.activate_free_trial()


# THEN in users/apps.py, make sure signals are loaded:
# 
# class UsersConfig(AppConfig):
#     default_auto_field = 'django.db.models.BigAutoField'
#     name = 'users'
#     
#     def ready(self):
#         import users.signals  # Import signals