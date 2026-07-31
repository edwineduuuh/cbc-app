"""
One-off data migration: set every current free-trial student to 3 quiz credits,
matching the new default. Subscribed students are skipped (they're unlimited).
Runs automatically on deploy; reverse is a no-op.
"""
from django.db import migrations
from django.utils import timezone


def top_up(apps, schema_editor):
    User = apps.get_model("users", "User")
    Subscription = apps.get_model("questions", "Subscription")
    active_sub_ids = set(
        Subscription.objects
        .filter(is_active=True, end_date__gte=timezone.now())
        .values_list("user_id", flat=True)
    )
    (User.objects
        .filter(role="student")
        .exclude(id__in=active_sub_ids)
        .update(quiz_credits=3))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0014_alter_user_quiz_credits"),
        ("questions", "0046_alter_userprofile_free_quizzes_remaining"),
    ]

    operations = [
        migrations.RunPython(top_up, noop),
    ]
