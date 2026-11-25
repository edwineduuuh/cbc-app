"""Every role x subscription x access combination for the resource library."""
import shutil
import tempfile
from datetime import timedelta
from unittest import mock

import fitz
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from questions.models import Subscription, SubscriptionPlan

from .models import Resource
from .stamp import FOOTER

User = get_user_model()
MEDIA = tempfile.mkdtemp()


def make_pdf(text="Photosynthesis notes"):
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def client_for(user):
    c = APIClient()
    if user:
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


@override_settings(MEDIA_ROOT=MEDIA, DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage")
class LibraryAccess(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        # Uploading a PDF starts an AI analysis; not wanted in access tests.
        p = mock.patch("library.extraction.start_extraction")
        p.start()
        self.addCleanup(p.stop)
        self.free = User.objects.create_user("free", "free@x.invalid", "pw-123456", role="student")
        self.paid = User.objects.create_user("paid", "paid@x.invalid", "pw-123456", role="student")
        plan = SubscriptionPlan.objects.create(name="Monthly", slug="m", price_kes=999, duration_days=30)
        Subscription.objects.create(user=self.paid, plan=plan, start_date=timezone.now(),
                                    end_date=timezone.now() + timedelta(days=30))
        self.expired = User.objects.create_user("exp", "exp@x.invalid", "pw-123456", role="student")
        Subscription.objects.create(user=self.expired, plan=plan,
                                    start_date=timezone.now() - timedelta(days=60),
                                    end_date=timezone.now() - timedelta(days=30))
        self.fac = User.objects.create_user("fac", "fac@x.invalid", "pw-123456", role="teacher")
        self.admin = User.objects.create_user("adm", "adm@x.invalid", "pw-123456", role="admin", is_staff=True)

        def res(kind, category, access, **kw):
            r = Resource(kind=kind, category=category, title=f"{category} {access}", access=access, **kw)
            if kind != Resource.KIND_VIDEO:
                r.file.save("x.pdf", SimpleUploadedFile("x.pdf", make_pdf()), save=False)
            else:
                r.video_url = "https://video.example/abc"
            r.mark_published()
            r.save()
            return r

        self.free_pdf = res("pdf", "worksheets", "free")
        self.prem_pdf = res("pdf", "worksheets", "premium")
        self.free_notes = res("pdf", "revision_notes", "free")
        self.prem_notes = res("pdf", "revision_notes", "premium")
        self.prem_book = res("book", "textbook", "premium")
        self.prem_video = res("video", "topic_lesson", "premium")
        self.free_video = res("video", "topic_lesson", "free")
        self.draft = Resource.objects.create(kind="pdf", category="worksheets", title="draft", access="free")

    def open(self, user, r, portal="student"):
        base = "/api/library" if portal == "student" else "/api/facilitator/revision-notes"
        return client_for(user).get(f"{base}/{r.id}/open/")

    # ── Students ──
    def test_free_student_sees_everything_published_with_premium_locked(self):
        rows = client_for(self.free).get("/api/library/").json()["results"]
        titles = {r["title"]: r["locked"] for r in rows}
        self.assertNotIn("draft", titles)
        self.assertEqual(len(rows), 7)
        self.assertFalse(titles["worksheets free"])
        self.assertTrue(titles["worksheets premium"])

    def test_free_student_opens_free_items_only(self):
        for r in (self.free_pdf, self.free_notes, self.free_video):
            self.assertEqual(self.open(self.free, r).status_code, 200, r.title)
        for r in (self.prem_pdf, self.prem_book, self.prem_video, self.prem_notes):
            resp = self.open(self.free, r)
            self.assertEqual(resp.status_code, 402, r.title)
            self.assertEqual(resp.json()["code"], "premium_required")

    def test_premium_student_opens_everything(self):
        for r in (self.free_pdf, self.prem_pdf, self.prem_book, self.prem_video, self.prem_notes):
            self.assertEqual(self.open(self.paid, r).status_code, 200, r.title)

    def test_expired_subscription_is_free(self):
        self.assertEqual(self.open(self.expired, self.prem_pdf).status_code, 402)

    def test_drafts_and_unclassified_never_reach_students(self):
        self.assertEqual(self.open(self.paid, self.draft).status_code, 404)

    def test_pdf_is_stamped_with_footer(self):
        resp = self.open(self.free, self.free_pdf)
        self.assertEqual(resp["Content-Type"], "application/pdf")
        doc = fitz.open(stream=resp.content, filetype="pdf")
        self.assertIn("stadispace.co.ke", doc[0].get_text())
        self.assertIn("0717 946 924", doc[0].get_text())
        self.assertTrue(FOOTER)

    def test_signed_out_gets_nothing(self):
        self.assertEqual(APIClient().get("/api/library/").status_code, 401)
        self.assertEqual(APIClient().get(f"/api/library/{self.free_pdf.id}/open/").status_code, 401)

    # ── Facilitators ──
    def test_facilitator_cannot_use_student_library(self):
        self.assertEqual(client_for(self.fac).get("/api/library/").status_code, 403)
        for r in (self.free_pdf, self.prem_book, self.free_video, self.free_notes):
            self.assertEqual(self.open(self.fac, r).status_code, 404, r.title)

    def test_facilitator_gets_all_revision_notes_free_and_premium(self):
        rows = client_for(self.fac).get("/api/facilitator/revision-notes/").json()["results"]
        self.assertEqual({r["id"] for r in rows}, {self.free_notes.id, self.prem_notes.id})
        self.assertEqual(self.open(self.fac, self.prem_notes, "facilitator").status_code, 200)

    def test_facilitator_notes_route_does_not_open_other_resources(self):
        for r in (self.prem_pdf, self.prem_book, self.prem_video):
            self.assertEqual(self.open(self.fac, r, "facilitator").status_code, 404, r.title)
        rows = client_for(self.fac).get("/api/facilitator/revision-notes/?category=worksheets&kind=book").json()
        self.assertTrue(all(r["category"] == "revision_notes" for r in rows["results"]))

    def test_students_cannot_use_facilitator_notes_route(self):
        self.assertEqual(client_for(self.paid).get("/api/facilitator/revision-notes/").status_code, 403)
        self.assertEqual(self.open(self.paid, self.free_notes, "facilitator").status_code, 404)

    # ── Admin ──
    def test_only_admin_manages_resources(self):
        for u in (self.free, self.paid, self.fac):
            self.assertEqual(client_for(u).get("/api/admin/library/").status_code, 403)
            r = client_for(u).post("/api/admin/library/", {"kind": "pdf", "category": "worksheets", "title": "x"})
            self.assertEqual(r.status_code, 403)

    def test_admin_upload_requires_classification_before_publish(self):
        c = client_for(self.admin)
        r = c.post("/api/admin/library/", {
            "kind": "pdf", "category": "practice_papers", "title": "Grade 7 paper",
            "file": SimpleUploadedFile("p.pdf", make_pdf(), content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        rid = r.json()["id"]
        self.assertEqual(r.json()["page_count"], 1)
        bad = c.post(f"/api/admin/library/{rid}/publish/")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("Free or Premium", bad.json()["error"])
        c.patch(f"/api/admin/library/{rid}/", {"access": "premium"}, format="json")
        self.assertEqual(c.post(f"/api/admin/library/{rid}/publish/").status_code, 200)
        self.assertEqual(Resource.objects.get(pk=rid).audit.count(), 3)

    def test_extraction_eligibility_is_independent_and_limited(self):
        c = client_for(self.admin)
        c.patch(f"/api/admin/library/{self.prem_pdf.id}/", {"extraction_eligible": True}, format="json")
        self.prem_pdf.refresh_from_db()
        self.assertTrue(self.prem_pdf.extraction_eligible)
        # eligibility gives the facilitator no access to the worksheet itself
        self.assertEqual(self.open(self.fac, self.prem_pdf, "facilitator").status_code, 404)
        # books and videos can never be generator sources
        c.patch(f"/api/admin/library/{self.prem_book.id}/", {"extraction_eligible": True}, format="json")
        self.prem_book.refresh_from_db()
        self.assertFalse(self.prem_book.extraction_eligible)

    def test_non_pdf_upload_is_refused(self):
        r = client_for(self.admin).post("/api/admin/library/", {
            "kind": "pdf", "category": "worksheets", "title": "x",
            "file": SimpleUploadedFile("x.exe", b"MZ...", content_type="application/octet-stream"),
        }, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_published_resource_is_archived_not_deleted(self):
        c = client_for(self.admin)
        self.assertEqual(c.delete(f"/api/admin/library/{self.free_pdf.id}/").status_code, 409)
        self.assertEqual(c.post(f"/api/admin/library/{self.free_pdf.id}/archive/").status_code, 200)
        self.assertEqual(self.open(self.free, self.free_pdf).status_code, 404)


class CloudinaryRead(APITestCase):
    """The account blocks public PDF delivery, so files are read by a signed API download."""

    def test_cloudinary_files_use_signed_download(self):
        from unittest import mock
        from .models import read_file

        class FakeStorage:
            def _prepend_prefix(self, name):
                return "media/" + name

            def _get_resource_type(self, name):
                return "raw"

        field = mock.Mock(storage=FakeStorage())
        field.name = "library/docs/paper.pdf"
        resp = mock.Mock(content=b"%PDF-1.4 x")
        with mock.patch("requests.get", return_value=resp) as get, \
                mock.patch("cloudinary.utils.private_download_url", return_value="https://api/x") as signed:
            self.assertEqual(read_file(field), b"%PDF-1.4 x")
        signed.assert_called_once_with("media/library/docs/paper.pdf", "", resource_type="raw", type="upload")
        get.assert_called_once()
        field.open.assert_not_called()
