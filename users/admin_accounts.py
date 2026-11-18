"""Administrator account management: facilitator approval and suspension.

    GET  /api/auth/admin/accounts/?role=teacher&status=pending&q=
    POST /api/auth/admin/accounts/<id>/action/   {"action": ..., "reason": ...}
    GET  /api/auth/admin/accounts/<id>/history/

Actions and the status changes they allow:
    approve    pending              -> active
    reject     pending              -> rejected
    suspend    active | pending     -> suspended
    reinstate  suspended | rejected -> active

Every change goes through User.set_status, so it is written to the
RoleChange audit table with who did it and why. An administrator cannot act
on their own account or on another administrator - admin accounts are
provisioned through the existing superadmin process, never here.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from questions.permissions import IsAdminUser, is_platform_admin
from .models import RoleChange

User = get_user_model()

TRANSITIONS = {
    "approve":   ({User.STATUS_PENDING}, User.STATUS_ACTIVE),
    "reject":    ({User.STATUS_PENDING}, User.STATUS_REJECTED),
    "suspend":   ({User.STATUS_ACTIVE, User.STATUS_PENDING}, User.STATUS_SUSPENDED),
    "reinstate": ({User.STATUS_SUSPENDED, User.STATUS_REJECTED}, User.STATUS_ACTIVE),
}


def _row(u):
    return {
        "id": u.id,
        "username": u.username,
        "name": (f"{u.first_name} {u.last_name}").strip() or u.username,
        "email": u.email,
        "email_verified": u.email_verified,
        "role": u.role,
        "status": u.status,
        "school_name": u.school_name,
        "date_joined": u.date_joined,
        "last_login": u.last_login,
        "providers": list(u.socialaccount_set.values_list("provider", flat=True))
        if hasattr(u, "socialaccount_set") else [],
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_accounts(request):
    qs = User.objects.filter(is_staff=False, is_superuser=False) \
        .exclude(role__in=["admin", "superadmin"])
    role = request.query_params.get("role")
    if role:
        qs = qs.filter(role=role)
    st = request.query_params.get("status")
    if st:
        qs = qs.filter(status=st)
    q = (request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(username__icontains=q)
                       | Q(first_name__icontains=q) | Q(last_name__icontains=q))
    counts = {s: User.objects.filter(role=role or "teacher", status=s, is_staff=False,
                                     is_superuser=False).count()
              for s, _ in User.STATUS_CHOICES}
    rows = [_row(u) for u in qs.order_by("-date_joined")[:200]]
    return Response({"results": rows, "counts": counts})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def account_action(request, pk):
    action = (request.data.get("action") or "").strip()
    reason = (request.data.get("reason") or "").strip()[:500]
    if action not in TRANSITIONS:
        return Response({"error": "Unknown action."}, status=400)
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "Account not found."}, status=404)
    if target.pk == request.user.pk:
        return Response({"error": "You cannot change your own account status."}, status=403)
    if is_platform_admin(target):
        return Response({"error": "Administrator accounts are not managed here."}, status=403)

    allowed_from, new_status = TRANSITIONS[action]
    if target.status not in allowed_from:
        return Response({"error": f"Cannot {action} an account that is {target.status}."},
                        status=409)
    target.set_status(new_status, by=request.user, reason=reason or action)
    return Response(_row(target))


@api_view(["GET"])
@permission_classes([IsAdminUser])
def account_history(request, pk):
    rows = RoleChange.objects.filter(user_id=pk).select_related("changed_by")[:100]
    return Response([{
        "field": r.field, "from": r.old_value, "to": r.new_value, "reason": r.reason,
        "by": r.changed_by.username if r.changed_by else "system", "at": r.created_at,
    } for r in rows])
