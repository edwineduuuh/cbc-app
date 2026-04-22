import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
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
            self.stdout.write(self.style.WARNING(f"Fixture not found — skipping."))
            return

        # Clear partial data from previous failed attempts
        self.stdout.write("Clearing partial data...")
        with connection.cursor() as cursor:
            cursor.execute("""
                TRUNCATE TABLE
                    questions_studentanswer, questions_studentsession,
                    questions_livequestion, questions_livesession,
                    questions_attempt, questions_classquizassignment,
                    questions_subscription, questions_paymentrequest,
                    questions_subscriptionplan, questions_guestusage,
                    questions_lessonplan, questions_motivationalcontent,
                    quizzes_questions, quizzes_assigned_classrooms, quizzes,
                    question_sets_questions, question_sets,
                    question_parts, questions, passages, topics, subjects,
                    user_profiles, classrooms_students, classroom_invitations,
                    classrooms, users, authtoken_token,
                    account_emailaddress, account_emailconfirmation,
                    socialaccount_socialtoken, socialaccount_socialaccount,
                    ai_grading_settings, live_sessions
                RESTART IDENTITY CASCADE
            """)

        self.stdout.write("Loading fixture...")
        call_command('loaddata', fixture, verbosity=1)
        self.stdout.write(self.style.SUCCESS("All data loaded."))
