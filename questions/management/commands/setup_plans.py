from django.core.management.base import BaseCommand
from questions.models import SubscriptionPlan


class Command(BaseCommand):
    help = (
        "Create the 3 subscription plans IF MISSING. Never overwrites an existing "
        "plan — prices are managed in the Django admin, not here."
    )

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Weekly",
                "slug": "weekly",
                "description": "Perfect for trying out StadiSpace",
                "price_kes": 349,
                "billing_period": "weekly",
                "duration_days": 7,
                "max_quizzes_per_day": 0,
                "can_access_b2c": True,
                "can_access_analytics": True,
                "can_download_pdf": False,
                "is_active": True,
                "order": 1,
            },
            {
                "name": "Monthly",
                "slug": "monthly",
                "description": "Most popular — best for consistent practice",
                "price_kes": 999,
                "billing_period": "monthly",
                "duration_days": 30,
                "max_quizzes_per_day": 0,
                "can_access_b2c": True,
                "can_access_analytics": True,
                "can_download_pdf": True,
                "is_active": True,
                "order": 2,
            },
            {
                "name": "Termly",
                "slug": "termly",
                "description": "Best value — covers an entire school term",
                "price_kes": 2199,
                "billing_period": "termly",
                "duration_days": 90,
                "max_quizzes_per_day": 0,
                "can_access_b2c": True,
                "can_access_analytics": True,
                "can_download_pdf": True,
                "is_active": True,
                "order": 3,
            },
        ]

        for plan_data in plans:
            slug = plan_data.pop("slug")
            # get_or_create ONLY sets these values when the row is first created.
            # An existing plan is left exactly as the admin configured it — this
            # command must never silently reset a live price.
            obj, created = SubscriptionPlan.objects.get_or_create(
                slug=slug,
                defaults=plan_data,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(
                    f"Created: {obj.name} — KES {obj.price_kes}/{obj.billing_period} (ID: {obj.id})"
                ))
            else:
                self.stdout.write(
                    f"Exists (left untouched): {obj.name} — KES {obj.price_kes}/"
                    f"{obj.billing_period} (ID: {obj.id})"
                )

        self.stdout.write(self.style.SUCCESS("\nDone. Prices are managed in the Django admin, not by this command."))
