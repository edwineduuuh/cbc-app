from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
import random
import string


class User(AbstractUser):
    """
    Custom user model for CBC Edu Platform.
    
    Extends Django's AbstractUser with education-specific fields.
    Supports multiple roles: student, teacher, admin, superadmin, school_admin.
    """
    
    # Role choices (clear, consistent, extensible)
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_ADMIN = 'admin'
    ROLE_SUPERADMIN = 'superadmin'
    ROLE_SCHOOL_ADMIN = 'school_admin'

    ROLE_CHOICES = [
        (ROLE_STUDENT,     _('Student')),
        (ROLE_TEACHER,     _('Teacher')),
        (ROLE_ADMIN,       _('Admin')),
        (ROLE_SUPERADMIN,  _('Super Admin')),
        (ROLE_SCHOOL_ADMIN,_('School Admin')),
    ]

    # Fields
    email = models.EmailField(
        _('email address'),
        unique=True,
        blank=False,
        null=False,
        error_messages={
            'unique': _("A user with that email already exists."),
        },
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

    # Optional: Add more useful fields later
    # phone_number = models.CharField(max_length=15, blank=True)
    # profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    # is_verified = models.BooleanField(default=False)

    # Authentication settings
    USERNAME_FIELD = 'username'          # keep username as login field
    REQUIRED_FIELDS = ['email']          # email is required during createsuperuser

    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['username']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    # Helper properties/methods (very useful in templates/views)
    @property
    def is_admin(self):
        """Quick check for any admin level."""
        return self.role in [self.ROLE_ADMIN, self.ROLE_SUPERADMIN, self.ROLE_SCHOOL_ADMIN]

    @property
    def is_super_admin(self):
        """Only true super admins."""
        return self.role == self.ROLE_SUPERADMIN or self.is_superuser

    @property
    def is_teacher_or_above(self):
        return self.role in [self.ROLE_TEACHER, self.ROLE_SCHOOL_ADMIN] or self.is_admin

    def save(self, *args, **kwargs):
        """
        Auto-set role and staff status for superusers.
        """
        if self.is_superuser:
            self.role = self.ROLE_SUPERADMIN
            self.is_staff = True
        super().save(*args, **kwargs)

class Classroom(models.Model):
    """
    A class/stream taught by a teacher (e.g., "Grade 9N - Mathematics")
    """
    name = models.CharField(max_length=50)  # e.g., "9N", "8A", "7B"
    grade = models.IntegerField(validators=[MinValueValidator(4), MaxValueValidator(12)])
    subject = models.ForeignKey('questions.Subject', on_delete=models.CASCADE, related_name='classrooms', null=True, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classrooms_teaching')
    students = models.ManyToManyField(User, related_name='classrooms_enrolled', blank=True)
    
    # 🔐 RANDOM, UNIQUE JOIN CODE - Auto-generated!
    join_code = models.CharField(max_length=12, unique=True, blank=True, editable=False)
    
    description = models.TextField(blank=True, help_text="Optional class description")
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'classrooms'
        ordering = ['-created_at']
        unique_together = ['teacher', 'name', 'subject', 'grade']  # No duplicate classes
    
    def generate_unique_code(self):
        """Generate a random, unique join code"""
        while True:
            # Format: SUBJ-GRADE-NAME-RANDOM
            # Example: MATH-9-9N-XK7P
            subject_code = self.subject.name[:4].upper()
            grade_code = str(self.grade)
            name_code = self.name[:3].upper()
            random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            
            code = f"{subject_code}-{grade_code}-{name_code}-{random_code}"
            
            # Check if unique
            if not Classroom.objects.filter(join_code=code).exists():
                return code
    
    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = self.generate_unique_code()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.subject.name} - Grade {self.grade}{self.name} ({self.teacher.username})"
    
    @property
    def student_count(self):
        return self.students.count()


class ClassroomInvitation(models.Model):
    """
    Track when students join classrooms
    """
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='invitations')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classroom_invitations')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'classroom_invitations'
        unique_together = ['classroom', 'student']  # Student can't join same class twice
    
    def __str__(self):
        return f"{self.student.username} joined {self.classroom}"


trial_end = models.DateTimeField(null=True, blank=True)

def save(self, *args, **kwargs):
    if self.is_superuser:
        self.role = self.ROLE_SUPERADMIN
        self.is_staff = True
    if not self.pk and not self.trial_end:
        from django.utils import timezone
        from datetime import timedelta
        self.trial_end = timezone.now() + timedelta(days=7)
    super().save(*args, **kwargs)

# ADD THESE FIELDS TO YOUR USER MODEL IN users/models.py

from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    # ... your existing fields ...
    
    # FREE TRIAL FIELDS
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    has_used_trial = models.BooleanField(default=False)
    
    def activate_free_trial(self):
        """Give user a 7-day free trial"""
        if self.has_used_trial:
            return False  # Already used trial
        
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
        """Check if user has access (trial OR subscription)"""
        # Check trial
        if self.has_active_trial:
            return True
        
        # Check subscription
        try:
            sub = self.subscription
            return sub.is_valid
        except:
            return False