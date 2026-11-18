"""
users/adapters.py - Google / Microsoft sign-in (allauth via dj-rest-auth).

Rules (StadiSpace auth spec, Nov 2026):

* NEVER link a provider to an existing account just because the email
  matches. The previous version did exactly that in pre_social_login, which
  let anyone whose Google/Microsoft account *claimed* a victim's email sign
  in as the victim. With the auto-connect gone, dj-rest-auth's own guard
  answers "User is already registered with this e-mail address." Linking a
  second provider is a deliberate act from Settings, while signed in.
* The role is chosen on the sign-up screen and sent with the token as
  `role`. Only student / teacher (facilitator) are accepted; anything else,
  or nothing, means student. A returning user's role always comes from the
  database - this adapter only runs for brand-new accounts.
* Status: a student whose provider verified the email is active at once; a
  facilitator is pending until an administrator approves. An email the
  provider does not mark verified (Microsoft Graph gives no flag) starts
  unverified, so a student stays pending until they verify it with us.
"""
import json

from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model
from django.http import HttpResponseBadRequest

User = get_user_model()

from users.auth import facilitator_requires_approval

SIGNUP_ROLES = (User.ROLE_STUDENT, User.ROLE_TEACHER)


def _requested_role(request):
    # allauth hands us the plain Django request, whose JSON body DRF has
    # already consumed, so the sign-in view copies the role onto it.
    role = (getattr(request, "stadispace_signup_role", "") or "").strip().lower()
    if role == "facilitator":
        role = User.ROLE_TEACHER
    return role if role in SIGNUP_ROLES else User.ROLE_STUDENT


def _provider_verified_email(sociallogin):
    extra = sociallogin.account.extra_data or {}
    if sociallogin.account.provider == "google":
        return bool(extra.get("email_verified") or extra.get("verified_email"))
    return False


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):

    def pre_social_login(self, request, sociallogin):
        """A brand-new provider identity whose email already belongs to an
        account is refused - never linked (see module docstring). Answering
        here also stops allauth falling back to its HTML sign-up form,
        which this API cannot serve."""
        if sociallogin.is_existing:
            return
        email = (sociallogin.user.email or "").strip().lower()
        if email and User.objects.filter(email__iexact=email).exists():
            raise ImmediateHttpResponse(HttpResponseBadRequest(
                json.dumps({
                    "code": "email_exists",
                    "detail": "This email already has a StadiSpace account. Sign in "
                              "the way you usually do; you can link this sign-in "
                              "method from Settings afterwards.",
                }),
                content_type="application/json",
            ))

    def is_auto_signup_allowed(self, request, sociallogin):
        return True

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if user.email:
            user.email = user.email.strip().lower()
        # Microsoft sends no usable username; an empty one makes allauth fall
        # back to its HTML sign-up form. Same scheme as email registration.
        if not user.username and user.email:
            from users.serializers import RegisterSerializer
            user.username = RegisterSerializer()._generate_username(user.email)
        if "given_name" in data or "family_name" in data:
            user.first_name = data.get("given_name", "") or user.first_name
            user.last_name = data.get("family_name", "") or user.last_name
        elif data.get("name") and not user.first_name:
            names = data["name"].split(" ", 1)
            user.first_name = names[0]
            user.last_name = names[1] if len(names) > 1 else ""

        user.role = _requested_role(request)
        user.email_verified = _provider_verified_email(sociallogin)
        # Verified email = in. Facilitators wait for a human only when the
        # FACILITATOR_REQUIRES_APPROVAL setting is switched on.
        if user.role == User.ROLE_TEACHER and facilitator_requires_approval():
            user.status = User.STATUS_PENDING
        else:
            user.status = User.STATUS_ACTIVE if user.email_verified else User.STATUS_PENDING
        return user

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
        # Belt and braces: never let a social sign-up end up privileged.
        if user.role not in SIGNUP_ROLES:
            user.role = User.ROLE_STUDENT
            user.save(update_fields=["role"])
        if not user.email_verified and user.email:
            try:
                from users.views import _send_verification_email
                _send_verification_email(user)
            except Exception:
                pass
        return user
