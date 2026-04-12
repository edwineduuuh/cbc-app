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
        blank=False,
        null=False,
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

    # FREE TRIAL FIELDS
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    has_used_trial = models.BooleanField(default=False)

    # Parent/Guardian info (for comms, receipts, progress reports)
    parent_name = models.CharField(max_length=150, blank=True, default='')
    parent_phone = models.CharField(max_length=15, blank=True, default='',
        help_text='Parent phone in 2547XXXXXXXX format')
    parent_email = models.EmailField(blank=True, default='',
        help_text='Parent email for receipts & progress reports')

    # FREE TRIAL CREDITS (4 total: 2 as guest + 2 after signup)
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

    def activate_free_trial(self):
        """Give user a 7-day free trial"""
        if self.has_used_trial:
            return False
        
        self.trial_start = timezone.now()
        self.trial_end = timezone.now() + timedelta(days=7)
        self.has_used_trial = True
        self.save()
        return True
    
    @property
    def has_active_trial(self):
        """Check if trial is currently active"""
        if not self.trial_end:
            return False
        return timezone.now() < self.trial_end
    
    @property
    def has_access(self):
        # Checking if user has access
        if self.has_active_trial:
            return True
        # Will add real subscription later....
        return False

    def save(self, *args, **kwargs):
        """Auto-set role and staff status for superusers + activate trial for new students"""
        if self.is_superuser:
            self.role = self.ROLE_SUPERADMIN
            self.is_staff = True
        
        # Auto-activate trial for new students
        if not self.pk and self.role == self.ROLE_STUDENT and not self.has_used_trial:
            self.trial_start = timezone.now()
            self.trial_end = timezone.now() + timedelta(days=7)
            self.has_used_trial = True
        
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