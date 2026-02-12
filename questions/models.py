from django.db import models
from django.contrib.auth import get_user_model
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

    # subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='questions')
    # grade = models.IntegerField(help_text="Grade level (4-12)")
    
    question_text = models.TextField(help_text="The question itself")

    # MCQs Optipons
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)

    correct_answer = models.CharField(
        max_length=1,
        choices = [('A', 'A'), ('B','B'), ('C','C'), ('D','D')],
        help_text="Correct options (A, B C or D)"
    )

    explanation = models.TextField(blank=True, help_text="Optional explanation of answers")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

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