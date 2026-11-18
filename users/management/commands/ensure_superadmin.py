"""Create the 'superadmin' account on first deploy - from environment
variables, never from a password written in the repo.

    DJANGO_SUPERADMIN_PASSWORD   required to create the account
    DJANGO_SUPERADMIN_EMAIL      optional (default admin@stadispace.co.ke)

Does nothing if the account already exists (it never resets a password) or
if the password variable is not set. Safe to run on every deploy.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the superadmin account from env vars if it does not exist."

    def handle(self, *args, **options):
        User = get_user_model()
        if User.objects.filter(username="superadmin").exists():
            self.stdout.write("superadmin exists - nothing to do.")
            return
        password = os.environ.get("DJANGO_SUPERADMIN_PASSWORD", "")
        if not password:
            self.stdout.write("DJANGO_SUPERADMIN_PASSWORD not set - skipping.")
            return
        User.objects.create_superuser(
            username="superadmin",
            email=os.environ.get("DJANGO_SUPERADMIN_EMAIL", "admin@stadispace.co.ke"),
            password=password,
        )
        self.stdout.write("superadmin created.")
