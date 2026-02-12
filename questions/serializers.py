from rest_framework import serializers
from .models import Subject, Topic, Question, Quiz, Attempt


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model
    """
    topic_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'slug', 'description', 'icon', 'topic_count', 'question_count']
    
    def get_topic_count(self, obj):
        return obj.topics.count()
    
    def get_question_count(self, obj):
        return obj.questions.count()


class TopicSerializer(serializers.ModelSerializer):
    """
    Serializer for Topic model
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = ['id', 'name', 'slug', 'description', 'subject', 'subject_name', 'order', 'question_count']
    
    def get_question_count(self, obj):
        return obj.questions.count()


class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for Question model - hides correct answer for quiz taking
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'subject', 'subject_name', 'topic', 'topic_name', 'grade',
            'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
            'difficulty'
        ]


class QuestionDetailSerializer(serializers.ModelSerializer):
    """
    Full question serializer - includes correct answer and explanation
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'subject', 'subject_name', 'topic', 'topic_name', 'grade',
            'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'explanation', 'difficulty'
        ]


class QuizListSerializer(serializers.ModelSerializer):
    """
    Quiz list view - summary info
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    total_questions = serializers.IntegerField(source='questions.count', read_only=True)
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'subject_name',
            'topic_name', 'grade', 'total_questions',
            'duration_minutes', 'passing_score'
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """
    Full quiz view - includes questions
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    questions = QuestionDetailSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'subject_name',
            'topic_name', 'grade', 'questions',
            'duration_minutes', 'passing_score'
        ]


class SubmitQuizSerializer(serializers.Serializer):
    """
    Serializer for submitting quiz answers
    """
    quiz_id = serializers.IntegerField()
    answers = serializers.JSONField(help_text='{"question_id": "A", "question_id": "B", ...}')


class AttemptSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz attempts
    """
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.CharField(source='student.username', read_only=True)
    
    class Meta:
        model = Attempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name',
            'status', 'started_at', 'completed_at',
            'score', 'total_questions', 'correct_answers'
        ]
        read_only_fields = ['student', 'started_at', 'score', 'total_questions', 'correct_answers']


class AttemptDetailSerializer(serializers.ModelSerializer):
    """
    Full attempt details - includes questions with correct answers
    """
    quiz = QuizDetailSerializer(read_only=True)
    questions_review = serializers.SerializerMethodField()
    
    class Meta:
        model = Attempt
        fields = [
            'id', 'quiz', 'student', 'status', 'started_at', 'completed_at',
            'answers', 'score', 'total_questions', 'correct_answers', 'questions_review'
        ]
    
    def get_questions_review(self, obj):
        """
        Return questions with student's answers and correct answers
        """
        questions = obj.quiz.questions.all()
        review = []
        
        for question in questions:
            student_answer = obj.answers.get(str(question.id))
            is_correct = student_answer == question.correct_answer
            
            review.append({
                'question_id': question.id,
                'question_text': question.question_text,
                'option_a': question.option_a,
                'option_b': question.option_b,
                'option_c': question.option_c,
                'option_d': question.option_d,
                'student_answer': student_answer,
                'correct_answer': question.correct_answer,
                'is_correct': is_correct,
                'explanation': question.explanation
            })
        
        return review