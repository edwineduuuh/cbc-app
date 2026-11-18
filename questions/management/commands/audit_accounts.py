"""Read-only account audit: who maintains the question bank, and which
roles actually exist.

    python manage.py audit_accounts

Prints counts and role labels only - no usernames, emails or phone numbers -
so the output is safe to paste into a chat or an issue. Writes nothing.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Max, Q
from django.utils import timezone

from questions.models import Passage, Question, Quiz, Subscription
from users.models import User


class Command(BaseCommand):
    help = "Read-only summary of roles and who authors central content."

    def handle(self, *args, **options):
        out = self.stdout.write
        recent = timezone.now() - timedelta(days=90)

        out("Users by role (role, is_staff, is_superuser, count):")
        for r in (User.objects.values("role", "is_staff", "is_superuser")
                  .annotate(n=Count("id")).order_by("-n")):
            out(f"  {r['role']:<13} staff={r['is_staff']!s:<5} "
                f"super={r['is_superuser']!s:<5} {r['n']}")

        out("\nQuestions by author role (role, questions, distinct authors, "
            "touched in last 90 days):")
        for r in (Question.objects.values("created_by__role")
                  .annotate(n=Count("id"),
                            authors=Count("created_by", distinct=True),
                            recent=Count("id", filter=Q(updated_at__gte=recent)))
                  .order_by("-n")):
            out(f"  {r['created_by__role'] or '(no author)':<13} "
                f"{r['n']:>6} {r['authors']:>4} {r['recent']:>6}")

        out("\nQuizzes by creator role (role, active, count):")
        for r in (Quiz.objects.values("created_by__role", "is_active")
                  .annotate(n=Count("id")).order_by("-n")):
            out(f"  {r['created_by__role'] or '(none)':<13} "
                f"active={r['is_active']!s:<5} {r['n']}")

        out("\nPassages by creator role:")
        for r in (Passage.objects.values("created_by__role")
                  .annotate(n=Count("id")).order_by("-n")):
            out(f"  {r['created_by__role'] or '(none)':<13} {r['n']}")

        # "Facilitator" is the label on the sign-up form; it is stored as
        # role="teacher". A literal "facilitator" (or anything else outside
        # ROLE_CHOICES) could only have been typed in by hand - report it.
        known = {value for value, _ in User.ROLE_CHOICES}
        odd = (User.objects.exclude(role__in=known).values("role")
               .annotate(n=Count("id")).order_by("-n"))
        out("\nRoles outside ROLE_CHOICES (e.g. a hand-typed 'facilitator'):")
        for r in odd:
            authored = Question.objects.filter(created_by__role=r["role"]).count()
            out(f"  {r['role']!r:<15} accounts={r['n']} questions_authored={authored}")
        if not odd:
            out("  none")
        out("Note: the sign-up option 'Facilitator' is stored as role='teacher'.")

        sa = User.objects.filter(role="school_admin")
        out(f"\nschool_admin accounts: {sa.count()} "
            f"(staff: {sa.filter(is_staff=True).count()}, "
            f"last login: {sa.aggregate(m=Max('last_login'))['m']})")

        teacher_authors = (Question.objects.filter(created_by__role="teacher")
                           .values("created_by").distinct().count())
        out(f"Teacher accounts that authored questions: {teacher_authors}")

        out(f"\nTotals: questions={Question.objects.count()} "
            f"linked to a sub-strand="
            f"{Question.objects.exclude(substrand=None).count()} "
            f"quizzes={Quiz.objects.count()} "
            f"active subscriptions="
            f"{Subscription.objects.filter(is_active=True, end_date__gt=timezone.now()).count()}")
        newest = Question.objects.aggregate(m=Max("created_at"))["m"]
        out(f"Newest question: {newest}")
