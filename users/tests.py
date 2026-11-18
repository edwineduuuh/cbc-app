"""Account tests: one auth system, three sign-in methods, stored roles,
controlled facilitator approval (StadiSpace auth spec, Nov 2026).

Google/Microsoft are simulated at the provider boundary
(`complete_login`): everything after the provider hands back an identity
- account creation, role, status, linking, tokens - is the real code.

Run:  python manage.py test users
"""
from unittest import mock

from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from users.models import RoleChange, User

PW = "Str0ng-pass-word!"


def client_for(user=None):
    c = APIClient()
    if user is not None:
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return c


def register(role="student", email="new@example.invalid", **extra):
    body = {"email": email, "password": PW, "password2": PW, "role": role,
            "first_name": "Amina", **extra}
    if role == "student":
        body.setdefault("grade", 7)
    return APIClient().post("/api/auth/register/", body, format="json")


def verify(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return APIClient().post("/api/auth/verify-email/", {"uid": uid, "token": token}, format="json")


class Base(APITestCase):
    def setUp(self):
        cache.clear()     # throttle counters
        self.admin = User.objects.create_user("boss", "boss@example.invalid", PW, role="admin")


# ── Email registration and verification ──────────────────────────────────
class EmailRegistration(Base):
    @mock.patch("users.views._send_verification_email")
    def test_student_pending_until_email_verified(self, _send):
        r = register("student")
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="new@example.invalid")
        self.assertEqual((u.role, u.status), ("student", "pending"))
        # pending: can see own account, nothing else
        self.assertEqual(client_for(u).get("/api/auth/me/").status_code, 200)
        r = client_for(u).get("/api/attempts/")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["reason"], "awaiting_verification")
        u.refresh_from_db()   # signing in updated last_login, which the token covers
        verify(u)
        u.refresh_from_db()
        self.assertEqual(u.status, "active")
        self.assertEqual(client_for(u).get("/api/attempts/").status_code, 200)

    @mock.patch("users.views._send_verification_email")
    def test_facilitator_is_active_after_verification(self, _send):
        register("teacher", email="fa@example.invalid")
        u = User.objects.get(email="fa@example.invalid")
        self.assertEqual(client_for(u).get("/api/facilitator/library/").json()["reason"], "awaiting_verification")
        verify(u)
        u.refresh_from_db()
        self.assertEqual((u.role, u.status), ("teacher", "active"))

    @override_settings(FACILITATOR_REQUIRES_APPROVAL=True)
    @mock.patch("users.views._send_verification_email")
    def test_facilitator_stays_pending_after_verification(self, _send):
        register("teacher", email="f@example.invalid")
        u = User.objects.get(email="f@example.invalid")
        verify(u)
        u.refresh_from_db()
        self.assertEqual((u.role, u.status, u.email_verified), ("teacher", "pending", True))
        r = client_for(u).get("/api/facilitator/library/")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["reason"], "awaiting_approval")

    def test_admin_cannot_be_chosen_at_registration(self):
        for role in ("admin", "superadmin", "school_admin"):
            self.assertEqual(register(role, email=f"{role}@example.invalid").status_code, 400)

    @mock.patch("users.views._send_verification_email")
    def test_one_email_one_account_case_insensitive(self, _send):
        self.assertEqual(register("student", email="Jane@Example.invalid").status_code, 201)
        r = register("student", email="jane@example.INVALID")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(User.objects.filter(email__iexact="jane@example.invalid").count(), 1)

    def test_users_cannot_change_their_own_role_or_status(self):
        u = User.objects.create_user("s", "s@example.invalid", PW, role="student")
        client_for(u).patch("/api/auth/auth/me/", {"role": "admin", "status": "active"}, format="json")
        u.refresh_from_db()
        self.assertEqual(u.role, "student")

    @mock.patch("users.views._send_verification_email")
    def test_changing_email_needs_reverification(self, send):
        u = User.objects.create_user("s", "s@example.invalid", PW, role="student", email_verified=True)
        other = User.objects.create_user("o", "o@example.invalid", PW)
        r = client_for(u).patch("/api/auth/auth/me/", {"email": "O@example.invalid"}, format="json")
        self.assertEqual(r.status_code, 400)          # belongs to someone else
        client_for(u).patch("/api/auth/auth/me/", {"email": "fresh@example.invalid"}, format="json")
        u.refresh_from_db()
        self.assertEqual((u.email, u.email_verified), ("fresh@example.invalid", False))
        self.assertTrue(send.called)
        self.assertTrue(other.pk)


# ── Login, status and redirects ──────────────────────────────────────────
class Login(Base):
    def login(self, email):
        return APIClient().post("/api/auth/login/", {"email": email, "password": PW}, format="json")

    def test_existing_accounts_still_work(self):
        u = User.objects.create_user("old", "old@example.invalid", PW, role="student")
        self.assertEqual(u.status, "active")            # migration default
        r = self.login("old@example.invalid")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["status"], "active")

    def test_suspended_and_rejected_get_no_tokens(self):
        for st in ("suspended", "rejected"):
            User.objects.create_user(st, f"{st}@example.invalid", PW, role="teacher", status=st)
            r = self.login(f"{st}@example.invalid")
            self.assertEqual(r.status_code, 403)
            self.assertNotIn("tokens", r.json())
            self.assertEqual(r.json()["reason"], st)

    def test_token_issued_before_suspension_stops_working(self):
        u = User.objects.create_user("s", "s@example.invalid", PW, role="student")
        c = client_for(u)
        self.assertEqual(c.get("/api/attempts/").status_code, 200)
        u.set_status("suspended", by=self.admin)
        self.assertEqual(c.get("/api/attempts/").status_code, 403)

    def test_login_is_throttled(self):
        User.objects.create_user("t", "t@example.invalid", PW)
        codes = [APIClient().post("/api/auth/login/", {"email": "t@example.invalid", "password": "nope"},
                                  format="json").status_code for _ in range(12)]
        self.assertIn(429, codes)


# ── Facilitator approval in admin ────────────────────────────────────────
class FacilitatorApproval(Base):
    def setUp(self):
        super().setUp()
        self.fac = User.objects.create_user("fac", "fac@example.invalid", PW, role="teacher",
                                            status="pending", email_verified=True)

    def act(self, user, target, action, reason=""):
        return client_for(user).post(f"/api/auth/admin/accounts/{target.pk}/action/",
                                     {"action": action, "reason": reason}, format="json")

    def test_approve_gives_access_and_is_audited(self):
        self.assertEqual(client_for(self.fac).get("/api/facilitator/library/").status_code, 403)
        r = self.act(self.admin, self.fac, "approve", "checked TSC number")
        self.assertEqual(r.status_code, 200)
        self.fac.refresh_from_db()
        self.assertEqual(self.fac.status, "active")
        self.assertEqual(client_for(self.fac).get("/api/facilitator/library/").status_code, 200)
        log = RoleChange.objects.get(user=self.fac)
        self.assertEqual((log.old_value, log.new_value, log.changed_by), ("pending", "active", self.admin))

    def test_reject_suspend_reinstate(self):
        self.assertEqual(self.act(self.admin, self.fac, "reject").status_code, 200)
        self.assertEqual(self.act(self.admin, self.fac, "approve").status_code, 409)  # not pending
        self.assertEqual(self.act(self.admin, self.fac, "reinstate").status_code, 200)
        self.assertEqual(self.act(self.admin, self.fac, "suspend").status_code, 200)
        self.fac.refresh_from_db()
        self.assertEqual(self.fac.status, "suspended")
        self.assertEqual(RoleChange.objects.filter(user=self.fac).count(), 3)

    def test_list_pending_applications(self):
        r = client_for(self.admin).get("/api/auth/admin/accounts/?role=teacher&status=pending")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([row["email"] for row in r.json()["results"]], ["fac@example.invalid"])
        self.assertEqual(r.json()["counts"]["pending"], 1)

    def test_only_admins_and_never_self_or_other_admins(self):
        student = User.objects.create_user("s", "s@example.invalid", PW, role="student")
        for who in (student, self.fac):
            self.assertEqual(self.act(who, self.fac, "approve").status_code, 403)
            self.assertEqual(client_for(who).get("/api/auth/admin/accounts/").status_code, 403)
        other_admin = User.objects.create_user("a2", "a2@example.invalid", PW, role="admin")
        self.assertEqual(self.act(self.admin, other_admin, "suspend").status_code, 403)
        self.assertEqual(self.act(self.admin, self.admin, "suspend").status_code, 403)

    def test_students_cannot_reach_facilitator_endpoints(self):
        student = User.objects.create_user("s", "s@example.invalid", PW, role="student")
        self.assertEqual(client_for(student).get("/api/facilitator/library/").status_code, 403)


# ── Google / Microsoft ───────────────────────────────────────────────────
def fake_complete_login(provider_id, data):
    def complete_login(self, request, app, token, **kwargs):
        provider = self.get_provider()
        login = provider.sociallogin_from_response(request, data)
        login.token = token
        return login
    return complete_login


class SocialSignIn(Base):
    def setUp(self):
        super().setUp()
        for prov in ("google", "microsoft"):
            SocialApp.objects.create(provider=prov, name=prov, client_id="x", secret="y")

    def google(self, data, role=None):
        body = {"access_token": "tok"}
        if role:
            body["role"] = role
        with mock.patch.object(GoogleOAuth2Adapter, "complete_login", fake_complete_login("google", data)):
            return APIClient().post("/api/auth/auth/google/", body, format="json")

    def microsoft(self, data, role=None):
        body = {"access_token": "tok"}
        if role:
            body["role"] = role
        with mock.patch.object(MicrosoftGraphOAuth2Adapter, "complete_login",
                               fake_complete_login("microsoft", data)):
            return APIClient().post("/api/auth/auth/microsoft/", body, format="json")

    GOOGLE = {"id": "g-123", "sub": "g-123", "email": "Jane@Gmail.example", "email_verified": True,
              "given_name": "Jane", "family_name": "W"}
    MS = {"id": "m-9", "mail": "peter@outlook.example", "userPrincipalName": "peter@outlook.example",
          "givenName": "Peter", "surname": "K", "displayName": "Peter K"}

    def test_google_student_signup_is_active_and_verified(self):
        r = self.google(self.GOOGLE, role="student")
        self.assertEqual(r.status_code, 200, r.content)
        u = User.objects.get(email="jane@gmail.example")
        self.assertEqual((u.role, u.status, u.email_verified), ("student", "active", True))
        self.assertTrue(SocialAccount.objects.filter(user=u, provider="google", uid="g-123").exists())
        self.assertEqual(r.json()["user"]["status"], "active")

    def test_google_facilitator_signup_is_active(self):
        self.google(self.GOOGLE, role="facilitator")
        u = User.objects.get(email="jane@gmail.example")
        self.assertEqual((u.role, u.status), ("teacher", "active"))

    @override_settings(FACILITATOR_REQUIRES_APPROVAL=True)
    def test_google_facilitator_signup_waits_when_approval_is_on(self):
        self.google(self.GOOGLE, role="facilitator")
        u = User.objects.get(email="jane@gmail.example")
        self.assertEqual((u.role, u.status), ("teacher", "pending"))

    def test_role_from_request_cannot_be_admin(self):
        self.google(self.GOOGLE, role="admin")
        self.assertEqual(User.objects.get(email="jane@gmail.example").role, "student")

    @mock.patch("users.views._send_verification_email")
    def test_microsoft_email_is_not_trusted_until_verified(self, _send):
        r = self.microsoft(self.MS, role="student")
        self.assertEqual(r.status_code, 200, r.content)
        u = User.objects.get(email="peter@outlook.example")
        self.assertEqual((u.status, u.email_verified), ("pending", False))

    def test_returning_user_keeps_stored_role(self):
        self.google(self.GOOGLE, role="facilitator")
        u = User.objects.get(email="jane@gmail.example")
        u.set_status("active", by=self.admin)
        r = self.google(self.GOOGLE, role="student")      # role in request is ignored
        self.assertEqual(r.status_code, 200)
        u.refresh_from_db()
        self.assertEqual(u.role, "teacher")
        self.assertEqual(User.objects.filter(email="jane@gmail.example").count(), 1)

    def test_no_silent_linking_to_an_existing_email(self):
        victim = User.objects.create_user("victim", "jane@gmail.example", PW, role="admin")
        r = self.google(self.GOOGLE)
        self.assertEqual(r.status_code, 400)
        self.assertNotIn("access", r.json())
        self.assertFalse(SocialAccount.objects.filter(user=victim).exists())

    def test_suspended_social_user_gets_no_tokens(self):
        self.google(self.GOOGLE, role="student")
        User.objects.get(email="jane@gmail.example").set_status("suspended", by=self.admin)
        r = self.google(self.GOOGLE)
        self.assertEqual(r.status_code, 403)
        self.assertNotIn("access", r.json())
