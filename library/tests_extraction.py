"""AI curriculum mapping of PDF questions - with the AI replaced by scripted
answers, so the guard rails are what's being tested."""
import shutil
import tempfile
from unittest import mock

import fitz
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from questions.models import Subject, Substrand, Topic

from .extraction import run_extraction
from .models import ExtractedQuestion, ExtractionRun, Resource, approved_question_pool

User = get_user_model()
MEDIA = tempfile.mkdtemp()

PAGE1 = """Grade 7 Mathematics Exercise
1. Find the area of a rectangle 5 cm long and 3 cm wide. (2 marks)
2. Find the perimeter of a square of side 4 cm. (2 marks)
Example: the area of a 2 cm square is 2 x 2 = 4 cm2.
"""
PAGE2 = """3. Work out 1/2 + 1/4. (1 mark)
4. A triangle has base 6 cm and height 4 cm. Find its area.
ANSWERS
1. 15 cm2
"""


def make_pdf():
    doc = fitz.open()
    for text in (PAGE1, PAGE2):
        page = doc.new_page()
        page.insert_textbox(fitz.Rect(50, 50, 550, 800), text, fontsize=10)
    data = doc.tobytes()
    doc.close()
    return data


def client_for(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


@override_settings(MEDIA_ROOT=MEDIA, LIBRARY_EXTRACT_SYNC=True,
                   DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage")
class CurriculumMapping(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.admin = User.objects.create_user("adm", "a@x.invalid", "pw-123456", role="admin", is_staff=True)
        self.fac = User.objects.create_user("fac", "f@x.invalid", "pw-123456", role="teacher")
        maths = Subject.objects.create(name="Mathematics", slug="mathematics")
        measurement = Topic.objects.create(subject=maths, grade=7, name="Measurement", slug="measurement")
        numbers = Topic.objects.create(subject=maths, grade=7, name="Numbers", slug="numbers")
        self.area = Substrand.objects.create(topic=measurement, name="Area")
        self.perimeter = Substrand.objects.create(topic=measurement, name="Perimeter")
        self.fractions = Substrand.objects.create(topic=numbers, name="Fractions")
        self.r = Resource(kind="pdf", category="worksheets", title="Mixed exercise")  # no grade/subject given
        self.r.file.save("m.pdf", SimpleUploadedFile("m.pdf", make_pdf()), save=False)
        self.r.save()

    def fake_ai(self, prompt, system="", **kw):
        if kw.get("task") == "library_extract_read":
            return {
                "document": {"grade_guess": 7, "learning_area_guess": "Mathematics"},
                "items": [
                    {"page": 1, "label": "1", "kind": "question", "marks": 2,
                     "text": "Find the area of a rectangle 5 cm long and 3 cm wide."},
                    {"page": 1, "label": "2", "kind": "question", "marks": 2,
                     "text": "Find the perimeter of a square of side 4 cm."},
                    {"page": 1, "label": "", "kind": "worked_example",
                     "text": "the area of a 2 cm square is 2 x 2 = 4 cm2."},
                    {"page": 2, "label": "3", "kind": "question", "text": "Work out 1/2 + 1/4."},
                    {"page": 2, "label": "4", "kind": "question",
                     "text": "A triangle has base 6 cm and height 4 cm. Find its area."},
                    # Not in the PDF at all - the AI made it up.
                    {"page": 2, "label": "5", "kind": "question",
                     "text": "Explain how plants make food by photosynthesis."},
                    {"page": 2, "label": "1", "kind": "answer_key", "text": "15 cm2"},
                ],
            }
        return {"mappings": [
            {"index": 0, "substrand_id": f"S{self.area.id}", "confidence": 0.93, "reason": "area of rectangle"},
            {"index": 1, "substrand_id": self.perimeter.id, "confidence": 0.55,
             "alternatives": [{"substrand_id": self.area.id, "confidence": 0.5}]},
            {"index": 2, "substrand_id": 99999, "confidence": 0.9},          # invented ID
            {"index": 3, "substrand_id": self.area.id, "confidence": 0.9},
            {"index": 4, "substrand_id": None, "confidence": 0.1},
        ]}

    def analyse(self):
        with mock.patch("library.extraction.generate_json", side_effect=self.fake_ai):
            r = client_for(self.admin).post(f"/api/admin/library/{self.r.id}/analyse/")
        self.assertEqual(r.status_code, 202, r.content)
        return ExtractionRun.objects.get(pk=r.json()["id"])

    def q(self, label):
        return ExtractedQuestion.objects.get(resource=self.r, label=label)

    def test_questions_are_found_classified_one_by_one_and_nothing_is_approved(self):
        run = self.analyse()
        self.assertEqual(run.status, "done", run.error)
        self.assertEqual(run.document_guess["learning_area"], "Mathematics")
        labels = sorted(ExtractedQuestion.objects.filter(resource=self.r).values_list("label", flat=True))
        self.assertEqual(labels, ["1", "2", "3", "4", "5"])           # worked example left out
        self.assertEqual(self.q("1").proposed_substrand, self.area)
        self.assertEqual(self.q("2").proposed_substrand, self.perimeter)
        self.assertEqual(self.q("1").original_answer, "15 cm2")      # from the answer key
        self.assertEqual(self.q("1").page, 1)
        self.assertEqual(self.q("3").page, 2)
        self.assertFalse(ExtractedQuestion.objects.exclude(review_status="proposed").exists())

    def test_guard_rails(self):
        self.analyse()
        self.assertIn("low_confidence", self.q("2").flags)
        self.assertIn("ambiguous", self.q("2").flags)
        q3 = self.q("3")
        self.assertIsNone(q3.proposed_substrand)                     # invented ID discarded
        self.assertIn("rejected_invented", q3.flags)
        q5 = self.q("5")
        self.assertFalse(q5.text_verified)                           # not on the page
        self.assertIn("text_unverified", q5.flags)
        self.assertTrue(self.q("1").text_verified)
        self.assertIn("no_answer", self.q("4").flags)

    def test_only_approved_mappings_from_eligible_pdfs_enter_the_pool(self):
        self.analyse()
        c = client_for(self.admin)
        self.assertEqual(approved_question_pool().count(), 0)
        n = c.post(f"/api/admin/library/{self.r.id}/extraction/approve-confident/").json()["approved"]
        self.assertEqual(n, 1)                                       # only Q1: confident and unflagged
        self.assertEqual(self.q("1").review_status, "approved")
        self.assertEqual(self.q("1").grade, 7)                       # read from the curriculum table
        self.assertEqual(approved_question_pool().count(), 0)        # resource not a generator source yet
        self.r.extraction_eligible = True
        self.r.save()
        self.assertEqual(list(approved_question_pool()), [self.q("1")])

    def test_admin_corrects_rejects_and_edits_without_losing_the_original(self):
        self.analyse()
        c = client_for(self.admin)
        q2 = self.q("2")
        r = c.post(f"/api/admin/library/questions/{q2.id}/review/",
                   {"action": "approve", "substrand_id": self.area.id}, format="json")
        self.assertEqual(r.status_code, 200)
        q2.refresh_from_db()
        self.assertTrue(q2.corrected)
        self.assertEqual(q2.substrand, self.area)
        bad = c.post(f"/api/admin/library/questions/{self.q('3').id}/review/",
                     {"action": "approve", "substrand_id": 424242}, format="json")
        self.assertEqual(bad.status_code, 400)                       # no free-text curriculum
        self.assertEqual(c.post(f"/api/admin/library/questions/{self.q('3').id}/review/",
                                {"action": "approve"}, format="json").status_code, 400)
        c.post(f"/api/admin/library/questions/{self.q('5').id}/review/", {"action": "reject"}, format="json")
        self.assertEqual(self.q("5").review_status, "rejected")
        q4 = self.q("4")
        c.post(f"/api/admin/library/questions/{q4.id}/review/",
               {"action": "edit", "answer": "12 cm2"}, format="json")
        q4.refresh_from_db()
        self.assertEqual((q4.original_answer, q4.answer), ("", "12 cm2"))
        self.assertEqual(q4.original_text, "A triangle has base 6 cm and height 4 cm. Find its area.")

    def test_reanalysis_keeps_admin_decisions(self):
        self.analyse()
        client_for(self.admin).post(f"/api/admin/library/{self.r.id}/extraction/approve-confident/")
        self.analyse()
        self.assertEqual(ExtractedQuestion.objects.filter(resource=self.r, review_status="approved").count(), 1)

    def test_unknown_learning_area_maps_nothing(self):
        def no_area(prompt, system="", **kw):
            out = self.fake_ai(prompt, system, **kw)
            if kw.get("task") == "library_extract_read":
                out["document"] = {"grade_guess": None, "learning_area_guess": None}
            return out
        with mock.patch("library.extraction.generate_json", side_effect=no_area):
            client_for(self.admin).post(f"/api/admin/library/{self.r.id}/analyse/")
        self.assertFalse(ExtractedQuestion.objects.filter(proposed_substrand__isnull=False).exists())
        self.assertIn("unknown_learning_area", self.q("1").flags)

    def test_review_is_admin_only(self):
        self.analyse()
        c = client_for(self.fac)
        self.assertEqual(c.get(f"/api/admin/library/{self.r.id}/extraction/").status_code, 403)
        self.assertEqual(c.post(f"/api/admin/library/{self.r.id}/analyse/").status_code, 403)
        self.assertEqual(c.post(f"/api/admin/library/questions/{self.q('1').id}/review/",
                                {"action": "approve"}, format="json").status_code, 403)

    def test_failed_ai_marks_run_failed(self):
        with mock.patch("library.extraction.generate_json", side_effect=RuntimeError("provider down")):
            run = run_extraction(ExtractionRun.objects.create(resource=self.r).id)
        self.assertEqual(run.status, "failed")
        self.assertIn("provider down", run.error)
