"""
Content generation for teacher tools - assessments, lesson plans, notes.

DELIBERATELY SEPARATE FROM ai_grading.py
Grading marks a learner with nobody in between, so it stays on the model it
was tuned against. Generation is read by a teacher before it reaches anyone,
so it can run on the cheapest model that writes well. Which model that is is
a setting, not a code change, so they can be compared on real output:

    GEN_PROVIDER = openai | anthropic | gemini | openrouter
    GEN_MODEL    = gpt-6-luna | claude-haiku-4-5 | gemini-3.8-flash | ...

Every call is logged to ApiCall with tokens and cost. That is rule 5 of the
plan: if the bill spikes you have a bug, not a business - and you cannot see
a spike you never recorded.
"""
from __future__ import annotations

import json
import logging
import re
import time

from django.conf import settings

logger = logging.getLogger("generation")

# USD per token (input, output). Keep in sync with the providers' pricing
# pages; wrong numbers here mean a cost dashboard that lies.
PRICES = {
    # DeepSeek - peak-hour rates (off-peak is half). Cache hits bill far lower.
    "deepseek-flash":      (0.30 / 1e6, 1.20 / 1e6),
    "deepseek-v4-pro":     (1.32 / 1e6, 3.96 / 1e6),
    # OpenAI
    "gpt-6-luna":          (0.10 / 1e6, 0.50 / 1e6),
    "gpt-6.1-terra":       (1.00 / 1e6, 5.00 / 1e6),
    "gpt-6.1-sol":         (2.00 / 1e6, 10.00 / 1e6),
    "gpt-6-astra":         (10.00 / 1e6, 50.00 / 1e6),
    # Anthropic
    "claude-haiku-4-5":    (1.00 / 1e6, 5.00 / 1e6),
    "claude-sonnet-4-6":   (3.00 / 1e6, 15.00 / 1e6),
    "claude-opus-4-8":     (5.00 / 1e6, 25.00 / 1e6),
    "claude-opus-5-5":     (4.00 / 1e6, 20.00 / 1e6),
    "claude-sonnet-5-5":   (2.00 / 1e6, 10.00 / 1e6),
    # Google
    "gemini-3.8-flash":    (0.75 / 1e6, 3.75 / 1e6),
    "gemini-3.1-flash-lite": (0.25 / 1e6, 1.50 / 1e6),
    "gemini-2.5-flash":    (0.30 / 1e6, 2.50 / 1e6),
}

DEFAULT_MODEL = {
    # Not the cheapest tier. Side by side on the same sub-strand, the same
    # prompt and the same rules, gpt-6-luna wrote "which of the following is
    # the increase in height" with four plain lengths, ignored the rule to
    # write money as Ksh, and never used the item types a real paper uses.
    # gpt-6.1-terra wrote a negative rate with a sign trap and a reciprocal
    # trap among its options, printed the marks inline the way KNEC does,
    # and set an equation in implicit form to be rearranged. Ten times the
    # price of luna is still a fraction of a shilling a paper, and the paper
    # is the product.
    "openai": "gpt-6.1-terra",
    "anthropic": "claude-haiku-4-5",
    "gemini": "gemini-2.5-flash",
    "openrouter": "google/gemini-2.5-flash",
    "deepseek": "deepseek-flash",
}


class GenerationError(RuntimeError):
    """Raised when a provider fails or returns something unusable."""


def _provider() -> str:
    return (getattr(settings, "GEN_PROVIDER", "") or "openai").strip().lower()


def _model(override: str | None = None) -> str:
    if override:
        return override
    configured = (getattr(settings, "GEN_MODEL", "") or "").strip()
    return configured or DEFAULT_MODEL.get(_provider(), "gpt-6-luna")


def cost_usd(model: str, tokens_in: int, tokens_out: int) -> float:
    pin, pout = PRICES.get(model, (0.0, 0.0))
    return tokens_in * pin + tokens_out * pout


# ── providers ─────────────────────────────────────────────────────────────
# `images` is an optional list of PNG bytes (e.g. rendered PDF pages) sent
# alongside the prompt. Every provider here can read images; calls that pass
# none are byte-for-byte what they were before.
def _b64(data: bytes) -> str:
    import base64
    return base64.b64encode(data).decode("ascii")


def _image_mime(data: bytes) -> str:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:3] == b"GIF":
        return "image/gif"
    return "image/png"


def _openai_content(prompt, images):
    if not images:
        return prompt
    return [{"type": "text", "text": prompt}] + [
        {"type": "image_url", "image_url": {"url": f"data:{_image_mime(im)};base64,{_b64(im)}"}}
        for im in images]


def _call_openai(system, prompt, model, max_tokens, want_json, images=None):
    from openai import OpenAI

    # The SDK's default is a 600 second timeout with retries on top, so a
    # single stalled call can hold a paper for ten minutes and then start
    # again. Fail fast and let the caller report it.
    client = OpenAI(api_key=settings.OPENAI_API_KEY,
                    timeout=150.0, max_retries=1)
    kwargs = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": _openai_content(prompt, images)},
        ],
        "max_completion_tokens": max_tokens,
    }
    if want_json:
        kwargs["response_format"] = {"type": "json_object"}
    r = client.chat.completions.create(**kwargs)
    u = r.usage
    return (r.choices[0].message.content or "",
            getattr(u, "prompt_tokens", 0), getattr(u, "completion_tokens", 0))


def _call_anthropic(system, prompt, model, max_tokens, want_json, images=None, thinking=False):
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY,
                                 timeout=150.0, max_retries=1)
    kwargs = {
        "model": model,
        # Current Claude models think by default, and thinking is billed
        # against max_tokens. The first run of Haiku 5.5 spent most of the
        # budget reasoning and the JSON came back cut off mid-object, so
        # leave room for both.
        "max_tokens": max_tokens * 3,
        # Cache the system prompt: it is identical for every generation of a
        # given tool, so the prefix bills at ~10% after the first call.
        "system": [{"type": "text", "text": system,
                    "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": prompt if not images else [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                         "data": _b64(im)}} for im in images
        ] + [{"type": "text", "text": prompt}]}],
    }

    # Effort is chosen per service in questions/ai_routing.py: a route marked
    # "thinking" (assessment papers) gets high effort - working answers out,
    # checking marks add up - everything else stays low. Streamed, because a
    # large max_tokens is refused without streaming (it could outlast the
    # HTTP timeout). Older SDKs without the parameter fall back.
    effort = "high" if thinking else "low"
    try:
        with client.messages.stream(output_config={"effort": effort}, **kwargs) as stream:
            r = stream.get_final_message()
    except TypeError:
        with client.messages.stream(**kwargs) as stream:
            r = stream.get_final_message()

    text = "".join(b.text for b in r.content if b.type == "text")
    return text, r.usage.input_tokens, r.usage.output_tokens


def _call_gemini(system, prompt, model, max_tokens, want_json, images=None):
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    cfg = types.GenerateContentConfig(
        system_instruction=system,
        max_output_tokens=max_tokens,
        temperature=0.4,
        response_mime_type="application/json" if want_json else "text/plain",
    )
    contents = prompt if not images else [
        types.Part.from_bytes(data=im, mime_type="image/png") for im in images] + [prompt]
    r = client.models.generate_content(model=model, contents=contents, config=cfg)
    # Gemini returns an empty candidate when a safety filter trips. Treat that
    # as an error rather than silently producing nothing - the same failure
    # that got Gemini pulled from grading (commits 4bde1e35, 53b5cfbe).
    text = (getattr(r, "text", "") or "").strip()
    if not text:
        raise GenerationError(
            "Gemini returned an empty response (safety filter or overload)")
    um = getattr(r, "usage_metadata", None)
    return (text,
            getattr(um, "prompt_token_count", 0) if um else 0,
            getattr(um, "candidates_token_count", 0) if um else 0)


def _call_openrouter(system, prompt, model, max_tokens, want_json, images=None):
    import requests

    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": _openai_content(prompt, images)},
            ],
            "max_tokens": max_tokens,
            **({"response_format": {"type": "json_object"}} if want_json else {}),
        },
        timeout=180,
    )
    if r.status_code != 200:
        raise GenerationError(f"OpenRouter HTTP {r.status_code}: {r.text[:200]}")
    d = r.json()
    u = d.get("usage") or {}
    return (d["choices"][0]["message"]["content"],
            u.get("prompt_tokens", 0), u.get("completion_tokens", 0))


def deepseek_client():
    from openai import OpenAI
    return OpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url="https://api.deepseek.com",
                  timeout=180.0, max_retries=1)


# Thinking tokens are billed as output and count against max_tokens, so a
# thinking call gets this much extra room or its answer is cut off.
THINKING_HEADROOM = 8000


def _call_deepseek(system, prompt, model, max_tokens, want_json, images=None, thinking=False):
    """DeepSeek speaks the OpenAI API. Thinking is chosen per service in
    questions/ai_routing.py (the benchmark found it helps question writing,
    PDF reading and marking, and is wasted on schemes and lesson plans)."""
    client = deepseek_client()
    kwargs = {
        "model": model,
        "messages": ([{"role": "system", "content": system}] if system else []) + [
            {"role": "user", "content": _openai_content(prompt, images)},
        ],
        "max_tokens": max_tokens + (THINKING_HEADROOM if thinking else 0),
        "extra_body": {"thinking": {"type": "enabled" if thinking else "disabled"}},
    }
    if want_json:
        kwargs["response_format"] = {"type": "json_object"}
    r = client.chat.completions.create(**kwargs)
    u = r.usage
    return (r.choices[0].message.content or "",
            getattr(u, "prompt_tokens", 0), getattr(u, "completion_tokens", 0))


_PROVIDERS = {
    "openai": _call_openai,
    "anthropic": _call_anthropic,
    "gemini": _call_gemini,
    "openrouter": _call_openrouter,
    "deepseek": _call_deepseek,
}


# ── public API ────────────────────────────────────────────────────────────
def _attempt(prov, mdl, thinking, system, prompt, max_tokens, want_json, images, task, user):
    """One call to one provider, always logged."""
    fn = _PROVIDERS.get(prov)
    if not fn:
        raise GenerationError(f"Unknown provider {prov!r}")
    kw = {}
    if images:
        kw["images"] = images
    if prov in ("deepseek", "anthropic"):
        kw["thinking"] = thinking
    started = time.time()
    text, tin, tout, err = "", 0, 0, ""
    try:
        text, tin, tout = fn(system, prompt, mdl, max_tokens, want_json, **kw)
        if not (text or "").strip():
            raise GenerationError(f"{prov}/{mdl} returned an empty response")
        return text
    except Exception as e:
        err = f"{type(e).__name__}: {e}"[:400]
        logger.error("generation failed task=%s %s/%s: %s", task, prov, mdl, err)
        raise
    finally:
        _log_call(task=task, provider=prov, model=mdl, user=user,
                  tokens_in=tin, tokens_out=tout, error=err,
                  ms=int((time.time() - started) * 1000))


def generate(prompt: str, system: str = "", *, max_tokens: int = 4000,
             want_json: bool = False, model: str | None = None,
             provider: str | None = None, task: str = "generate",
             user=None, images: list | None = None, thinking: bool = False) -> str:
    """Generate text and return the raw string.

    The model comes from questions/ai_routing.py for the service this task
    belongs to; an explicit provider/model overrides that. A routed call that
    fails is retried once on the service's fallback (Terra). Every attempt is
    logged to ApiCall, so spend and failures are visible.
    """
    from questions import ai_routing

    if provider or model:
        prov = (provider or _provider()).strip().lower()
        return _attempt(prov, _model(model), thinking, system, prompt, max_tokens,
                        want_json, images, task, user)

    service = ai_routing.service_for_task(task)
    route = ai_routing.route_for(service) if service else None
    if route is None:
        return _attempt(_provider(), _model(), False, system, prompt, max_tokens,
                        want_json, images, task, user)
    try:
        return _attempt(route.provider, route.model, route.thinking, system, prompt,
                        max_tokens, want_json, images, task, user)
    except Exception as first:
        fb = ai_routing.fallback_for(service, route)
        if not fb:
            raise
        logger.warning("task=%s: %s failed (%s); falling back to %s", task, route, first, fb)
        return _attempt(fb.provider, fb.model, fb.thinking, system, prompt, max_tokens,
                        want_json, images, task, user)


def generate_json(prompt: str, system: str = "", **kw) -> dict | list:
    """Generate and parse JSON, tolerating a fenced or chatty response."""
    kw.setdefault("want_json", True)
    raw = generate(prompt, system, **kw)
    return parse_json(raw)


def parse_json(raw: str):
    """Parse JSON from a model response that may be fenced or padded."""
    s = (raw or "").strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.I | re.S).strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    # Fall back to the outermost object/array in the text.
    for opener, closer in (("{", "}"), ("[", "]")):
        i, j = s.find(opener), s.rfind(closer)
        if i != -1 and j > i:
            try:
                return json.loads(s[i:j + 1])
            except json.JSONDecodeError:
                continue
    raise GenerationError(f"Could not parse JSON from response: {s[:200]}")


def _log_call(*, task, provider, model, user, tokens_in, tokens_out, error, ms):
    """Record every call. Never let logging break a request."""
    try:
        from questions.models import ApiCall
        ApiCall.objects.create(
            user=user if getattr(user, "pk", None) else None,
            task=task, provider=provider, model=model,
            tokens_in=tokens_in or 0, tokens_out=tokens_out or 0,
            cost_usd=cost_usd(model, tokens_in or 0, tokens_out or 0),
            response_time_ms=ms, error=error or "",
        )
    except Exception:
        logger.exception("could not record ApiCall (task=%s)", task)
