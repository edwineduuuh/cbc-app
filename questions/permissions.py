# questions/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminUser(BasePermission):
    """
    Allows access to users with admin/superadmin/school_admin role
    OR Django staff/superuser status.
    """
    message = "You must be an admin to perform this action."

    ADMIN_ROLES = ["admin", "superadmin", "school_admin"]

    def has_permission(self, request, view):
        user = request.user
        return (
            user and
            user.is_authenticated and
            (
                getattr(user, "role", None) in self.ADMIN_ROLES or
                user.is_staff or
                user.is_superuser
            )
        )


class IsTeacherUser(BasePermission):
    """
    Allows access only to teachers or school admins.
    Used for classroom content management.
    """
    message = "You must be a teacher or school admin to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ["teacher", "school_admin"]
        )


class IsAdminOrTeacher(BasePermission):
    """
    Allows access to admins (staff/superuser) OR teachers/school admins.
    Used for shared authoring features.
    """
    message = "You must be an admin or teacher/school admin to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return (
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.is_staff
                or getattr(user, "role", None) in ["admin", "superadmin", "teacher", "school_admin"]
            )
        )


class CanAccessQuestion(BasePermission):
    """
    Controls READ access to questions based on scope.
    - public: everyone
    - b2c: authenticated + subscribed (or admin/teacher)
    - classroom: enrolled students, teacher of class, admins
    """
    message = "You do not have permission to access this question."

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins see everything
        if user.is_superuser or user.is_staff:
            return True

        # Public questions - everyone
        if obj.scope == "public":
            return True

        # B2C questions - authenticated + premium subscription
        if obj.scope == "b2c":
            # Replace with your actual subscription check
            return user.is_authenticated and getattr(user, "can_access_premium", False)

        # Classroom questions - teacher or enrolled student
        if obj.scope == "classroom":
            if user.role in ["teacher", "school_admin"]:
                return obj.created_by == user

            # Check if student is enrolled in a class that uses this question
            from questions.models import Quiz
            from users.models import ClassroomMembership

            student_classroom_ids = ClassroomMembership.objects.filter(
                student=user, is_active=True
            ).values_list("classroom_id", flat=True)

            return Quiz.objects.filter(
                questions=obj,
                classroom_assignments__classroom_id__in=student_classroom_ids,
            ).exists()

        return False