"""
users/auth.py
JWT authentication that also records daily activity - so the admin can see
who used StadiSpace on any given day. Deduped via cache to one DB write per
user per day; failures never break authentication.
"""
import logging
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)
EAT = ZoneInfo("Africa/Nairobi")


def touch_activity(user):
    """Mark a user active today (Kenya date), at most one DB write per day."""
    if not user or not getattr(user, "is_authenticated", False):
        return
    try:
        today = timezone.now().astimezone(EAT).date()
        ck = f"active:{user.pk}:{today.isoformat()}"
        if cache.get(ck):
            return
        from .models import DailyActivity
        DailyActivity.objects.get_or_create(user=user, date=today)
        # Keep last_activity_date AND last_login fresh (the admin "Last Login"
        # column reads last_login, which JWT never set). Once/day, cheap.
        type(user).objects.filter(pk=user.pk).update(
            last_activity_date=today, last_login=timezone.now())
        cache.set(ck, 1, 60 * 60 * 24)
    except Exception:
        logger.debug("touch_activity failed", exc_info=True)


# What a signed-in but NOT active account may still call: enough to see its
# own account, verify its email, and fix its password - nothing else.
INACTIVE_ALLOWED_PATHS = (
    "/api/auth/me/",
    "/api/auth/auth/me/",
    "/api/auth/resend-verification/",
    "/api/auth/verify-email/",
    "/api/auth/change-password/",
    "/api/health/",
)


def account_block_payload(user):
    """The 403 body the frontend turns into the right screen."""
    if user.status == user.STATUS_PENDING:
        reason = ("awaiting_verification"
                  if user.role == user.ROLE_STUDENT and not user.email_verified
                  else "awaiting_approval")
    else:
        reason = user.status            # "suspended" or "rejected"
    return {"code": "account_inactive", "status": user.status, "reason": reason,
            "detail": "This account cannot use StadiSpace yet."}


class AccountInactive(PermissionDenied):
    default_code = "account_inactive"

    def __init__(self, user):
        super().__init__(detail=account_block_payload(user))


class ActivityTrackingJWTAuthentication(JWTAuthentication):
    """Standard SimpleJWT auth + a daily-activity ping on success.

    Also the one place account status is enforced: a pending, suspended or
    rejected account is refused on every endpoint except the few it needs
    to see its own state. Doing it here covers every view, including the
    many that declare permission_classes explicitly and would bypass a
    default permission. Staff/superusers are never blocked (no lock-out).
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user = result[0]
            if (getattr(user, "status", "active") != "active"
                    and not (user.is_staff or user.is_superuser)
                    and request.path not in INACTIVE_ALLOWED_PATHS):
                raise AccountInactive(user)
            touch_activity(user)
        return result
