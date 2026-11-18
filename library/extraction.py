"""Find the questions in an uploaded PDF and propose a curriculum mapping for
each one. AI classifies existing content; it never writes questions.

Two passes:

  1. Read  - page text (PyMuPDF) goes to the model a few pages at a time. It
             returns each block verbatim and says what it is: question,
             worked example, explanation, answer key or marking scheme. Only
             questions are kept; answer-key entries are attached to their
             question by label. Every question's text is then looked for on
             the page it claims to come from - text that isn't there is
             flagged, so an invented or garbled question can't slip through.

  2. Map   - each question is matched against the curriculum tables for the
             learning area (and nearby grades). The model may only answer with
             IDs from the list it was given; any other answer is discarded.
             Grade, learning area and strand are then read from the chosen
             sub-strand in the database, never from the model.

Every result starts as "proposed". Nothing enters the generator's pool until
an admin approves it (library.models.approved_question_pool).
"""
from __future__ import annotations

import logging
import re
import threading

from django.conf import settings
from django.db import connection
from django.utils import timezone

from questions.generation import generate_json
from questions.models import Subject, Substrand, Topic

from .models import ExtractedQuestion, ExtractionRun, Resource

logger = logging.getLogger(__name__)

MAX_PAGES = 40            # per run; the rest is noted for the admin
PAGES_PER_CALL = 4
QUESTIONS_PER_CALL = 15
CONFIDENT = 0.75          # below this a mapping is flagged for review
CLOSE_CALL = 0.15         # an alternative this close makes it ambiguous

FLAG_TEXT = {
    "low_confidence": "The AI is not sure of this mapping.",
    "ambiguous": "Fits more than one sub-strand.",
    "no_mapping": "No matching sub-strand in the curriculum.",
    "strand_only": "Matched a strand but no specific sub-strand.",
    "rejected_invented": "The AI suggested a curriculum entry that does not exist - discarded.",
    "grade_differs": "Mapped to a different grade than the rest of the document.",
    "no_answer": "No answer or marking scheme found for this question.",
    "needs_figure": "Refers to a diagram, table or graph in the PDF.",
    "text_unverified": "The text could not be found on the stated page - check it.",
    "unknown_learning_area": "Could not tell the learning area - set it on the resource and analyse again.",
}

READ_SYSTEM = (
    "You extract assessment content from Kenyan CBC/CBE school documents. You copy "
    "text exactly as it appears - you never write, complete, improve or invent "
    "questions or answers. Reply with JSON only."
)

MAP_SYSTEM = (
    "You classify existing school questions against the official Kenyan CBC/CBE "
    "curriculum. You may only choose IDs from the list provided. If nothing in the "
    "list fits, answer null. Be honest about uncertainty. Reply with JSON only."
)


# ── text helpers ────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def _found_on_page(text: str, page_text: str) -> bool:
    """True when the question's opening words appear on the page (whitespace,
    punctuation and case ignored - PDF text extraction mangles all three)."""
    probe = _norm(text)[:60]
    return bool(probe) and probe in _norm(page_text)


def read_pages(data: bytes):
    import fitz
    pages = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        total = doc.page_count
        for i, page in enumerate(doc):
            if i >= MAX_PAGES:
                break
            text = page.get_text("text") or ""
            visuals = len(page.get_images(full=False))
            try:
                visuals += 1 if len(page.get_drawings()) > 20 else 0
            except Exception:
                pass
            pages.append({"page": i + 1, "text": text[:7000], "visuals": visuals})
    return pages, total


# ── pass 1: read ────────────────────────────────────────────────────────────

def _read_prompt(chunk, resource):
    hint = []
    if resource.grade:
        hint.append(f"The uploader says grade {resource.grade}.")
    if resource.subject_id:
        hint.append(f"The uploader says learning area: {resource.subject.name}.")
    pages = "\n\n".join(
        f"=== PAGE {p['page']} ({p['visuals']} images/diagrams) ===\n{p['text']}" for p in chunk)
    return f"""Below are pages from a PDF titled "{resource.title}". {' '.join(hint)}

Split the content into blocks and label each one:
  question        - something a learner must answer (include sub-parts as separate items, e.g. "3(a)")
  worked_example  - a question shown together with its solution, for teaching
  explanation     - notes, definitions, instructions, headings
  answer_key      - an answer to a numbered question, from an answers or marking-scheme section
Skip explanations entirely. Copy question and answer text EXACTLY as written.

Return JSON:
{{"document": {{"grade_guess": <integer or null>, "learning_area_guess": "<name or null>"}},
  "items": [
    {{"page": <page number>, "label": "<question number as printed, e.g. 3(a)>",
      "kind": "question|worked_example|answer_key",
      "text": "<exact text>", "options": ["<A. ...>", ...],
      "answer": "<exact answer if printed next to it, else null>",
      "marks": <integer or null>, "question_type": "mcq|short_answer|structured|essay|calculation",
      "refers_to_figure": <true if it needs a diagram, table, graph or picture>}}
  ]}}

{pages}"""


def _label_key(label):
    return _norm(label)


def extract_questions(pages, resource, *, user=None):
    """Pass 1. Returns (questions, document_guess)."""
    found, answers, guesses = [], {}, []
    by_page = {p["page"]: p["text"] for p in pages}
    for i in range(0, len(pages), PAGES_PER_CALL):
        chunk = pages[i:i + PAGES_PER_CALL]
        if not any(p["text"].strip() for p in chunk):
            continue
        out = generate_json(_read_prompt(chunk, resource), READ_SYSTEM, max_tokens=8000,
                            task="library_extract_read", user=user)
        if not isinstance(out, dict):
            continue
        if out.get("document"):
            guesses.append(out["document"])
        for it in out.get("items") or []:
            kind = (it.get("kind") or "").strip()
            text = (it.get("text") or "").strip()
            if not text:
                continue
            if kind == "answer_key":
                answers.setdefault(_label_key(it.get("label")), text)
            elif kind == "question":
                found.append(it)

    questions = []
    for n, it in enumerate(found):
        page = it.get("page") if isinstance(it.get("page"), int) else None
        answer = (it.get("answer") or "").strip() or answers.get(_label_key(it.get("label")), "")
        questions.append({
            "page": page or 0,
            "label": str(it.get("label") or "")[:40],
            "order": n,
            "text": it["text"].strip(),
            "answer": answer,
            "options": [str(o) for o in (it.get("options") or [])][:8],
            "marks": it.get("marks") if isinstance(it.get("marks"), int) else None,
            "question_type": str(it.get("question_type") or "")[:20],
            "refers_to_figure": bool(it.get("refers_to_figure")),
            "text_verified": bool(page) and _found_on_page(it["text"], by_page.get(page, "")),
        })

    doc = {}
    grades = [g.get("grade_guess") for g in guesses if isinstance(g.get("grade_guess"), int)]
    areas = [g.get("learning_area_guess") for g in guesses if g.get("learning_area_guess")]
    if grades:
        doc["grade_guess"] = max(set(grades), key=grades.count)
    if areas:
        doc["learning_area_guess"] = max(set(areas), key=areas.count)
    return questions, doc


# ── pass 2: map ─────────────────────────────────────────────────────────────

def resolve_subject(resource, doc_guess):
    if resource.subject_id:
        return resource.subject
    name = (doc_guess.get("learning_area_guess") or "").strip()
    if not name:
        return None
    exact = Subject.objects.filter(name__iexact=name).first()
    if exact:
        return exact
    matches = [s for s in Subject.objects.all() if _norm(s.name) in _norm(name) or _norm(name) in _norm(s.name)]
    return matches[0] if len(matches) == 1 else None


def candidate_substrands(subject, grade):
    qs = Substrand.objects.select_related("topic").filter(topic__subject=subject)
    if grade:
        qs = qs.filter(topic__grade__in=[grade - 1, grade, grade + 1])
    return list(qs.order_by("topic__grade", "topic__order", "order"))


def _outcomes(s, limit=3):
    items = s.learning_outcomes if isinstance(s.learning_outcomes, list) else []
    out = []
    for o in items[:limit]:
        out.append(o if isinstance(o, str) else (o.get("text") or o.get("outcome") or str(o)))
    return "; ".join(x[:140] for x in out)


def _map_prompt(questions, cands, subject):
    lines = "\n".join(
        f"S{s.id} | Grade {s.topic.grade} | Strand: {s.topic.name} | Sub-strand: {s.name}"
        + (f" | Outcomes: {_outcomes(s)}" if _outcomes(s) else "")
        for s in cands)
    qs = "\n\n".join(
        f"[{i}] {q['text'][:900]}" + (f"\nAnswer: {q['answer'][:300]}" if q["answer"] else "")
        for i, q in enumerate(questions))
    return f"""Learning area: {subject.name}

CURRICULUM (the only valid choices):
{lines}

QUESTIONS:
{qs}

For every question choose the ONE sub-strand it assesses, from the list above.
A strand is the heading (e.g. Measurement); a sub-strand is the unit under it
(e.g. Area). Do not confuse them, and do not confuse a learning outcome with a strand.
If no sub-strand fits, use null. Give a confidence from 0 to 1 and list close alternatives.

Return JSON: {{"mappings": [{{"index": <n>, "substrand_id": <number from S-list or null>,
  "confidence": <0-1>, "alternatives": [{{"substrand_id": <n>, "confidence": <0-1>}}],
  "reason": "<one short sentence>"}}]}}"""


def _sid(v):
    if isinstance(v, int):
        return v
    m = re.match(r"^\s*S?(\d+)\s*$", str(v or ""))
    return int(m.group(1)) if m else None


def map_questions(questions, subject, cands, doc_grade, *, user=None):
    """Pass 2. Adds proposal fields to each question dict in place."""
    valid = {s.id: s for s in cands}
    for start in range(0, len(questions), QUESTIONS_PER_CALL):
        batch = questions[start:start + QUESTIONS_PER_CALL]
        out = generate_json(_map_prompt(batch, cands, subject), MAP_SYSTEM, max_tokens=4000,
                            task="library_extract_map", user=user)
        rows = out.get("mappings") if isinstance(out, dict) else out
        by_index = {r.get("index"): r for r in (rows or []) if isinstance(r, dict)}
        for i, q in enumerate(batch):
            r = by_index.get(i) or {}
            flags = q.setdefault("flags", [])
            raw_sid = r.get("substrand_id")
            sid = _sid(raw_sid)
            sub = valid.get(sid)
            if raw_sid not in (None, "", "null") and not sub:
                flags.append("rejected_invented")
            try:
                conf = max(0.0, min(1.0, float(r.get("confidence") or 0)))
            except (TypeError, ValueError):
                conf = 0.0
            alts = []
            for a in r.get("alternatives") or []:
                aid = _sid(a.get("substrand_id")) if isinstance(a, dict) else None
                if aid in valid and aid != (sub.id if sub else None):
                    try:
                        ac = max(0.0, min(1.0, float(a.get("confidence") or 0)))
                    except (TypeError, ValueError):
                        ac = 0.0
                    alts.append({"substrand_id": aid, "confidence": round(ac, 2)})
            q["proposed_substrand"] = sub
            q["proposed_topic"] = sub.topic if sub else None
            q["confidence"] = round(conf if sub else 0.0, 2)
            q["alternatives"] = alts[:3]
            q["reason"] = str(r.get("reason") or "")[:500]
            if not sub:
                flags.append("no_mapping")
            else:
                if conf < CONFIDENT:
                    flags.append("low_confidence")
                if any(a["confidence"] >= conf - CLOSE_CALL for a in alts):
                    flags.append("ambiguous")
                if doc_grade and sub.topic.grade != doc_grade:
                    flags.append("grade_differs")
    return questions


# ── the run ─────────────────────────────────────────────────────────────────

def run_extraction(run_id):
    run = ExtractionRun.objects.select_related("resource", "resource__subject").get(pk=run_id)
    resource = run.resource
    user = run.started_by
    run.status = ExtractionRun.RUNNING
    run.save(update_fields=["status"])
    try:
        with resource.file.open("rb") as fh:
            data = fh.read()
        pages, total = read_pages(data)
        run.pages_total, run.pages_read = total, len(pages)
        notes = []
        if total > MAX_PAGES:
            notes.append(f"Only the first {MAX_PAGES} of {total} pages were read.")
        if not any(p["text"].strip() for p in pages):
            notes.append("No text found - this looks like a scanned PDF. Upload a text PDF to extract questions.")

        questions, doc = extract_questions(pages, resource, user=user)
        subject = resolve_subject(resource, doc)
        grade = resource.grade or doc.get("grade_guess")
        doc["learning_area"] = subject.name if subject else None
        doc["grade_used"] = grade

        for q in questions:
            q["flags"] = []
            if not q["answer"]:
                q["flags"].append("no_answer")
            if q["refers_to_figure"]:
                q["flags"].append("needs_figure")
            if not q["text_verified"]:
                q["flags"].append("text_unverified")

        if questions:
            cands = candidate_substrands(subject, grade) if subject else []
            if not subject:
                notes.append(FLAG_TEXT["unknown_learning_area"])
                for q in questions:
                    q["flags"].append("unknown_learning_area")
            elif not cands:
                notes.append(f"The curriculum has no sub-strands for {subject.name}"
                             f"{f' around grade {grade}' if grade else ''} yet.")
                for q in questions:
                    q["flags"].append("no_mapping")
            else:
                map_questions(questions, subject, cands, grade, user=user)

        # Replace the previous run's unreviewed proposals; keep anything an
        # admin already approved or rejected.
        ExtractedQuestion.objects.filter(resource=resource,
                                         review_status=ExtractedQuestion.PROPOSED).delete()
        ExtractedQuestion.objects.bulk_create([
            ExtractedQuestion(
                run=run, resource=resource, page=q["page"], label=q["label"], order=q["order"],
                original_text=q["text"], original_answer=q["answer"], options=q["options"],
                marks=q["marks"], question_type=q["question_type"],
                refers_to_figure=q["refers_to_figure"], text_verified=q["text_verified"],
                proposed_substrand=q.get("proposed_substrand"), proposed_topic=q.get("proposed_topic"),
                confidence=q.get("confidence", 0), alternatives=q.get("alternatives", []),
                reason=q.get("reason", ""), flags=sorted(set(q["flags"])),
            ) for q in questions
        ])
        if not questions and not notes:
            notes.append("No questions were found in this document.")
        run.document_guess, run.notes = doc, notes
        run.status = ExtractionRun.DONE
    except Exception as e:
        logger.exception("library extraction failed (run %s)", run_id)
        run.status = ExtractionRun.FAILED
        run.error = f"{type(e).__name__}: {e}"[:500]
    run.finished_at = timezone.now()
    run.save()
    return run


def start_extraction(resource, user):
    run = ExtractionRun.objects.create(resource=resource, started_by=user)
    if getattr(settings, "LIBRARY_EXTRACT_SYNC", False):
        run_extraction(run.id)
        return run

    def _go():
        try:
            run_extraction(run.id)
        finally:
            connection.close()

    threading.Thread(target=_go, daemon=True, name=f"extract-{run.id}").start()
    return run
