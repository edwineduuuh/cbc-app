"""Security tests for Phase 0.

Each test pins down a hole that was open in production: answer keys served to
anyone, central content editable by any logged-in user, and payment callbacks
trusted on their word. If one of these fails, something has re-opened it.

Run:  python manage.py test questions
"""
from datetime import timedelta
from unittest import mock

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from questions.models import (
    Attempt, PaymentRequest, Question, QuestionPart, Quiz, Subject,
    Subscription, SubscriptionPlan, Topic,
)
from questions.serializers import redact_table
from users.models import User

MATCHING_TABLE = {
    "table_type": "matching",
    "rows": [
        [{"v": "Animal"}, {"v": "Group"}],
        [{"v": "Frog"}, {"e": True, "a": "Amphibian"}],
        [{"v": "Eagle"}, {"e": True, "a": "Bird"}],
        [{"v": "Shark"}, {"e": True, "a": "Fish"}],
    ],
}
FILL_TABLE = {
    "rows": [
        [{"v": "Item"}, {"v": "Cost"}, {"v": "Total"}],
        [{"v": "Pens"}, {"v": "10"}, {"e": True, "a": "50"}],
        [{"v": "Books"}, {"v": "20"}, {"e": True, "a": "40"}],
    ],
}


def client_for(user):
    c = APIClient()
    if user is not None:
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return c


class Fixtures(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.student = User.objects.create_user("s1", "s1@example.invalid", "pw-12345!", role="student")
        cls.other_student = User.objects.create_user("s2", "s2@example.invalid", "pw-12345!", role="student")
        # Anyone can self-register as a teacher, so a teacher is a customer.
        cls.teacher = User.objects.create_user("t1", "t1@example.invalid", "pw-12345!", role="teacher")
        cls.editor = User.objects.create_user("e1", "e1@example.invalid", "pw-12345!", role="content_editor")
        cls.admin = User.objects.create_user("a1", "a1@example.invalid", "pw-12345!", role="admin")

        cls.subject = Subject.objects.create(name="Science", slug="science")
        cls.topic = Topic.objects.create(subject=cls.subject, grade=7, name="Living things", slug="living")
        cls.mcq = Question.objects.create(
            topic=cls.topic, question_type="mcq", question_text="Which is a bird?",
            option_a="Frog", option_b="Eagle", option_c="Shark", option_d="Cow",
            correct_answer="B", worked_solution={"steps": ["Eagles have feathers"]},
        )
        cls.multipart = Question.objects.create(
            topic=cls.topic, question_type="multipart", question_text="Answer the parts",
        )
        QuestionPart.objects.create(
            parent_question=cls.multipart, part_label="a", question_text="Name one",
            correct_answer="Eagle", marking_scheme={"points": ["Eagle"]}, explanation="Birds fly",
        )
        cls.matching = Question.objects.create(
            topic=cls.topic, question_type="table", question_text="Match them",
            table_data=MATCHING_TABLE,
        )
        cls.quiz = Quiz.objects.create(title="Q", grade=7, subject=cls.subject, is_active=True)
        cls.quiz.questions.set([cls.mcq, cls.multipart, cls.matching])


class AnswerKeysAreNotPublic(Fixtures):
    def _questions(self, user):
        r = client_for(user).get(f"/api/quizzes/{self.quiz.id}/")
        self.assertEqual(r.status_code, 200)
        return {q["id"]: q for q in r.json()["questions"]}

    def test_guest_and_student_get_no_answers(self):
        for user in (None, self.student, self.teacher):
            qs = self._questions(user)
            mcq, mp = qs[self.mcq.id], qs[self.multipart.id]
            self.assertNotIn("correct_answer", mcq)
            self.assertNotIn("worked_solution", mcq)
            part = mp["parts"][0]
            for f in ("correct_answer", "marking_scheme", "explanation"):
                self.assertNotIn(f, part)
            self.assertEqual(part["question_text"], "Name one")  # still answerable

    def test_matching_table_keeps_chips_but_not_the_pairing(self):
        td = self._questions(None)[self.matching.id]["table_data"]
        self.assertEqual(sorted(td["chip_pool"]), ["Amphibian", "Bird", "Fish"])
        for row in td["rows"][1:]:
            self.assertEqual(row[1].get("v"), "")
            self.assertNotIn("a", row[1])
            self.assertTrue(row[1]["e"])
        self.assertEqual(td["rows"][1][0]["v"], "Frog")  # prompt column intact

    def test_fill_table_loses_cell_answers(self):
        td = redact_table(FILL_TABLE)
        self.assertNotIn("chip_pool", td)
        self.assertNotIn("a", td["rows"][1][2])
        self.assertEqual(td["rows"][1][1]["v"], "10")  # given values stay
        self.assertEqual(FILL_TABLE["rows"][1][2]["a"], "50")  # original untouched

    def test_content_staff_see_answers(self):
        for user in (self.admin, self.editor):
            self.assertEqual(self._questions(user)[self.mcq.id]["correct_answer"], "B")

    def test_submitted_attempt_shows_answers_to_its_owner(self):
        a = Attempt.objects.create(quiz=self.quiz, student=self.student, status="completed",
                                   answers={str(self.mcq.id): "A"})
        r = client_for(self.student).get(f"/api/attempts/{a.id}/")
        self.assertEqual(r.status_code, 200)
        qs = {q["id"]: q for q in r.json()["quiz"]["questions"]}
        self.assertEqual(qs[self.mcq.id]["correct_answer"], "B")

    def test_grading_status_only_for_the_owner(self):
        a = Attempt.objects.create(quiz=self.quiz, student=self.student, status="completed", score=50)
        url = f"/api/attempts/{a.id}/grading-status/"
        self.assertEqual(client_for(None).get(url).status_code, 401)
        self.assertEqual(client_for(self.other_student).get(url).status_code, 404)
        self.assertEqual(client_for(self.student).get(url).status_code, 200)


class CentralContentIsAdminOnly(Fixtures):
    def test_customers_cannot_read_or_change_the_question_bank(self):
        for user in (self.student, self.teacher):
            c = client_for(user)
            self.assertEqual(c.get("/api/admin/questions/manage/").status_code, 403)
            self.assertEqual(c.patch(f"/api/admin/questions/{self.mcq.id}/",
                                     {"question_text": "hacked"}, format="json").status_code, 403)
            self.assertEqual(c.delete(f"/api/admin/questions/{self.mcq.id}/").status_code, 403)
            self.assertEqual(c.post("/api/admin/questions/create/", {}, format="json").status_code, 403)
            self.assertEqual(c.post("/api/admin/questions/bulk-import/").status_code, 403)
            self.assertEqual(c.post("/api/admin/bulk-upload/").status_code, 403)
        self.mcq.refresh_from_db()
        self.assertEqual(self.mcq.question_text, "Which is a bird?")

    def test_customers_cannot_touch_quizzes_or_curriculum(self):
        for user in (self.student, self.teacher):
            c = client_for(user)
            self.assertEqual(c.post(f"/api/admin/quizzes/{self.quiz.id}/publish/").status_code, 403)
            self.assertEqual(c.delete(f"/api/admin/quizzes/{self.quiz.id}/").status_code, 403)
            self.assertEqual(c.get(f"/api/admin/quizzes/{self.quiz.id}/export/").status_code, 403)
            self.assertEqual(c.delete(f"/api/admin/topics/{self.topic.id}/").status_code, 403)
            self.assertEqual(c.post("/api/admin/motivational/", {"text": "x"}, format="json").status_code, 403)
        self.quiz.refresh_from_db()
        self.assertTrue(self.quiz.is_active)
        self.assertTrue(Topic.objects.filter(pk=self.topic.pk).exists())

    def test_content_editor_edits_questions_but_not_curriculum(self):
        c = client_for(self.editor)
        self.assertEqual(c.get("/api/admin/questions/manage/").status_code, 200)
        self.assertEqual(c.get(f"/api/admin/topics/?subject={self.subject.id}").status_code, 200)
        self.assertEqual(c.delete(f"/api/admin/topics/{self.topic.id}/").status_code, 403)
        self.assertEqual(c.get("/api/admin/payments/").status_code, 403)

    def test_admin_keeps_full_access(self):
        c = client_for(self.admin)
        self.assertEqual(c.get("/api/admin/questions/manage/").status_code, 200)
        self.assertEqual(c.get(f"/api/admin/quizzes/{self.quiz.id}/export/").status_code, 200)
        self.assertEqual(c.get("/api/admin/payments/").status_code, 200)

    def test_school_admin_role_grants_nothing(self):
        sa = User.objects.create_user("sa", "sa@example.invalid", "pw-12345!", role="school_admin")
        self.assertEqual(client_for(sa).get("/api/admin/payments/").status_code, 403)

    def test_public_endpoints_still_public(self):
        c = client_for(None)
        self.assertEqual(c.get("/api/subjects/").status_code, 200)
        self.assertEqual(c.get("/api/quizzes/").status_code, 200)
        self.assertEqual(c.get("/api/plans/").status_code, 200)
        # Live sessions are account-free by design: unknown id is 404, not 401.
        # (join/ and leaderboard/ are not used here: both already raise
        # NameError on master - the code still says Classroom, renamed to
        # LiveSession. Separate bug, tracked in docs/revamp.)
        self.assertEqual(c.get("/api/sessions/999999/results/").status_code, 404)

    def test_email_diagnostic_needs_admin(self):
        r = client_for(None).post("/api/auth/email-diagnostic/", {"email": "x@example.invalid"},
                                  HTTP_X_DIAG_KEY="stadispace_diag_2026")
        self.assertEqual(r.status_code, 401)


class FakeResponse:
    def __init__(self, payload, status=200):
        self.status_code, self._p, self.text = status, payload, str(payload)

    def json(self):
        return self._p


class PaymentCallbackIsVerified(Fixtures):
    def setUp(self):
        self.plan = SubscriptionPlan.objects.create(
            name="Darja", slug="darja", price_kes=300, duration_days=30)
        self.payment = PaymentRequest.objects.create(
            user=self.student, plan=self.plan, phone_number="0712345678",
            amount_paid=300, checkout_request_id="INV123")
        self.forged = {"invoice_id": "INV123", "state": "COMPLETE", "value": 300}

    def _post(self, body):
        return client_for(None).post("/api/payments/callback/", body, format="json")

    def _premium(self):
        return Subscription.objects.filter(user=self.student, is_active=True,
                                           end_date__gt=timezone.now()).exists()

    @mock.patch.dict("os.environ", {"INTASEND_API_TOKEN": "", "INTASEND_CHALLENGE": ""})
    def test_unverifiable_callback_is_not_applied(self):
        self._post(self.forged)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "pending")
        self.assertFalse(self._premium())

    @mock.patch.dict("os.environ", {"INTASEND_API_TOKEN": "tok", "INTASEND_CHALLENGE": ""})
    def test_forged_complete_rejected_when_intasend_says_pending(self):
        with mock.patch("requests.get", return_value=FakeResponse({"state": "PENDING"})):
            self._post(self.forged)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "pending")
        self.assertFalse(self._premium())

    @mock.patch.dict("os.environ", {"INTASEND_API_TOKEN": "tok", "INTASEND_CHALLENGE": ""})
    def test_real_payment_confirmed_by_intasend_activates(self):
        with mock.patch("requests.get", return_value=FakeResponse(
                {"state": "COMPLETE", "value": 300, "mpesa_reference": "QWE123"})):
            self._post(self.forged)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "verified")
        self.assertEqual(self.payment.mpesa_code, "QWE123")
        self.assertTrue(self._premium())

    @mock.patch.dict("os.environ", {"INTASEND_API_TOKEN": "tok", "INTASEND_CHALLENGE": ""})
    def test_underpayment_reported_by_intasend_is_rejected(self):
        with mock.patch("requests.get", return_value=FakeResponse({"state": "COMPLETE", "value": 10})):
            self._post({**self.forged, "value": 300})
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "rejected")
        self.assertFalse(self._premium())

    @mock.patch.dict("os.environ", {"INTASEND_API_TOKEN": "", "INTASEND_CHALLENGE": "s3cret"})
    def test_challenge_secret_still_works_without_api_token(self):
        self._post({**self.forged, "challenge": "wrong"})
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "pending")
        self._post({**self.forged, "challenge": "s3cret"})
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "verified")
