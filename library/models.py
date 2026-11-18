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


class ExtractionRun(models.Model):
    """One AI pass over a PDF: find the questions, propose curriculum mappings.

    Nothing a run produces is usable until an admin approves it.
    """
    QUEUED, RUNNING, DONE, FAILED = "queued", "running", "done", "failed"
    STATUSES = [(QUEUED, "Queued"), (RUNNING, "Running"), (DONE, "Done"), (FAILED, "Failed")]

    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="extraction_runs")
    status = models.CharField(max_length=10, choices=STATUSES, default=QUEUED)
    error = models.TextField(blank=True, default="")
    pages_read = models.IntegerField(default=0)
    pages_total = models.IntegerField(default=0)
    scanned_pages = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)   # progress heartbeat
    # What the AI thinks the whole document is - shown to the admin, never
    # copied onto the questions (a PDF can span many strands).
    document_guess = models.JSONField(default=dict, blank=True)
    notes = models.JSONField(default=list, blank=True)
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "library_extraction_runs"
        ordering = ["-created_at"]


class ExtractedQuestion(models.Model):
    """A question found in an uploaded PDF, with its proposed and approved
    curriculum mapping. The original text, answer, PDF and page are kept
    exactly as found; an admin correction is stored alongside, never over it.
    """
    PROPOSED, APPROVED, REJECTED = "proposed", "approved", "rejected"
    REVIEW = [(PROPOSED, "Awaiting review"), (APPROVED, "Approved"), (REJECTED, "Rejected")]

    run = models.ForeignKey(ExtractionRun, on_delete=models.CASCADE, related_name="questions")
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="extracted_questions")
    page = models.IntegerField()
    label = models.CharField(max_length=40, blank=True, default="")
    order = models.IntegerField(default=0)

    original_text = models.TextField()
    original_answer = models.TextField(blank=True, default="")
    options = models.JSONField(default=list, blank=True)
    marks = models.IntegerField(null=True, blank=True)
    question_type = models.CharField(max_length=20, blank=True, default="")
    refers_to_figure = models.BooleanField(default=False)
    text_verified = models.BooleanField(default=False,
                                        help_text="The text was found on the stated page")
    from_scan = models.BooleanField(default=False,
                                    help_text="Read from a scanned page image (OCR) - check the wording")
    figure = models.ImageField(upload_to="library/figures/", storage=image_storage,
                               null=True, blank=True, max_length=300,
                               help_text="The diagram, table or graph the question needs, cut from the PDF page")

    # The AI's proposal - only ever entries that exist in the curriculum tables.
    proposed_substrand = models.ForeignKey("questions.Substrand", null=True, blank=True,
                                           on_delete=models.SET_NULL, related_name="+")
    proposed_topic = models.ForeignKey("questions.Topic", null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name="+")
    confidence = models.FloatField(default=0)
    alternatives = models.JSONField(default=list, blank=True)   # [{substrand_id, confidence}]
    reason = models.TextField(blank=True, default="")
    flags = models.JSONField(default=list, blank=True)

    # The admin's decision.
    review_status = models.CharField(max_length=10, choices=REVIEW, default=PROPOSED, db_index=True)
    substrand = models.ForeignKey("questions.Substrand", null=True, blank=True,
                                  on_delete=models.SET_NULL, related_name="extracted_questions")
    topic = models.ForeignKey("questions.Topic", null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="extracted_questions")
    grade = models.IntegerField(null=True, blank=True, db_index=True)
    subject = models.ForeignKey("questions.Subject", null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="extracted_questions")
    corrected = models.BooleanField(default=False)
    edited_text = models.TextField(blank=True, default="")
    edited_answer = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_extracted_questions"
        ordering = ["resource", "page", "order"]

    @property
    def text(self):
        return self.edited_text or self.original_text

    @property
    def answer(self):
        return self.edited_answer or self.original_answer

    def approve(self, substrand, user, *, corrected=False):
        topic = substrand.topic
        self.substrand = substrand
        self.topic = topic
        self.grade = topic.grade
        self.subject_id = topic.subject_id
        self.corrected = corrected
        self.review_status = self.APPROVED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()


def approved_question_pool():
    """What the Assessment Generator may draw on from PDFs: approved mappings,
    from resources the admin has marked as generator sources."""
    return ExtractedQuestion.objects.filter(
        review_status=ExtractedQuestion.APPROVED,
        substrand__isnull=False,
        resource__extraction_eligible=True,
    ).exclude(resource__status=Resource.ARCHIVED)
