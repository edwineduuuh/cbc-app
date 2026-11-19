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

import difflib
import json
import logging
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor

from questions.generation import generate_json
from questions.knec_format import (KNEC_STYLE, exemplars_for, paper_shape,
                                   scaled_sections)
from questions.subject_style import depth_for, reading_level, style_for

logger = logging.getLogger("generation")

SYSTEM = """You are a setter at the Kenya National Examinations Council. \
You write the School Based Assessment papers that KNEC publishes for the \
CBE curriculum, and your questions are held to the standard of a paper that \
goes out to every school in the country. A teacher reading your paper must \
not be able to tell it from a KNEC one.

Rules:
- Assess ONLY the learning outcomes given. Do not test content outside them.
- Use Kenyan English and KICD terminology. Say "learner", never "student".
- Use KICD command verbs: State, Name, Identify, Describe, Explain, \
Outline, Distinguish, Calculate, Work out, Account for, Analyse, Justify.
- Ground questions in real Kenyan contexts: named towns, counties, crops, \
institutions, money written as Ksh, local businesses and everyday situations. \
Vary them. Do not reuse Nairobi for every question.
- Pitch the difficulty at exactly the grade given.
- Every question carries its marks. A structured question is worth 2 to 6 \
marks and may have (a)/(b)/(c) parts. Do not stack parts past that. If the \
teacher asked for long questions, every structured question is long - never \
mix a 2-mark question and a 13-mark question on the same paper, which makes \
the paper look unplanned.
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

- NO TWO QUESTIONS MAY SHARE A SCENARIO. A paper with three questions about \
ramps, or three about matatu fares, reads as one idea stretched thin however \
different the numbers are. Each question gets a different setting drawn from \
different parts of Kenyan life: farming, markets and trade, transport, \
school, health, water, energy, weather, sport, small business, wildlife, \
fishing, construction, savings and loans.

- REACH THE DEPTH THE OUTCOME DEMANDS. Look at the verb in each specific \
learning outcome. If the design says a learner should apply, analyse, \
justify or evaluate, a question that only asks them to recall a definition \
or substitute one number into a given formula has not assessed it. At least \
a third of the paper must require more than recall: interpreting what an \
answer means in the situation, finding the error in a worked solution, \
deciding between two methods and saying why, working backwards from a \
result, or judging whether a claim is reasonable.

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

- A FIGURE WHERE POSITION MATTERS IS A "plot", NEVER A "diagram". If the \
figure is a coordinate grid, a straight line, a shaded inequality region, a \
number line, or anything a learner reads a value off, give the question a \
"plot" object with the numbers in it. It is then drawn exactly from those \
numbers. A "diagram" is passed to a picture model, which cannot put a point \
at (3, 7) - ask it for a coordinate grid and it draws a picture of a blank \
grid, which is useless to a question saying "use the diagram above". Use \
"diagram" only for a picture of a real thing: a leaf section, an apparatus \
set-up, a circuit, a map.

- WRITE MATHEMATICS AS MATHEMATICS, NOT AS TYPEWRITER TEXT. Put every \
mathematical expression between single dollar signs, in LaTeX, and it is \
typeset properly on the paper: $\\frac{3}{4}$ not 3/4, $x^2$ not x^2 or x2, \
$\\sqrt{16}$ not sqrt(16), $2\\frac{1}{2}$ for a mixed number, $y = 2x + 1$, \
$3x - 5 \\le 16$ for an inequality, $\\pi r^2$, $45^\\circ$, $12\\ \
\\text{cm}^2$. A learner reading "1/2" or "x^2" on a printed paper is \
reading something that looks unfinished. Leave ordinary words outside the \
dollar signs - only the mathematics goes inside.

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
"correct_answer" for structured. Omit "marking_scheme" for mcq.

A mathematical figure uses "plot" INSTEAD of "diagram". Two types:

 "plot": {"type": "cartesian",
          "x_range": [-3, 3], "y_range": [-3, 5],
          "lines": [{"equation": "y = 2x + 1", "style": "solid"}],
          "shade": [{"inequality": "2x + y <= 6"}],
          "points": [{"x": 3, "y": 7, "label": "A"}],
          "alt": "one sentence describing it"}

 "plot": {"type": "number_line", "min": -2, "max": 8, "step": 1,
          "mark": [{"at": 2, "closed": true}, {"at": 6, "closed": false}],
          "shade": [{"from": 2, "to": 6}],
          "alt": "one sentence describing it"}

Rules for a plot: write equations in x and y only, as "y = 2x + 1" or
"2x + 3y = 12"; an inequality uses <, <=, > or >= and is drawn with the
correct boundary (broken for < and >, solid for <= and >=) and the correct
side shaded. "lines", "shade" and "points" are each optional - leave out
what the question does not need. Choose ranges that show what matters and
keep the grid under about 15 steps each way. For a blank grid for a learner
to plot on, give ranges and nothing else."""


def _diagram_instruction(want_diagram, substrand):
    """Ask for a diagram outright when the facilitator ticked the box.

    Left to its own judgement the model almost never asks for one, so the
    tick box did nothing. If it is ticked, one question must use a diagram.
    """
    if not want_diagram:
        return ("DIAGRAMS: do not use any diagram in this assessment. "
                "Write questions that stand on their own words.")
    return (
        "FIGURES: exactly ONE question in this paper must be built around a "
        "figure, and it must be a question that is genuinely better with one "
        "- a graph to read, a number line, a labelled structure, an "
        "apparatus set-up, a cycle, a map. Word that question so it refers "
        "to the figure above it. If the figure is mathematical - a "
        "coordinate grid, a line, a shaded inequality, a number line - give "
        "it a \"plot\" object with the numbers in it, NOT a \"diagram\": a "
        "plot is drawn exactly, a diagram is only a picture. Every other "
        "question has neither."
    )


def _bullets(items, limit=None, indent=""):
    items = [i for i in (items or []) if str(i).strip()]
    if limit:
        items = items[:limit]
    return ("\n".join(f"{indent}- {i}" for i in items)
            or f"{indent}- (none recorded)")


# One call for a whole paper is why a paper took two minutes: the model
# writes the questions one after another and we wait for all of them. Six
# questions is about forty seconds, and six calls of six run in the time of
# one - so a fifty question paper costs roughly what eight questions cost.
QUESTIONS_PER_CALL = 3
MAX_PARALLEL_CALLS = 14

# What the facilitator typed decides the mix. Working it out here rather
# than asking the model keeps every parallel part consistent with the rest,
# and costs nothing.
_ALL_STRUCTURED = re.compile(
    r"no\s+(multiple[-\s]?choice|mcq)|all\s+structured|structured\s+only|"
    r"only\s+structured|essay|written\s+answers\s+only", re.I)
_ALL_MCQ = re.compile(
    r"(multiple[-\s]?choice|mcq)s?\s+only|only\s+(multiple[-\s]?choice|mcq)|"
    r"all\s+(multiple[-\s]?choice|mcq)", re.I)
_MOSTLY_STRUCTURED = re.compile(r"mostly\s+structured|mainly\s+structured", re.I)
_MOSTLY_MCQ = re.compile(r"mostly\s+(multiple[-\s]?choice|mcq)|"
                         r"mainly\s+(multiple[-\s]?choice|mcq)", re.I)


def plan_mix(count: int, grade, description: str, mcq_ratio=None):
    """(number of multiple-choice, number of structured) for this paper."""
    count = max(1, int(count or 1))
    text = description or ""

    if mcq_ratio is not None:
        ratio = max(0.0, min(1.0, float(mcq_ratio)))
    elif _ALL_STRUCTURED.search(text):
        ratio = 0.0
    elif _ALL_MCQ.search(text):
        ratio = 1.0
    elif _MOSTLY_STRUCTURED.search(text):
        ratio = 0.2
    elif _MOSTLY_MCQ.search(text):
        ratio = 0.8
    else:
        try:
            g = int(grade)
        except (TypeError, ValueError):
            g = 8
        # Grades 4-6 are a multiple-choice paper; 7-9 split evenly; Grade 10
        # is mostly Section A by item count. Read off the real papers.
        ratio = 1.0 if g <= 6 else (0.5 if g <= 9 else 0.55)

    n_mcq = int(round(count * ratio))
    if ratio not in (0.0, 1.0):
        n_mcq = max(1, min(count - 1, n_mcq))
    return n_mcq, count - n_mcq


# Parts of one paper are written at the same time and cannot see each other.
# Giving each part its own style is what stops four parts all writing the
# obvious scenario question.
PART_STYLES = [
    "explain and use the key ideas directly, in classroom terms - no story scenarios",
    "apply the ideas to a real Kenyan situation; each question a different kind of situation",
    "interpret given information: a short table, figures, a timeline, a source extract or a described picture",
    "compare, evaluate or justify a view with reasons",
]


def plan_jobs(n_mcq: int, n_struct: int, subs: list) -> list[dict]:
    """Split the paper into parts that can be written at the same time.

    Each part is given its own slice of the sub-strands, so the parts cover
    the design between them instead of all crowding the same outcome.
    """
    jobs = []
    for kind, total in (("mcq", n_mcq), ("structured", n_struct)):
        left = total
        while left > 0:
            take = min(QUESTIONS_PER_CALL, left)
            jobs.append({"type": kind, "count": take})
            left -= take

    if len(jobs) > MAX_PARALLEL_CALLS:
        # Too many parts means too many calls; make each part bigger instead.
        merged, per = [], max(1, (n_mcq + n_struct) // MAX_PARALLEL_CALLS + 1)
        for kind, total in (("mcq", n_mcq), ("structured", n_struct)):
            left = total
            while left > 0:
                take = min(per, left)
                merged.append({"type": kind, "count": take})
                left -= take
        jobs = merged

    n = len(jobs) or 1
    for i, job in enumerate(jobs):
        job["part"] = i + 1
        job["parts"] = n
        # Round-robin the sub-strands so every part has something of its own.
        job["subs"] = subs[i::n] or subs
    return jobs


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


def build_prompt(substrands, *, count=10, description="", mcq_ratio=None,
                 want_diagram=False, section=None, part=None):
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

    # mcq_ratio=None means nobody fixed the mix, so the paper is shaped by
    # what the facilitator wrote and by what this learning area is normally
    # assessed with. A hard-coded 60% multiple-choice made every paper a
    # recognition quiz no matter what was asked for.
    # A full KNEC paper is generated one section at a time, so this pass is
    # told exactly which section it is writing and nothing else.
    if section:
        if section["type"] == "mcq":
            mix = (f"You are writing {section['name'] or 'the paper'} only. "
                   f"EVERY question is multiple-choice with four options "
                   f"A-D and is worth exactly 1 mark. Write no structured "
                   f"questions.")
        else:
            mix = (f"You are writing {section['name'] or 'the paper'} only. "
                   f"EVERY question is structured with parts (a), (b) and "
                   f"where it helps (c), each part carrying its own marks. "
                   f"Each question is worth {section['marks']} marks or "
                   f"close to it. Write no multiple-choice questions.")
    elif mcq_ratio is None:
        mix = (
            "Decide the mix of multiple-choice and structured questions "
            "yourself. The teacher's request above governs: if they asked "
            "for all structured, or an essay, or multiple-choice only, give "
            "exactly that. If they did not say, give a mix of both.")
    else:
        n_mcq = max(0, min(count, round(count * float(mcq_ratio))))
        mix = (f"Produce exactly {n_mcq} multiple-choice and "
               f"{count - n_mcq} structured questions.")

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

    # This call is one part of a paper being written in parallel. Say so, and
    # point it at its own slice of the design, so the parts do not all crowd
    # the same outcome.
    part_note = ""
    if part and part.get("parts", 1) > 1:
        mine = [getattr(s, "_tag", i) for i, s in
                enumerate(part.get("subs") or [], start=1)]
        part_note = (
            f"\nYOU ARE WRITING PART {part['part']} OF {part['parts']} of one "
            f"paper, and other parts are being written at the same time. "
            f"Write ONLY your {count} questions - do not try to cover the "
            f"whole design. Draw yours mainly from "
            + (", ".join(f"[S{t}]" for t in mine) if mine else "the design")
            + ", and make them unmistakably different in shape and setting "
              "from anything an obvious first attempt would produce, so the "
              "finished paper does not repeat itself.\n"
            + f"YOUR PART'S STYLE: {PART_STYLES[(part['part'] - 1) % len(PART_STYLES)]}\n"
              "No two questions in the whole paper may use the same KIND of situation "
              "(for example, only ONE story where someone offers goods in exchange "
              "for other goods), so keep to your style.\n")

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

    depth = (
        f"At least {max(2, round(count / 3))} of the {count} questions "
        f"{depth_for(subject.name)} Give each question its honest "
        f"bloom_level; a paper that is all \"remember\" has not assessed "
        f"this design.")

    # What a good paper looks like in THIS learning area. Without it one set
    # of instructions wrote Kiswahili, CRE, Agriculture and Mathematics
    # papers in the same shape.
    style = style_for(subject.name)
    reading = reading_level(topic.grade)
    # How a real KNEC paper at this grade is built, and how its questions are
    # actually worded - read off KJSEA and KPSEA papers.
    shape = paper_shape(topic.grade, count)
    examples = exemplars_for(subject.name)

    return f"""Write an assessment for:

Grade: {topic.grade}
Learning area: {subject.name}
{style}

{reading}

{KNEC_STYLE}

{examples}

{shape}

THE KICD CURRICULUM DESIGN TO ASSESS (assess these outcomes and only these):

{design}
{part_note}

CORE COMPETENCIES THE DESIGN TARGETS:
{competencies}
{_rubric_text([t for t, _ in groups])}

TEACHER'S REQUEST: {description.strip() or 'A standard classroom assessment.'}
{_diagram_instruction(want_diagram, subs)}

Produce exactly {count} questions. {mix} Number them 1 to {count}, with any \
multiple-choice questions first. {spread}

{depth}

Every question must carry "sub": N, the number of the [S N] sub-strand it \
assesses. Do not invent a tag that is not listed.

Return JSON in exactly this shape:
{SCHEMA}"""


def generate_assessment(substrands, *, count=10, description="",
                        mcq_ratio=None, user=None, diagrams=True,
                        verify=True, full_paper=False,
                        defer_images=False) -> dict:
    """Generate one assessment over one or more sub-strands."""
    subs = _as_list(substrands)
    started = time.time()
    marks = [("start", 0.0)]

    def mark(name):
        marks.append((name, round(time.time() - started, 1)))

    grade = subs[0].topic.grade
    sections = scaled_sections(grade, count) if full_paper else None

    if not sections:
        # Write the paper in parts, all at the same time. One call for the
        # whole paper means waiting for the model to write every question in
        # turn, which is what made a short paper take two minutes.
        n_mcq, n_struct = plan_mix(count, grade, description, mcq_ratio)
        jobs = plan_jobs(n_mcq, n_struct, subs)
        data, raw = {}, []

        def write(job):
            from django.db import connection
            try:
                prompt = build_prompt(
                    subs, count=job["count"], description=description,
                    want_diagram=diagrams and job["part"] == 1,
                    section={"name": "", "type": job["type"],
                             "marks": 5, "count": job["count"]},
                    part=job)
                part = generate_json(prompt, SYSTEM,
                                     max_tokens=token_budget(job["count"]),
                                     task=f"assessment-{job['type']}",
                                     user=user)
                got = [q for q in (part or {}).get("questions", [])
                       if isinstance(q, dict)]
                return job, part, got
            finally:
                connection.close()

        if len(jobs) == 1:
            results = [write(jobs[0])]
        else:
            with ThreadPoolExecutor(max_workers=len(jobs)) as pool:
                results = list(pool.map(write, jobs))

        for job, part, got in sorted(results, key=lambda r: r[0]["part"]):
            if not data and isinstance(part, dict):
                data = {k: v for k, v in part.items() if k != "questions"}
            raw += got
        if not raw:
            raise ValueError("Generator returned no questions")
        # Multiple-choice first, as every KNEC paper orders them.
        raw.sort(key=lambda q: 0 if (q.get("type") or "") == "mcq" else 1)
        data["questions"] = raw
        mark(f"written-in-{len(jobs)}-parts")

    elif sections:
        # One call per section. A single call for forty questions runs out of
        # budget and drifts; each section also gets instructions for only the
        # kind of question it contains.
        data, raw = {}, []
        for i, sec in enumerate(sections):
            prompt = build_prompt(subs, count=sec["count"],
                                  description=description,
                                  want_diagram=diagrams and i == len(sections) - 1,
                                  section=sec)
            part = generate_json(prompt, SYSTEM,
                                 max_tokens=token_budget(sec["count"]),
                                 task=f"assessment-{sec['type']}", user=user)
            if not isinstance(part, dict) or not part.get("questions"):
                raise ValueError(f"Generator returned no {sec['name']}")
            got = [q for q in part["questions"] if isinstance(q, dict)]
            for q in got:
                q["section"] = sec["name"]
            raw += got
            if not data:
                data = {k: v for k, v in part.items() if k != "questions"}
            mark(sec["name"].lower().replace(" ", "-") or "written")
        data["questions"] = raw
        data["sections"] = [{"name": s["name"], "type": s["type"],
                             "instruction": s["instruction"]}
                            for s in sections]
    data = _validate(data, subs)
    mark("written")

    if verify:
        # Before diagrams, so we never pay to draw a picture for a question
        # that is about to be thrown out.
        from questions.review import review_paper
        data = review_paper(data, subs, user=user, description=description)
        mark("reviewed")

    if diagrams:
        # Plots are drawn now: they come from numbers, so they cost nothing
        # and take milliseconds. Pictures are held back - one takes most of a
        # minute, and a facilitator should not be watching a spinner with a
        # finished paper sitting behind it.
        from questions.diagrams import (attach_diagrams, attach_plots,
                                        mark_image_pending)
        data = attach_plots(data)
        if defer_images:
            data = mark_image_pending(data)
        else:
            data = attach_diagrams(data, user=user)
        mark("drawn")

    # Wall time per stage. The whole chain once ran past gunicorn's 120s
    # timeout, so the worker was killed and the browser reported "Failed to
    # fetch" on a paper that had in fact been generated. Guessing which stage
    # is slow is not good enough - record it.
    logger.info("assessment built in %.1fs: %s", marks[-1][1],
                ", ".join(f"{n}@{t}s" for n, t in marks[1:]))
    data["seconds"] = marks[-1][1]
    return tidy_paper(data)


_NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
              "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
              "seventeen", "eighteen", "nineteen", "twenty"]
_TRAILING_MARKS = re.compile(r"\s*\(\s*\d+\s*marks?\s*\)\s*$", re.I)
_FIGURE_ABOVE = re.compile(r"\b(the|this)\s+(sketch map|map|diagram|figure|graph|table|picture|chart|illustration|photograph)\s+above\b", re.I)


def paper_instructions(questions) -> str:
    """Instructions written from the questions actually on the paper."""
    n = len(questions)
    count = f"{_NUM_WORDS[n]} ({n})" if n < len(_NUM_WORDS) else str(n)
    kinds = {(q.get("type") or "").lower() for q in questions}
    lines = [f"Answer all {count} questions."]
    if "mcq" in kinds:
        lines.append("For multiple-choice questions, write the letter of the best answer.")
    if kinds - {"mcq"}:
        lines.append("For structured questions, write your answers in the spaces provided.")
    return " ".join(lines)


def tidy_paper(data: dict) -> dict:
    """Fixes code can make reliably, so they never depend on the model:
    instructions that match the paper, marks printed once, and a figure
    that prints below its question called 'below'."""
    qs = data.get("questions") or []
    for q in qs:
        if q.get("diagram") or q.get("plot") or q.get("figure"):
            q["question_text"] = _FIGURE_ABOVE.sub(lambda m: f"{m.group(1)} {m.group(2)} below",
                                                   q.get("question_text") or "")
        for part in q.get("parts") or []:
            if isinstance(part, dict) and part.get("question_text"):
                part["question_text"] = _TRAILING_MARKS.sub("", part["question_text"])
        if q.get("question_text") and not q.get("parts"):
            q["question_text"] = _TRAILING_MARKS.sub("", q["question_text"])
    if qs:
        data["instructions"] = paper_instructions(qs)
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


def _match_outcome(claimed: str, outcomes: list) -> str:
    """The design outcome this question claims, or '' if it is not one.

    The model copies the outcome it is assessing out of the list it was
    given. A tag that is not in the list means the question has wandered off
    the design, which is the one thing this tool must never do.
    """
    claimed = (claimed or "").strip()
    if not claimed or not outcomes:
        return ""
    low = claimed.lower()
    best, score = "", 0.0
    for o in outcomes:
        r = difflib.SequenceMatcher(None, low, str(o).strip().lower()).ratio()
        if r > score:
            best, score = str(o).strip(), r
    return best if score >= 0.75 else ""


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

    # Hold the question to an outcome that is actually in the design. A tag
    # the design does not contain means the question has wandered off it.
    claimed = (q.get("outcome") or "").strip()
    matched = _match_outcome(claimed, s.learning_outcomes or [])
    q["outcome"] = matched
    # Keep what it said even when that is not a design outcome, so the
    # rejection can name the claim instead of saying "the outcome it claimed".
    if claimed and not matched:
        q["outcome_claimed"] = claimed
    q["off_design"] = not matched
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

    # A paper of 2-mark questions with a 13-mark one buried in it looks
    # unplanned, and a teacher allocating lesson time notices immediately.
    struct = [q["marks"] for q in questions if q["type"] == "structured"]
    if len(struct) > 2:
        biggest, smallest = max(struct), min(struct)
        if biggest >= 10 and biggest >= 3 * smallest:
            warnings.append(
                f"The questions are very unevenly weighted - from {smallest} "
                f"marks to {biggest}. Check the balance before printing.")

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
