from django.core.management.base import BaseCommand
from questions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Create or update the 3 subscription plans: Weekly (149), Monthly (499), Termly (999)"

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Weekly",
                "slug": "weekly",
                "description": "Perfect for trying out StadiSpace",
                "price_kes": 149,
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
                "price_kes": 499,
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
                "price_kes": 999,
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

        # Deactivate any old plans not in our 3
        kept_slugs = [p["slug"] for p in plans]
        deactivated = SubscriptionPlan.objects.exclude(slug__in=kept_slugs).filter(is_active=True).update(is_active=False)
        if deactivated:
            self.stdout.write(f"Deactivated {deactivated} old plan(s)")

        for plan_data in plans:
            slug = plan_data.pop("slug")
            obj, created = SubscriptionPlan.objects.update_or_create(
                slug=slug,
                defaults=plan_data,
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"{action}: {obj.name} — KES {obj.price_kes}/{obj.billing_period} (ID: {obj.id})"
            ))

        self.stdout.write(self.style.SUCCESS("\nDone! Plans are ready."))
        self.stdout.write(
            "IMPORTANT: Update the plan IDs in the frontend subscribe page "
            "to match the database IDs shown above."
        )
