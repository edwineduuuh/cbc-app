from rest_framework import serializers
from .models import Subject, Topic, Question, Quiz, Attempt, QuestionSet, SubscriptionPlan, PaymentRequest


class SubjectSerializer(serializers.ModelSerializer):
    topic_count    = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model  = Subject
        fields = ['id', 'name', 'slug', 'description', 'icon', 'topic_count', 'question_count']

    def get_topic_count(self, obj):
        return obj.topics.count()

    def get_question_count(self, obj):
        return Question.objects.filter(topic__subject=obj).count()


class TopicSerializer(serializers.ModelSerializer):
    subject_name   = serializers.CharField(source='subject.name', read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model  = Topic
        fields = ['id', 'name', 'slug', 'description', 'subject', 'subject_name', 'grade', 'order', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.count()


# UPDATE YOUR QuestionSerializer IN questions/serializers.py

class QuestionSerializer(serializers.ModelSerializer):
    """for quiz taking"""
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    topic_name   = serializers.CharField(source='topic.name', read_only=True)
    grade        = serializers.IntegerField(source='topic.grade', read_only=True)
    
    # ✅ ADD THIS LINE
    question_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Question
        fields = [
            'id', 'subject_name', 'topic_name', 'grade',
            'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer',
            'difficulty', 'question_type', 'max_marks',
            'question_image_url',  # ✅ ADD THIS
        ]
    
    # ✅ ADD THIS METHOD
    def get_question_image_url(self, obj):
        """Return full URL for question image"""
        if obj.question_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
            return obj.question_image.url
        return None


# ALSO UPDATE QuestionDetailSerializer (for admin viewing):

class QuestionDetailSerializer(serializers.ModelSerializer):
    """Full detail - used for admin/authoring and attempt review"""
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    topic_name   = serializers.CharField(source='topic.name', read_only=True)
    grade        = serializers.IntegerField(source='topic.grade', read_only=True)
    subject      = serializers.IntegerField(source='topic.subject.id', read_only=True)
    
    # ✅ ADD THIS LINE
    question_image_url = serializers.SerializerMethodField()

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
            'question_image_url',  # ✅ ADD THIS
        ]
        read_only_fields = [
            'id', 'subject', 'subject_name', 'topic_name', 'grade',
            'created_at', 'created_by'
        ]
        extra_kwargs = {
            'topic': {'required': True},
        }
    
    def get_question_image_url(self, obj):
        if obj.question_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
            return obj.question_image.url
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
            'quiz_type', 'term', 'set_number', 'created_at',
        ]
    
    def get_attempt_status(self, obj):
        request = self.context.get('request')
        
        print(f"=== ATTEMPT STATUS CHECK ===")
        print(f"Quiz ID: {obj.id}")
        print(f"Request: {request}")
        print(f"User: {request.user if request else 'NO REQUEST'}")
        print(f"Is authenticated: {request.user.is_authenticated if request else False}")
    
        if not request or not request.user.is_authenticated:
            print(f"RETURNING NULL - not authenticated")
            return None
    
        latest_attempt = Attempt.objects.filter(
            quiz=obj,
            student=request.user
        ).order_by('-started_at').first()
        
        print(f"Found attempt: {latest_attempt}")
    
        if not latest_attempt:
            print(f"RETURNING NULL - no attempt found")
            return None
        
        answered_count = len(latest_attempt.answers) if latest_attempt.answers else 0
        
        result = {
            'id': latest_attempt.id,
            'status': latest_attempt.status,
            'score': latest_attempt.score,
            'total_marks_awarded': latest_attempt.total_marks_awarded,
            'total_max_marks': latest_attempt.total_max_marks,
            'answered_count': answered_count,
            'total_questions': obj.questions.count(),
            'completed_at': latest_attempt.completed_at,
        }
        
        print(f"RETURNING: {result}")
        return result


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
    
# ─── Serializers ─────────────────────────────────────────────

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        # from questions.models import SubscriptionPlan
        # model = SubscriptionPlan
        model = SubscriptionPlan  # Replace with: model = SubscriptionPlan
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
        value = value.strip().upper()
        # from questions.models import PaymentRequest
        # if PaymentRequest.objects.filter(mpesa_code=value).exists():
        #     raise serializers.ValidationError("This M-Pesa code has already been submitted.")
        return value


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


class SubscriptionStatusSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        # model = Subscription
        model = None  # Replace with: model = Subscription
        fields = [
            'id', 'plan_name', 'start_date', 'end_date',
            'is_active', 'is_valid', 'days_remaining'
        ]

from rest_framework import serializers
from .models import LessonPlan, Classroom, Question, StudentSession, StudentAnswer


class LessonPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LessonPlan
        fields = "__all__"
        read_only_fields = ["teacher", "generated_plan", "created_at", "updated_at"]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Question
        fields = "__all__"
        read_only_fields = ["classroom"]


class ClassroomSerializer(serializers.ModelSerializer):
    questions      = QuestionSerializer(many=True, read_only=True)
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
    answers     = StudentAnswerSerializer(many=True, read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    subject     = serializers.CharField(source="classroom.subject", read_only=True)
    grade       = serializers.CharField(source="classroom.grade", read_only=True)

    class Meta:
        model  = StudentSession
        fields = "__all__"
        read_only_fields = ["total_score", "joined_at"]


class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentSession
        fields = ["id", "student_name", "total_score", "joined_at"]

from .models import LiveQuestion

class LiveQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LiveQuestion
        fields = "__all__"
        read_only_fields = ["classroom"]