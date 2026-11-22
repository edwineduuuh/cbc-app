"""
questions/tutor.py
AI Tutor - a pre-quiz "teacher" that teaches a Topic and answers a student's
follow-up questions about it. Claude only (no Gemini).

Lessons are GROUNDED in the topic's own questions (their explanations and
worked solutions) and CACHED on Topic.cached_ai_lesson, mirroring the existing
Question.cached_ai_explanation pattern - so a lesson is generated once per topic
and then served instantly and for free to every student after.

Built fresh. Does NOT import or depend on the abandoned ai_service.py.
"""
import json
import logging
import time
import re

import anthropic
from django.conf import settings

logger = logging.getLogger("generation")

# Generation (lessons, flashcards) - max quality; cached, so the cost is
# one-time per sub-strand. Opus is the most capable model.
CLAUDE_MODEL = "claude-opus-4-8"
# Chat follow-ups - live per message, so it must be accurate AND fast. Sonnet
# is the balance: far stronger than Haiku (Kiswahili included), still quick.
CLAUDE_CHAT_MODEL = "claude-sonnet-4-6"

# How many of a topic's questions to feed in as source material.
SOURCE_QUESTION_LIMIT = 40


def _get_claude():
    """Fresh client per call - matches ai_grading.py to avoid closed-client
    issues under threads."""
    # A stuck call must not hold a generation slot for the SDK's 10-minute
    # default; one retry, then give up (the unit is retried on the next visit).
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=120, max_retries=1)


def _call_claude(system: str, messages: list, max_tokens: int = 3000,
                 model: str = CLAUDE_MODEL, cache_system: bool = True, task: str = "tutor-lesson") -> str:
    # NB: no `temperature` - Opus 4.8 rejects sampling params (400). Sonnet is
    # fine without it too.
    #
    # Prompt caching: send the system prompt as a cache_control block so a
    # repeated prefix is billed at ~10% instead of full price. The model reads
    # the exact same text - output is unchanged. (Blocks below the cache minimum
    # are silently not cached, so this is always safe.)
    system_param = [{
        "type": "text",
        "text": system,
        **({"cache_control": {"type": "ephemeral"}} if cache_system else {}),
    }]
    started = time.time()
    response = _get_claude().messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_param,
        messages=messages,
    )
    try:   # record usage, like generation calls
        from questions.generation import _log_call
        u = response.usage
        _log_call(task=task, provider="anthropic", model=model, user=None,
                  tokens_in=(u.input_tokens or 0) + (getattr(u, "cache_read_input_tokens", 0) or 0)
                  + (getattr(u, "cache_creation_input_tokens", 0) or 0),
                  tokens_out=u.output_tokens or 0, error="", ms=int((time.time() - started) * 1000))
    except Exception:
        pass
    # Return the first text block (robust whether or not thinking is on).
    return next((b.text for b in response.content if b.type == "text"), "")


def _write_content(system: str, prompt: str, max_tokens: int, task: str) -> str:
    """Write a lesson or deck on the tutor_lessons route (DeepSeek), falling
    back to Claude if it fails or returns something that is not JSON."""
    from questions import ai_routing
    route = ai_routing.route_for("tutor_lessons") or ai_routing.CURRENT["tutor_lessons"]
    if route.provider != "anthropic":
        try:
            from questions.generation import generate
            raw = generate(prompt, system, max_tokens=max_tokens, want_json=True,
                           provider=route.provider, model=route.model,
                           thinking=route.thinking, task=task)
            _parse_json(raw)                 # unusable output -> fall back
            return raw
        except Exception as e:
            logger.warning("tutor content on %s failed (%s); falling back to Claude", route, e)
    fb = ai_routing.FALLBACK["tutor_lessons"] if route.provider != "anthropic" else route
    return _call_claude(system, [{"role": "user", "content": prompt}],
                        max_tokens=max_tokens, model=fb.model, task=task)


def _parse_json(raw_text: str) -> dict:
    """Tolerant JSON extraction (same approach used elsewhere in the codebase)."""
    raw = raw_text.strip()
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in tutor response")
    raw = raw[start:end + 1]
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)  # trailing commas
    return json.loads(raw)


# ─────────────────────────────────────────────────────────────
#  SOURCE MATERIAL - harvest the topic's own content
# ─────────────────────────────────────────────────────────────

def _harvest_topic_content(topic) -> str:
    """Pull real, human-authored content from the topic's questions so the
    lesson is grounded in what students are actually tested on."""
    questions = (
        topic.questions
        .exclude(explanation="", worked_solution=None)
        .order_by("difficulty", "id")[:SOURCE_QUESTION_LIMIT]
    )

    chunks = []
    for q in questions:
        parts = [f"Q: {q.question_text.strip()}"]
        if q.correct_answer:
            parts.append(f"Answer: {q.correct_answer.strip()}")
        if q.explanation:
            parts.append(f"Explanation: {q.explanation.strip()}")
        if q.worked_solution:
            try:
                steps = q.worked_solution
                if isinstance(steps, (list, dict)):
                    steps = json.dumps(steps, ensure_ascii=False)
                parts.append(f"Worked solution: {steps}")
            except Exception:
                pass
        chunks.append("\n".join(parts))

    return "\n\n---\n\n".join(chunks)


# ─────────────────────────────────────────────────────────────
#  LESSON GENERATION (cached)
# ─────────────────────────────────────────────────────────────

LESSON_SYSTEM = """You are an expert, warm Kenyan CBC/CBE teacher.
You write clear, engaging lessons that teach a topic BEFORE a student is tested,
pitched exactly at the learner's grade level. Use simple language, everyday
Kenyan examples, and build understanding step by step. You may use LaTeX for
mathematics (wrap inline math in \\( \\) and display math in \\[ \\]).
Respond with VALID JSON ONLY - no markdown fences, no text outside the JSON."""


def _kicd_block(topic, substrand=None) -> str:
    """The official KICD curriculum design, verbatim - the lesson's syllabus.

    For one sub-strand: its specific learning outcomes, suggested learning
    experiences, key inquiry questions, competencies, values and PCIs. For a
    whole strand: every sub-strand's outcomes."""
    def bullets(items, limit=12):
        items = [str(i).strip() for i in (items or []) if str(i).strip()][:limit]
        return "\n".join(f"  - {i}" for i in items)

    if substrand is not None:
        s = substrand
        parts = [f"KICD CURRICULUM DESIGN - sub-strand {s.kicd_code + ' ' if s.kicd_code else ''}{s.name}"]
        for title, items in (
            ("Specific learning outcomes (by the end of the sub-strand the learner should be able to)",
             s.learning_outcomes),
            ("Suggested learning experiences", s.learning_experiences),
            ("Key inquiry question(s)", s.inquiry_questions),
            ("Core competencies", s.core_competencies),
            ("Values", s.values),
            ("Pertinent and contemporary issues", s.pertinent_issues),
        ):
            if items:
                parts.append(f"{title}:\n{bullets(items)}")
        return "\n\n".join(parts) if len(parts) > 1 else ""

    subs = list(topic.substrands.order_by("order", "name"))
    lines = []
    for s in subs:
        if s.learning_outcomes:
            lines.append(f"{s.kicd_code + ' ' if s.kicd_code else ''}{s.name}:\n{bullets(s.learning_outcomes, 8)}")
    if not lines:
        return ""
    return "KICD CURRICULUM DESIGN - specific learning outcomes for this strand:\n\n" + "\n\n".join(lines)


def _source_block(topic) -> str:
    source = _harvest_topic_content(topic)
    if source.strip():
        return (
            f"\nReal content from this strand's questions - use it as the factual "
            f"basis (teach these ideas, don't just list the questions):\n\n{source}\n"
        )
    return ("\n(Little stored content for this strand - teach from your own CBC "
            "subject knowledge.)\n")


def generate_lesson(topic, substrand=None) -> dict:
    """Generate a lesson grounded in the strand's questions. If a substrand is
    given, the lesson is FOCUSED on that sub-strand's learning outcomes."""
    focus = (
        f"\nFocus this lesson specifically on the sub-strand: \"{substrand.name}\". "
        f"Teach only what belongs to that sub-strand, not the whole strand.\n"
        if substrand else ""
    )
    scope_name = substrand.name if substrand else topic.name
    kicd = _kicd_block(topic, substrand)
    kicd_rules = (
        f"""

{kicd}

THE KICD DESIGN ABOVE IS THE SYLLABUS. Follow it exactly:
- Teach EVERY specific learning outcome listed - each one must be clearly
  covered by a section. Do not skip any, and do not teach beyond them.
- Build examples and activities from the suggested learning experiences.
- Answer the key inquiry question(s) by the end of the lesson.
- Where it fits naturally, show the values and pertinent issues in examples.
"""
        if kicd else ""
    )

    user = f"""Write a CBC/CBE lesson.

Subject: {topic.subject.name}
Grade: {topic.grade}
Strand: {topic.name}{focus}{kicd_rules}{_source_block(topic)}
Return ONLY this JSON shape:
{{
  "heading": "Engaging lesson title for {scope_name}",
  "intro": "1-2 sentence friendly hook that says why this matters",
  "sections": [
    {{
      "title": "Sub-concept title",
      "body": "Clear explanation in 2-4 short paragraphs, grade-appropriate",
      "example": "A concrete worked example (use LaTeX for any maths)",
      "diagram": {{"subject": "what to draw, e.g. a fibreglass sheet showing glass fibres inside resin",
                   "labels": ["glass fibres", "resin"],
                   "alt": "one sentence describing the picture"}}
    }}
  ],
  "key_terms": [{{"term": "word", "definition": "simple meaning"}}],
  "summary_points": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "ready_check": "One friendly question that checks readiness to try a quiz"
}}

Aim for 3-6 sections (enough to cover every learning outcome). Tight and
teachable, not a textbook dump.

FIGURES: a learner understands structures, processes, tools, drawings and
apparatus far better with a picture. Give a section a "diagram" whenever a
picture genuinely helps - most lessons need two or three. Leave it out where
words are enough. Never draw with text characters.
- "diagram" is a labelled black-and-white textbook drawing: "subject" says
  exactly what to draw, "labels" (up to 6) are the parts to label.
- For a mathematical figure (a coordinate graph, a line, an inequality, a
  number line) use "plot" INSTEAD of "diagram" - it is drawn exactly:
  {{"type": "cartesian", "x_range": [-3, 3], "y_range": [-3, 5],
    "lines": [{{"equation": "y = 2x + 1"}}], "points": [{{"x": 1, "y": 3, "label": "A"}}],
    "alt": "..."}}
  or {{"type": "number_line", "min": -2, "max": 8, "step": 1,
    "mark": [{{"at": 2, "closed": true}}], "shade": [{{"from": 2, "to": 6}}], "alt": "..."}}"""

    raw = _write_content(LESSON_SYSTEM, user, 5000, task="tutor-lesson")
    lesson = _parse_json(raw)
    lesson["v"] = LESSON_VERSION
    _prepare_figures(lesson)
    return lesson


# Bump to rewrite every cached lesson the next time it is opened (the old one
# is shown until the new one is ready). v2: KICD-led + diagrams.
LESSON_VERSION = 2


def _prepare_figures(lesson: dict) -> None:
    """Maths plots are drawn at once (exact and free). Pictures for the image
    model are marked pending - draw_lesson_diagrams fills them in."""
    from questions.diagrams import attach_plot
    for sec in lesson.get("sections") or []:
        if not isinstance(sec, dict):
            continue
        if attach_plot(sec):                 # sets sec["diagram"] = {url, alt, exact}
            continue
        spec = sec.get("diagram")
        if isinstance(spec, dict) and str(spec.get("subject") or "").strip():
            sec["diagram"] = {"spec": spec, "alt": spec.get("alt") or spec["subject"], "pending": True}
        else:
            sec.pop("diagram", None)


def draw_lesson_diagrams(lesson: dict) -> bool:
    """Draw every pending picture, in parallel. Returns True if any changed.
    A picture that fails is dropped - the lesson still reads without it."""
    from concurrent.futures import ThreadPoolExecutor
    from questions.diagrams import generate_diagram

    pending = [sec for sec in lesson.get("sections") or []
               if isinstance(sec, dict) and isinstance(sec.get("diagram"), dict)
               and sec["diagram"].get("pending")]
    if not pending:
        return False

    def draw(sec):
        return sec, generate_diagram(sec["diagram"]["spec"])

    with ThreadPoolExecutor(max_workers=4) as pool:
        for sec, url in pool.map(draw, pending):
            if url:
                sec["diagram"] = {"url": url, "alt": sec["diagram"]["alt"]}
            else:
                sec.pop("diagram", None)
    return True


# ─────────────────────────────────────────────────────────────
#  FLASH CARD DECK GENERATION (hybrid, CBE, cached)
# ─────────────────────────────────────────────────────────────

FLASHCARD_SYSTEM = """You are an expert Kenyan CBC/CBE teacher creating clean,
engaging revision flash cards. CBE is competency-based, so favour APPLICATION and
understanding over rote recall. Cards must be sharp: a short front, a clean back.
You may use LaTeX for maths (\\( \\) inline, \\[ \\] display).
Respond with VALID JSON ONLY."""


def generate_flashcards(topic, substrand=None, count: int = 12) -> list:
    """Generate a clean deck of flash cards grounded in the strand's questions,
    focused on the sub-strand if given. Returns a list of card dicts."""
    focus = (
        f"\nFocus ONLY on the sub-strand: \"{substrand.name}\".\n"
        if substrand else ""
    )
    scope_name = substrand.name if substrand else topic.name

    user = f"""Create about {count} revision flash cards.

Subject: {topic.subject.name}
Grade: {topic.grade}
Strand: {topic.name}{focus}
{_kicd_block(topic, substrand)}
Cover every specific learning outcome above (when given) - nothing beyond it.
{_source_block(topic)}
Make a varied, engaging deck for "{scope_name}". Use a MIX of card types:
- "concept": a definition / what-is question
- "application": a short real-life Kenyan scenario (CBE competency)
- "recall": a key fact
- "why": reasoning ("why does ...")

Return ONLY:
{{
  "cards": [
    {{
      "type": "concept|application|recall|why",
      "front": "Short prompt (the question/term)",
      "back": "Clean, correct answer",
      "why": "One short line on why it matters (optional, can be empty)"
    }}
  ]
}}

Keep fronts short. Ground answers in the real content above. Grade-appropriate."""

    raw = _write_content(FLASHCARD_SYSTEM, user, 3500, task="tutor-flashcards")
    data = _parse_json(raw)
    cards = []
    for c in data.get("cards", []):
        front = (c.get("front") or "").strip()
        back = (c.get("back") or "").strip()
        if front and back:
            cards.append({
                "front": front,
                "back": back,
                "why": (c.get("why") or "").strip(),
                "type": c.get("type", "concept"),
            })
    return cards


# ─────────────────────────────────────────────────────────────
#  FOLLOW-UP CHAT (pre-quiz teacher - generous, may explain fully)
# ─────────────────────────────────────────────────────────────

TUTOR_SYSTEM = """You are a warm, patient Kenyan CBC/CBE teacher helping a student
UNDERSTAND a topic before they attempt a quiz on it. This is learning time, not a
test - so explain fully and generously, give examples, and check understanding.

Rules:
- Stay strictly on the given topic and subject; gently redirect if asked off-topic.
- Match the student's grade level: simple words, short sentences, Kenyan examples.
- Be encouraging. Never be condescending.
- Use LaTeX for maths: inline \\( \\), display \\[ \\].
- Keep replies focused - a few short paragraphs at most.
- Teach what the KICD curriculum design (given below) says for this grade -
  its learning outcomes are the boundary of what this learner needs.
- When a picture would genuinely help (a structure, a tool, a process, a type
  of drawing, apparatus), add it on its own line in exactly this form:
  [[diagram: what to draw | label one; label two]]
  At most two per reply. Never draw pictures with text characters."""


SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
SUPPORTED_DOC_TYPES = {"application/pdf"}


def _attachment_block(attachment: dict):
    """Build a Claude content block from an uploaded image or PDF.
    attachment: {"name", "media_type", "data" (base64)}. Returns None if invalid."""
    if not attachment:
        return None
    media_type = (attachment.get("media_type") or "").lower()
    data = attachment.get("data")
    if not data:
        return None
    if media_type in SUPPORTED_IMAGE_TYPES:
        return {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": data},
        }
    if media_type in SUPPORTED_DOC_TYPES:
        return {
            "type": "document",
            "source": {"type": "base64", "media_type": media_type, "data": data},
        }
    return None


def tutor_chat(topic, history: list, attachment: dict = None, max_tokens: int = 1200) -> str:
    """Answer a student's follow-up question about a topic.

    history: [{"role": "user"|"assistant", "content": "..."}] (most recent last)
    attachment: optional uploaded image/PDF attached to the latest message.
    """
    context = (
        f"You are teaching: {topic.subject.name} - Grade {topic.grade} - "
        f"{topic.name}."
    )
    try:
        kicd = _kicd_block(topic)     # the design is a bonus - never break chat
    except Exception:
        kicd = ""
    if kicd:
        context += "\n\n" + kicd
    system = f"{TUTOR_SYSTEM}\n\n{context}"

    # Sanitise to the roles/keys the API expects.
    messages = [
        {"role": m.get("role", "user"), "content": str(m.get("content", ""))}
        for m in history
        if m.get("content")
    ][-12:]  # keep last few turns to bound cost

    if not messages or messages[-1]["role"] != "user":
        raise ValueError("Last message must be from the student")

    # Attach the uploaded file (if any) to the most recent user message.
    block = _attachment_block(attachment)
    if block:
        messages[-1]["content"] = [
            block,
            {"type": "text", "text": messages[-1]["content"] or "Please look at this."},
        ]

    # Prompt caching: mark the end of the conversation history (everything
    # BEFORE the newest question) as a cache breakpoint. Each new message then
    # bills the whole prior thread at ~10% and pays full price only for the new
    # turn. Byte-identical to the model - the reply is unchanged. Short early
    # threads fall below the cache minimum and are simply not cached (no cost).
    if len(messages) >= 2:
        prev = messages[-2]
        if isinstance(prev["content"], str):
            prev["content"] = [{
                "type": "text", "text": prev["content"],
                "cache_control": {"type": "ephemeral"},
            }]
        elif isinstance(prev["content"], list) and prev["content"]:
            prev["content"][-1] = {**prev["content"][-1],
                                   "cache_control": {"type": "ephemeral"}}

    from questions import ai_routing
    route = ai_routing.route_for("tutor") or ai_routing.CURRENT["tutor"]
    # DeepSeek reads images but not PDFs: a PDF attachment stays on Claude.
    if route.provider == "deepseek" and not (block and block.get("type") == "document"):
        try:
            return _deepseek_chat(system, messages, max_tokens, route)
        except Exception as e:
            logger.warning("tutor %s failed (%s); falling back to Claude", route, e)
    model = route.model if route.provider == "anthropic" else CLAUDE_CHAT_MODEL
    return _call_claude(system, messages, max_tokens=max_tokens, model=model, task="tutor")


def _deepseek_chat(system, messages, max_tokens, route):
    """The tutor conversation on DeepSeek (OpenAI-style messages), logged."""
    from questions.generation import THINKING_HEADROOM, _log_call, deepseek_client

    def convert(content):
        if isinstance(content, str):
            return content
        parts = []
        for b in content:
            if b.get("type") == "text":
                parts.append({"type": "text", "text": b["text"]})
            elif b.get("type") == "image":
                src = b["source"]
                parts.append({"type": "image_url",
                              "image_url": {"url": f"data:{src['media_type']};base64,{src['data']}"}})
        return parts
    msgs = [{"role": "system", "content": system}] + [
        {"role": m["role"], "content": convert(m["content"])} for m in messages]
    started = time.time()
    tin = tout = 0
    err = ""
    try:
        r = deepseek_client().chat.completions.create(
            model=route.model, messages=msgs,
            max_tokens=max_tokens + (THINKING_HEADROOM if route.thinking else 0),
            extra_body={"thinking": {"type": "enabled" if route.thinking else "disabled"}})
        tin, tout = r.usage.prompt_tokens, r.usage.completion_tokens
        text = r.choices[0].message.content or ""
        if not text.strip():
            raise RuntimeError("DeepSeek returned an empty reply")
        return text
    except Exception as e:
        err = f"{type(e).__name__}: {e}"[:400]
        raise
    finally:
        _log_call(task="tutor", provider="deepseek", model=route.model, user=None, tokens_in=tin,
                  tokens_out=tout, error=err, ms=int((time.time() - started) * 1000))


# ─────────────────────────────────────────────────────────────
#  BACKGROUND GENERATION - a learner never waits on an open request
# ─────────────────────────────────────────────────────────────
# Writing one lesson or deck takes the AI 30-60s. Requests return at once with
# whatever is ready; missing units are written in the background (in parallel)
# and the page polls until they land. A cross-worker lock in the shared DB
# cache stops two learners from paying for the same unit twice.

from concurrent.futures import ThreadPoolExecutor as _Pool

try:
    from django.core.cache import caches as _caches
    _gen_cache = _caches["grades"]
except Exception:   # pragma: no cover - cache table missing
    from django.core.cache import cache as _gen_cache

GEN_LOCK_SECONDS = 300          # a unit still "writing" after this is retried
GEN_FAILED_SECONDS = 120        # how long a failure is reported before retrying
_GEN_POOL = _Pool(max_workers=4, thread_name_prefix="tutor-gen")

_GEN_KINDS = {
    "lesson": ("cached_ai_lesson", lambda topic, sub: generate_lesson(topic, substrand=sub)),
    "cards": ("cached_flashcards", lambda topic, sub: generate_flashcards(topic, substrand=sub)),
}


def _gen_key(kind, topic, substrand):
    return f"tutor-gen:{kind}:{topic.id}:{substrand.id if substrand else 0}"


def _generate_and_store(kind, topic_id, substrand_id, key):
    from django.db import close_old_connections, connection
    from .models import Substrand, Topic
    close_old_connections()
    try:
        topic = Topic.objects.select_related("subject").get(pk=topic_id)
        sub = Substrand.objects.get(pk=substrand_id) if substrand_id else None
        field, make = _GEN_KINDS[kind]
        content = make(topic, sub)
        if not content:
            raise ValueError("empty content")
        holder = sub or topic
        setattr(holder, field, content)
        holder.save(update_fields=[field])     # the text is readable now
        if kind == "lesson" and draw_lesson_diagrams(content):
            setattr(holder, field, content)
            holder.save(update_fields=[field])  # ...and now with its pictures
    except Exception as e:
        print(f"⚠ tutor {kind} generation failed for topic {topic_id}/{substrand_id}: {e}")
        try:
            _gen_cache.set(key + ":failed", 1, GEN_FAILED_SECONDS)
        except Exception:
            pass
    finally:
        try:
            _gen_cache.delete(key)
        except Exception:
            pass
        connection.close()


def unit_status(kind, topic, substrand=None, force=False, retry=False):
    """(content_or_None, state) without ever waiting on the AI.

    state: "ready"   - content is cached and current
           "writing" - being written now (content may be the old version
                       when an admin is regenerating)
           "failed"  - the last attempt failed; pass retry=True to try again
    """
    field, _ = _GEN_KINDS[kind]
    holder = substrand or topic
    cached = getattr(holder, field) or None
    key = _gen_key(kind, topic, substrand)

    def start():
        try:
            if not _gen_cache.add(key, 1, GEN_LOCK_SECONDS):
                return              # someone else is already writing it
            _gen_cache.delete(key + ":failed")
        except Exception:
            pass                    # cache down: still generate, just unlocked
        _GEN_POOL.submit(_generate_and_store, kind, topic.id,
                         substrand.id if substrand else None, key)

    try:
        writing = _gen_cache.get(key) is not None
        failed = _gen_cache.get(key + ":failed") is not None
    except Exception:
        writing = failed = False

    if force and not writing:
        start()
        return cached, "writing"
    if writing:
        return cached, "writing"
    if cached and kind == "lesson" and (cached.get("v") or 1) < LESSON_VERSION and not failed:
        start()                     # an older lesson: show it while it is rewritten
        return cached, "writing"    # (a failed rewrite keeps the old one for now)
    if cached:
        return cached, "ready"
    if failed and not retry:
        return None, "failed"
    start()
    return None, "writing"


# ─────────────────────────────────────────────────────────────
#  DIAGRAMS IN CHAT
# ─────────────────────────────────────────────────────────────
_DIAGRAM_MARK = re.compile(r"^[ \t]*\[\[diagram:\s*(.+?)\]\][ \t]*$", re.M)


def extract_chat_diagrams(reply: str):
    """Pull [[diagram: subject | a; b]] markers out of a tutor reply.

    Returns (reply_without_markers, [{"url", "alt"}]). Each picture starts
    drawing in the background; its URL is fixed up front (same prompt, same
    key), so the page shows it as soon as it has been drawn."""
    from questions.diagrams import diagram_key, generate_diagram
    diagrams = []
    for m in list(_DIAGRAM_MARK.finditer(reply or ""))[:2]:
        subject, _, labels = m.group(1).partition("|")
        spec = {"subject": subject.strip(),
                "labels": [l.strip() for l in labels.split(";") if l.strip()][:6]}
        if not spec["subject"]:
            continue
        spec["alt"] = spec["subject"]
        diagrams.append({"url": f"/api/diagrams/{diagram_key(spec)}.png", "alt": spec["subject"]})
        _GEN_POOL.submit(_draw_in_background, spec)
    return _DIAGRAM_MARK.sub("", reply or "").strip(), diagrams


def _draw_in_background(spec):
    from django.db import close_old_connections, connection
    from questions.diagrams import generate_diagram
    close_old_connections()
    try:
        generate_diagram(spec)
    finally:
        connection.close()
