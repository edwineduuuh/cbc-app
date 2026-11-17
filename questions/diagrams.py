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
import io
import logging
import time

from django.conf import settings
from django.core.files.base import ContentFile

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
        url = _store(data, diagram_key(spec))
        return url
    except Exception as e:
        logger.exception("diagram generation failed")
        _log_call(task="diagram", provider="openai", model=IMAGE_MODEL,
                  user=user, tokens_in=0, tokens_out=0,
                  error=f"{type(e).__name__}: {e}"[:400],
                  ms=int((time.time() - started) * 1000))
        return None
    finally:
        pass


def _store(data: bytes, key: str) -> str:
    """Save the PNG to the configured media storage and return its URL."""
    from django.core.files.storage import default_storage

    name = f"diagrams/{key}.png"
    if not default_storage.exists(name):
        default_storage.save(name, ContentFile(data))
    return default_storage.url(name)


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
            q.pop("diagram", None)
            payload.setdefault("warnings", []).append(
                f"Q{q.get('number')}: the diagram could not be generated.")
    return payload
