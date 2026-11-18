"""Find the questions in an uploaded PDF and propose a curriculum mapping for
each one. AI classifies existing content; it never writes questions.

Two passes over the WHOLE document, however long:

  1. Read  - pages go to the model a few at a time, overlapping by one page so
             a question that runs over a page break is seen whole. A page with
             a usable text layer is sent as text; a scanned page (no text
             layer) and any page with diagrams, tables or many drawn shapes is
             also sent as a rendered image, so the model reads what is
             actually printed - the scan itself, maths notation, table cells.
             The model returns each block verbatim and says what it is:
             question, worked example, answer key (explanations are dropped).
             Answer-key entries attach to their question by number.

             Checks: a question from a text page must be found on that page,
             or it is flagged. A question from a scanned page cannot be
             checked against text, so it is marked "read from a scan" for the
             admin to compare against the page.

             Figures: when a question needs a diagram, table or graph, that
             part of the page is cut out as an image and stored with the
             question - from the region the model points at, or, failing
             that, from the drawings and pictures between this question and
             the next one on the page.

  2. Map   - each question is matched against the curriculum tables for the
             learning area (and nearby grades). The model may only answer with
             IDs from the list it was given; any other answer is discarded.
             Grade, learning area and strand are read from the chosen
             sub-strand in the database, never from the model.

Every result starts as "proposed". Nothing enters the generator's pool until
an admin approves it (library.models.approved_question_pool).
"""
from __future__ import annotations

import logging
import re
import threading
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection
from django.utils import timezone

from questions.generation import generate_json
from questions.models import Subject, Substrand

from .models import ExtractedQuestion, ExtractionRun

logger = logging.getLogger(__name__)

PAGES_PER_CALL = 4        # window size; consecutive windows share one page
QUESTIONS_PER_CALL = 15
CONFIDENT = 0.75          # below this a mapping is flagged for review
CLOSE_CALL = 0.15         # an alternative this close makes it ambiguous
SCAN_TEXT_MIN = 40        # fewer readable characters than this = scanned page
RENDER_DPI = 110          # page images sent to the model
FIGURE_DPI = 170          # figures cut out for questions
STALE_AFTER = timedelta(minutes=15)   # a run with no progress this long has died

FLAG_TEXT = {
    "low_confidence": "The AI is not sure of this mapping.",
    "ambiguous": "Fits more than one sub-strand.",
    "no_mapping": "No matching sub-strand in the curriculum.",
    "rejected_invented": "The AI suggested a curriculum entry that does not exist - discarded.",
    "grade_differs": "Mapped to a different grade than the rest of the document.",
    "no_answer": "No answer or marking scheme found for this question.",
    "needs_figure": "Uses a diagram, table or graph - check the cut-out image.",
    "figure_missing": "Uses a diagram, table or graph that could not be cut out - check the page.",
    "text_unverified": "The text could not be found on the stated page - check it.",
    "from_scan": "Read from a scanned page - compare the wording with the page.",
    "unknown_learning_area": "Could not tell the learning area - set it on the resource and analyse again.",
}

READ_SYSTEM = (
    "You extract assessment content from Kenyan CBC/CBE school documents, including "
    "scanned pages. You copy text exactly as printed - you never write, complete, "
    "improve or invent questions or answers. Reply with JSON only."
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


# ── reading pages ───────────────────────────────────────────────────────────

def page_info(page):
    """What a page holds, and whether the model needs to see it as an image."""
    text = page.get_text("text") or ""
    images = len(page.get_images(full=False))
    try:
        drawings = len(page.get_drawings())
    except Exception:
        drawings = 0
    scanned = len(_norm(text)) < SCAN_TEXT_MIN and (images > 0 or drawings > 0 or not text.strip())
    tables = False
    if not (scanned or images or drawings > 20) and drawings > 4:
        try:   # ruled tables are drawn lines; only look when there are some
            tables = bool(page.find_tables().tables)
        except Exception:
            tables = False
    visual = scanned or images > 0 or drawings > 20 or tables
    return {"page": page.number + 1, "text": text[:9000], "scanned": scanned,
            "visual": visual, "images": images, "drawings": drawings}


def render_png(page, dpi=RENDER_DPI, clip=None) -> bytes:
    return page.get_pixmap(dpi=dpi, clip=clip).tobytes("png")


def _windows(total):
    """Page windows of PAGES_PER_CALL that overlap by one page."""
    step = max(1, PAGES_PER_CALL - 1)
    start = 0
    while start < total:
        yield list(range(start, min(start + PAGES_PER_CALL, total)))
        if start + PAGES_PER_CALL >= total:
            break
        start += step


def _read_prompt(infos, resource):
    hint = []
    if resource.grade:
        hint.append(f"The uploader says grade {resource.grade}.")
    if resource.subject_id:
        hint.append(f"The uploader says learning area: {resource.subject.name}.")
    imaged = [i["page"] for i in infos if i["visual"]]
    body = []
    for i in infos:
        if i["scanned"]:
            body.append(f"=== PAGE {i['page']} === (scanned - read it from the attached image of page {i['page']})")
        else:
            note = " (an image of this page is attached - use it for diagrams, tables and maths notation)" if i["visual"] else ""
            body.append(f"=== PAGE {i['page']} ==={note}\n{i['text']}")
    images_note = (f"Images attached, in order: pages {', '.join(map(str, imaged))}.\n" if imaged else "")
    return f"""Below are pages from a PDF titled "{resource.title}". {' '.join(hint)}
{images_note}
Split the content into blocks and label each one:
  question        - something a learner must answer (sub-parts as separate items, e.g. "3(a)")
  worked_example  - a question shown together with its solution, for teaching
  answer_key      - an answer to a numbered question, from an answers or marking-scheme section
Skip notes, explanations, instructions and headings. Copy question and answer text
EXACTLY as printed - for scanned pages, transcribe exactly what you see. Write maths
in plain text or LaTeX ($...$). If a question continues onto the next page, include
all of it under the page where it starts.

When a question needs a diagram, table, graph or picture to be answered, give
"figure_box": the region of that page holding the figure, as fractions of the page
width and height [left, top, right, bottom], e.g. [0.1, 0.42, 0.9, 0.7]. Use null if
there is no figure or you cannot see it.

Return JSON:
{{"document": {{"grade_guess": <integer or null>, "learning_area_guess": "<name or null>"}},
  "items": [
    {{"page": <page number>, "label": "<question number as printed>",
      "kind": "question|worked_example|answer_key",
      "text": "<exact text>", "options": ["<A. ...>", ...],
      "answer": "<exact answer if printed with it, else null>",
      "marks": <integer or null>, "question_type": "mcq|short_answer|structured|essay|calculation",
      "refers_to_figure": <true|false>, "figure_box": [l, t, r, b] or null}}
  ]}}

{chr(10).join(body)}"""


def _label_key(label):
    return _norm(label)


def _valid_box(box):
    try:
        l, t, r, b = (float(x) for x in box)
    except (TypeError, ValueError):
        return None
    l, t, r, b = max(0, l), max(0, t), min(1, r), min(1, b)
    if r - l < 0.05 or b - t < 0.03:
        return None
    return l, t, r, b


def _fallback_figure_rect(page, question_text, next_text):
    """The pictures and drawings between this question and the next one."""
    import fitz
    pr = page.rect
    words = " ".join((question_text or "").split()[:6])
    hits = page.search_for(words) if words else []
    top = hits[0].y0 if hits else pr.y0
    bottom = pr.y1
    if next_text:
        nwords = " ".join(next_text.split()[:6])
        nh = [h for h in page.search_for(nwords) if h.y0 > top] if nwords else []
        if nh:
            bottom = nh[0].y0
    band = fitz.Rect(pr.x0, top, pr.x1, bottom)
    shapes = []
    for img in page.get_image_info():
        r = fitz.Rect(img["bbox"])
        if r.intersects(band):
            shapes.append(r & band)
    try:
        for d in page.get_drawings():
            r = fitz.Rect(d["rect"])
            if r.intersects(band) and r.width * r.height > 4:
                shapes.append(r & band)
    except Exception:
        pass
    if not shapes:
        return None
    u = shapes[0]
    for r in shapes[1:]:
        u |= r
    if u.width < 30 or u.height < 20:
        return None
    return (u + (-8, -8, 8, 8)) & pr


def cut_figure(doc, q, next_text=None):
    """PNG of the figure a question needs, or None."""
    import fitz
    if not q.get("refers_to_figure") or not q.get("page"):
        return None
    try:
        page = doc[q["page"] - 1]
    except (IndexError, ValueError):
        return None
    pr = page.rect
    rect = None
    box = _valid_box(q.get("figure_box")) if q.get("figure_box") else None
    if box:
        l, t, r, b = box
        rect = fitz.Rect(pr.x0 + l * pr.width, pr.y0 + t * pr.height,
                         pr.x0 + r * pr.width, pr.y0 + b * pr.height)
    elif not q.get("from_scan"):
        rect = _fallback_figure_rect(page, q["text"], next_text)
    if rect is None:
        return None
    return render_png(page, dpi=FIGURE_DPI, clip=rect)


def extract_questions(doc, resource, *, user=None, progress=None):
    """Pass 1 over every page. Returns (questions, document_guess, scanned_count)."""
    infos = [page_info(p) for p in doc]
    scanned = sum(1 for i in infos if i["scanned"])
    found, answers, guesses, seen = [], {}, [], set()

    for window in _windows(len(infos)):
        chunk = [infos[i] for i in window]
        if not any(i["text"].strip() or i["visual"] for i in chunk):
            if progress:
                progress(window[-1] + 1)
            continue
        images = [render_png(doc[i["page"] - 1]) for i in chunk if i["visual"]]
        out = generate_json(_read_prompt(chunk, resource), READ_SYSTEM, max_tokens=12000,
                            task="library_extract_read", user=user, images=images or None)
        if isinstance(out, dict):
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
                    page = it.get("page") if isinstance(it.get("page"), int) else 0
                    key = (page, _norm(text)[:80])
                    if key in seen:            # the overlapping page, read twice
                        continue
                    seen.add(key)
                    found.append(it)
        if progress:
            progress(window[-1] + 1)

    by_page = {i["page"]: i for i in infos}
    found.sort(key=lambda it: (it.get("page") or 0))
    questions = []
    for n, it in enumerate(found):
        page = it.get("page") if isinstance(it.get("page"), int) else 0
        info = by_page.get(page)
        from_scan = bool(info and info["scanned"])
        answer = (it.get("answer") or "").strip() or answers.get(_label_key(it.get("label")), "")
        questions.append({
            "page": page,
            "label": str(it.get("label") or "")[:40],
            "order": n,
            "text": it["text"].strip(),
            "answer": answer,
            "options": [str(o) for o in (it.get("options") or [])][:8],
            "marks": it.get("marks") if isinstance(it.get("marks"), int) else None,
            "question_type": str(it.get("question_type") or "")[:20],
            "refers_to_figure": bool(it.get("refers_to_figure")),
            "figure_box": it.get("figure_box"),
            "from_scan": from_scan,
            "text_verified": bool(info) and not from_scan and _found_on_page(it["text"], info["text"]),
        })

    doc_guess = {}
    grades = [g.get("grade_guess") for g in guesses if isinstance(g.get("grade_guess"), int)]
    areas = [g.get("learning_area_guess") for g in guesses if g.get("learning_area_guess")]
    if grades:
        doc_guess["grade_guess"] = max(set(grades), key=grades.count)
    if areas:
        doc_guess["learning_area_guess"] = max(set(areas), key=areas.count)
    return questions, doc_guess, scanned


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
            sub = valid.get(_sid(raw_sid))
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

def is_stale(run):
    return run.status in (ExtractionRun.QUEUED, ExtractionRun.RUNNING) and \
        run.updated_at and timezone.now() - run.updated_at > STALE_AFTER


def run_extraction(run_id):
    import fitz

    run = ExtractionRun.objects.select_related("resource", "resource__subject").get(pk=run_id)
    resource = run.resource
    user = run.started_by
    run.status = ExtractionRun.RUNNING
    run.save(update_fields=["status", "updated_at"])
    try:
        with resource.file.open("rb") as fh:
            data = fh.read()
        with fitz.open(stream=data, filetype="pdf") as doc:
            run.pages_total = doc.page_count
            run.save(update_fields=["pages_total", "updated_at"])

            def progress(n):
                ExtractionRun.objects.filter(pk=run.pk).update(pages_read=n, updated_at=timezone.now())

            questions, guess, scanned = extract_questions(doc, resource, user=user, progress=progress)
            run.pages_read = doc.page_count
            run.scanned_pages = scanned
            notes = []
            if scanned:
                notes.append(f"{scanned} scanned page{'s' if scanned != 1 else ''} read from the page image - "
                             "compare those questions' wording with the PDF.")

            subject = resolve_subject(resource, guess)
            grade = resource.grade or guess.get("grade_guess")
            guess["learning_area"] = subject.name if subject else None
            guess["grade_used"] = grade

            for idx, q in enumerate(questions):
                q["flags"] = []
                if not q["answer"]:
                    q["flags"].append("no_answer")
                if q["from_scan"]:
                    q["flags"].append("from_scan")
                elif not q["text_verified"]:
                    q["flags"].append("text_unverified")
                q["figure_png"] = None
                if q["refers_to_figure"]:
                    nxt = questions[idx + 1] if idx + 1 < len(questions) else None
                    next_text = nxt["text"] if nxt and nxt["page"] == q["page"] else None
                    try:
                        q["figure_png"] = cut_figure(doc, q, next_text)
                    except Exception:
                        logger.exception("figure cut failed (run %s, page %s)", run_id, q["page"])
                    q["flags"].append("needs_figure" if q["figure_png"] else "figure_missing")

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
        for q in questions:
            eq = ExtractedQuestion(
                run=run, resource=resource, page=q["page"], label=q["label"], order=q["order"],
                original_text=q["text"], original_answer=q["answer"], options=q["options"],
                marks=q["marks"], question_type=q["question_type"],
                refers_to_figure=q["refers_to_figure"], text_verified=q["text_verified"],
                from_scan=q["from_scan"],
                proposed_substrand=q.get("proposed_substrand"), proposed_topic=q.get("proposed_topic"),
                confidence=q.get("confidence", 0), alternatives=q.get("alternatives", []),
                reason=q.get("reason", ""), flags=sorted(set(q["flags"])),
            )
            if q.get("figure_png"):
                eq.figure.save(f"r{resource.id}-p{q['page']}-q{q['order']}.png",
                               ContentFile(q["figure_png"]), save=False)
            eq.save()
        if not questions:
            notes.append("No questions were found in this document.")
        run.document_guess, run.notes = guess, notes
        run.status = ExtractionRun.DONE
    except Exception as e:
        logger.exception("library extraction failed (run %s)", run_id)
        run.status = ExtractionRun.FAILED
        run.error = f"{type(e).__name__}: {e}"[:500]
    run.finished_at = timezone.now()
    run.save()
    return run


def start_extraction(resource, user):
    # A run cut off by a restart never finishes; let it be replaced.
    for old in resource.extraction_runs.filter(status__in=[ExtractionRun.QUEUED, ExtractionRun.RUNNING]):
        if is_stale(old):
            old.status, old.error = ExtractionRun.FAILED, "Stopped before finishing (server restarted)."
            old.save(update_fields=["status", "error", "updated_at"])
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
