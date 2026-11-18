"""Long PDFs, scanned pages and figures - the cases that used to be limits."""
import re
import shutil
import tempfile

import fitz
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from unittest import mock

from questions.models import Subject, Substrand, Topic

from .extraction import page_info, start_extraction
from .models import ExtractedQuestion, Resource

User = get_user_model()
MEDIA = tempfile.mkdtemp()


def pdf_bytes(build):
    doc = fitz.open()
    build(doc)
    data = doc.tobytes()
    doc.close()
    return data


def text_page(doc, text):
    doc.new_page().insert_textbox(fitz.Rect(50, 50, 550, 400), text, fontsize=11)


def scanned_page(doc, text):
    """A page that is only a picture of text - no text layer, like a scan."""
    src = fitz.open()
    src.new_page(width=400, height=200).insert_text((20, 100), text, fontsize=14)
    pix = src[0].get_pixmap(dpi=100)
    src.close()
    doc.new_page().insert_image(fitz.Rect(50, 50, 550, 300), pixmap=pix)


def diagram_page(doc):
    page = doc.new_page()
    page.insert_textbox(fitz.Rect(50, 50, 550, 120),
                        "1. The diagram below shows a triangle ABC. Find angle ACB.", fontsize=11)
    shape = page.new_shape()
    shape.draw_polyline([(150, 300), (400, 300), (250, 160), (150, 300)])
    shape.finish(color=(0, 0, 0), width=2)
    shape.commit()
    page.insert_textbox(fitz.Rect(50, 360, 550, 420), "2. Write 0.75 as a fraction.", fontsize=11)


@override_settings(MEDIA_ROOT=MEDIA, LIBRARY_EXTRACT_SYNC=True,
                   DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage")
class WholeDocument(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.admin = User.objects.create_user("adm", "a@x.invalid", "pw-123456", role="admin", is_staff=True)
        maths = Subject.objects.create(name="Mathematics", slug="mathematics")
        t = Topic.objects.create(subject=maths, grade=7, name="Geometry", slug="geometry")
        self.sub = Substrand.objects.create(topic=t, name="Angles")
        self.calls = []

    def resource(self, data):
        r = Resource(kind="pdf", category="worksheets", title="Doc")
        r.file.save("d.pdf", SimpleUploadedFile("d.pdf", data), save=False)
        r.save()
        return r

    def run_with(self, r, read):
        def fake(prompt, system="", **kw):
            self.calls.append(kw)
            if kw.get("task") == "library_extract_read":
                pages = [int(p) for p in re.findall(r"=== PAGE (\d+) ===", prompt)]
                return {"document": {"grade_guess": 7, "learning_area_guess": "Mathematics"},
                        "items": read(pages, kw)}
            n = len(re.findall(r"^\[\d+\]", prompt, flags=re.M))
            return {"mappings": [{"index": i, "substrand_id": self.sub.id, "confidence": 0.9}
                                 for i in range(n)]}
        with mock.patch("library.extraction.generate_json", side_effect=fake):
            return start_extraction(r, self.admin)

    def test_every_page_of_a_long_pdf_is_read(self):
        r = self.resource(pdf_bytes(lambda d: [text_page(d, f"{n}. Question number {n} on its own page.")
                                                for n in range(1, 51)]))
        run = self.run_with(r, lambda pages, kw: [
            {"page": p, "label": str(p), "kind": "question", "text": f"Question number {p} on its own page."}
            for p in pages])
        run.refresh_from_db()
        self.assertEqual(run.status, "done", run.error)
        self.assertEqual((run.pages_total, run.pages_read), (50, 50))
        pages = set(ExtractedQuestion.objects.filter(resource=r).values_list("page", flat=True))
        self.assertEqual(pages, set(range(1, 51)))
        # overlapping windows read some pages twice - each question kept once
        self.assertEqual(ExtractedQuestion.objects.filter(resource=r).count(), 50)

    def test_scanned_pages_are_read_from_the_image(self):
        r = self.resource(pdf_bytes(lambda d: scanned_page(d, "1. What is 12 x 3?")))
        info = page_info(fitz.open(stream=r.file.open("rb").read(), filetype="pdf")[0])
        self.assertTrue(info["scanned"])
        run = self.run_with(r, lambda pages, kw: [
            {"page": 1, "label": "1", "kind": "question", "text": "What is 12 x 3?", "answer": "36"}])
        run.refresh_from_db()
        read_call = next(c for c in self.calls if c.get("task") == "library_extract_read")
        self.assertTrue(read_call.get("images"))                     # the page image was sent
        self.assertTrue(read_call["images"][0].startswith(b"\x89PNG"))
        q = ExtractedQuestion.objects.get(resource=r)
        self.assertTrue(q.from_scan)
        self.assertIn("from_scan", q.flags)
        self.assertNotIn("text_unverified", q.flags)
        self.assertEqual(run.scanned_pages, 1)

    def test_figure_is_cut_from_the_box_the_model_gives(self):
        r = self.resource(pdf_bytes(diagram_page))
        self.run_with(r, lambda pages, kw: [
            {"page": 1, "label": "1", "kind": "question", "refers_to_figure": True,
             "figure_box": [0.2, 0.15, 0.75, 0.4],
             "text": "The diagram below shows a triangle ABC. Find angle ACB."},
            {"page": 1, "label": "2", "kind": "question", "text": "Write 0.75 as a fraction."}])
        q1 = ExtractedQuestion.objects.get(resource=r, label="1")
        self.assertTrue(q1.figure)
        self.assertTrue(q1.figure.open("rb").read().startswith(b"\x89PNG"))
        self.assertIn("needs_figure", q1.flags)
        self.assertFalse(ExtractedQuestion.objects.get(resource=r, label="2").figure)

    def test_figure_found_from_the_drawing_when_no_box_is_given(self):
        r = self.resource(pdf_bytes(diagram_page))
        self.run_with(r, lambda pages, kw: [
            {"page": 1, "label": "1", "kind": "question", "refers_to_figure": True,
             "text": "The diagram below shows a triangle ABC. Find angle ACB."},
            {"page": 1, "label": "2", "kind": "question", "text": "Write 0.75 as a fraction."}])
        q1 = ExtractedQuestion.objects.get(resource=r, label="1")
        self.assertTrue(q1.figure, q1.flags)
        self.assertNotIn("figure_missing", q1.flags)

    def test_figure_that_cannot_be_found_is_flagged_not_dropped(self):
        r = self.resource(pdf_bytes(lambda d: scanned_page(d, "1. Use the graph to find y.")))
        self.run_with(r, lambda pages, kw: [
            {"page": 1, "label": "1", "kind": "question", "refers_to_figure": True,
             "text": "Use the graph to find y."}])
        q = ExtractedQuestion.objects.get(resource=r)
        self.assertFalse(q.figure)
        self.assertIn("figure_missing", q.flags)
