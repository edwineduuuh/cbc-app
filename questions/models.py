from django.db import models
from django.contrib.auth import get_user_model
from cloudinary_storage.storage import MediaCloudinaryStorage
# Create your models here.
User = get_user_model()

class Subject(models.Model):
    """
    Docstring for Subject
    Learning area 
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon or Emoji")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subjects'
        ordering = ['name']

    def __str__(self):
        return self.name
    
class Topic(models.Model):
    """
    Docstring for Topic
    Example Math Grade 8- Algebra
    """
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    grade = models.IntegerField(help_text="Grade level: 4 - 12")
    name = models.CharField(max_length=150, help_text="Topic name")
    slug = models.SlugField(max_length=150)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0, help_text="Display order within greade")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'topics'
        ordering = ['subject', 'grade', 'order', 'name']
        unique_together = [['subject', 'grade', 'slug']]
    
    def __str__(self):
        return f"{self.subject.name} - Grade {self.grade} - {self.name} "

class Passage(models.Model):
    PASSAGE_TYPES = [
        ('prose', 'Prose'),
        ('poem', 'Poem'),
        ('dialogue', 'Dialogue'),
        ('excerpt', 'Excerpt'),
        ('article', 'Article'),
        ('cloze', 'Broken Passage / Cloze'),
    ]
    
    title = models.CharField(max_length=200)
    content = models.TextField(help_text="The full passage, poem or excerpt")
    passage_type = models.CharField(max_length=20, choices=PASSAGE_TYPES, default='prose')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='passages')
    grade = models.IntegerField()
    author = models.CharField(max_length=100, blank=True, help_text="Author or source")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'passages'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (Grade {self.grade})"
    
# ===== DELETE THE FIRST QUESTION CLASS HERE (lines ~35-85) =====
class Question(models.Model):
    """
    Docstring for Question
    Individual MCQs
    Grade and Subjects are inherited from Topic
    """
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    QUESTION_TYPES = [
        ('mcq', 'Multiple Choice'),
        ('fill_blank', 'Fill in the Blank'),
        ('math', 'Mathematical Expression'),
        ('structured', 'Structured Answer'),
        ('essay', 'Essay'),
    ]

    # RELATIONSHIPS
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='questions')
    passage = models.ForeignKey(
    Passage,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='questions',
    help_text="Link to reading passage if this is a comprehension question"
)
    # QUESTION TYPE
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        default='mcq'
    )
    
    # QUESTION TEXT
    question_text = models.TextField(help_text="The question itself")

    # MCQ FIELDS
    option_a = models.CharField(max_length=500, blank=True)
    option_b = models.CharField(max_length=500, blank=True)
    option_c = models.CharField(max_length=500, blank=True)
    option_d = models.CharField(max_length=500, blank=True)
    correct_answer = models.TextField(
    blank=True,
    help_text="For MCQ: A/B/C/D. For others: model answer text"
)

    # NON-MCQ FIELDS
    correct_answers = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of accepted answers for fill_blank/math"
    )
    
    case_sensitive = models.BooleanField(default=False)
    
    # MATH OPTIONS
    math_options = models.JSONField(
        default=dict,
        blank=True,
        help_text="Math-specific settings"
    )

    # COMMON FIELDS
    explanation = models.TextField(blank=True, help_text="Optional explanation of answers")
    worked_solution = models.JSONField(null=True, blank=True, default=None, help_text="Step-by-step solution with LaTeX")   
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')

    # METADATA
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    marking_scheme = models.JSONField(null=True, blank=True)
    max_marks = models.IntegerField(default=1)

    question_image = models.ImageField(
    upload_to='question_images/',
    null=True,
    blank=True,
    help_text="Optional diagram, graph, or illustration",
    storage=MediaCloudinaryStorage(),
)
    class Meta:
        db_table = 'questions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Q{self.id}: {self.question_text[:50]}..."
    
    @property
    def grade(self):
        """Get grade from topic"""
        return self.topic.grade
    
    @property
    def subject(self):
        """Get subject from topic"""
        return self.topic.subject

class QuestionPart(models.Model):
    PART_TYPES = [
        ('mcq', 'Multiple Choice'),
        ('structured', 'Structured Answer'),
        ('essay', 'Essay'),
        ('math', 'Mathematical Expression'),
        ('fill_blank', 'Fill in the Blank'),
    ]
    
    parent_question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='parts'
    )
    part_label = models.CharField(
        max_length=10,
        help_text="e.g. a, b, c, i, ii, iii"
    )
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=PART_TYPES, default='structured')
    
    # MCQ fields
    option_a = models.CharField(max_length=500, blank=True)
    option_b = models.CharField(max_length=500, blank=True)
    option_c = models.CharField(max_length=500, blank=True)
    option_d = models.CharField(max_length=500, blank=True)
    correct_answer = models.TextField(blank=True)
    
    # Marking
    max_marks = models.IntegerField(default=1)
    marking_scheme = models.JSONField(null=True, blank=True)
    explanation = models.TextField(blank=True)
    
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'question_parts'
        ordering = ['order', 'part_label']
    
    def __str__(self):
        return f"Q{self.parent_question.id}({self.part_label}): {self.question_text[:50]}"
class Quiz(models.Model):
    """Collection of questions from quiz"""
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Link to grade and subject
    grade = models.IntegerField(help_text="Target grade level")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="quizzes")

    topic = models.ForeignKey(
        Topic, 
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='quizzes',
        help_text='Leave blank if it covers multiple topics'
    )

    questions = models.ManyToManyField(Question, related_name='quizzes')
    duration_minutes = models.IntegerField(default=30, help_text="Time limit in minutes, 0 = no limit")
    passing_score = models.IntegerField(default=50, help_text="Min % to pass")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    assigned_classrooms = models.ManyToManyField(
        'users.Classroom',
        related_name='assigned_quizzes',
        blank=True,
        help_text="Classrooms this quiz is assigned to"
    )
    
    # Quiz type fields
    quiz_type = models.CharField(
        max_length=20,
        choices=[('topical', 'Topical Quiz'), ('exam', 'Exam')],
        default='topical',
        help_text='Type of assessment'
    )
    
    # NEW FIELDS FOR EXAMS
    term = models.IntegerField(
        choices=[(1, 'Term 1'), (2, 'Term 2'), (3, 'Term 3')],
        null=True,
        blank=True,
        help_text='Term for exams (null for topical quizzes)'
    )
    
    set_number = models.IntegerField(
        null=True,
        blank=True,
        help_text='Set number for exams (e.g., 1, 2, 3...)'
    )
    
    # Existing fields
    available_to_teachers = models.BooleanField(
        default=False,
        help_text="Admin marked this as available in teacher library"
    )
    
    owner_type = models.CharField(
        max_length=20,
        choices=[('admin', 'Admin Created'), ('teacher', 'Teacher Created')],
        default='teacher'
    )
    quiz_type = models.CharField(
    max_length=20,
    choices=[('topical', 'Topical Quiz'), ('exam', 'Exam')],
    default='topical',
    help_text='Type of assessment'
)
    class Meta:
        db_table = 'quizzes'
        verbose_name_plural = 'Quizzes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} (Grade {self.grade})"
    
    def total_questions(self):
        return self.questions.count()


class Attempt(models.Model):
    """
    Student's attempt at a quiz
    """
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Store answers as JSON: {"question_id": "A", "question_id": "B", ...}
    answers = models.JSONField(default=dict, help_text="Student's answers")
    
    score = models.FloatField(null=True, blank=True, help_text="Percentage score")
    total_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)

    total_marks_awarded = models.FloatField(default=0, help_text="Actual marks earned")
    total_max_marks = models.FloatField(default=0, help_text="Maximum marks possible")

    detailed_feedback = models.JSONField(
        null=True,
        blank=True,
        help_text='Question-by-question AI feedback'
    )
    
    class Meta:
        db_table = 'attempts'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} ({self.score}%)"
    
    def calculate_score(self):
        """
        Calculate score based on answers
        """
        if not self.answers:
            self.score = 0
            self.correct_answers = 0
            self.total_questions = 0
            return
        
        questions = self.quiz.questions.all()
        self.total_questions = questions.count()
        correct = 0
        
        for question in questions:
            student_answer = self.answers.get(str(question.id))
            if student_answer and student_answer.upper() == question.correct_answer:
                correct += 1
        
        self.correct_answers = correct
        self.score = (correct / self.total_questions * 100) if self.total_questions > 0 else 0
        self.save()

class QuestionSet(models.Model):
    """
    Saved collections of questions for teachers to reuse
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    questions = models.ManyToManyField(Question, related_name='question_sets')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='question_sets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'question_sets'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.questions.count()} questions)"
    
class ClassQuizAssignment(models.Model):
    """
    Links a quiz to a specific classroom (teacher assigns quiz to class)
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='class_assignments')
    classroom = models.ForeignKey('users.Classroom', on_delete=models.CASCADE, related_name='quiz_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_quizzes')
    
    assigned_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'class_quiz_assignments'
        unique_together = ['quiz', 'classroom']  # Prevent duplicate assignments
    
    def __str__(self):
        return f"{self.quiz.title} → {self.classroom}"
    
# ============================================================
# ADD THIS TO YOUR questions/models.py  (or payments/models.py)
# ============================================================

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class SubscriptionPlan(models.Model):
    """
    The Darja tiers — configurable subscription plans
    """
    BILLING_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('termly', 'Termly (3 months)'),
        ('annual', 'Annual'),
    ]

    name = models.CharField(max_length=100)          # e.g. "Darja Basic", "Darja Pro"
    slug = models.SlugField(unique=True)              # e.g. "darja-basic"
    description = models.TextField(blank=True)
    price_kes = models.IntegerField(help_text="Price in Kenyan Shillings")
    billing_period = models.CharField(max_length=20, choices=BILLING_CHOICES, default='monthly')
    duration_days = models.IntegerField(help_text="How many days this plan lasts")
    
    # Features
    max_quizzes_per_day = models.IntegerField(default=5, help_text="0 = unlimited")
    can_access_b2c = models.BooleanField(default=True)
    can_access_analytics = models.BooleanField(default=False)
    can_download_pdf = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['order', 'price_kes']

    def __str__(self):
        return f"{self.name} — KES {self.price_kes}/{self.billing_period}"


class PaymentRequest(models.Model):
    """
    Manual M-Pesa payment — student submits transaction code, admin verifies
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified — Active'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    # Who is paying & what for
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_requests')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='payments')

    # M-Pesa details submitted by student
    mpesa_code = models.CharField(max_length=20, blank=True, default='')
    phone_number = models.CharField(
        max_length=15,
        help_text="Phone number used for payment e.g. 0712345678"
    )
    amount_paid = models.IntegerField(help_text="Amount student claims to have paid (KES)")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Admin verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='verified_payments'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)

    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    checkout_request_id = models.CharField(max_length=100, blank=True, null=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'payment_requests'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.user.username} | {self.mpesa_code} | {self.status}"

    def approve(self, admin_user):
        """Verify payment and activate/extend subscription"""
        self.status = 'verified'
        self.verified_by = admin_user
        self.verified_at = timezone.now()
        self.save()

        # Create or extend subscription
        subscription, created = Subscription.objects.get_or_create(
            user=self.user,
            defaults={
                'plan': self.plan,
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=self.plan.duration_days),
                'is_active': True,
                'payment': self,
            }
        )

        if not created:
            # Extend existing subscription
            if subscription.end_date > timezone.now():
                # Still active — extend from current end
                subscription.end_date += timedelta(days=self.plan.duration_days)
            else:
                # Expired — restart from now
                subscription.start_date = timezone.now()
                subscription.end_date = timezone.now() + timedelta(days=self.plan.duration_days)
            subscription.plan = self.plan
            subscription.is_active = True
            subscription.payment = self
            subscription.save()

        return subscription

    def reject(self, admin_user, reason=''):
        self.status = 'rejected'
        self.verified_by = admin_user
        self.verified_at = timezone.now()
        self.rejection_reason = reason
        self.save()


class Subscription(models.Model):
    """
    Active subscription for a user — created when payment is verified
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    payment = models.ForeignKey(PaymentRequest, on_delete=models.SET_NULL, null=True, blank=True)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.user.username} — {self.plan.name} — expires {self.end_date.date()}"

    @property
    def is_valid(self):
        """Check if subscription is currently active and not expired"""
        return self.is_active and self.end_date > timezone.now()

    @property
    def days_remaining(self):
        if not self.is_valid:
            return 0
        return (self.end_date - timezone.now()).days
    
# ═══════════════════════════════════════════════════════════════
# FREE TRIAL COUNTER
# ═══════════════════════════════════════════════════════════════

class UserProfile(models.Model):
    """User profile with free trial tracking"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Free trial counter
    free_quizzes_remaining = models.IntegerField(default=3)
    free_trial_exhausted = models.BooleanField(default=False)
    
    # Analytics
    total_quizzes_attempted = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.username} - {self.free_quizzes_remaining} free quizzes"
    
    def can_start_quiz(self):
        """Check if user can start a quiz"""
        # Check subscription
        if hasattr(self.user, 'subscription') and self.user.subscription.is_active:
            return True, "Unlimited (Subscribed)"
        
        # Check free trial
        if self.free_quizzes_remaining > 0:
            return True, f"{self.free_quizzes_remaining} free quizzes remaining"
        
        return False, "No free quizzes remaining. Please subscribe."
    
    def use_free_quiz(self):
        """Decrement free quiz counter"""
        if self.free_quizzes_remaining > 0:
            self.free_quizzes_remaining -= 1
            if self.free_quizzes_remaining == 0:
                self.free_trial_exhausted = True
            self.save()
            return True
        return False


# Auto-create profile when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    
"""
AI GRADING CONTROLS - Adjust how strict/lenient the AI is

Add this to your Django settings or as a model
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class AIGradingSettings(models.Model):
    """
    Controls for AI grading behavior
    Can be global or per-subject/grade
    """
    
    # Scope
    subject = models.ForeignKey(
        'questions.Subject', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Leave blank for global settings"
    )
    grade = models.IntegerField(null=True, blank=True)
    
    # Strictness Level (1-10)
    # 1 = Very Lenient, 5 = Balanced, 10 = Very Strict
    strictness_level = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="1=Very Lenient, 10=Very Strict"
    )
    
    # Spelling Tolerance
    allow_spelling_errors = models.BooleanField(
        default=True,
        help_text="Accept minor spelling mistakes"
    )
    max_spelling_errors = models.IntegerField(
        default=2,
        help_text="Max spelling errors to still award marks"
    )
    
    # Grammar Tolerance
    require_perfect_grammar = models.BooleanField(
        default=False,
        help_text="Require grammatically correct answers"
    )
    
    # Partial Marks
    award_partial_marks = models.BooleanField(
        default=True,
        help_text="Give partial credit for partially correct answers"
    )
    partial_marks_threshold = models.FloatField(
        default=0.5,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Minimum correctness to award partial marks (0.5 = 50%)"
    )
    
    # Duplicate Detection
    penalize_duplicate_points = models.BooleanField(
        default=True,
        help_text="Don't award marks for repeated/duplicate points"
    )
    
    # Context Awareness
    accept_synonyms = models.BooleanField(
        default=True,
        help_text="Accept synonyms and alternative phrasings"
    )
    
    # Feedback Style
    feedback_tone = models.CharField(
        max_length=20,
        choices=[
            ('encouraging', 'Encouraging'),
            ('neutral', 'Neutral'),
            ('professional', 'Professional')
        ],
        default='encouraging',
        help_text="Tone of AI feedback"
    )
    
    provide_study_tips = models.BooleanField(
        default=True,
        help_text="Include study tips in feedback"
    )
    
    # Manual Review Triggers
    flag_for_manual_review_below = models.FloatField(
        default=0.4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Flag for manual review if confidence < this (0.4 = 40%)"
    )
    
    auto_approve_above = models.FloatField(
        default=0.9,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Auto-approve if confidence > this (0.9 = 90%)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_grading_settings'
        unique_together = ['subject', 'grade']
        ordering = ['subject', 'grade']
    
    def __str__(self):
        if self.subject and self.grade:
            return f"{self.subject.name} Grade {self.grade} - Strictness {self.strictness_level}"
        elif self.subject:
            return f"{self.subject.name} - Strictness {self.strictness_level}"
        else:
            return f"Global Settings - Strictness {self.strictness_level}"
    
    @classmethod
    def get_settings_for(cls, subject=None, grade=None):
        """Get applicable settings for a subject/grade"""
        
        # Try specific settings first
        if subject and grade:
            settings = cls.objects.filter(subject=subject, grade=grade).first()
            if settings:
                return settings
        
        # Try subject-level settings
        if subject:
            settings = cls.objects.filter(subject=subject, grade__isnull=True).first()
            if settings:
                return settings
        
        # Fall back to global settings
        settings = cls.objects.filter(subject__isnull=True, grade__isnull=True).first()
        if settings:
            return settings
        
        # Create default global settings
        return cls.objects.create(
            strictness_level=5,
            allow_spelling_errors=True,
            award_partial_marks=True
        )


# Updated AIGrader class to use settings
class AIGraderWithControls:
    """Enhanced AI Grader with configurable strictness"""
    
    def __init__(self, settings=None):
        self.settings = settings or AIGradingSettings.get_settings_for()
        self.client = None
    
    def _build_marking_prompt(self, question, student_answer):
        """Build prompt with strictness controls"""
        
        settings = self.settings
        
        # Base prompt
        prompt = f"""You are a Kenyan CBC curriculum teacher marking a student's answer.

QUESTION:
{question.question_text}

MODEL ANSWER:
{question.correct_answer}

STUDENT'S ANSWER:
{student_answer}

GRADING SETTINGS:
- Strictness Level: {settings.strictness_level}/10 (1=Very Lenient, 10=Very Strict)
- Spelling Errors: {'Accept up to ' + str(settings.max_spelling_errors) if settings.allow_spelling_errors else 'Must be perfect'}
- Grammar: {'Must be perfect' if settings.require_perfect_grammar else 'Focus on content, not grammar'}
- Partial Marks: {'Yes' if settings.award_partial_marks else 'No - all or nothing'}
- Synonyms: {'Accept' if settings.accept_synonyms else 'Must match exactly'}
- Duplicate Points: {'Penalize' if settings.penalize_duplicate_points else 'Allow'}

INSTRUCTIONS:
"""
        
        # Adjust instructions based on strictness
        if settings.strictness_level <= 3:
            # Lenient
            prompt += """
1. BE LENIENT - Accept answers that show understanding even if not perfectly worded
2. Accept synonyms and alternative explanations freely
3. Award full marks if the core concept is demonstrated
4. Ignore minor spelling/grammar issues completely
"""
        elif settings.strictness_level <= 7:
            # Balanced
            prompt += """
1. BE FAIR - Accept correct answers phrased differently
2. Award partial marks for partially correct answers
3. Be lenient with spelling but note serious errors
4. Focus on understanding, not perfect expression
"""
        else:
            # Strict
            prompt += """
1. BE STRICT - Require precise, accurate answers
2. Deduct marks for spelling errors
3. Require proper grammar and structure
4. Only award full marks for perfectly correct answers
"""
        
        # Add marking scheme
        if question.marking_scheme and 'points' in question.marking_scheme:
            prompt += "\nMARKING POINTS:\n"
            for i, point in enumerate(question.marking_scheme['points'], 1):
                marks = point.get('marks', 1)
                prompt += f"{i}. {point['description']} ({marks} mark{'s' if marks > 1 else ''})\n"
        
        # Common instructions
        prompt += f"""
5. {'Penalize duplicate/repeated points' if settings.penalize_duplicate_points else 'Accept related points'}
6. Maximum marks: {question.max_marks}
7. This is for Kenyan students where English may be a second language

Respond with JSON:
{{
  "marks_awarded": <0 to {question.max_marks}>,
  "confidence": <0.0 to 1.0>,
  "feedback": "<explanation>",
  "personalized_message": "<{settings.get_feedback_tone_display()} tone message>",
  "study_tip": "<specific improvement tip>",
  "points_earned": ["<list>"],
  "points_missed": ["<list>"],
  "spelling_errors": <count>,
  "grammar_issues": <count>
}}"""
        
        return prompt
    
    def should_flag_for_review(self, result):
        """Check if result should be manually reviewed"""
        confidence = result.get('confidence', 1.0)
        
        if confidence < self.settings.flag_for_manual_review_below:
            return True
        
        if confidence > self.settings.auto_approve_above:
            return False
        
        # Mid-range confidence - check other factors
        spelling_errors = result.get('spelling_errors', 0)
        grammar_issues = result.get('grammar_issues', 0)
        
        if spelling_errors > self.settings.max_spelling_errors:
            return True
        
        if self.settings.require_perfect_grammar and grammar_issues > 0:
            return True
        
        return False


# Django Admin Interface for Settings
# from django.contrib import admin


class AIGradingSettings(models.Model):
    """Controls for AI grading behavior"""
    
    subject = models.ForeignKey(
        Subject, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    grade = models.IntegerField(null=True, blank=True)
    
    strictness_level = models.IntegerField(default=5)
    allow_spelling_errors = models.BooleanField(default=True)
    award_partial_marks = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # class Meta:
    #     db_table = 'ai_grading_settings'
    
    def __str__(self):
        if self.subject and self.grade:
            return f"{self.subject.name} Grade {self.grade}"
        return "Global Settings"
    
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


# ─────────────────────────────────────────────
#  LESSON PLANS
# ─────────────────────────────────────────────

class LessonPlan(models.Model):
    teacher        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lesson_plans")
    grade          = models.CharField(max_length=20)
    subject        = models.CharField(max_length=80)
    term           = models.CharField(max_length=20)
    week           = models.PositiveSmallIntegerField()
    lesson_number  = models.PositiveSmallIntegerField()
    strand         = models.CharField(max_length=200)
    substrand      = models.CharField(max_length=200, blank=True)
    duration       = models.CharField(max_length=40)
    learner_level  = models.CharField(max_length=60)
    prior_knowledge= models.TextField(blank=True)
    resources      = models.TextField(blank=True)
    is_practical   = models.BooleanField(default=False)
    practical_area = models.CharField(max_length=200, blank=True)

    # AI-generated JSON stored as text
    generated_plan = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.grade} | {self.subject} | {self.strand} (Wk {self.week})"


# ─────────────────────────────────────────────
#  CLASSROOMS (Kahoot-style)
# ─────────────────────────────────────────────

class Classroom(models.Model):
    STATUS_CHOICES = [("waiting","Waiting"),("live","Live"),("ended","Ended")]

    teacher       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="classrooms")
    name          = models.CharField(max_length=200)
    subject       = models.CharField(max_length=80)
    grade         = models.CharField(max_length=20)
    join_code     = models.CharField(max_length=10, unique=True)
    time_per_question = models.PositiveSmallIntegerField(default=30)   # seconds
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default="waiting")
    current_question_index = models.IntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)
    started_at    = models.DateTimeField(null=True, blank=True)
    ended_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} [{self.join_code}]"


class LiveQuestion(models.Model):
    TYPE_CHOICES = [("mcq","MCQ"),("truefalse","True/False"),("open","Open-Ended")]

    classroom   = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="questions")
    order       = models.PositiveSmallIntegerField(default=0)
    text        = models.TextField()
    question_type = models.CharField(max_length=12, choices=TYPE_CHOICES, default="mcq")
    options     = models.JSONField(default=list, blank=True)   # ["A","B","C","D"]
    correct_index = models.IntegerField(null=True, blank=True) # index into options, or None for open
    points      = models.PositiveSmallIntegerField(default=10)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.text[:60]}"


# ─────────────────────────────────────────────
#  STUDENT SESSIONS (no account required)
# ─────────────────────────────────────────────

class StudentSession(models.Model):
    classroom   = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="sessions")
    student_name = models.CharField(max_length=100)
    joined_at   = models.DateTimeField(auto_now_add=True)
    total_score = models.IntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        unique_together = [("classroom","student_name")]

    def __str__(self):
        return f"{self.student_name} @ {self.classroom.join_code}"


class StudentAnswer(models.Model):
    session     = models.ForeignKey(StudentSession, on_delete=models.CASCADE, related_name="answers")
    question    = models.ForeignKey(LiveQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField()                    # raw student answer
    selected_index = models.IntegerField(null=True, blank=True)  # for MCQ/TF
    is_correct  = models.BooleanField(null=True, blank=True)
    points_awarded = models.IntegerField(default=0)
    ai_feedback = models.TextField(blank=True)          # AI-generated feedback
    marked_at   = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.session.student_name} — Q{self.question.order}"

class GuestUsage(models.Model):
    fingerprint = models.CharField(max_length=64, unique=True)
    session_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    quizzes_taken = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    GUEST_LIMIT = 4

    def remaining(self):
        return max(0, self.GUEST_LIMIT - self.quizzes_taken)

    def __str__(self):
        return f"{self.fingerprint or self.session_id} - {self.quizzes_taken}"


class MotivationalContent(models.Model):
    CONTENT_TYPES = [
        ('quote', 'Quote'),
        ('story', 'Story'),
        ('tip', 'Tip'),
    ]
    CATEGORIES = [
        ('general', 'General'),
        ('exam', 'Exam Motivation'),
        ('study', 'Study Tips'),
        ('life', 'Life Skills'),
        ('success', 'Success Stories'),
    ]

    content_type = models.CharField(max_length=10, choices=CONTENT_TYPES, default='quote')
    category = models.CharField(max_length=20, choices=CATEGORIES, default='general')
    text = models.TextField(help_text="The quote, story, or tip text")
    author = models.CharField(max_length=150, blank=True, help_text="Who said/wrote it (optional)")
    is_active = models.BooleanField(default=True)
    grade_min = models.IntegerField(default=4, help_text="Minimum grade to show this to")
    grade_max = models.IntegerField(default=12, help_text="Maximum grade to show this to")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'motivational_content'
        ordering = ['-created_at']
        verbose_name = 'Motivational Content'
        verbose_name_plural = 'Motivational Content'

    def __str__(self):
        preview = self.text[:60] + '...' if len(self.text) > 60 else self.text
        return f"[{self.get_content_type_display()}] {preview}"