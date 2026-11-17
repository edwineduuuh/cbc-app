"""
Generate the diagram a question needs, as a real image.

Models will happily "draw" with pipes and hyphens if you let them, which
looks broken on a printed paper. The assessment prompt forbids that and asks
for a description instead; this turns the description into an image.

Generate once, store forever. A diagram is tied to a sub-strand and a topic,
not to a particular paper, so the same leaf section is reused by every
assessment that needs it rather than being paid for again.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import time

from django.conf import settings
from django.db.models import F

from questions.generation import _log_call

logger = logging.getLogger("generation")

IMAGE_MODEL = "gpt-image-2.6-flare"
IMAGE_SIZE = "1024x1024"

# Cost per image, for the ApiCall log. Image models are not billed per token,
# so this is recorded as output "tokens" of 0 with the price carried here.
IMAGE_COST_USD = 0.04

STYLE = (
    "A clean black-and-white educational diagram for a Kenyan school "
    "textbook. Simple clear line art on a plain white background. Black "
    "outlines only, no colour, no shading, no gradients, no photorealism, "
    "no decorative borders or background scenery. Each labelled part has a "
    "straight thin leader line to a horizontal label in a plain sans-serif "
    "font. Spelling must be exact. Nothing else written on the image: no "
    "title, no caption, no question text, no watermark."
)


def _prompt(spec: dict) -> str:
    subject = (spec.get("subject") or "").strip()
    labels = [str(l).strip() for l in (spec.get("labels") or []) if str(l).strip()]
    parts = [STYLE, f"Draw: {subject}."]
    if labels:
        parts.append("Label exactly these parts, spelled this way: "
                     + "; ".join(labels) + ".")
    return " ".join(parts)


def diagram_key(spec: dict) -> str:
    """Stable id for a diagram, so the same one is never generated twice."""
    raw = _prompt(spec).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:32]


def generate_diagram(spec: dict, *, user=None) -> str | None:
    """Render the diagram and return a stored URL, or None if it failed.

    Never raises: a paper without its picture is still a usable paper, and a
    failed image must not lose the questions that were already generated.
    """
    if not spec or not (spec.get("subject") or "").strip():
        return None
    if not getattr(settings, "OPENAI_API_KEY", ""):
        logger.warning("no OPENAI_API_KEY; skipping diagram")
        return None

    # Same prompt, same picture: if we have drawn it before, hand back the
    # stored one and pay nothing.
    key = diagram_key(spec)
    from .models import Diagram
    existing = Diagram.objects.filter(key=key).only("key").first()
    if existing:
        Diagram.objects.filter(pk=existing.pk).update(
            times_used=F("times_used") + 1)
        logger.info("diagram cache hit %s", key)
        return existing.url

    started = time.time()
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        r = client.images.generate(
            model=IMAGE_MODEL,
            prompt=_prompt(spec),
            size=IMAGE_SIZE,
            n=1,
        )
        b64 = getattr(r.data[0], "b64_json", None)
        if b64:
            data = base64.b64decode(b64)
        else:
            import requests
            data = requests.get(r.data[0].url, timeout=90).content
        return _store(data, key, spec)
    except Exception as e:
        logger.exception("diagram generation failed")
        _log_call(task="diagram", provider="openai", model=IMAGE_MODEL,
                  user=user, tokens_in=0, tokens_out=0,
                  error=f"{type(e).__name__}: {e}"[:400],
                  ms=int((time.time() - started) * 1000))
        return None
    finally:
        pass


def _store(data: bytes, key: str, spec: dict) -> str | None:
    """Keep the PNG in the database and return the URL that serves it.

    Not the filesystem: Railway rebuilds the container on every deploy, so a
    file written to media/ is gone by the next push and the picture would be
    paid for again - and Django does not serve MEDIA_URL at all when DEBUG is
    off, which is why these came out as broken images.
    """
    from .models import Diagram

    if not data:
        return None
    d, _ = Diagram.objects.get_or_create(
        key=key,
        defaults={
            "data": data,
            "content_type": "image/png",
            "byte_size": len(data),
            "prompt": _prompt(spec)[:4000],
            "alt": (spec.get("alt") or spec.get("subject") or "")[:1000],
            "labels": [str(l) for l in (spec.get("labels") or [])],
            "model_used": IMAGE_MODEL,
            "cost_usd": IMAGE_COST_USD,
        },
    )
    return d.url


def attach_diagrams(payload: dict, *, user=None) -> dict:
    """Generate an image for any question that asked for a diagram.

    Replaces the spec with {url, alt}. Questions whose image fails keep their
    text and simply lose the picture.
    """
    for q in payload.get("questions", []):
        spec = q.get("diagram")
        if not isinstance(spec, dict) or not spec.get("subject"):
            q.pop("diagram", None)
            continue
        started = time.time()
        url = generate_diagram(spec, user=user)
        if url:
            _log_call(task="diagram", provider="openai", model=IMAGE_MODEL,
                      user=user, tokens_in=0, tokens_out=0, error="",
                      ms=int((time.time() - started) * 1000))
            q["diagram"] = {
                "url": url,
                "alt": spec.get("alt") or spec.get("subject", "Diagram"),
            }
        else:
            # Keep the description. The question says "the diagram above", so
            # dropping it silently leaves a question referring to nothing -
            # a teacher can at least sketch from the words.
            q["diagram"] = {
                "url": "",
                "alt": spec.get("alt") or spec.get("subject") or "",
            }
            payload.setdefault("warnings", []).append(
                f"Q{q.get('number')}: the diagram could not be drawn - the "
                f"description is shown instead.")
    return payload
