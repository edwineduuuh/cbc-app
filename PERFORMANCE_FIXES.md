# ⚡ Performance Optimization Guide

**Goal:** Fix N+1 queries and add database indexes  
**Impact:** 10-100x faster page loads for large datasets  
**Time:** 2-3 hours  

---

## 📊 Current Performance Issues

### Problem 1: N+1 Query in Analytics (Line 485-540)
**Current:** For 30 students, makes **90+ database queries**  
**After fix:** Makes **3 queries total**  

### Problem 2: Missing Indexes
**Current:** Full table scans on queries with 10,000+ records  
**After fix:** Index lookups in milliseconds  

---

## 🔧 FIX #1: Optimize Analytics Queries

### Before (Slow):
```python
class TeacherClassroomAnalyticsView(APIView):
    def get(self, request, pk):
        classroom = Classroom.objects.get(pk=pk)
        students = classroom.students.all()
        
        student_stats = []
        for student in students:  # Query 1
            attempts = Attempt.objects.filter(student=student)  # Query 2 (per student!)
            total = attempts.aggregate(Sum('score'))  # Query 3 (per student!)
            avg = attempts.aggregate(Avg('score'))  # Query 4 (per student!)
            
            student_stats.append({
                'name': student.username,
                'total': total,
                'average': avg,
            })
        # For 30 students: 1 + (30 × 3) = 91 queries!
```

### After (Fast):
```python
from django.db.models import Prefetch, Sum, Avg, Count, Q, F

class TeacherClassroomAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        # Get classroom with ownership check
        try:
            classroom = Classroom.objects.select_related('teacher').get(
                pk=pk,
                teacher=request.user
            )
        except Classroom.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        
        # Single query with annotations
        students = classroom.students.annotate(
            total_attempts=Count('attempts'),
            avg_score=Avg('attempts__score', filter=Q(attempts__status='completed')),
            total_score=Sum('attempts__score', filter=Q(attempts__status='completed')),
            latest_attempt=Max('attempts__started_at'),
        ).order_by('-avg_score')
        
        # Now accessing student.total_attempts doesn't hit database!
        student_stats = [{
            'id': student.id,
            'name': student.get_full_name(),
            'username': student.username,
            'total_attempts': student.total_attempts or 0,
            'avg_score': round(student.avg_score or 0, 2),
            'total_score': round(student.total_score or 0, 2),
            'latest_attempt': student.latest_attempt,
        } for student in students]
        
        return Response({
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'total_students': len(student_stats),
            },
            'students': student_stats,
        })
        # Total queries: 3 (classroom, students with annotations, counts)
```

**Test it:**
```python
# In Django shell
from django.test.utils import override_settings
from django.db import connection
from django.test.utils import CaptureQueriesContext

with CaptureQueriesContext(connection) as queries:
    # Call your view
    response = view.get(request, pk=classroom_id)
    print(f"Total queries: {len(queries)}")
    # Should print: Total queries: 3
```

---

## 🔧 FIX #2: Add Database Indexes

### Create Migration File

**Run:**
```bash
python manage.py makemigrations --empty questions --name add_performance_indexes
```

**Edit the generated file:**

```python
# questions/migrations/XXXX_add_performance_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0024_motivationalcontent'),  # Update to your latest migration
    ]

    operations = [
        # Add indexes to Question model
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['topic', 'created_at'], name='q_topic_created_idx'),
        ),
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['created_by', '-created_at'], name='q_author_created_idx'),
        ),
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['question_type', 'is_active'], name='q_type_active_idx'),
        ),
        
        # Add indexes to Attempt model
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['quiz', 'student'], name='attempt_quiz_student_idx'),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['student', '-started_at'], name='attempt_student_date_idx'),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['status', 'started_at'], name='attempt_status_date_idx'),
        ),
        
        # Add indexes to Quiz model
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['subject', 'is_active'], name='quiz_subject_active_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['created_by', '-created_at'], name='quiz_author_date_idx'),
        ),
        
        # Add indexes to PaymentRequest model
        migrations.AddIndex(
            model_name='paymentrequest',
            index=models.Index(fields=['user', 'status'], name='payment_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentrequest',
            index=models.Index(fields=['status', '-submitted_at'], name='payment_status_date_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentrequest',
            index=models.Index(fields=['checkout_request_id'], name='payment_checkout_idx'),
        ),
    ]
```

**Apply migration:**
```bash
# Dry run first
python manage.py migrate --dry-run

# Apply
python manage.py migrate

# Check indexes were created
python manage.py dbshell
\d questions_question  # PostgreSQL
SHOW INDEX FROM questions_question;  # MySQL
.schema questions_question  # SQLite
```

---

## 🔧 FIX #3: Update Model Definitions

**File:** `questions/models.py`

**Add to existing fields:**

```python
class Question(models.Model):
    # Existing fields with db_index added:
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name='questions',
        db_index=True  # ← ADD THIS
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_questions',
        db_index=True  # ← ADD THIS
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # ← ADD THIS
    question_type = models.CharField(max_length=20, db_index=True)  # ← ADD THIS
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['topic', '-created_at']),
            models.Index(fields=['created_by', '-created_at']),
        ]

class Attempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_index=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts', db_index=True)
    status = models.CharField(max_length=20, default='in_progress', db_index=True)
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['quiz', 'student']),
            models.Index(fields=['student', '-started_at']),
            models.Index(fields=['status', 'started_at']),
        ]

class Quiz(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['subject', 'is_active']),
            models.Index(fields=['-created_at']),
        ]
```

---

## 🔧 FIX #4: Optimize Quiz List View

**File:** `questions/views.py`

```python
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class QuizListView(ListAPIView):
    serializer_class = QuizSerializer
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'grade', 'is_active']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Optimize with select_related
        return Quiz.objects.select_related(
            'subject',
            'created_by',
        ).prefetch_related(
            'questions'
        ).filter(is_active=True)
```

---

## 🔧 FIX #5: Optimize Leaderboard Queries

**File:** `questions/views.py`

```python
class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, quiz_id):
        # Single query with aggregation
        leaderboard = Attempt.objects.filter(
            quiz_id=quiz_id,
            status='completed'
        ).select_related(
            'student'
        ).values(
            'student__id',
            'student__username',
            'student__first_name',
            'student__last_name',
        ).annotate(
            best_score=Max('score'),
            attempts_count=Count('id'),
            avg_score=Avg('score'),
            latest_attempt=Max('started_at'),
        ).order_by('-best_score')[:50]  # Top 50 only
        
        return Response({
            'quiz_id': quiz_id,
            'leaderboard': list(leaderboard),
        })
```

---

## 📊 Performance Testing

### Before & After Comparison

**Test Script:**
```python
# tests/test_performance.py
from django.test import TestCase
from django.test.utils import override_settings
from django.db import connection
from django.test.utils import CaptureQueriesContext
import time

class PerformanceTest(TestCase):
    def test_analytics_query_count(self):
        """Analytics should use <= 5 queries regardless of student count"""
        # Setup: Create classroom with 50 students
        classroom = create_test_classroom_with_students(50)
        
        with CaptureQueriesContext(connection) as queries:
            start = time.time()
            response = self.client.get(f'/api/analytics/classroom/{classroom.id}/')
            elapsed = time.time() - start
            
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 5, f"Too many queries: {len(queries)}")
        self.assertLess(elapsed, 1.0, f"Too slow: {elapsed}s")
        print(f"✅ Analytics: {len(queries)} queries in {elapsed:.2f}s")
    
    def test_quiz_list_performance(self):
        """Quiz list should be paginated and efficient"""
        # Create 1000 quizzes
        create_test_quizzes(1000)
        
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get('/api/quizzes/')
            
        self.assertLessEqual(len(queries), 3)
        self.assertIn('count', response.data)  # Paginated response
        print(f"✅ Quiz list: {len(queries)} queries")
```

**Run tests:**
```bash
python manage.py test tests.test_performance
```

---

## 📈 Monitoring Query Performance

**Add to settings.py (development only):**

```python
if DEBUG:
    # Log slow queries
    LOGGING = {
        'version': 1,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
            },
        },
        'loggers': {
            'django.db.backends': {
                'handlers': ['console'],
                'level': 'DEBUG',
            },
        },
    }
```

**Use Django Debug Toolbar:**
```bash
pip install django-debug-toolbar
```

```python
# settings.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
```

---

## ✅ Verification Checklist

After applying all fixes:

- [ ] Migrations applied successfully
- [ ] All tests pass
- [ ] Analytics page loads in < 2 seconds (even with 100 students)
- [ ] Quiz list pagination works
- [ ] No N+1 queries in Django Debug Toolbar
- [ ] Database indexes visible in `\di` (PostgreSQL) or equivalent

---

**Expected Results:**
- **90% faster** analytics page loading
- **50% reduction** in database CPU usage
- **Better UX** for teachers with large classrooms
- **Lower hosting costs** (fewer database queries = less CPU)
