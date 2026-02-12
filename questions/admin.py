from django.contrib import admin
from .models import Subject, Topic, Question, Quiz, Attempt


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'grade', 'order', 'question_count']
    list_filter = ['subject', 'grade']
    search_fields = ['name', 'subject__name']
    prepopulated_fields = {'slug': ('name',)}  # ← Was 'slugs' (wrong)
    ordering = ['subject', 'grade', 'order']
    
    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = 'Questions'


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'question_preview', 'topic', 'get_grade', 'difficulty', 'created_at'] 
    list_filter = ['topic__subject', 'topic__grade', 'difficulty']
    search_fields = ['question_text']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('topic', 'difficulty')
        }),
        ('Question', {
            'fields': ('question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'),
             'description': 'Use LaTeX for math: $\\frac{1}{2}$ for fractions, $x^2$ for exponents'
        }),
        ('Additional', {
            'fields': ('explanation', 'created_by'),
            'classes': ('collapse',)
        })
    )
    
    def question_preview(self, obj):
        return obj.question_text[:50] + "..."
    question_preview.short_description = 'Question'
    
    def get_grade(self, obj): 
        return obj.topic.grade
    get_grade.short_description = 'Grade'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'grade', 'topic', 'total_questions', 'is_active', 'created_at']  # ← Fixed (was 'created-at')
    list_filter = ['subject', 'grade', 'is_active']
    search_fields = ['title']
    filter_horizontal = ['questions']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'description', 'subject', 'grade', 'topic')
        }),
        ('Questions', {
            'fields': ('questions',)
        }),
        ('Settings', {
            'fields': ('duration_minutes', 'passing_score', 'is_active')
        })
    )


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'quiz__subject', 'quiz__grade']
    search_fields = ['student__username', 'quiz__title']
    readonly_fields = ['started_at', 'completed_at', 'score', 'total_questions', 'correct_answers']