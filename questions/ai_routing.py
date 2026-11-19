"""Which AI model handles which StadiSpace service - in one place.

Defaults keep today's behaviour exactly, so deploying this changes nothing.
Railway settings switch it:

  AI_PROFILE=deepseek      the benchmarked routes below (docs: "StadiSpace AI
                           Provider Benchmark", 19 Nov 2026)
  AI_TUTOR_PILOT=true      the tutor too (off unless set: supervised pilot)
  AI_ROUTE_<SERVICE>=provider:model[:think]
                           override one service, e.g.
                           AI_ROUTE_MARKING=anthropic:claude-sonnet-4-6

Services: scheme, lesson_plan, assessment (writing, checking, replacing),
pdf (reading and curriculum mapping), marking, marking_kiswahili, tutor.

A route that fails falls back once (generation to Terra, marking and tutor to
Claude) so a provider outage never blocks a teacher or a learner.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

SERVICES = ("scheme", "lesson_plan", "assessment", "pdf", "marking", "marking_kiswahili", "tutor")


@dataclass(frozen=True)
class Route:
    provider: str
    model: str
    thinking: bool = False

    def __str__(self):
        return f"{self.provider}:{self.model}{':think' if self.thinking else ''}"


def parse(spec: str | None) -> Route | None:
    """'deepseek:deepseek-flash:think' -> Route. Empty or malformed -> None."""
    parts = [p.strip() for p in (spec or "").split(":") if p.strip()]
    if len(parts) < 2:
        return None
    return Route(parts[0].lower(), parts[1], len(parts) > 2 and parts[2].lower() in ("think", "thinking"))


# Today's production behaviour. None = the generation default (GEN_PROVIDER / GEN_MODEL).
CURRENT = {
    "scheme": None,
    "lesson_plan": None,
    "assessment": None,
    "pdf": None,
    "marking": Route("anthropic", "claude-sonnet-4-6"),
    "marking_kiswahili": Route("anthropic", "claude-opus-4-8"),
    "tutor": Route("anthropic", "claude-sonnet-4-6"),
}

# What the benchmark recommended.
DEEPSEEK = {
    "scheme": Route("deepseek", "deepseek-flash"),
    "lesson_plan": Route("deepseek", "deepseek-flash"),
    "assessment": Route("deepseek", "deepseek-flash", thinking=True),
    "pdf": Route("deepseek", "deepseek-flash", thinking=True),
    "marking": Route("deepseek", "deepseek-flash", thinking=True),
    "marking_kiswahili": Route("anthropic", "claude-opus-4-8"),   # Claude Opus stays: 30/30
    "tutor": Route("anthropic", "claude-sonnet-4-6"),             # until the pilot is switched on
}
TUTOR_PILOT = Route("deepseek", "deepseek-flash", thinking=True)

FALLBACK = {
    "scheme": Route("openai", "gpt-6.1-terra"),
    "lesson_plan": Route("openai", "gpt-6.1-terra"),
    "assessment": Route("openai", "gpt-6.1-terra"),
    "pdf": Route("openai", "gpt-6.1-terra"),
    "marking": Route("anthropic", "claude-sonnet-4-6"),
    "marking_kiswahili": Route("anthropic", "claude-sonnet-4-6"),
    "tutor": Route("anthropic", "claude-sonnet-4-6"),
}


def route_for(service: str) -> Route | None:
    """The route for a service right now (None = generation default)."""
    override = parse((getattr(settings, "AI_ROUTE_OVERRIDES", {}) or {}).get(service))
    if override:
        return override
    if service == "tutor" and getattr(settings, "AI_TUTOR_PILOT", False):
        return TUTOR_PILOT
    profile = (getattr(settings, "AI_PROFILE", "") or "").strip().lower()
    return (DEEPSEEK if profile == "deepseek" else CURRENT).get(service)


def fallback_for(service: str, used: Route | None) -> Route | None:
    fb = FALLBACK.get(service)
    return fb if fb and fb != used else None


def service_for_task(task: str) -> str | None:
    """Map a generation task name (as logged in ApiCall) to its service."""
    t = (task or "").lower()
    if t.startswith("studio-scheme"):
        return "scheme"
    if t.startswith("studio-lesson-plan"):
        return "lesson_plan"
    if t.startswith("assessment"):
        return "assessment"
    if t.startswith("library_extract"):
        return "pdf"
    return None
