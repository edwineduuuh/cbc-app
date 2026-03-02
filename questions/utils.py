import hashlib


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_guest_fingerprint(request):
    ip = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    raw = f"{ip}-{user_agent}"
    fingerprint = hashlib.sha256(raw.encode()).hexdigest()

    return fingerprint