"""Admin-managed learning resources: PDFs, books and videos.

One table for all three so a resource exists once. Revision Notes in
particular are a single record shown in the student PDF Library and in the
facilitator portal - never a duplicate copy.

Four settings are deliberately independent (see
docs/revamp/RESOURCES_AND_GENERATOR_PLAN.md):
  status              - can students see it at all (draft/published/archived)
  access              - free or premium for students; must be chosen before
                        publishing, so nothing goes out as Free by accident
  allow_download      - may an entitled viewer save the file
  extraction_eligible - may the Assessment Generator read questions from it;
                        this grants no person any access to the resource
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


def _cloudinary_on():
    return str(getattr(settings, "DEFAULT_FILE_STORAGE", "")).startswith("cloudinary")


def document_storage():
    if _cloudinary_on():
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        return RawMediaCloudinaryStorage()
    from django.core.files.storage import FileSystemStorage
    return FileSystemStorage()


def video_storage():
    if _cloudinary_on():
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage
        return VideoMediaCloudinaryStorage()
    from django.core.files.storage import FileSystemStorage
    return FileSystemStorage()


def image_storage():
    if _cloudinary_on():
        from cloudinary_storage.storage import MediaCloudinaryStorage
        return MediaCloudinaryStorage()
    from django.core.files.storage import FileSystemStorage
    return FileSystemStorage()


class Resource(models.Model):
    KIND_PDF, KIND_BOOK, KIND_VIDEO = "pdf", "book", "video"
    KINDS = [(KIND_PDF, "PDF"), (KIND_BOOK, "Book"), (KIND_VIDEO, "Video")]

    REVISION_NOTES = "revision_notes"
    CATEGORIES = {
        KIND_PDF: [
            (REVISION_NOTES, "Revision Notes"),
            ("worksheets", "Worksheets and Exercises"),
            ("practice_papers", "Practice Papers"),
            ("exam_prep", "Examination Preparation"),
            ("marking_schemes", "Marking Schemes and Answers"),
            ("study_guides", "Study Guides and Reference"),
            ("practical_guides", "Practical and Project Guides"),
        ],
        KIND_BOOK: [
            ("textbook", "Textbooks and Learning Books"),
            ("reference", "Subject Reference Books"),
            ("revision_book", "Revision Books"),
            ("supplementary", "Supplementary Reading"),
            ("other_book", "Other Curriculum Books"),
        ],
        KIND_VIDEO: [
            ("topic_lesson", "Topic Lessons"),
            ("worked_example", "Worked Examples"),
            ("practical_demo", "Practical Demonstrations"),
            ("topic_revision", "Topic Revision"),
            ("exam_prep_video", "Examination Preparation"),
        ],
    }
    ALL_CATEGORIES = [c for cats in CATEGORIES.values() for c in cats]
    # Only these PDF categories may feed the Assessment Generator (brief §5).
    EXTRACTABLE = {REVISION_NOTES, "worksheets", "practice_papers", "exam_prep", "study_guides"}

    ACCESS_UNSET, ACCESS_FREE, ACCESS_PREMIUM = "", "free", "premium"
    ACCESS = [(ACCESS_UNSET, "Not classified"), (ACCESS_FREE, "Free"), (ACCESS_PREMIUM, "Premium")]

    DRAFT, PUBLISHED, ARCHIVED = "draft", "published", "archived"
    STATUSES = [(DRAFT, "Draft"), (PUBLISHED, "Published"), (ARCHIVED, "Archived")]

    kind = models.CharField(max_length=10, choices=KINDS, db_index=True)
    category = models.CharField(max_length=30, choices=ALL_CATEGORIES, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")

    grade = models.IntegerField(null=True, blank=True, db_index=True)
    subject = models.ForeignKey("questions.Subject", null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="library_resources")
    topic = models.ForeignKey("questions.Topic", null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="library_resources",
                              help_text="Strand")
    substrand = models.ForeignKey("questions.Substrand", null=True, blank=True,
                                  on_delete=models.SET_NULL, related_name="library_resources")

    access = models.CharField(max_length=10, choices=ACCESS, default=ACCESS_UNSET, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default=DRAFT, db_index=True)
    allow_download = models.BooleanField(default=True)
    extraction_eligible = models.BooleanField(default=False)

    file = models.FileField(upload_to="library/docs/", storage=document_storage,
                            null=True, blank=True, max_length=300)
    video_file = models.FileField(upload_to="library/videos/", storage=video_storage,
                                  null=True, blank=True, max_length=300)
    video_url = models.URLField(blank=True, default="",
                                help_text="Or an authorised external link (e.g. unlisted YouTube)")
    thumbnail = models.ImageField(upload_to="library/thumbs/", storage=image_storage,
                                  null=True, blank=True, max_length=300)
    page_count = models.IntegerField(null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "library_resources"
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["kind", "status", "category"])]

    def __str__(self):
        return f"[{self.kind}] {self.title}"

    @property
    def is_document(self):
        return self.kind in (self.KIND_PDF, self.KIND_BOOK)

    def publish_problems(self):
        """Why this resource cannot be published yet (empty list = it can)."""
        problems = []
        if self.access not in (self.ACCESS_FREE, self.ACCESS_PREMIUM):
            problems.append("Choose Free or Premium before publishing.")
        valid = {c for c, _ in self.CATEGORIES.get(self.kind, [])}
        if self.category not in valid:
            problems.append("Pick a category that matches the resource type.")
        if self.is_document and not self.file:
            problems.append("Upload the PDF file.")
        if self.kind == self.KIND_VIDEO and not (self.video_file or self.video_url):
            problems.append("Upload the video or add its link.")
        return problems

    def mark_published(self):
        self.status = self.PUBLISHED
        if not self.published_at:
            self.published_at = timezone.now()


class ResourceAuditLog(models.Model):
    """Who changed what on a resource - kept for quality control."""
    resource = models.ForeignKey(Resource, null=True, on_delete=models.SET_NULL, related_name="audit")
    resource_title = models.CharField(max_length=200)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
                              related_name="+")
    action = models.CharField(max_length=30)   # created, updated, published, archived, deleted
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_audit_log"
        ordering = ["-created_at"]
