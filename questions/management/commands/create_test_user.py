from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from questions.models import Subscription, SubscriptionPlan
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Create test user
        user, created = User.objects.get_or_create(
            username='testpaid',
            defaults={
                'email': 'testpaid@test.com',
                'is_staff': False,
                'role': 'student'
            }
        )
        user.set_password('testpaid123')
        user.save()
        
        # Get or create a plan
        plan, _ = SubscriptionPlan.objects.get_or_create(
            slug='test-plan',
            defaults={
                'name': 'Test Plan',
                'price_kes': 0,
                'billing_period': 'annual',
                'duration_days': 365,
                'max_quizzes_per_day': 0,
            }
        )
        
        # Create subscription (expires in 1 year)
        Subscription.objects.update_or_create(
            user=user,
            defaults={
                'plan': plan,
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=365),
                'is_active': True,
            }
        )
        
        self.stdout.write(self.success_message(
            f"✅ Created user: testpaid / testpaid123 with active subscription"
        ))