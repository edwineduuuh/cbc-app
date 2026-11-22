"""Unfinished quizzes are saved on the server and follow the learner."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from questions.models import Quiz, QuizDraft, Subject

User = get_user_model()


class QuizDrafts(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = User.objects.create_user("d1", "d1@example.invalid", "pw-12345!", role="student")
        cls.other = User.objects.create_user("d2", "d2@example.invalid", "pw-12345!", role="student")
        subject = Subject.objects.create(name="Maths", slug="maths")
        cls.quiz = Quiz.objects.create(title="Fractions", grade=7, subject=subject, is_active=True)

    def url(self, qid=None):
        return f"/api/quizzes/{qid or self.quiz.id}/draft/"

    def test_save_then_load_on_another_device(self):
        self.client.force_authenticate(self.me)
        draft = {"qids": [1, 2], "answers": {"0": "28"}, "currentIdx": 1, "savedAt": 1}
        self.assertEqual(self.client.put(self.url(), {"draft": draft}, format="json").status_code, 204)
        draft["currentIdx"] = 2
        self.client.put(self.url(), {"draft": draft}, format="json")          # overwrite, not duplicate
        self.assertEqual(QuizDraft.objects.count(), 1)
        r = self.client.get(self.url())
        self.assertEqual(r.data["draft"]["currentIdx"], 2)

    def test_drafts_are_private(self):
        QuizDraft.objects.create(user=self.other, quiz=self.quiz, data={"answers": {"0": "x"}})
        self.client.force_authenticate(self.me)
        self.assertIsNone(self.client.get(self.url()).data["draft"])

    def test_delete_and_guards(self):
        self.client.force_authenticate(self.me)
        self.client.put(self.url(), {"draft": {"answers": {}}}, format="json")
        self.assertEqual(self.client.delete(self.url()).status_code, 204)
        self.assertFalse(QuizDraft.objects.exists())
        self.assertEqual(self.client.put(self.url(), {"draft": "x"}, format="json").status_code, 400)
        big = {"answers": {"0": "a" * 300_000}}
        self.assertEqual(self.client.put(self.url(), {"draft": big}, format="json").status_code, 413)
        self.assertEqual(self.client.put(self.url(99999), {"draft": {}}, format="json").status_code, 404)

    def test_signed_out_cannot_use_drafts(self):
        self.assertIn(self.client.get(self.url()).status_code, (401, 403))
