from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Docstring for UserSerializer
    Serializer for User model
    Converts User object to/from JSON
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email','role','grade', 'first_name','last_name']
        read_only_data = ['id']

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
        fields = ['username', 'email','password', 'password2', 'role','grade', 'first_name','last_name']

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
            last_name=validated_data.get('last_name', '')
        )

        return user
    
class LoginSerializer(serializers.Serializer):
    """
    Serializer for login form in browsable API.
    """
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})