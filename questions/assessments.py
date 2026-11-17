"""
Generate an assessment from the official KICD curriculum design.

Fresh every time, not pulled from a bank. A bank of 1,067 questions averages
11 per topic, so two teachers with the same filters would get the identical
paper, and most sub-strands could not fill one at all. Generation also lets a
teacher say "include a question on a local farming example" - something no
stored bank can answer. At roughly KES 0.20 a paper on the cheap tier, there
is no cost argument for doing it any other way.

What makes it KICD-aligned rather than merely Kenyan-flavoured: the
sub-strand's learning outcomes, inquiry questions and command verbs go into
the prompt verbatim, straight from `ingest_kicd`. The model is told to assess
those outcomes and nothing else.

Every structured question comes back with a `marking_scheme`, because that is
what makes auto-marking possible later - the grader scores an answer only
against the scheme, never against its own knowledge.
"""
from __future__ import annotations

import json
import random
import re

from questions.generation import generate_json

SYSTEM = """You are a Kenyan teacher writing a classroom assessment for the \
CBE (Competency Based Education) curriculum.

Rules:
- Assess ONLY the learning outcomes given. Do not test content outside them.
- Use Kenyan English and KICD terminology. Say "learner", never "student".
- Use KICD command verbs: State, Name, Identify, Describe, Explain, \
Outline, Distinguish, Calculate, Work out, Account for, Analyse, Justify.
- Ground questions in real Kenyan contexts: named towns, counties, crops, \
institutions, currency in KES, local businesses and everyday situations. \
Vary them. Do not reuse Nairobi for every question.
- Pitch the difficulty at exactly the grade given.
- Every question carries its marks. Structured questions are 2-5 marks and \
may have (a)/(b) parts.
- For EVERY structured question, give a marking_scheme written the way a \
Kenyan marking scheme is written, so a marker can use it without judgement:
  * Group the points by the question part they belong to ("a", "b", "c").
  * Start each part with how the marks are earned: "Award 1 mark each for \
any two valid reasons (max 2 marks)", "Award 2 marks for the correct \
calculation and answer".
  * Then list the acceptable responses as separate points. Where several \
answers are valid, list them - a marker needs to recognise a correct answer \
the learner phrased differently.
  * Each point must be specific enough to decide yes or no: write "states \
that light energy is converted to chemical energy", never "mentions the \
process".
  * The marks across all points must add up to the question's total.
- For MCQs give four options with exactly one correct answer. Distractors \
must be plausible but clearly wrong to a learner who knows the outcome.

- An MCQ is worth exactly 1 mark. Never more.

- NEVER draw a diagram with text characters. No ASCII art, no boxes made of \
pipes and dashes, no arrows made of hyphens, no tables of symbols. They look \
broken on a printed paper. When a question uses a diagram, set "diagram" on \
that question describing what to draw and which parts to label, and write \
the question so it refers to "the diagram above" - the picture is drawn \
separately and placed there.

Return ONLY valid JSON. No markdown fences, no commentary."""

SCHEMA = """{
 "title": "short title naming the sub-strand",
 "instructions": "one or two sentences of instructions for the learner",
 "total_marks": 26,
 "questions": [
  {"number": 1, "type": "mcq", "marks": 1,
   "question_text": "...",
   "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
   "correct_answer": "B",
   "outcome": "the learning outcome this assesses, copied from the list",
   "bloom_level": "remember|understand|apply|analyze",
   "command_verb": "Identify"},
  {"number": 5, "type": "structured", "marks": 3,
   "question_text": "stem that sets a Kenyan context",
   "parts": [{"label": "a", "question_text": "...", "marks": 2},
             {"label": "b", "question_text": "...", "marks": 1}],
   "marking_scheme": [
     {"part": "a", "award": "Award 1 mark each for any two valid reasons (max 2 marks)",
      "marks": 2,
      "points": ["first acceptable answer", "second acceptable answer",
                 "another answer a marker should accept"]},
     {"part": "b", "award": "Award 1 mark for a reasoned explanation",
      "marks": 1,
      "points": ["what the answer must say to earn the mark"]}],
   "outcome": "...",
   "bloom_level": "apply",
   "command_verb": "Explain",
   "diagram": {"subject": "a transverse section of a leaf",
               "labels": ["upper epidermis", "palisade mesophyll", "stoma"],
               "alt": "one sentence describing it for a screen reader"}}
 ]
}
Omit "parts" for a single-part structured question. Omit "options",
"correct_answer" for structured. Omit "marking_scheme" for mcq."""


def _diagram_instruction(want_diagram, substrand):
    """Ask for a diagram outright when the facilitator ticked the box.

    Left to its own judgement the model almost never asks for one, so the
    tick box did nothing. If it is ticked, one question must use a diagram.
    """
    if not want_diagram:
        return ("DIAGRAMS: do not use any diagram in this assessment. "
                "Write questions that stand on their own words.")
    return (
        "DIAGRAMS: exactly ONE question in this paper must be built around a "
        "diagram, and it must be a question that is genuinely better with a "
        "picture - a labelled structure, an apparatus set-up, a cycle, a "
        "graph to read, a map. Give that question a \"diagram\" object "
        "naming what to draw and the parts to label, and word the question "
        "so it refers to the diagram above it. Every other question has no "
        "diagram."
    )


def _bullets(items, limit=None):
    items = [i for i in (items or []) if str(i).strip()]
    if limit:
        items = items[:limit]
    return "\n".join(f"- {i}" for i in items) or "- (none recorded)"


def build_prompt(substrand, *, count=10, description="", mcq_ratio=0.6,
                 want_diagram=False):
    """Assemble the generation prompt from the stored KICD design."""
    topic = substrand.topic
    subject = topic.subject
    n_mcq = max(0, round(count * mcq_ratio))
    n_struct = count - n_mcq

    rubric = topic.assessment_rubric or []
    rubric_text = ""
    if rubric:
        lines = []
        for r in rubric[:6]:
            ind = r.get("indicator", "")
            meets = r.get("meets", "")
            if ind:
                lines.append(f"- {ind} | meets expectations: {meets}")
        if lines:
            rubric_text = (
                "\nASSESSMENT RUBRIC FOR THIS STRAND (what 'meeting "
                "expectations' looks like):\n" + "\n".join(lines))

    return f"""Write an assessment for:

Grade: {topic.grade}
Learning area: {subject.name}
Strand: {topic.kicd_code} {topic.name}
Sub-strand: {substrand.kicd_code} {substrand.name}
Suggested duration in the design: {substrand.suggested_duration or 'not stated'}

SPECIFIC LEARNING OUTCOMES (from the KICD curriculum design - assess these \
and only these):
{_bullets(substrand.learning_outcomes)}

KEY INQUIRY QUESTIONS:
{_bullets(substrand.inquiry_questions)}

CORE COMPETENCIES THE DESIGN TARGETS:
{_bullets(substrand.core_competencies, 4)}
{rubric_text}

TEACHER'S REQUEST: {description.strip() or 'A standard classroom assessment.'}
{_diagram_instruction(want_diagram, substrand)}

Produce exactly {count} questions: {n_mcq} multiple-choice and {n_struct} \
structured. Number them 1 to {count}, MCQs first. Spread them across the \
learning outcomes above rather than clustering on one, and across Bloom \
levels rather than all recall.

Return JSON in exactly this shape:
{SCHEMA}"""


def generate_assessment(substrand, *, count=10, description="",
                        mcq_ratio=0.6, user=None, diagrams=True) -> dict:
    """Generate one assessment. Returns the parsed payload."""
    prompt = build_prompt(substrand, count=count, description=description,
                          mcq_ratio=mcq_ratio, want_diagram=diagrams)
    data = generate_json(prompt, SYSTEM, max_tokens=8000,
                         task="assessment", user=user)
    if not isinstance(data, dict) or not data.get("questions"):
        raise ValueError("Generator returned no questions")
    data = _validate(data, substrand)

    if diagrams:
        # After validation, so a failed image never costs us the questions.
        from questions.diagrams import attach_diagrams
        data = attach_diagrams(data, user=user)
    return data


# A line is "drawn" rather than written when it is mostly box/arrow glyphs
# and whitespace. Belt and braces for the prompt rule against ASCII art,
# because one of these on a printed paper is humiliating.
_ART_CHARS = set("|_-=+/\\<>^~*()[]{}·°o")


def _looks_drawn(line: str) -> bool:
    stripped = line.strip()
    if len(stripped) < 4:
        return False
    visible = [c for c in stripped if not c.isspace()]
    if not visible:
        return False
    arty = sum(1 for c in visible if c in _ART_CHARS)
    return arty / len(visible) >= 0.5


def _has_ascii_art(text: str) -> bool:
    lines = (text or "").split("\n")
    drawn = sum(1 for l in lines if _looks_drawn(l))
    return drawn >= 2


def _strip_ascii_art(text: str) -> str:
    """Drop the drawn block, including its framed label lines.

    A line like "| epidermal cells |" is mostly letters, so the ratio test
    alone keeps it - and half a removed box is worse than none. Once a block
    is known to be art, anything fenced by box characters goes with it.
    """
    fenced = re.compile(r"^\s*[|/\\+]|[|/\\+]\s*$|^[\s_\-=]+$")
    kept = [l for l in (text or "").split("\n")
            if not _looks_drawn(l) and not fenced.search(l)]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()


def _normalise_scheme(scheme):
    """Accept either scheme shape and store the grouped one.

    The grouped shape - part, award wording, acceptable points - is what a
    Kenyan marking scheme looks like and what a marker can actually use. Older
    output (and the occasional flat response) is a plain list of
    {point, marks}, so it is wrapped rather than rejected.
    """
    if not isinstance(scheme, list):
        return []
    out = []
    for entry in scheme:
        if not isinstance(entry, dict):
            continue
        if entry.get("points") or entry.get("award"):
            points = [str(p).strip() for p in (entry.get("points") or [])
                      if str(p).strip()]
            out.append({
                "part": str(entry.get("part") or "").strip(),
                "award": str(entry.get("award") or "").strip(),
                "marks": int(entry.get("marks") or 0),
                "points": points,
            })
        elif entry.get("point"):
            out.append({
                "part": str(entry.get("part") or "").strip(),
                "award": "",
                "marks": int(entry.get("marks") or 0),
                "points": [str(entry["point"]).strip()],
            })
    return out


_LETTERS = ["A", "B", "C", "D"]


def _spread_answer(q, number):
    """Move the correct option to a rotating position.

    Models overwhelmingly put the correct answer first - a generated paper
    came back A, A, A, A, which a learner passes by guessing. Rotating by
    question number guarantees an even spread without randomness that would
    make the same paper regenerate differently.
    """
    opts = q["options"]
    correct = q["correct_answer"]
    values = [opts[k] for k in _LETTERS if k in opts]
    correct_value = opts[correct]
    others = [v for v in values if v != correct_value]

    target = _LETTERS[(number - 1) % 4]
    rebuilt, rest = {}, iter(others)
    for letter in _LETTERS:
        rebuilt[letter] = correct_value if letter == target else next(rest, "")
    if all(rebuilt.values()):
        q["options"] = rebuilt
        q["correct_answer"] = target


def _validate(data, substrand):
    """Fix what is cheap to fix, flag what is not.

    Marks are the part teachers notice: a paper whose parts do not sum to its
    stated total gets thrown away. So the total is always recomputed from the
    questions rather than trusted.
    """
    warnings = []
    questions = []
    for i, q in enumerate(data.get("questions", []), start=1):
        if not isinstance(q, dict) or not q.get("question_text"):
            continue
        q["number"] = i
        q["marks"] = int(q.get("marks") or 1)
        if _has_ascii_art(q.get("question_text", "")):
            warnings.append(
                f"Q{i}: contained a diagram drawn with text characters; "
                f"it was removed. Regenerate if the question needs a picture.")
            q["question_text"] = _strip_ascii_art(q["question_text"])
        qtype = (q.get("type") or "").lower()
        q["type"] = "mcq" if qtype == "mcq" else "structured"

        if q["type"] == "mcq":
            # A multiple-choice question is worth one mark. The model has
            # handed back 5- and 6-mark MCQs, which makes the paper's totals
            # nonsense and is obvious to any teacher reading it.
            if q["marks"] != 1:
                q["marks"] = 1
            opts = q.get("options") or {}
            if len(opts) != 4 or q.get("correct_answer") not in opts:
                warnings.append(f"Q{i}: MCQ options or correct answer invalid")
            else:
                _spread_answer(q, i)
            q.pop("marking_scheme", None)
        else:
            scheme = _normalise_scheme(q.get("marking_scheme"))
            q["marking_scheme"] = scheme
            if not scheme:
                warnings.append(f"Q{i}: structured question has no marking scheme")
            else:
                total = sum(int(p.get("marks") or 0) for p in scheme)
                if total != q["marks"]:
                    # Trust the scheme over the stated mark: the scheme is what
                    # a marker actually works from.
                    warnings.append(
                        f"Q{i}: marks {q['marks']} but scheme sums to {total}; "
                        f"using {total}")
                    q["marks"] = total
            q.pop("options", None)
            q.pop("correct_answer", None)
        questions.append(q)

    data["questions"] = questions
    data["total_marks"] = sum(q["marks"] for q in questions)
    data["warnings"] = warnings
    data.setdefault("title", f"{substrand.name} Assessment")
    data["covers"] = (
        f"{substrand.topic.kicd_code} {substrand.topic.name} "
        f"({substrand.kicd_code} {substrand.name})").strip()
    return data
