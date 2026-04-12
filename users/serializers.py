from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Classroom, ClassroomInvitation
from questions.models import Subject



User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'grade',
            'first_name', 'last_name',
            'is_staff', 'is_superuser'  # ADD THESE TWO
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser']

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles password validation and hashing.
    """
    password = serializers.CharField(
        write_only = True,
        required = True,
        validators = [validate_password],
        style = {'input_type':'password'}
    )
    password2 = serializers.CharField(
        write_only = True,
        required = True,
        style = {'input_type':'password'}
    )

    class Meta:
        model = User
        fields = ['username', 'email','password', 'password2', 'role','grade', 'first_name','last_name',
                  'parent_name', 'parent_phone', 'parent_email']

    def validate(self, attrs):
         """
        Validate that passwords match.
        """
         if attrs['password'] != attrs['password2']:
             raise serializers.ValidationError({
                 "password": "Password fields didn't match"
             })
         return attrs
    
    def validate_grade(self, value):

        if value is not None and (value < 4 or value > 12):
            raise serializers.ValidationError("Grade must be between 4 and 12")
        return value
    
    def validate_parent_phone(self, value):
        """Normalize parent phone to 254 format"""
        if not value:
            return value
        import re
        phone = value.strip().replace(' ', '').replace('-', '')
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        if not phone.startswith('254'):
            raise serializers.ValidationError("Phone must start with 07, 01, +254, or 254")
        if len(phone) != 12 or not re.match(r'^254[17]\d{8}$', phone):
            raise serializers.ValidationError("Invalid Kenyan phone number")
        return phone

    def create(self, validated_data):
        """
        Create new user with hashed password.
        """
        validated_data.pop('password2')

        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email = validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'student'),
            grade=validated_data.get('grade'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            parent_name=validated_data.get('parent_name', ''),
            parent_phone=validated_data.get('parent_phone', ''),
            parent_email=validated_data.get('parent_email', ''),
        )

        return user
    
class LoginSerializer(serializers.Serializer):
    """
    Serializer for login form in browsable API.
    """
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})


class SubjectField(serializers.RelatedField):
    """Custom field to handle subject by ID or name"""
    def to_representation(self, value):
        return {
            'id': value.id,
            'name': value.name,
            'icon': value.icon
        }
    
    def to_internal_value(self, data):
        if isinstance(data, dict):
            return Subject.objects.get(id=data['id'])
        try:
            # Try as ID first
            return Subject.objects.get(id=int(data))
        except (ValueError, TypeError):
            # Try as name
            return Subject.objects.get(name__iexact=str(data))
        except Subject.DoesNotExist:
            raise serializers.ValidationError(f"Subject '{data}' not found")


class ClassroomSerializer(serializers.ModelSerializer):
    """Serializer for listing classrooms"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_icon = serializers.CharField(source='subject.icon', read_only=True)
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    teacher_full_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()  # ← FIXED
    
    class Meta:
        model = Classroom
        fields = [
            'id', 'name', 'grade', 'subject', 'subject_name', 'subject_icon',
            'teacher', 'teacher_name', 'teacher_full_name', 'student_count',
            'join_code', 'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['join_code', 'teacher', 'created_at', 'updated_at']
    
    def get_teacher_full_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip() or obj.teacher.username
    
    def get_student_count(self, obj):  # ← ADD THIS
        return obj.students.count()


class ClassroomCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating classrooms (accepts subject ID)"""
    class Meta:
        model = Classroom
        fields = ['name', 'grade', 'subject', 'description', 'is_active']
    
    def validate(self, data):
        # Check if teacher already has this class
        teacher = self.context['request'].user
        if Classroom.objects.filter(
            teacher=teacher,
            name=data['name'],
            subject=data['subject'],
            grade=data['grade']
        ).exists():
            raise serializers.ValidationError(
                f"You already have a {data['subject']} Grade {data['grade']}{data['name']} class"
            )
        return data


class ClassroomDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed classroom view with students list"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_icon = serializers.CharField(source='subject.icon', read_only=True)
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    students = serializers.SerializerMethodField()
    
    class Meta:
        model = Classroom
        fields = [
            'id', 'name', 'grade', 'subject', 'subject_name', 'subject_icon',
            'teacher', 'teacher_name', 'students', 'student_count',
            'join_code', 'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['join_code', 'teacher', 'created_at', 'updated_at']
    
    def get_students(self, obj):
        from .serializers import UserSerializer
        return UserSerializer(obj.students.all(), many=True).data


class JoinClassroomSerializer(serializers.Serializer):
    """Serializer for students joining a classroom"""
    join_code = serializers.CharField(max_length=12, required=True)
    
    def validate_join_code(self, value):
        try:
            classroom = Classroom.objects.get(join_code=value, is_active=True)
        except Classroom.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired join code")
        
        # Check if student already in class
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if classroom.students.filter(id=request.user.id).exists():
                raise serializers.ValidationError("You are already in this class")
        
        return value


class UpdateClassroomSerializer(serializers.ModelSerializer):
    """Serializer for updating classroom settings"""
    class Meta:
        model = Classroom
        fields = ['name', 'description', 'is_active']


class RegenerateJoinCodeSerializer(serializers.Serializer):
    """Serializer for regenerating join code"""
    confirm = serializers.BooleanField(required=True)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm to regenerate join code")
        return value