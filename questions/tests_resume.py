"""A paper being written when the server restarts is picked up again."""
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from questions import facilitator_views as fv
from questions.models import GeneratedOutput, Subject, Substrand, Topic

User = get_user_model()


class ResumeAfterRestart(TestCase):
    def setUp(self):
        self.fac = User.objects.create_user("fac", "f@x.invalid", "pw-123456", role="teacher")
        s = Subject.objects.create(name="Science", slug="science")
        t = Topic.objects.create(subject=s, grade=6, name="Force and Energy", slug="force")
        self.sub = Substrand.objects.create(topic=t, name="Light")
        self.out = GeneratedOutput.objects.create(
            teacher=self.fac, tool="assessment", title="x", payload={},
            status=GeneratedOutput.STATUS_RUNNING,
            inputs={"count": 10, "description": "", "mcq_ratio": None, "diagrams": True,
                    "substrands": [self.sub.id]})

    def kill(self, seconds=120):
        """Pretend the worker writing it died `seconds` ago."""
        GeneratedOutput.objects.filter(pk=self.out.pk).update(
            updated_at=timezone.now() - timedelta(seconds=seconds))
        self.out.refresh_from_db()

    def test_live_paper_is_left_alone(self):
        with mock.patch.object(fv, "_launch") as launch:
            fv.revive_dead_jobs()
        launch.assert_not_called()

    def test_dead_paper_is_restarted_once_and_keeps_running(self):
        self.kill()
        with mock.patch.object(fv, "_launch") as launch:
            fv.revive_dead_jobs()
            fv.revive_dead_jobs()                     # second sweep: now alive again
        launch.assert_called_once()
        args = launch.call_args[0]
        self.assertEqual((args[0], args[1], args[3]), (self.out.pk, [self.sub.id], self.fac.id))
        self.out.refresh_from_db()
        self.assertEqual(self.out.inputs["_attempts"], 2)
        self.assertEqual(fv._status_of(self.out), "running")   # never shown as failed

    def test_two_workers_noticing_together_restart_it_once(self):
        self.kill()
        stale_copy = GeneratedOutput.objects.get(pk=self.out.pk)
        with mock.patch.object(fv, "_launch") as launch:
            self.assertTrue(fv.revive(self.out))
            self.assertFalse(fv.revive(stale_copy))   # lost the claim
        launch.assert_called_once()

    def test_gives_up_after_three_attempts(self):
        self.out.inputs = {**self.out.inputs, "_attempts": 3}
        self.out.save()
        self.kill()
        with mock.patch.object(fv, "_launch") as launch:
            fv.revive_dead_jobs()
        launch.assert_not_called()
        self.assertEqual(fv._status_of(self.out), "failed")

    def test_opening_the_paper_revives_it(self):
        self.kill()
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.fac).access_token}")
        with mock.patch.object(fv, "_launch") as launch:
            r = c.get(f"/api/facilitator/library/{self.out.pk}/")
        self.assertEqual(r.json()["status"], "running")
        launch.assert_called_once()

    def test_a_momentary_provider_error_is_retried(self):
        paper = {"title": "Light test", "questions": [{"question_text": "q"}]}
        with mock.patch.object(fv, "generate_assessment",
                               side_effect=[RuntimeError("overloaded"), paper]):
            fv._build_assessment(self.out.pk, [self.sub.id], self.out.inputs, self.fac.id)
        self.out.refresh_from_db()
        self.assertEqual(self.out.status, "ready")
        self.assertEqual(self.out.title, "Light test")
