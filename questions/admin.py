from django.contrib import admin
from .models import Subject, Topic, Question, Quiz, Attempt, AIGradingSettings



@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']
    ordering = ['name']

from .models import QuestionPart

class QuestionPartInline(admin.TabularInline):
    model = QuestionPart
    extra = 3
    fields = ['part_label', 'question_text', 'question_type', 'max_marks', 'correct_answer', 'option_a', 'option_b', 'option_c', 'option_d', 'order']


from .models import Passage
@admin.register(Passage)
class PassageAdmin(admin.ModelAdmin):
    list_display = ['title', 'passage_type', 'subject', 'grade', 'created_at']
    list_filter = ['passage_type', 'subject', 'grade']
    search_fields = ['title', 'content']
   
@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [QuestionPartInline]
    list_display = ['id', 'question_text_short', 'topic', 'question_type', 'difficulty', 'max_marks', 'has_image']
    list_filter = ['question_type', 'difficulty', 'topic__subject', 'topic__grade']
    search_fields = ['question_text', 'id']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('topic', 'passage','question_type', 'difficulty', 'max_marks', 'question_text', 'question_image')  # ADD question_image HERE
        }),
        ('MCQ Options', {
            'fields': ('option_a', 'option_b', 'option_c', 'option_d'),
            'classes': ('collapse',)
        }),
        ('Answer & Grading', {
            'fields': ('correct_answer', 'explanation', 'marking_scheme')
        }),
        ('Metadata', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        })
    )
    
    def question_text_short(self, obj):
        return obj.question_text[:80] + '...' if len(obj.question_text) > 80 else obj.question_text
    question_text_short.short_description = 'Question'
    
    def has_image(self, obj):
        return "✓" if obj.question_image else "✗"
    has_image.short_description = 'Image'

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'grade', 'order', 'question_count']
    list_filter = ['subject', 'grade']
    search_fields = ['name', 'subject__name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['grade', 'subject__name', 'order', 'name']  # ← Grade first, then subject
    
    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = 'Questions'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'grade', 'subject', 'quiz_type', 'term', 'set_number', 'is_active', 'created_at']
    list_filter = ['grade', 'subject', 'quiz_type', 'is_active']
    search_fields = ['title', 'description']
    filter_horizontal = ['questions']
    ordering = ['grade', 'subject__name', '-created_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'description', 'grade', 'subject', 'topic')
        }),
        ('Quiz Type', {
            'fields': ('quiz_type', 'term', 'set_number'),
            'description': 'Set quiz_type to "exam" for exams, "topical" for topical quizzes'
        }),
        ('Questions', {
            'fields': ('questions',)
        }),
        ('Settings', {
            'fields': ('duration_minutes', 'passing_score', 'is_active', 'owner_type', 'available_to_teachers')
        })
    )
    
    def question_preview(self, obj):
        return obj.question_text[:50] + "..."
    question_preview.short_description = 'Question'
    
    def get_grade(self, obj):
        return f"Grade {obj.topic.grade}"
    get_grade.short_description = 'Grade'
    get_grade.admin_order_field = 'topic__grade'
    
    def get_subject(self, obj):
        return obj.topic.subject.name
    get_subject.short_description = 'Subject'
    get_subject.admin_order_field = 'topic__subject__name'
    
    def get_topic_with_order(self, obj):
        if obj.topic.order > 0:
            return f"{obj.topic.name} ({obj.topic.order})"
        return obj.topic.name
    get_topic_with_order.short_description = 'Topic'
    get_topic_with_order.admin_order_field = 'topic__order'


# @admin.register(Quiz)
# class QuizAdmin(admin.ModelAdmin):
#     list_display = ['title', 'grade', 'subject', 'topic', 'total_questions', 'is_active', 'created_at']
#     list_filter = ['grade', 'subject', 'is_active', 'owner_type', 'available_to_teachers']
#     search_fields = ['title', 'description']
#     filter_horizontal = ['questions']
#     ordering = ['grade', 'subject__name', '-created_at']  # ← Grade first
    
#     fieldsets = (
#         ('Basic Info', {
#             'fields': ('title', 'description', 'grade', 'subject', 'topic')
#         }),
#         ('Questions', {
#             'fields': ('questions',)
#         }),
#         ('Settings', {
#             'fields': ('duration_minutes', 'passing_score', 'is_active', 'owner_type', 'available_to_teachers')
#         })
#     )


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'quiz__grade', 'quiz__subject']
    search_fields = ['student__username', 'quiz__title']
    readonly_fields = ['started_at', 'completed_at', 'score', 'total_questions', 'correct_answers']
    ordering = ['-started_at']

   
@admin.register(AIGradingSettings)
class AIGradingSettingsAdmin(admin.ModelAdmin):
       list_display = ['__str__', 'strictness_level', 'updated_at']


from .models import SubscriptionPlan, PaymentRequest, Subscription

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'price_kes', 'billing_period', 'duration_days', 'is_active']

@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'mpesa_code', 'status', 'submitted_at']

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'start_date', 'end_date', 'is_active']


from .models import MotivationalContent

@admin.register(MotivationalContent)
class MotivationalContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'content_type', 'category', 'author', 'is_active', 'grade_range', 'created_at']
    list_filter = ['content_type', 'category', 'is_active']
    search_fields = ['title', 'text', 'author']
    list_editable = ['is_active']
    ordering = ['-created_at']

    def grade_range(self, obj):
        return f"G{obj.grade_min}–G{obj.grade_max}"
    grade_range.short_description = 'Grades'


