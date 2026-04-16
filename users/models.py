from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
import random
import string


class User(AbstractUser):
    """
    Custom user model for CBC Edu Platform.
    """
    
    # Role choices
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_ADMIN = 'admin'
    ROLE_SUPERADMIN = 'superadmin'
    ROLE_SCHOOL_ADMIN = 'school_admin'

    ROLE_CHOICES = [
        (ROLE_STUDENT, _('Student')),
        (ROLE_TEACHER, _('Teacher')),
        (ROLE_ADMIN, _('Admin')),
        (ROLE_SUPERADMIN, _('Super Admin')),
        (ROLE_SCHOOL_ADMIN, _('School Admin')),
    ]

    # Core fields
    email = models.EmailField(
        _('email address'),
        unique=True,
        blank=True,
        null=True,
        default=None,
        error_messages={'unique': _("A user with that email already exists.")},
    )

    role = models.CharField(
        _('role'),
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_STUDENT,
        help_text=_("User's primary role in the platform."),
    )

    grade = models.PositiveIntegerField(
        _('grade'),
        null=True,
        blank=True,
        help_text=_("Student's current grade level (only for students)."),
    )

    # FREE TRIAL FIELDS (kept for migration compatibility — not used for access control)
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    has_used_trial = models.BooleanField(default=False)

    # Parent/Guardian info (for comms, receipts, progress reports)
    parent_name = models.CharField(max_length=150, blank=True, default='')
    parent_phone = models.CharField(max_length=15, blank=True, default='',
        help_text='Parent phone in 2547XXXXXXXX format')
    parent_email = models.EmailField(blank=True, default='',
        help_text='Parent email for receipts & progress reports')

    # FREE TRIAL CREDITS — 4 free quizzes for every new user
    quiz_credits = models.IntegerField(
        default=4,
        help_text='Free quiz attempts remaining'
    )
    free_quizzes_used = models.IntegerField(
        default=0,
        help_text='Number of free quizzes used (0-4)'
    )
    total_quizzes_taken = models.IntegerField(
        default=0,
        help_text='Total quizzes taken (analytics)'
    )

    # STREAK TRACKING
    current_streak = models.IntegerField(default=0, help_text='Current daily streak')
    longest_streak = models.IntegerField(default=0, help_text='All-time longest streak')
    last_activity_date = models.DateField(null=True, blank=True, help_text='Last quiz activity date')

    # Authentication settings
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['username']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    # Helper properties
    @property
    def is_admin(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_SUPERADMIN, self.ROLE_SCHOOL_ADMIN]

    @property
    def is_super_admin(self):
        return self.role == self.ROLE_SUPERADMIN or self.is_superuser

    @property
    def is_teacher_or_above(self):
        return self.role in [self.ROLE_TEACHER, self.ROLE_SCHOOL_ADMIN] or self.is_admin

    @property
    def has_active_trial(self):
        """Check if user still has free quiz credits"""
        return self.quiz_credits > 0
    
    @property
    def has_access(self):
        """Check if user can take a quiz (has credits OR active subscription)"""
        if self.quiz_credits > 0:
            return True
        try:
            return self.subscription.is_valid
        except Exception:
            return False

    def use_quiz_credit(self):
        """Decrement one free quiz credit. Returns True if credit was available.
        Uses F() expressions to prevent race conditions."""
        from django.db.models import F
        
        # Atomic decrement - prevents race conditions
        rows_updated = User.objects.filter(
            pk=self.pk,
            quiz_credits__gt=0
        ).update(
            quiz_credits=F('quiz_credits') - 1,
            free_quizzes_used=F('free_quizzes_used') + 1,
            total_quizzes_taken=F('total_quizzes_taken') + 1
        )
        
        if rows_updated > 0:
            # Refresh from DB to get updated values
            self.refresh_from_db(fields=['quiz_credits', 'free_quizzes_used', 'total_quizzes_taken'])
            return True
        return False

    def update_streak(self):
        """Update daily streak. Call after quiz completion."""
        today = timezone.now().date()
        if self.last_activity_date == today:
            return  # Already counted today

        if self.last_activity_date == today - timedelta(days=1):
            self.current_streak += 1
        elif self.last_activity_date != today:
            self.current_streak = 1

        self.last_activity_date = today
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        self.save(update_fields=['current_streak', 'longest_streak', 'last_activity_date'])

    def save(self, *args, **kwargs):
        """Auto-set role and staff status for superusers"""
        if self.is_superuser:
            self.role = self.ROLE_SUPERADMIN
            self.is_staff = True
        # Normalize blank email to None so unique constraint allows multiple blanks
        if not self.email:
            self.email = None
        
        super().save(*args, **kwargs)


class Classroom(models.Model):
    """A class/stream taught by a teacher"""
    name = models.CharField(max_length=50)
    grade = models.IntegerField(validators=[MinValueValidator(4), MaxValueValidator(12)])
    subject = models.ForeignKey('questions.Subject', on_delete=models.CASCADE, related_name='classrooms', null=True, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classrooms_teaching')
    students = models.ManyToManyField(User, related_name='classrooms_enrolled', blank=True)
    
    join_code = models.CharField(max_length=12, unique=True, blank=True, editable=False)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'classrooms'
        ordering = ['-created_at']
        unique_together = ['teacher', 'name', 'subject', 'grade']
    
    def generate_unique_code(self):
        """Generate a random, unique join code"""
        while True:
            subject_code = self.subject.name[:4].upper() if self.subject else "GEN"
            grade_code = str(self.grade)
            name_code = self.name[:3].upper()
            random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            
            code = f"{subject_code}-{grade_code}-{name_code}-{random_code}"
            
            if not Classroom.objects.filter(join_code=code).exists():
                return code
    
    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = self.generate_unique_code()
        super().save(*args, **kwargs)
    
    def __str__(self):
        subj_name = self.subject.name if self.subject else "General"
        return f"{subj_name} - Grade {self.grade}{self.name} ({self.teacher.username})"
    
    @property
    def student_count(self):
        return self.students.count()


class ClassroomInvitation(models.Model):
    """Track when students join classrooms"""
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='invitations')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classroom_invitations')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'classroom_invitations'
        unique_together = ['classroom', 'student']
    
    def __str__(self):
        return f"{self.student.username} joined {self.classroom}"