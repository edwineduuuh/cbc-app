"""Serve a generated diagram.

A plain Django view, not a DRF one: an <img> tag cannot send an
Authorization header, so this has to be reachable without a token. That is
safe here - the key is a sha256 of the drawing prompt, so it cannot be
guessed, and the picture is a black-and-white textbook diagram with nothing
personal in it.

The bytes come from the database rather than disk because Railway wipes the
filesystem on every deploy.
"""
import logging

from django.http import Http404, HttpResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_safe

from .models import Diagram

logger = logging.getLogger("generation")

# The key is the content hash, so a given URL's bytes can never change.
ONE_YEAR = 60 * 60 * 24 * 365


@require_safe
@cache_control(public=True, max_age=ONE_YEAR, immutable=True)
def diagram_file(request, key):
    try:
        d = Diagram.objects.only("data", "content_type", "key").get(key=key)
    except Diagram.DoesNotExist:
        raise Http404("No such diagram")

    body = bytes(d.data or b"")
    if not body:
        raise Http404("Empty diagram")

    r = HttpResponse(body, content_type=d.content_type or "image/png")
    r["Content-Length"] = str(len(body))
    r["ETag"] = f'"{d.key}"'
    # Printed papers and the Next.js frontend are served from another origin.
    r["Access-Control-Allow-Origin"] = "*"
    return r
