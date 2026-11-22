"""Learners see only official KICD strands; legacy buckets stay for staff."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from questions.models import Question, Subject, Substrand, Topic

User = get_user_model()


class OfficialStrandsOnly(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.learner = User.objects.create_user("o1", "o1@example.invalid", "pw-12345!", role="student")
        cls.admin = User.objects.create_user("o2", "o2@example.invalid", "pw-12345!", role="admin")
        maths = Subject.objects.create(name="Mathematics", slug="maths")
        bio = Subject.objects.create(name="Biology", slug="bio")
        cls.official = Topic.objects.create(subject=maths, grade=9, name="Numbers", slug="numbers")
        Substrand.objects.create(topic=cls.official, name="Integers", learning_outcomes=["add integers"])
        cls.imported = Topic.objects.create(subject=maths, grade=9, name="Imported Questions - Grade 9", slug="imp")
        Question.objects.create(topic=cls.imported, question_type="mcq", question_text="kept?")
        cls.bio_bucket = Topic.objects.create(subject=bio, grade=9, name="Assorted Questions", slug="assorted")

    def test_learner_sees_official_strands_only(self):
        self.client.force_authenticate(self.learner)
        names = [t["name"] for t in self.client.get("/api/topics/?grade=9").data]
        self.assertEqual(names, ["Numbers"])

    def test_subject_with_only_a_legacy_bucket_is_hidden(self):
        self.client.force_authenticate(self.learner)
        names = [s["name"] for s in self.client.get("/api/subjects/?grade=9").data]
        self.assertEqual(names, ["Mathematics"])

    def test_staff_still_see_everything_and_questions_are_kept(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get("/api/topics/?grade=9").data), 3)
        self.assertTrue(Question.objects.filter(topic=self.imported).exists())
