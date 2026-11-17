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

import logging

from questions.generation import generate_json

logger = logging.getLogger("generation")

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

Return ONLY JSON, no commentary:
{"questions": [{"n": 1, "correct": "B", "tests": "yes", "repeats": 0, "note": ""},
               {"n": 2, "correct": "none", "tests": "yes", "repeats": 0, "note": "7x12=84, not listed"},
               {"n": 3, "correct": "n/a", "tests": "no", "repeats": 0, "note": "only asks for a percentage"},
               {"n": 4, "correct": "C", "tests": "yes", "repeats": 1, "note": "same as Q1 with different numbers"}]}"""

REPAIR_SYSTEM_SUFFIX = """

You are replacing questions that failed review. Do not repeat the fault \
that is named for each one. Return the same JSON shape, with "questions" \
holding ONLY the replacements."""


def _block(q) -> str:
    opts = q.get("options") or {}
    lines = [f'Question {q["number"]} [{q.get("substrand") or "unlabelled"}] '
             f'({q.get("type")}): {q.get("question_text", "")}']
    for k in ("A", "B", "C", "D"):
        if k in opts:
            lines.append(f"  {k}) {opts[k]}")
    for part in (q.get("parts") or []):
        lines.append(f'  ({part.get("label")}) {part.get("question_text", "")}')
    return "\n".join(lines)


def _verdicts(payload, user):
    """Ask the checker about every question. {} if the call fails."""
    questions = payload.get("questions") or []
    if not questions:
        return {}
    prompt = ("Check these questions.\n\n"
              + "\n\n".join(_block(q) for q in questions))
    try:
        data = generate_json(prompt, REVIEW_SYSTEM,
                             max_tokens=min(24000, 2000 + 700 * len(questions)),
                             task="assessment-review", user=user)
    except Exception as e:
        logger.warning("paper review failed, left as generated: %s", e)
        return {}

    out = {}
    for row in (data or {}).get("questions", []):
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
            # Only ever an earlier question: a checker that names a later one
            # would have the paper delete the original and keep the copy.
            "repeats": repeats if 0 < repeats < n else 0,
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


def _repair(faults, substrands, *, count_by_type, description, user,
            keeping=None):
    """Generate replacements for the questions that were thrown out."""
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

    verdicts = _verdicts(payload, user)
    if not verdicts:
        payload.setdefault("warnings", []).append(
            "The questions could not be double-checked automatically. "
            "Read the answers before printing.")
        return payload

    kept, faults = [], []
    for q in payload.get("questions", []):
        v = verdicts.get(q.get("number"))
        fault = _fault(q, v) if v else None
        if fault:
            faults.append((q.get("type") or "structured",
                           q.get("substrand") or "", fault))
        else:
            kept.append(q)

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

    warnings = payload.setdefault("warnings", [])
    if replacements:
        warnings.append(
            f"{len(faults)} question(s) failed review and were replaced. "
            f"Reasons: " + "; ".join(sorted({why for _, _, why in faults})) + ".")
    else:
        warnings.append(
            f"{len(faults)} question(s) failed review and were removed, so "
            f"this paper has {len(questions)} questions. Reasons: "
            + "; ".join(sorted({why for _, _, why in faults})) + ".")
    return payload
