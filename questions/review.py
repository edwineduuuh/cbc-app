"""Check a generated paper before a facilitator ever sees it, and repair it.

Two faults get past generation and neither is visible to the code that made
them:

1. A wrong answer key. _validate counts the options and confirms the marked
   letter exists; it has no idea whether the marked option is the right one.
   A wrong key is invisible until a teacher marks thirty scripts with it.

2. A question that names the sub-strand without testing it. "An application
   multiplies water use by 7, calculate the weekly use" filed under Visual
   Programming tests multiplication - delete the word "application" and the
   question is unchanged. It is worthless as evidence of the outcome, and a
   paper full of these is what makes a generator look cheap.

So the paper is reviewed by a second pass that is NOT shown the answer key.
It works each MCQ out for itself, and judges every question against one
test: remove the sub-strand's vocabulary - does the question still have the
same answer? Disagreement, or a yes, means the question goes.

Then the holes are filled. A facilitator asked for twelve questions, so
handing back nine and a list of excuses is not an answer. The replacements
are generated in one more call that is told exactly why the originals
failed. One repair round only - bounded cost, no loops.
"""
from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor

from questions.generation import generate_json

logger = logging.getLogger("generation")

# Questions per checking call. Small enough that the batches finish together.
REVIEW_BATCH = 3

REVIEW_SYSTEM = """You are a Kenyan examiner checking a paper before it is \
printed. You have not been shown anyone's answer key.

For EVERY question, judge two things.

1. "correct" - only for multiple-choice questions. Work the answer out \
yourself, doing every calculation in full. Report the letter of the single \
correct option, or "none" if no option is correct, "many" if more than one \
is defensibly correct, or "unclear" if it cannot be answered as written. \
For a structured question report "n/a".

2. "tests" - for every question. Each question is labelled with the \
sub-strand it is supposed to assess. Apply this test: strike the \
sub-strand's vocabulary out of the question. If the question still has the \
same answer, it does not assess that sub-strand - report "no". If answering \
it genuinely requires the ideas or skills of that sub-strand, report "yes".

Be hard on this. A question that mentions a computer application but only \
asks a learner to multiply two numbers is testing multiplication: "no". A \
question that asks what a block of code outputs, or which step is missing, \
is testing programming: "yes".

3. "repeats" - the number of an EARLIER question in this paper that this one \
is a copy of in shape, or 0. Two questions are the same shape when they ask \
a learner to do the same thing and differ only in their numbers, their names \
or their town. "Four sacks of x kg plus 3 kg is 19 kg, which equation" and \
"five cans of x litres plus 8 litres is 33 litres, which equation" are the \
same shape: the second repeats the first. Judge the task, not the wording. \
Always name the earlier question, never the later one.

4. "outcome" - every question states the curriculum outcome it claims to \
assess, in square brackets under it. Answer "yes" if answering the question \
genuinely requires the skill that outcome names, and "no" if the question \
tests something else and the claim is just attached to it. A question whose \
outcome says "determine the gradient from two known points" but which hands \
the learner the gradient and asks for something else is a "no". This is the \
one thing the paper must never get wrong: a question outside the design is \
worthless to the teacher whatever else is right about it.

5. "shallow" - "yes" if the question only asks a learner to recall a \
definition, read a number straight out of the stem, or substitute one value \
into a formula the question itself supplies, when the sub-strand's outcomes \
expect them to apply, analyse or judge. Otherwise "no". A question whose \
answer is stated in its own wording is always shallow.

6. "setting" - two or three words naming the scenario, such as "road ramp", \
"matatu fare", "maize harvest", "none" if it has no real-world setting. Use \
the same words for the same scenario so repeats can be spotted. Two stories \
of the same KIND are the same setting even with different people, places and \
goods: "someone offers goods in exchange for other goods" is one setting \
("barter offer") whether it is milk for maize or goats for a pot. A later \
question with the same kind of story as an earlier one is a repeat.

A question may refer to "the diagram above" or "the graph above". The figure \
IS printed with it on the paper, and is described in square brackets under \
the question. Judge the question as a learner holding the paper would, with \
the figure in front of them. NEVER report "unclear" merely because you \
cannot see a picture yourself.

Return ONLY JSON, no commentary:
{"questions": [{"n": 1, "correct": "B", "tests": "yes", "outcome": "yes", "repeats": 0, "shallow": "no", "setting": "road ramp", "note": ""},
               {"n": 2, "correct": "none", "tests": "yes", "outcome": "yes", "repeats": 0, "shallow": "no", "setting": "water tank", "note": "7x12=84, not listed"},
               {"n": 3, "correct": "n/a", "tests": "no", "outcome": "yes", "repeats": 0, "shallow": "yes", "setting": "none", "note": "only asks for a percentage"},
               {"n": 4, "correct": "C", "tests": "yes", "outcome": "yes", "repeats": 1, "shallow": "no", "setting": "road ramp", "note": "same as Q1 with different numbers"}]}"""

REPAIR_SYSTEM_SUFFIX = """

You are replacing questions that failed review. Do not repeat the fault \
that is named for each one. Return the same JSON shape, with "questions" \
holding ONLY the replacements."""


def _figure_line(q) -> str:
    """Describe the figure this question will be printed with.

    Without this the checker sees "use the graph above" with no graph, calls
    the question unanswerable and deletes it - which is exactly what happened
    to the one good graph question on a paper.
    """
    plot = q.get("plot")
    if isinstance(plot, dict) and plot.get("type"):
        try:
            from questions.plots import render_plot
            return ("  [FIGURE PRINTED ABOVE THIS QUESTION: "
                    + render_plot(plot)[1] + "]")
        except Exception:
            return ("  [FIGURE PRINTED ABOVE THIS QUESTION, drawn exactly "
                    "from: " + json.dumps(plot, default=str)[:400] + "]")
    dia = q.get("diagram")
    if isinstance(dia, dict):
        shown = dia.get("alt") or dia.get("subject") or ""
        if shown:
            return f"  [FIGURE PRINTED ABOVE THIS QUESTION: {shown}]"
    return ""


def _block(q) -> str:
    opts = q.get("options") or {}
    lines = [f'Question {q["number"]} [{q.get("substrand") or "unlabelled"}] '
             f'({q.get("type")}): {q.get("question_text", "")}']
    # The outcome the question says it assesses, so the checker can judge the
    # claim rather than take it on trust.
    if q.get("outcome"):
        lines.append(f'  [CLAIMS TO ASSESS THIS DESIGN OUTCOME: '
                     f'"{q["outcome"]}"]')
    fig = _figure_line(q)
    if fig:
        lines.append(fig)
    for k in ("A", "B", "C", "D"):
        if k in opts:
            lines.append(f"  {k}) {opts[k]}")
    for part in (q.get("parts") or []):
        lines.append(f'  ({part.get("label")}) {part.get("question_text", "")}')
    return "\n".join(lines)


def _verdicts(payload, user, subject_name=""):
    """Ask the checker about every question. {} if the call fails."""
    questions = payload.get("questions") or []
    if not questions:
        return {}

    # Without this the checker judges a Mathematics paper by the standards of
    # an essay subject and calls honest calculation "shallow", which then has
    # the question replaced by one asking a learner to explain something.
    from questions.subject_style import depth_for, style_for

    context = ""
    if subject_name:
        context = (f"This is a {subject_name} paper. A question is deep "
                   f"enough when it {depth_for(subject_name)}\n\n")
        if style_for(subject_name) and "WORKING OUT" in style_for(subject_name):
            context += (
                "MATHEMATICS: calculation IS the subject. A question that "
                "requires real working is never shallow, however plainly it "
                "is worded. Mark shallow only when a single trivial "
                "substitution answers it. A maths question that asks a "
                "learner to explain, describe or spot someone's mistake "
                "instead of calculating does not belong on this paper - "
                "report it with tests=\"no\".\n\n")

    # Check in parallel batches. One call for the whole paper means waiting
    # for every verdict in turn, and the check is the second thing standing
    # between a facilitator and their paper.
    batches = [questions[i:i + REVIEW_BATCH]
               for i in range(0, len(questions), REVIEW_BATCH)]

    # Each batch is checked separately (in parallel), so give every batch the
    # whole paper in one line per question - otherwise "repeats" and
    # "setting" can only compare a question with the two beside it, and a
    # paper of three barter stories sails through.
    whole = "\n".join(f'Question {q["number"]}: {" ".join(str(q.get("question_text", "")).split())[:180]}'
                      for q in questions)

    def check(batch):
        from django.db import connection
        try:
            prompt = (context
                      + "THE WHOLE PAPER, for judging \"repeats\" and \"setting\" only:\n"
                      + whole + "\n\nNow check ONLY these questions (report only these numbers).\n\n"
                      + "\n\n".join(_block(q) for q in batch))
            return generate_json(
                prompt, REVIEW_SYSTEM,
                max_tokens=min(24000, 2000 + 700 * len(batch)),
                task="assessment-review", user=user)
        except Exception as e:
            logger.warning("paper review batch failed: %s", e)
            return {}
        finally:
            connection.close()

    if len(batches) == 1:
        parts = [check(batches[0])]
    else:
        with ThreadPoolExecutor(max_workers=len(batches)) as pool:
            parts = list(pool.map(check, batches))

    rows = []
    for p in parts:
        rows += (p or {}).get("questions", [])
    if not rows:
        logger.warning("paper review returned nothing, left as generated")
        return {}

    out = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            n = int(row.get("n"))
        except (TypeError, ValueError):
            continue
        try:
            repeats = int(row.get("repeats") or 0)
        except (TypeError, ValueError):
            repeats = 0
        out[n] = {
            "correct": str(row.get("correct") or "").strip(),
            "tests": str(row.get("tests") or "").strip().lower(),
            "outcome_ok": str(row.get("outcome") or "").strip().lower() != "no",
            # Only ever an earlier question: a checker that names a later one
            # would have the paper delete the original and keep the copy.
            "repeats": repeats if 0 < repeats < n else 0,
            "shallow": str(row.get("shallow") or "").strip().lower() == "yes",
            "setting": str(row.get("setting") or "").strip().lower(),
            "note": str(row.get("note") or "").strip(),
        }
    return out


def _fault(q, v):
    """Why this question must not be printed, or None if it is fine."""
    if v.get("tests") == "no":
        where = q.get("substrand") or "the sub-strand"
        note = v.get("note") or ""
        reason = f"it did not actually assess {where}"
        return f"{reason} - {note}" if note else reason

    if not v.get("outcome_ok", True):
        claimed = q.get("outcome") or q.get("outcome_claimed") or "the outcome it claimed"
        return (f'it did not actually assess the design outcome it claims, '
                f'"{claimed}"')

    if v.get("repeats"):
        return (f"it asked the same thing as question {v['repeats']} with "
                f"different numbers, so the paper was padding")

    if q.get("type") != "mcq":
        return None

    verdict = (v.get("correct") or "").strip()
    letter = verdict.upper()
    note = v.get("note") or ""

    if letter in ("A", "B", "C", "D"):
        if letter == q.get("correct_answer"):
            return None
        # Two independent passes disagree on the answer. Either one is wrong
        # and a teacher cannot tell which, so it does not go on the paper.
        return ("the generator and the checker disagreed on the correct "
                f"answer{f' ({note})' if note else ''}")

    reasons = {
        "none": "none of its options was correct",
        "many": "more than one option was correct",
        "unclear": "it could not be answered as written",
    }
    if verdict.lower() in reasons:
        return reasons[verdict.lower()] + (f": {note}" if note else "")
    return None


REPAIR_PER_CALL = 2


def _repair(faults, substrands, *, count_by_type, description, user,
            keeping=None):
    """Generate replacements for the questions that were thrown out, a couple
    per call and all calls at once - one call writing five replacements in
    turn took about forty seconds."""
    if len(faults) <= REPAIR_PER_CALL:
        return _repair_one(faults, substrands, count_by_type=count_by_type,
                           description=description, user=user, keeping=keeping)
    chunks = [faults[i:i + REPAIR_PER_CALL] for i in range(0, len(faults), REPAIR_PER_CALL)]

    def run(chunk):
        from django.db import connection
        by_type = {}
        for t, _, _ in chunk:
            by_type[t] = by_type.get(t, 0) + 1
        try:
            return _repair_one(chunk, substrands, count_by_type=by_type,
                               description=description, user=user, keeping=keeping)
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=len(chunks)) as pool:
        parts = list(pool.map(run, chunks))
    return [q for part in parts for q in part]


def _repair_one(faults, substrands, *, count_by_type, description, user,
                keeping=None):
    """One replacement call."""
    from questions.assessments import (SCHEMA, SYSTEM, _as_list, build_prompt,
                                       token_budget)

    subs = _as_list(substrands)
    total = sum(count_by_type.values())
    if not total:
        return []

    # Reuse the full design prompt so the replacements are grounded exactly
    # as the originals were, then say what went wrong.
    base = build_prompt(subs, count=total, description=description,
                        mcq_ratio=(count_by_type.get("mcq", 0) / total),
                        want_diagram=False)

    rejected = "\n".join(
        f'- a {t} question on {label or "the sub-strand"}, rejected because {why}'
        for t, label, why in faults)

    # The replacements have to differ from what SURVIVED too, or a paper that
    # lost its duplicates gets them straight back.
    kept_text = "\n".join(f'- {q.get("question_text", "")[:200]}'
                          for q in (keeping or []))

    prompt = (
        f"{base}\n\n"
        f"THESE QUESTIONS WERE JUST REJECTED IN REVIEW. Write replacements "
        f"that do not repeat the fault:\n{rejected}\n\n"
        + (f"THE PAPER ALREADY CONTAINS THESE QUESTIONS. Your replacements "
           f"must ask for something different from every one of them, not the "
           f"same task with other numbers:\n{kept_text}\n\n" if kept_text else "")
        +
        f"Produce exactly {total} questions: "
        f"{count_by_type.get('mcq', 0)} multiple-choice and "
        f"{count_by_type.get('structured', 0)} structured.\n\n"
        f"Return JSON in exactly this shape:\n{SCHEMA}")

    try:
        data = generate_json(prompt, SYSTEM + REPAIR_SYSTEM_SUFFIX,
                             max_tokens=token_budget(total),
                             task="assessment-repair", user=user)
    except Exception as e:
        logger.warning("repair generation failed: %s", e)
        return []
    return [q for q in (data or {}).get("questions", []) if isinstance(q, dict)]


def review_paper(payload: dict, substrands, *, user=None, description="",
                 repair=True) -> dict:
    """Review every question, drop what fails, generate replacements.

    Never raises: a checker that is down must not cost a facilitator the
    paper that was already generated and paid for.
    """
    from questions.assessments import _validate

    subs_list = list(substrands) if isinstance(substrands, (list, tuple)) \
        else [substrands]
    subject_name = ""
    if subs_list and getattr(subs_list[0], "topic", None):
        subject_name = getattr(subs_list[0].topic.subject, "name", "") or ""

    verdicts = _verdicts(payload, user, subject_name)
    if not verdicts:
        payload.setdefault("warnings", []).append(
            "The questions could not be double-checked automatically. "
            "Read the answers before printing.")
        return payload

    questions = payload.get("questions", [])
    # Some recall belongs on a paper; a paper that is all recall does not
    # assess the design. Allow a third, reject the rest.
    shallow_budget, shallow_used = max(1, len(questions) // 3), 0
    settings = {}

    hard, soft = [], []     # hard: wrong or off-topic. soft: thin or repeated.
    for q in questions:
        v = verdicts.get(q.get("number"))
        if not v:
            hard.append((q, None))
            continue

        fault = _fault(q, v)
        if fault:
            hard.append((q, fault))
            continue

        setting = v.get("setting")
        if setting and setting not in ("none", "n/a", "-"):
            if setting in settings:
                soft.append((q, f"it is set in the same scenario as question "
                                f"{settings[setting]} ({setting}), so the "
                                f"paper reads as one idea repeated"))
                continue
            settings[setting] = q.get("number")

        if v.get("shallow"):
            if shallow_used >= shallow_budget:
                soft.append((q, "it only asked a learner to recall or "
                                "substitute, which this outcome does not "
                                "stop at"))
                continue
            shallow_used += 1

        hard.append((q, None))

    # Replacing most of a paper is a sign the review is wrong, not the paper,
    # and it doubles the cost. Hard faults always go; thin or repeated ones go
    # only while the paper keeps its shape.
    room = max(0, len(questions) // 2 - sum(1 for _, f in hard if f))
    rejected = [(q, f) for q, f in hard if f] + soft[:room]
    rejected_ids = {id(q) for q, _ in rejected}

    kept = [q for q in questions if id(q) not in rejected_ids]
    faults = [(q.get("type") or "structured", q.get("substrand") or "", f)
              for q, f in rejected]

    if len(soft) > room:
        payload.setdefault("warnings", []).append(
            f"{len(soft) - room} further question(s) are thin or repeat a "
            f"setting, but were kept so the paper keeps its length. "
            f"Generate again for a different spread.")

    if not faults:
        return payload

    logger.info("review rejected %s of %s questions",
                len(faults), len(payload.get("questions", [])))

    replacements = []
    if repair:
        by_type = {}
        for t, _, _ in faults:
            by_type[t] = by_type.get(t, 0) + 1
        raw = _repair(faults, substrands, count_by_type=by_type,
                      description=description, user=user, keeping=kept)
        if raw:
            # Put them through the same validation the originals went
            # through - marks, marking schemes, answer spread, sub-strand tag.
            checked = _validate({"questions": raw}, substrands)
            replacements = checked.get("questions", [])

    questions = kept + replacements
    for i, q in enumerate(questions, start=1):
        q["number"] = i
    payload["questions"] = questions
    payload["total_marks"] = sum(int(q.get("marks") or 0) for q in questions)

    # A question that was caught and replaced is the check doing its job, so
    # it is logged, not shown. The warnings box is for what a facilitator
    # must act on before printing; filling it with our own internal
    # reasoning makes a sound paper look faulty.
    logger.info("review replaced %s of %s: %s", len(faults), len(questions),
                "; ".join(sorted({why for _, _, why in faults}))[:500])
    if not replacements:
        payload.setdefault("warnings", []).append(
            f"This paper has {len(questions)} questions rather than the "
            f"number asked for: {len(faults)} did not pass checking and "
            f"could not be replaced.")
    return payload
