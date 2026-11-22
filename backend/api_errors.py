"""API error handling shared by every DRF view."""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """DRF's handler, plus: a malformed filter (?subject=undefined, ?grade=abc)
    is the caller's mistake - answer 400, not a 500 crash. Django raises these
    as ValueError / ValidationError when the bad value reaches the query."""
    response = exception_handler(exc, context)
    if response is not None:
        return response
    msg = str(exc)
    if isinstance(exc, (ValueError, DjangoValidationError)) and (
        "expected a number" in msg or "must be an integer" in msg or "is not a valid" in msg
    ):
        return Response({"error": "Invalid filter value."}, status=400)
    return None
