from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.
class User(AbstractUser):
    """
    Docstring for User
    Custom User models for CBC Edu Platform.
    Extends django's AbstractUser to add education-specific fields
    """

    ROLE_CHOICES =[
        ('student', 'Student'),
        ('teacher', 'Teacher')
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices = ROLE_CHOICES, default='student')
    grade = models.IntegerField(null=True, blank=True, help_text="Student's grade")

    # Make email field required
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return f"{self.username} ({self.role})"
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'