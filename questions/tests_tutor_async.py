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
                                             cached_ai_lesson={"heading": "Solutions", "v": tutor.LESSON_VERSION})

    def setUp(self):
        self.pool = FakePool()
        self.cache = LocMemCache("tutor-test", {})
        self.cache.clear()      # locmem caches with one name share storage
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


class TutorFollowsKicd(TutorNeverBlocks):
    """The KICD design is the syllabus; lessons carry diagrams."""

    def setUp(self):
        super().setUp()
        Substrand.objects.filter(pk=self.sub_a.pk).update(
            kicd_code="1.1",
            learning_outcomes=["separate mixtures by filtration", "explain evaporation"],
            learning_experiences=["filter muddy water in groups"],
            inquiry_questions=["How can we separate mixtures?"])
        self.sub_a.refresh_from_db()

    def test_whole_strand_teaches_every_substrand(self):
        r = self.client.get(f"/api/tutor/topics/{self.topic.id}/lesson/")
        self.assertEqual([l["substrand"]["name"] for l in r.data["lessons"]], ["Separation", "Solutions"])

    def test_kicd_design_is_in_the_prompt(self):
        block = tutor._kicd_block(self.topic, self.sub_a)
        for text in ("separate mixtures by filtration", "filter muddy water", "How can we separate"):
            self.assertIn(text, block)
        sent = {}

        def fake_ai(prompt, system="", **k):
            sent["prompt"] = prompt
            return ('{"heading": "Separating", "sections": ['
                    '{"title": "Filtration", "body": "b", "diagram": {"subject": "a filter funnel", "labels": ["filter paper"]}},'
                    '{"title": "Graph", "body": "b", "plot": {"type": "number_line", "min": 0, "max": 5, "step": 1}},'
                    '{"title": "Words", "body": "b"}]}')
        with mock.patch("questions.generation.generate", fake_ai),                 mock.patch.object(tutor, "_call_claude", side_effect=AssertionError("no fallback expected")):
            lesson = tutor.generate_lesson(self.topic, substrand=self.sub_a)
        self.assertIn("Teach EVERY specific learning outcome", sent["prompt"])
        self.assertIn("explain evaporation", sent["prompt"])
        self.assertEqual(lesson["v"], tutor.LESSON_VERSION)
        secs = lesson["sections"]
        self.assertTrue(secs[0]["diagram"]["pending"])               # picture: drawn next
        self.assertTrue(secs[1]["diagram"]["url"].endswith(".svg"))  # maths: drawn exactly, now
        self.assertNotIn("diagram", secs[2])

        with mock.patch("questions.diagrams.generate_diagram", return_value="/api/diagrams/abc.png"):
            self.assertTrue(tutor.draw_lesson_diagrams(lesson))
        self.assertEqual(secs[0]["diagram"], {"url": "/api/diagrams/abc.png", "alt": "a filter funnel"})

    def test_old_lessons_are_rewritten_but_shown_meanwhile(self):
        old = {"heading": "Old", "sections": []}
        Substrand.objects.filter(pk=self.sub_b.pk).update(cached_ai_lesson=old)
        self.sub_b.refresh_from_db()
        self.assertEqual(tutor.unit_status("lesson", self.topic, self.sub_b), (old, "writing"))
        self.assertEqual(len(self.pool.jobs), 1)
        # a failed rewrite keeps the old lesson and does not retry every poll
        key = tutor._gen_key("lesson", self.topic, self.sub_b)
        self.cache.delete(key)
        self.cache.set(key + ":failed", 1, 60)
        self.assertEqual(tutor.unit_status("lesson", self.topic, self.sub_b), (old, "ready"))
        self.assertEqual(len(self.pool.jobs), 1)

    def test_chat_diagrams_become_pictures(self):
        reply = "A fibreglass sheet looks like this:\n[[diagram: a fibreglass sheet | glass fibres; resin]]\nSee?"
        text, diagrams = tutor.extract_chat_diagrams(reply)
        self.assertNotIn("[[", text)
        self.assertEqual(len(diagrams), 1)
        self.assertRegex(diagrams[0]["url"], r"^/api/diagrams/[0-9a-f]{32}\.png$")
        self.assertEqual(len(self.pool.jobs), 1)                     # drawing started


class DiagramsAreSmall(TutorNeverBlocks):
    def test_line_art_is_compressed(self):
        import io
        from PIL import Image, ImageDraw
        from questions.diagrams import _compress_line_art
        im = Image.new("RGB", (1024, 1024), (252, 252, 250))
        d = ImageDraw.Draw(im)
        for i in range(0, 1024, 40):
            d.line([(i, 0), (1024 - i, 1024)], fill=(10, 10, 12), width=3)
        raw = io.BytesIO(); im.save(raw, "PNG")
        small = _compress_line_art(raw.getvalue())
        self.assertLess(len(small), len(raw.getvalue()))
        self.assertEqual(Image.open(io.BytesIO(small)).size, (1024, 1024))

    def test_unreadable_image_is_kept_as_is(self):
        from questions.diagrams import _compress_line_art
        self.assertEqual(_compress_line_art(b"not a png"), b"not a png")
