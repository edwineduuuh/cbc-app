"""
questions/tutor.py
AI Tutor — a pre-quiz "teacher" that teaches a Topic and answers a student's
follow-up questions about it. Claude only (no Gemini).

Lessons are GROUNDED in the topic's own questions (their explanations and
worked solutions) and CACHED on Topic.cached_ai_lesson, mirroring the existing
Question.cached_ai_explanation pattern — so a lesson is generated once per topic
and then served instantly and for free to every student after.

Built fresh. Does NOT import or depend on the abandoned ai_service.py.
"""
import json
import re

import anthropic
from django.conf import settings

# Generation (lessons, flashcards) — quality; cached so cost is one-time.
CLAUDE_MODEL = "claude-sonnet-4-6"
# Chat follow-ups — cheap + fast; live per message so cost matters.
CLAUDE_CHAT_MODEL = "claude-haiku-4-5-20251001"

# How many of a topic's questions to feed in as source material.
SOURCE_QUESTION_LIMIT = 40


def _get_claude():
    """Fresh client per call — matches ai_grading.py to avoid closed-client
    issues under threads."""
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _call_claude(system: str, messages: list, max_tokens: int = 3000,
                 model: str = CLAUDE_MODEL) -> str:
    response = _get_claude().messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=0.4,
        system=system,
        messages=messages,
    )
    return response.content[0].text


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
#  SOURCE MATERIAL — harvest the topic's own content
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
Respond with VALID JSON ONLY — no markdown fences, no text outside the JSON."""


def _source_block(topic) -> str:
    source = _harvest_topic_content(topic)
    if source.strip():
        return (
            f"\nReal content from this strand's questions — use it as the factual "
            f"basis (teach these ideas, don't just list the questions):\n\n{source}\n"
        )
    return ("\n(Little stored content for this strand — teach from your own CBC "
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

    user = f"""Write a CBC/CBE lesson.

Subject: {topic.subject.name}
Grade: {topic.grade}
Strand: {topic.name}{focus}{_source_block(topic)}
Return ONLY this JSON shape:
{{
  "heading": "Engaging lesson title for {scope_name}",
  "intro": "1-2 sentence friendly hook that says why this matters",
  "sections": [
    {{
      "title": "Sub-concept title",
      "body": "Clear explanation in 2-4 short paragraphs, grade-appropriate",
      "example": "A concrete worked example (use LaTeX for any maths)"
    }}
  ],
  "key_terms": [{{"term": "word", "definition": "simple meaning"}}],
  "summary_points": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "ready_check": "One friendly question that checks readiness to try a quiz"
}}

Aim for 3-5 sections. Tight and teachable, not a textbook dump."""

    raw = _call_claude(LESSON_SYSTEM, [{"role": "user", "content": user}], max_tokens=3500)
    return _parse_json(raw)


def get_or_create_lesson(topic, substrand=None, force: bool = False) -> dict:
    """Return the cached lesson (per sub-strand, or whole-strand fallback)."""
    holder = substrand or topic
    if holder.cached_ai_lesson and not force:
        return holder.cached_ai_lesson
    lesson = generate_lesson(topic, substrand=substrand)
    holder.cached_ai_lesson = lesson
    holder.save(update_fields=["cached_ai_lesson"])
    return lesson


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
Strand: {topic.name}{focus}{_source_block(topic)}
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

    raw = _call_claude(FLASHCARD_SYSTEM, [{"role": "user", "content": user}], max_tokens=3500)
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


def get_or_create_flashcards(topic, substrand=None, force: bool = False) -> list:
    """Return the cached deck (per sub-strand, or whole-strand fallback)."""
    holder = substrand or topic
    if holder.cached_flashcards and not force:
        return holder.cached_flashcards
    cards = generate_flashcards(topic, substrand=substrand)
    holder.cached_flashcards = cards
    holder.save(update_fields=["cached_flashcards"])
    return cards


# ─────────────────────────────────────────────────────────────
#  FOLLOW-UP CHAT (pre-quiz teacher — generous, may explain fully)
# ─────────────────────────────────────────────────────────────

TUTOR_SYSTEM = """You are a warm, patient Kenyan CBC/CBE teacher helping a student
UNDERSTAND a topic before they attempt a quiz on it. This is learning time, not a
test — so explain fully and generously, give examples, and check understanding.

Rules:
- Stay strictly on the given topic and subject; gently redirect if asked off-topic.
- Match the student's grade level: simple words, short sentences, Kenyan examples.
- Be encouraging. Never be condescending.
- Use LaTeX for maths: inline \\( \\), display \\[ \\].
- Keep replies focused — a few short paragraphs at most."""


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
        f"You are teaching: {topic.subject.name} — Grade {topic.grade} — "
        f"{topic.name}."
    )
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

    return _call_claude(system, messages, max_tokens=max_tokens, model=CLAUDE_CHAT_MODEL)
