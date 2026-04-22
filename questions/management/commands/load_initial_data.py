import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from questions.models import Question


class Command(BaseCommand):
    help = "Load initial data only if DB is empty"

    def handle(self, *args, **options):
        if Question.objects.exists():
            self.stdout.write("Data already loaded — skipping.")
            return

        fixture = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data_clean.json')
        fixture = os.path.abspath(fixture)

        if not os.path.exists(fixture):
            self.stdout.write(self.style.WARNING(f"Fixture not found at {fixture} — skipping."))
            return

        self.stdout.write("DB is empty — loading data...")
        call_command('loaddata', fixture, verbosity=1)
        self.stdout.write(self.style.SUCCESS("Data loaded."))
