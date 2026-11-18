"""Brute-force protection for the account endpoints.

Rates live in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].

Counts are kept in the default cache, which is per gunicorn worker, so the
effective ceiling is (rate x workers). That still turns an unlimited
password-guessing loop into a slow one; moving the count to a shared cache
is a one-line change (`cache = caches[...]`) if it is ever needed.
"""
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Per-IP limit for register, social sign-in, password reset and email
    verification requests."""
    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginRateThrottle(SimpleRateThrottle):
    """Per IP *and* per account being tried, so one address cannot be
    hammered from many IPs as quickly, and one IP cannot sweep many
    accounts as quickly either."""
    scope = "login"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        who = (request.data.get("email") or request.data.get("username") or "").strip().lower()
        return self.cache_format % {
            "scope": self.scope,
            "ident": f"{self.get_ident(request)}:{who}",
        }
