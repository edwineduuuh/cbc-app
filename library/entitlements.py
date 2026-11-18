"""Who may see and open which resource. The only place these rules live.

Separate checks, never one general "premium" flag (brief §7):
  role                   - student / facilitator (stored "teacher") / admin
  student subscription   - has_student_premium()
  resource access        - Resource.access (free / premium)
  facilitator scope      - Revision Notes only, regardless of access level
  extraction eligibility - generator only; never a person's permission
"""
from questions.permissions import is_platform_admin

from .models import Resource


def is_student(user):
    return bool(user and user.is_authenticated and getattr(user, "role", "") == "student")


def is_facilitator(user):
    return bool(user and user.is_authenticated and getattr(user, "role", "") == "teacher")


def has_student_premium(user):
    """A current paid student subscription. Facilitators never need one."""
    if not (user and user.is_authenticated):
        return False
    try:
        return bool(user.subscription.is_valid)
    except Exception:
        return False


def student_can_browse(user):
    return is_student(user) or is_platform_admin(user)


def facilitator_can_browse_notes(user):
    return is_facilitator(user) or is_platform_admin(user)


def can_open(user, resource: Resource, portal: str = "student"):
    """(allowed, reason). reason is 'premium_required' when an upgrade would help,
    'not_available' otherwise - the caller turns it into 402 / 404."""
    if is_platform_admin(user):
        return True, ""
    if resource.status != Resource.PUBLISHED:
        return False, "not_available"

    if portal == "facilitator":
        # Facilitators get Revision Notes - Free or Premium - and nothing else.
        if is_facilitator(user) and resource.category == Resource.REVISION_NOTES:
            return True, ""
        return False, "not_available"

    if not is_student(user):
        return False, "not_available"
    if resource.access == Resource.ACCESS_FREE:
        return True, ""
    if resource.access == Resource.ACCESS_PREMIUM:
        return (True, "") if has_student_premium(user) else (False, "premium_required")
    return False, "not_available"          # unclassified never reaches students
