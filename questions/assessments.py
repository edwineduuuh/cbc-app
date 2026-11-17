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
import logging
import random
import re
import time

from questions.generation import generate_json

logger = logging.getLogger("generation")

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

- IF AN MCQ NEEDS A CALCULATION, DO THE CALCULATION. Work the answer out in \
full, then make that exact value one of the four options and mark it \
correct. Each of the other three must be the value a learner reaches by one \
specific, nameable mistake, not a random number near the right one.

- Match the question to the verb. A multiple-choice question may only ask a \
learner to recognise something: use Identify, State, Name, Which, or Choose. \
Explain, Describe, Distinguish, Justify, Compare, Analyse and Outline all \
require writing, so a question using them must be structured, never \
multiple-choice.

- ASSESS THE COMPETENCY, NOT A GENERAL SKILL WEARING ITS NAME. This is the \
test every question must pass: if you can delete the sub-strand's vocabulary \
from the question and it still has the same answer, the question does not \
assess this sub-strand and must be rewritten.
  * "An application multiplies water use by 7; calculate the weekly use" \
tests multiplication. The word "application" is scenery. It is worthless as \
evidence of a visual programming outcome.
  * A visual programming question asks what a learner DOES with the tool: \
what a given block sequence outputs, which block is missing, what to change \
so the program repeats, how to test it, why it behaves wrongly.
  * The same applies everywhere - a question is about the sub-strand only \
when the sub-strand's own ideas are what the learner has to reason with.

- NO TWO QUESTIONS MAY SHARE A SHAPE. If two questions differ only in their \
numbers, their names or their town, they are one question printed twice and \
the paper is padding. "Four sacks of x kg plus 3 kg is 19 kg, which equation" \
and "five cans of x litres plus 8 litres is 33 litres, which equation" are \
the same question. Each question must demand something different: form an \
equation, solve one, check whether a given value satisfies one, find the \
error in a worked solution, read a result off a graph or number line, \
interpret what an answer means for the situation, decide which of two \
expressions fits.

- The Kenyan context must carry the question, not decorate it. If swapping \
the town or the crop for any other changes nothing about what is being \
tested, the context is decoration - rewrite the question so the local detail \
is what the learner reasons about.

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
  {"number": 1, "type": "mcq", "marks": 1, "sub": 1,
   "question_text": "...",
   "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
   "correct_answer": "B",
   "outcome": "the learning outcome this assesses, copied from the list",
   "bloom_level": "remember|understand|apply|analyze",
   "command_verb": "Identify"},
  {"number": 5, "type": "structured", "marks": 3, "sub": 2,
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


def _bullets(items, limit=None, indent=""):
    items = [i for i in (items or []) if str(i).strip()]
    if limit:
        items = items[:limit]
    return ("\n".join(f"{indent}- {i}" for i in items)
            or f"{indent}- (none recorded)")


def token_budget(count: int) -> int:
    """Output budget for a paper of `count` questions.

    A flat 8000 was fine for four questions and silently produced NOTHING for
    twelve: on a reasoning model the budget covers reasoning as well as the
    answer, so the paper was still being written when it ran out, and an
    empty response came back. A structured question with its marking scheme
    runs about 700 tokens, so budget generously - unused budget is not billed.
    """
    return min(32000, 5000 + 1100 * max(1, int(count or 1)))


def _as_list(substrands):
    """Accept one sub-strand or many, so older callers keep working."""
    if substrands is None:
        return []
    if isinstance(substrands, (list, tuple)):
        return list(substrands)
    return [substrands]


def _grouped(substrands):
    """[(topic, [substrand, ...]), ...] in the order given."""
    groups, index = [], {}
    for s in substrands:
        if s.topic_id not in index:
            index[s.topic_id] = len(groups)
            groups.append((s.topic, []))
        groups[index[s.topic_id]][1].append(s)
    return groups


def _rubric_text(topics):
    """The design publishes its rubric per strand, not per sub-strand."""
    blocks = []
    for t in topics:
        lines = []
        for r in (t.assessment_rubric or [])[:6]:
            ind = r.get("indicator", "")
            if ind:
                lines.append(f"- {ind} | meets expectations: {r.get('meets', '')}")
        if lines:
            head = f"{t.kicd_code} {t.name}".strip()
            blocks.append(f"For strand {head}:\n" + "\n".join(lines))
    if not blocks:
        return ""
    return ("\nASSESSMENT RUBRICS FROM THE DESIGN (what 'meeting "
            "expectations' looks like):\n" + "\n\n".join(blocks))


def build_prompt(substrands, *, count=10, description="", mcq_ratio=0.6,
                 want_diagram=False):
    """Assemble the generation prompt from the stored KICD design.

    Takes however many sub-strands were ticked. Each is given a tag - [S1],
    [S2] - and every question must come back carrying the tag it assesses, so
    a printed paper can say which part of the design each question came from
    and a facilitator can see the coverage is real.
    """
    subs = _as_list(substrands)
    if not subs:
        raise ValueError("No sub-strands given")

    topic = subs[0].topic
    subject = topic.subject
    n_mcq = max(0, round(count * mcq_ratio))
    n_struct = count - n_mcq

    groups = _grouped(subs)
    blocks, tag = [], 0
    for t, members in groups:
        lines = [f"STRAND {t.kicd_code} {t.name}".rstrip()]
        for s in members:
            tag += 1
            s._tag = tag                      # read back in _validate
            head = f"  [S{tag}] Sub-strand {s.kicd_code} {s.name}".rstrip()
            if s.suggested_duration:
                head += f" ({s.suggested_duration})"
            lines.append(head)
            lines.append("    Specific learning outcomes:")
            lines.append(_bullets(s.learning_outcomes, indent="      "))
            if s.inquiry_questions:
                lines.append("    Key inquiry questions:")
                lines.append(_bullets(s.inquiry_questions, 2, indent="      "))
        blocks.append("\n".join(lines))

    design = "\n\n".join(blocks)
    competencies = _bullets(subs[0].core_competencies, 4)

    if len(subs) == 1:
        spread = ("Spread the questions across the learning outcomes above "
                  "rather than clustering on one, and across Bloom levels "
                  "rather than all recall.")
    else:
        per = max(1, count // len(subs))
        spread = (
            f"The paper covers {len(subs)} sub-strands. Spread the {count} "
            f"questions across ALL of them - roughly {per} per sub-strand, "
            f"and every sub-strand listed must get at least one question. "
            f"Order the questions so the paper runs through the sub-strands "
            f"in the order listed above. Spread across Bloom levels too, "
            f"rather than all recall.")

    return f"""Write an assessment for:

Grade: {topic.grade}
Learning area: {subject.name}

THE KICD CURRICULUM DESIGN TO ASSESS (assess these outcomes and only these):

{design}

CORE COMPETENCIES THE DESIGN TARGETS:
{competencies}
{_rubric_text([t for t, _ in groups])}

TEACHER'S REQUEST: {description.strip() or 'A standard classroom assessment.'}
{_diagram_instruction(want_diagram, subs)}

Produce exactly {count} questions: {n_mcq} multiple-choice and {n_struct} \
structured. Number them 1 to {count}, MCQs first. {spread}

Every question must carry "sub": N, the number of the [S N] sub-strand it \
assesses. Do not invent a tag that is not listed.

Return JSON in exactly this shape:
{SCHEMA}"""


def generate_assessment(substrands, *, count=10, description="",
                        mcq_ratio=0.6, user=None, diagrams=True,
                        verify=True) -> dict:
    """Generate one assessment over one or more sub-strands."""
    subs = _as_list(substrands)
    started = time.time()
    marks = [("start", 0.0)]

    def mark(name):
        marks.append((name, round(time.time() - started, 1)))

    prompt = build_prompt(subs, count=count, description=description,
                          mcq_ratio=mcq_ratio, want_diagram=diagrams)
    data = generate_json(prompt, SYSTEM, max_tokens=token_budget(count),
                         task="assessment", user=user)
    if not isinstance(data, dict) or not data.get("questions"):
        raise ValueError("Generator returned no questions")
    data = _validate(data, subs)
    mark("written")

    if verify:
        # Before diagrams, so we never pay to draw a picture for a question
        # that is about to be thrown out.
        from questions.review import review_paper
        data = review_paper(data, subs, user=user, description=description)
        mark("reviewed")

    if diagrams:
        # After validation, so a failed image never costs us the questions.
        from questions.diagrams import attach_diagrams
        data = attach_diagrams(data, user=user)
        mark("drawn")

    # Wall time per stage. The whole chain once ran past gunicorn's 120s
    # timeout, so the worker was killed and the browser reported "Failed to
    # fetch" on a paper that had in fact been generated. Guessing which stage
    # is slow is not good enough - record it.
    logger.info("assessment built in %.1fs: %s", marks[-1][1],
                ", ".join(f"{n}@{t}s" for n, t in marks[1:]))
    data["seconds"] = marks[-1][1]
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


def _label(s):
    return f"{s.kicd_code} {s.name}".strip()


def _tag_question(q, by_tag, only):
    """Record which sub-strand a question came from, from its [S N] tag."""
    s = None
    try:
        s = by_tag.get(int(q.get("sub")))
    except (TypeError, ValueError):
        s = None
    if s is None:
        s = only                      # one sub-strand: the tag is redundant
    q.pop("sub", None)
    if s is None:
        return False
    q["substrand_id"] = s.id
    q["substrand"] = _label(s)
    q["strand"] = f"{s.topic.kicd_code} {s.topic.name}".strip()
    return True


def _validate(data, substrands):
    """Fix what is cheap to fix, flag what is not.

    Marks are the part teachers notice: a paper whose parts do not sum to its
    stated total gets thrown away. So the total is always recomputed from the
    questions rather than trusted.
    """
    subs = _as_list(substrands)
    by_tag = {getattr(s, "_tag", i): s for i, s in enumerate(subs, start=1)}
    only = subs[0] if len(subs) == 1 else None

    warnings = []
    questions = []
    untagged = 0
    for i, q in enumerate(data.get("questions", []), start=1):
        if not isinstance(q, dict) or not q.get("question_text"):
            continue
        q["number"] = i
        if not _tag_question(q, by_tag, only):
            untagged += 1
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

    # A sub-strand nobody asked a question about is the failure mode of a
    # multi-strand paper: it looks complete and quietly skips a third of what
    # was ticked.
    if len(subs) > 1:
        asked = {q.get("substrand_id") for q in questions}
        missed = [s for s in subs if s.id not in asked]
        if missed:
            warnings.append(
                "No question was set on: "
                + "; ".join(_label(s) for s in missed)
                + ". Ask for more questions, or tick fewer sub-strands.")
        if untagged:
            warnings.append(
                f"{untagged} question(s) did not say which sub-strand they "
                f"assess, so they are unlabelled on the paper.")

    data["warnings"] = warnings
    data.setdefault("title", f"{subs[0].name} Assessment" if subs
                    else "Assessment")
    data["covers"] = _covers(subs)
    data["substrands"] = [{"id": s.id, "label": _label(s),
                           "strand": f"{s.topic.kicd_code} {s.topic.name}".strip()}
                          for s in subs]
    return data


def _covers(subs):
    """One line naming what the paper assesses, grouped by strand."""
    parts = []
    for t, members in _grouped(subs):
        head = f"{t.kicd_code} {t.name}".strip()
        kids = ", ".join(_label(s) for s in members)
        parts.append(f"{head} ({kids})" if kids else head)
    return "; ".join(parts)
