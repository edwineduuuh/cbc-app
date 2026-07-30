"""
users/auth.py
JWT authentication that also records daily activity — so the admin can see
who used StadiSpace on any given day. Deduped via cache to one DB write per
user per day; failures never break authentication.
"""
import logging
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.utils import timezone
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


class ActivityTrackingJWTAuthentication(JWTAuthentication):
    """Standard SimpleJWT auth + a daily-activity ping on success."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            touch_activity(result[0])
        return result
