"""
Live lessons v2 — replace the earlier LiveSlot/LiveBooking (duration-per-kid
model, briefly deployed) with LiveAvailability + a group-session LiveBooking.
Forward-only: the earlier 0042/0043 stay in history (they were applied in prod),
this migration transforms from there. No booking data existed, so old tables are
dropped and the new ones created.
"""
from django.conf import settings
import django.db.models.deletion
from django.db import migrations, models


STATUS_CHOICES = [
    ("requested", "Requested"),
    ("approved", "Approved — awaiting payment"),
    ("payment_submitted", "Payment submitted — verifying"),
    ("confirmed", "Confirmed"),
    ("rejected", "Rejected"),
    ("cancelled", "Cancelled"),
    ("completed", "Completed"),
]
WINDOW_CHOICES = [
    ("w0800", "8:00 – 10:00 AM"),
    ("w1030", "10:30 – 12:30 PM"),
    ("w1400", "2:00 – 4:00 PM"),
    ("w1630", "4:30 – 6:30 PM"),
    ("w1900", "7:00 – 9:00 PM"),
]


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("questions", "0043_remove_liveslot_duration_minutes_and_more"),
    ]

    operations = [
        migrations.DeleteModel(name="LiveBooking"),
        migrations.DeleteModel(name="LiveSlot"),
        migrations.CreateModel(
            name="LiveAvailability",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_start", models.DateField(help_text="First date this applies (inclusive)")),
                ("date_end", models.DateField(help_text="Last date this applies (inclusive)")),
                ("label", models.CharField(blank=True, help_text="e.g. August holiday", max_length=80)),
                ("price_kes", models.IntegerField(default=1500, help_text="Flat price per group session in this range")),
                ("is_active", models.BooleanField(default=True)),
                ("open_w0800", models.BooleanField(default=True, verbose_name="8:00–10:00 AM")),
                ("open_w1030", models.BooleanField(default=True, verbose_name="10:30–12:30 PM")),
                ("open_w1400", models.BooleanField(default=True, verbose_name="2:00–4:00 PM")),
                ("open_w1630", models.BooleanField(default=True, verbose_name="4:30–6:30 PM")),
                ("open_w1900", models.BooleanField(default=True, verbose_name="7:00–9:00 PM")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name_plural": "Live availability",
                "db_table": "live_availability",
                "ordering": ["date_start"],
            },
        ),
        migrations.CreateModel(
            name="LiveBooking",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=STATUS_CHOICES, default="requested", max_length=20)),
                ("session_date", models.DateField()),
                ("window_key", models.CharField(choices=WINDOW_CHOICES, max_length=10)),
                ("learning_area", models.CharField(blank=True, help_text="Subject, or 'General'", max_length=120)),
                ("strand", models.CharField(blank=True, help_text="Strand/topic, or 'General'", max_length=200)),
                ("note", models.TextField(blank=True, help_text="What the student wants help with")),
                ("phone", models.CharField(help_text="Contact / M-Pesa phone", max_length=15)),
                ("amount_kes", models.IntegerField(help_text="Price snapshot at booking time")),
                ("checkout_request_id", models.CharField(blank=True, default="", max_length=100)),
                ("mpesa_code", models.CharField(blank=True, default="", max_length=20)),
                ("zoom_link", models.URLField(blank=True)),
                ("admin_notes", models.TextField(blank=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="live_bookings", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "live_bookings",
                "ordering": ["-created_at"],
            },
        ),
    ]
