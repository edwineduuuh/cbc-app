import os
import sys
import threading
import time

from django.apps import AppConfig


class QuestionsConfig(AppConfig):
    name = 'questions'

    def ready(self):
        # Only in the web server - never in migrate, tests or shell.
        if "gunicorn" not in os.path.basename(sys.argv[0] or "") and \
                os.environ.get("ASSESSMENT_WATCHDOG") != "1":
            return
        threading.Thread(target=_watchdog, daemon=True, name="assessment-watchdog").start()


def _watchdog():
    """Restart papers left half-written by a deploy or restart."""
    from django.db import connection
    time.sleep(30)        # let the server finish starting
    while True:
        try:
            from questions.facilitator_views import revive_dead_jobs
            revive_dead_jobs()
        except Exception:
            pass
        finally:
            connection.close()
        time.sleep(60)
