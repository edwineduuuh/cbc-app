# questions/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

# ── Who may do what ───────────────────────────────────────────────────────
# StadiSpace is B2C. Students and facilitators (teachers) are customers who
# CONSUME central content; anyone can self-register as either (see
# users/serializers.py SELF_SERVICE_ROLES), so neither role may ever manage
# central content. "school_admin" is a leftover role with no place in the
# product and grants nothing here.
#
#   ADMIN_ROLES   - run the platform: users, payments, curriculum, publishing
#   CONTENT_ROLES - maintain the teacher-set question bank. "content_editor"
#                   is recognised so the role can be introduced without
#                   touching these checks; it is only assigned by an admin.
ADMIN_ROLES = ("admin", "superadmin")
CONTENT_ROLES = ADMIN_ROLES + ("content_editor",)


def is_platform_admin(user) -> bool:
    return bool(
        user and user.is_authenticated and (
            user.is_superuser or user.is_staff
            or getattr(user, "role", None) in ADMIN_ROLES
        )
    )


def is_content_staff(user) -> bool:
    return bool(
        user and user.is_authenticated and (
            user.is_superuser or user.is_staff
            or getattr(user, "role", None) in CONTENT_ROLES
        )
    )


class IsContentStaff(BasePermission):
    """Central question bank, quizzes, passages and bulk imports."""
    message = "Only StadiSpace content staff can manage central content."

    def has_permission(self, request, view):
        return is_content_staff(request.user)


class IsCurriculumManager(BasePermission):
    """Curriculum structure (strands, sub-strands): content staff may read it
    to file questions; only an admin may change it."""
    message = "Only an administrator can change the curriculum structure."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return is_content_staff(request.user)
        return is_platform_admin(request.user)


class IsFacilitator(BasePermission):
    """Educator Studio: facilitators (stored role "teacher") and admins.

    Status is enforced earlier, in users.auth: a pending or suspended
    facilitator never gets this far.
    """
    message = "The Educator Studio is for facilitator accounts."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated
                    and (getattr(u, "role", None) == "teacher" or is_platform_admin(u)))


class IsAdminUser(BasePermission):
    """
    Allows access to users with the admin/superadmin role
    OR Django staff/superuser status.
    """
    message = "You must be an admin to perform this action."

    ADMIN_ROLES = list(ADMIN_ROLES)

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