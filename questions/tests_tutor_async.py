"""Tutor lessons and flash cards never hold a request open on the AI."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache.backends.locmem import LocMemCache
from rest_framework.test import APITestCase

from questions import tutor
from questions.models import Subject, Substrand, Topic

User = get_user_model()


class FakePool:
    def __init__(self):
        self.jobs = []

    def submit(self, fn, *args):
        self.jobs.append(args)


class TutorNeverBlocks(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user("t9", "t9@example.invalid", "pw-12345!", role="teacher")
        subject = Subject.objects.create(name="Science", slug="science")
        cls.topic = Topic.objects.create(subject=subject, grade=7, name="Mixtures", slug="mixtures")
        cls.sub_a = Substrand.objects.create(topic=cls.topic, name="Separation")
        cls.sub_b = Substrand.objects.create(topic=cls.topic, name="Solutions",
                                             cached_ai_lesson={"heading": "Solutions"})

    def setUp(self):
        self.pool = FakePool()
        self.cache = LocMemCache("tutor-test", {})
        p1 = mock.patch.object(tutor, "_GEN_POOL", self.pool)
        p2 = mock.patch.object(tutor, "_gen_cache", self.cache)
        p1.start(); p2.start()
        self.addCleanup(p1.stop); self.addCleanup(p2.stop)
        self.client.force_authenticate(self.staff)

    def test_ready_lessons_now_missing_ones_in_background(self):
        url = f"/api/tutor/topics/{self.topic.id}/lesson/?substrands={self.sub_a.id},{self.sub_b.id}"
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["pending"])
        by_name = {l["substrand"]["name"]: l for l in r.data["lessons"]}
        self.assertEqual(by_name["Solutions"]["status"], "ready")
        self.assertEqual(by_name["Separation"]["status"], "writing")
        self.assertEqual(len(self.pool.jobs), 1)
        self.client.get(url)                                 # a poll: no second paid job
        self.assertEqual(len(self.pool.jobs), 1)

    def test_failure_is_reported_and_retry_restarts(self):
        key = tutor._gen_key("lesson", self.topic, self.sub_a)
        self.cache.set(key + ":failed", 1, 60)
        self.assertEqual(tutor.unit_status("lesson", self.topic, self.sub_a), (None, "failed"))
        self.assertEqual(tutor.unit_status("lesson", self.topic, self.sub_a, retry=True), (None, "writing"))
        self.assertEqual(len(self.pool.jobs), 1)

    def test_flashcards_report_pending(self):
        r = self.client.get(f"/api/flashcards/?topic={self.topic.id}&substrands={self.sub_a.id}")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["pending"])
        self.assertEqual(r.data["cards"], [])

    def test_generation_stores_content_and_releases_lock(self):
        key = tutor._gen_key("lesson", self.topic, self.sub_a)
        self.cache.add(key, 1, 60)
        with mock.patch.object(tutor, "generate_lesson", return_value={"heading": "Separation"}), \
             mock.patch("django.db.connection.close"), mock.patch("django.db.close_old_connections"):
            tutor._generate_and_store("lesson", self.topic.id, self.sub_a.id, key)
        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.cached_ai_lesson["heading"], "Separation")
        self.assertIsNone(self.cache.get(key))
