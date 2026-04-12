from rest_framework import serializers
from .models import (
    Subject, Topic, Question, Quiz, Attempt, QuestionSet, 
    SubscriptionPlan, PaymentRequest, LessonPlan, Classroom, 
    LiveQuestion, StudentSession, StudentAnswer, Passage, QuestionPart
)


# ═══════════════════════════════════════════════════════════════
# QUIZ SYSTEM SERIALIZERS
# ═══════════════════════════════════════════════════════════════
class QuestionPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionPart
        fields = [
            'id', 'part_label', 'question_text', 'question_type',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'max_marks', 'marking_scheme',
            'explanation', 'order'
        ]
class PassageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passage
        fields = ['id', 'title', 'content', 'passage_type', 'author']
class SubjectSerializer(serializers.ModelSerializer):
    topic_count    = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model  = Subject
        fields = ['id', 'name', 'slug', 'description', 'icon', 'topic_count', 'question_count']

    def get_topic_count(self, obj):
        grade = self.context.get('grade')
        if grade:
            return obj.topics.filter(grade=grade).count()
        return obj.topics.count()

    def get_question_count(self, obj):
        grade = self.context.get('grade')
        if grade:
            return Question.objects.filter(topic__subject=obj, topic__grade=grade).count()
        return Question.objects.filter(topic__subject=obj).count()

class TopicSerializer(serializers.ModelSerializer):
    subject_name   = serializers.CharField(source='subject.name', read_only=True)
    question_count = serializers.SerializerMethodField()
    quiz_count     = serializers.SerializerMethodField()

    class Meta:
        model  = Topic
        fields = ['id', 'name', 'slug', 'description', 'subject', 'subject_name', 'grade', 'order', 'question_count', 'quiz_count']

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_quiz_count(self, obj):
        return Quiz.objects.filter(
            subject=obj.subject,
            grade=obj.grade,
            quiz_type='topical',
            is_active=True
        ).count()
class QuestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    topic_name   = serializers.CharField(source='topic.name', read_only=True)
    grade        = serializers.IntegerField(source='topic.grade', read_only=True)
    question_image_url = serializers.SerializerMethodField()
    passage = PassageSerializer(read_only=True)
    parts = QuestionPartSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = [
            'id', 'subject_name', 'topic_name', 'grade',
            'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer',
            'difficulty', 'question_type', 'max_marks',
            'question_image_url',
            'passage',
            'parts',
        ]

    def get_question_image_url(self, obj):
        if not obj.question_image:
            return None
        try:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
            return obj.question_image.url
        except:
            return None


class QuestionDetailSerializer(serializers.ModelSerializer):
    """Full detail - for admin/authoring and attempt review"""
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    topic_name   = serializers.CharField(source='topic.name', read_only=True)
    grade        = serializers.IntegerField(source='topic.grade', read_only=True)
    subject      = serializers.IntegerField(source='topic.subject.id', read_only=True)
    question_image_url = serializers.SerializerMethodField()
    question_image = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model  = Question
        fields = [
            'id', 'topic', 'subject', 'subject_name', 'topic_name', 'grade',
            'question_type',
            'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'correct_answers',
            'explanation', 'difficulty',
            'created_at', 'created_by',
            'question_image_url', 'question_image'
        ]
        read_only_fields = [
            'id', 'subject', 'subject_name', 'topic_name', 'grade',
            'created_at', 'created_by'
        ]
        extra_kwargs = {
            'topic': {'required': True},
        }
    
    def get_question_image_url(self, obj):
        if not obj.question_image:
            return None
        try:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
            return obj.question_image.url
        except (ValueError, Exception):
            # Old image uploaded before Cloudinary - return None
            return None


class QuizListSerializer(serializers.ModelSerializer):
    subject_name    = serializers.CharField(source='subject.name', read_only=True)
    topic_name      = serializers.CharField(source='topic.name', read_only=True, allow_null=True)
    total_questions = serializers.IntegerField(source='questions.count', read_only=True)
    attempt_status  = serializers.SerializerMethodField()

    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name',
            'topic_name', 'grade', 'total_questions',
            'duration_minutes', 'passing_score', 'is_active',
            'owner_type', 'available_to_teachers',
            'attempt_status', 'quiz_type',
            'term', 'set_number', 'created_at',
        ]
    
    def get_attempt_status(self, obj):
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            return None
    
        latest_attempt = Attempt.objects.filter(
            quiz=obj,
            student=request.user
        ).order_by('-started_at').first()
        
        if not latest_attempt:
            return None
        
        answered_count = len(latest_attempt.answers) if latest_attempt.answers else 0
        
        return {
            'id': latest_attempt.id,
            'status': latest_attempt.status,
            'score': latest_attempt.score,
            'total_marks_awarded': latest_attempt.total_marks_awarded,
            'total_max_marks': latest_attempt.total_max_marks,
            'answered_count': answered_count,
            'total_questions': obj.questions.count(),
            'completed_at': latest_attempt.completed_at,
        }


class QuizDetailSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name   = serializers.CharField(source='topic.name', read_only=True, allow_null=True)
    questions    = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description', 'subject_name',
            'topic_name', 'grade', 'questions',
            'duration_minutes', 'passing_score'
        ]


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    """For creating/updating quizzes – accepts question IDs"""
    questions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Question.objects.all(),
        required=False
    )
    question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description', 'subject', 'topic',
            'grade', 'duration_minutes', 'passing_score',
            'is_active', 'questions', 'question_ids', 'owner_type', 'available_to_teachers'
        ]

    def validate(self, data):
        if 'subject' not in data and not self.instance:
            raise serializers.ValidationError({"subject": "This field is required."})
        
        if 'question_ids' in data and not data.get('questions'):
            data['questions'] = Question.objects.filter(id__in=data['question_ids'])
        
        return data

    def create(self, validated_data):
        question_ids = validated_data.pop('question_ids', None)
        questions = validated_data.pop('questions', [])
        
        quiz = Quiz.objects.create(**validated_data)
        
        if questions:
            quiz.questions.set(questions)
        
        return quiz

    def update(self, instance, validated_data):
        question_ids = validated_data.pop('question_ids', None)
        questions = validated_data.pop('questions', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if questions is not None:
            instance.questions.set(questions)
        
        return instance


class SubmitQuizSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()
    answers = serializers.JSONField()


class AttemptSerializer(serializers.ModelSerializer):
    quiz_title   = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model  = Attempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name',
            'status', 'started_at', 'completed_at',
            'score', 'total_questions', 'correct_answers',
            'total_marks_awarded', 'total_max_marks'
        ]
        read_only_fields = ['student', 'started_at', 'score', 'total_questions', 'correct_answers', 'total_marks_awarded', 'total_max_marks']


class AttemptDetailSerializer(serializers.ModelSerializer):
    quiz              = serializers.SerializerMethodField()
    questions_review  = serializers.SerializerMethodField()
    detailed_feedback = serializers.SerializerMethodField()

    class Meta:
        model  = Attempt
        fields = [
            'id', 'quiz', 'student', 'status', 'started_at', 'completed_at',
            'answers', 'score', 'total_questions', 'correct_answers',
            'total_marks_awarded', 'total_max_marks',
            'questions_review', 'detailed_feedback',
        ]

    def get_quiz(self, obj):
        return QuizDetailSerializer(obj.quiz).data

    def get_questions_review(self, obj):
        questions = obj.quiz.questions.all()
        review = []
        for question in questions:
            student_answer = obj.answers.get(str(question.id))
            review.append({
                'question_id':    question.id,
                'question_text':  question.question_text,
                'option_a':       question.option_a,
                'option_b':       question.option_b,
                'option_c':       question.option_c,
                'option_d':       question.option_d,
                'student_answer': student_answer,
                'correct_answer': question.correct_answer,
                'is_correct':     student_answer == question.correct_answer,
                'explanation':    question.explanation,
            })
        return review

    def get_detailed_feedback(self, obj):
        return obj.detailed_feedback or {}


class QuestionSetSerializer(serializers.ModelSerializer):
    questions    = QuestionDetailSerializer(many=True, read_only=True)
    question_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    count        = serializers.IntegerField(source='questions.count', read_only=True)

    class Meta:
        model  = QuestionSet
        fields = ['id', 'name', 'description', 'questions', 'question_ids', 'count', 'created_at']

    def create(self, validated_data):
        question_ids = validated_data.pop('question_ids')
        question_set = QuestionSet.objects.create(**validated_data)
        question_set.questions.set(question_ids)
        return question_set


# ═══════════════════════════════════════════════════════════════
# SUBSCRIPTION & PAYMENTS
# ═══════════════════════════════════════════════════════════════

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'slug', 'description', 'price_kes',
            'billing_period', 'duration_days',
            'max_quizzes_per_day', 'can_access_b2c',
            'can_access_analytics', 'can_download_pdf',
        ]


class SubmitPaymentSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    mpesa_code = serializers.CharField(max_length=20)
    phone_number = serializers.CharField(max_length=15)
    amount_paid = serializers.IntegerField()

    def validate_mpesa_code(self, value):
        return value.strip().upper()


class PaymentRequestSerializer(serializers.ModelSerializer):
    plan_name  = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.IntegerField(source='plan.price_kes', read_only=True)
    username   = serializers.CharField(source='user.username', read_only=True)
    email      = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model  = PaymentRequest
        fields = [
            'id','username','email','plan_name','plan_price',
            'mpesa_code','phone_number','amount_paid',
            'status','rejection_reason','submitted_at','verified_at','admin_notes',
        ]


# ═══════════════════════════════════════════════════════════════
# KAHOOT-STYLE CLASSROOMS (TEACHER PANEL)
# ═══════════════════════════════════════════════════════════════

class LiveQuestionSerializer(serializers.ModelSerializer):
    """For Kahoot-style live quiz questions"""
    class Meta:
        model = LiveQuestion
        fields = ['id', 'order', 'text', 'question_type', 'options', 'correct_index', 'points']


class LessonPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LessonPlan
        fields = "__all__"
        read_only_fields = ["teacher", "generated_plan", "created_at", "updated_at"]


class ClassroomSerializer(serializers.ModelSerializer):
    """For Kahoot-style classrooms"""
    questions      = LiveQuestionSerializer(many=True, read_only=True)
    student_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Classroom
        fields = "__all__"
        read_only_fields = ["teacher", "join_code", "status", "created_at"]

    def get_student_count(self, obj):
        return obj.sessions.count()


class StudentAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)

    class Meta:
        model  = StudentAnswer
        fields = "__all__"
        read_only_fields = ["is_correct","points_awarded","ai_feedback","marked_at"]


class StudentSessionSerializer(serializers.ModelSerializer):
    answers        = StudentAnswerSerializer(many=True, read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    subject        = serializers.CharField(source="classroom.subject", read_only=True)
    grade          = serializers.CharField(source="classroom.grade", read_only=True)

    class Meta:
        model  = StudentSession
        fields = "__all__"
        read_only_fields = ["total_score", "joined_at"]


class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentSession
        fields = ["id", "student_name", "total_score", "joined_at"]

class UserQuotaSerializer(serializers.Serializer):
    """Return user quota and subscription status"""
    quiz_credits = serializers.IntegerField()
    free_quizzes_used = serializers.IntegerField()
    has_subscription = serializers.BooleanField()
    subscription_plan = serializers.CharField(allow_null=True)
    subscription_expires = serializers.DateTimeField(allow_null=True)