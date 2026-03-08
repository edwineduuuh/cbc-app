from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from questions.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize UserProfile for all existing users'

    def handle(self, *args, **options):
        users = User.objects.all()
        created_count = 0
        
        for user in users:
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'free_quizzes_remaining': 3}
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"✓ Created profile for {user.username}")
        
        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Complete! Created {created_count} profiles")
        )