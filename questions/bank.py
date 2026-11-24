"""The question bank: pay for a good question once, reuse it for ever.

Every question that passes review is saved here exactly as it prints (stem,
options, parts, marking scheme, figure, table), filed under its KICD
sub-strand. A new paper is assembled from the bank first and only the
shortfall is written by the model - so as the bank grows, the cost of a paper
falls towards nothing while the quality stays at the level that wrote it.

A teacher never gets the same bank question twice (BankUse), and a request
the bank cannot know about ("a question on our school farm") is written fresh
- and then banked for the next teacher.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import random
import re

logger = logging.getLogger("generation")

# Keys that describe one paper's copy of a question, not the question itself.
_PAPER_ONLY = ("number", "section", "bank_id")


def fingerprint(q: dict) -> str:
    """Same question, same fingerprint - so the bank never stores it twice."""
    def norm(t):
        return re.sub(r"\s+", " ", str(t or "")).strip().lower()
    core = {
        "t": norm(q.get("question_text")),
        "o": {k: norm(v) for k, v in sorted((q.get("options") or {}).items())},
        "p": [norm(p.get("question_text")) for p in (q.get("parts") or []) if isinstance(p, dict)],
    }
    return hashlib.sha256(json.dumps(core, sort_keys=True).encode("utf-8")).hexdigest()


def _has_figure(q: dict) -> bool:
    d = q.get("diagram")
    return bool(isinstance(d, dict) and (d.get("url") or d.get("pending") or d.get("subject")))


def save_to_bank(questions, *, user=None, model_used: str = "", source: str = "generated") -> int:
    """Bank every reviewed, on-design question. Returns how many were new.

    Never raises: a bank write must not cost a teacher their paper."""
    from questions.models import BankQuestion, Substrand

    saved = 0
    for q in questions or []:
        try:
            if not isinstance(q, dict) or q.get("bank_id"):
                continue                      # already from the bank
            sid = q.get("substrand_id")
            if not sid or q.get("off_design"):
                continue                      # only questions that assess the design
            if q.get("type") == "mcq" and not (q.get("options") and q.get("correct_answer")):
                continue
            if q.get("type") != "mcq" and not q.get("marking_scheme"):
                continue
            data = {k: v for k, v in copy.deepcopy(q).items() if k not in _PAPER_ONLY}
            d = data.get("diagram")
            if isinstance(d, dict) and d.get("pending"):
                continue                      # its picture is not drawn yet
            fp = fingerprint(data)
            if not Substrand.objects.filter(pk=sid).exists():
                continue
            _, created = BankQuestion.objects.get_or_create(
                fingerprint=fp,
                defaults=dict(substrand_id=sid, qtype=data.get("type") or "structured",
                              marks=int(data.get("marks") or 0), has_figure=_has_figure(data),
                              data=data, source=source, created_by=user if getattr(user, "pk", None) else None,
                              model_used=model_used[:60]))
            saved += int(created)
        except Exception as e:                # pragma: no cover - logged, never fatal
            logger.warning("bank save skipped a question: %s", e)
    return saved


# Requests the bank cannot know about are written fresh. Asking only for a
# number of figures, or a mix of question types, is something the bank can
# satisfy, so those words do not count.
_BANKABLE = re.compile(
    r"(?:at\s+least|about|around|exactly)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|an?)"
    r"(?:\s*(?:to|-|–|or)\s*(?:\d+|two|three|four|five|six|seven|eight))?"
    r"\s+(?:\w+\s+){0,2}?(?:diagrams?|figures?|graphs?|pictures?|drawings?|illustrations?|sketch(?:es)?)"
    r"|(?:make|include|add|with|draw|use)\b|please|mostly|mainly|only|all|no|structured|"
    r"multiple[-\s]?choice|mcqs?|questions?|a|the|and|of|some|paper|assessment|standard|test",
    re.I)


def wants_fresh(description: str) -> bool:
    """True when the teacher asked for something specific the bank cannot know."""
    rest = _BANKABLE.sub(" ", description or "")
    words = [w for w in re.findall(r"[A-Za-z]{3,}", rest)]
    return len(words) >= 2


def pick(subs, *, n_mcq: int, n_struct: int, figures: int, teacher=None) -> list[dict]:
    """Questions from the bank for this paper, spread across the sub-strands,
    never one this teacher has had before. May return fewer than asked."""
    from questions.models import BankQuestion, BankUse

    if not subs or (n_mcq + n_struct) <= 0:
        return []
    try:
        sync_handwritten(subs)        # your own questions come in first
    except Exception as e:
        logger.warning("could not sync hand-written questions: %s", e)
    try:
        sync_library(subs)            # approved questions from uploaded PDFs
    except Exception as e:
        logger.warning("could not sync library questions: %s", e)
    qs = BankQuestion.objects.filter(substrand__in=subs, status=BankQuestion.OK)
    if teacher is not None and getattr(teacher, "pk", None):
        used = BankUse.objects.filter(teacher=teacher).values("question_id")
        qs = qs.exclude(pk__in=used)
    pool = list(qs.only("id", "substrand_id", "qtype", "has_figure", "times_used", "data", "source"))
    random.shuffle(pool)
    # Questions you wrote or approved first, then the least used.
    pool.sort(key=lambda b: (b.source not in ("teacher", "library"), b.times_used))

    chosen, per_sub = [], {}
    want = {"mcq": n_mcq, "structured": n_struct}

    def take(cands, limit):
        nonlocal chosen
        # round-robin over sub-strands so the paper covers the design
        order = [s.id for s in subs]
        rounds = 0
        while limit > 0 and cands and rounds < 50:
            rounds += 1
            progressed = False
            for sid in order:
                if limit <= 0:
                    break
                # the next question from this sub-strand of a type still wanted
                b = next((c for c in cands if c.substrand_id == sid and want.get(c.qtype, 0) > 0), None)
                if b is None:
                    continue
                cands.remove(b)
                chosen.append(b)
                want[b.qtype] -= 1
                per_sub[sid] = per_sub.get(sid, 0) + 1
                limit -= 1
                progressed = True
            if not progressed:
                break

    # Figures first (structured preferred), up to the figure quota...
    fig_cands = sorted([b for b in pool if b.has_figure], key=lambda b: b.qtype == "mcq")
    take(fig_cands, figures)
    taken = {b.id for b in chosen}
    # ...then the rest of the paper, without more figures than asked for.
    rest = [b for b in pool if b.id not in taken and not b.has_figure]
    take(rest, sum(want.values()))

    out = []
    for b in chosen:
        q = copy.deepcopy(b.data)
        q["bank_id"] = b.id
        out.append(q)
    return out


def record_use(teacher, questions) -> None:
    """Remember which bank questions a teacher has had, so they never repeat."""
    from django.db.models import F
    from questions.models import BankQuestion, BankUse

    ids = [q.get("bank_id") for q in questions or [] if isinstance(q, dict) and q.get("bank_id")]
    if not ids:
        return
    BankQuestion.objects.filter(pk__in=ids).update(times_used=F("times_used") + 1)
    if teacher is not None and getattr(teacher, "pk", None):
        BankUse.objects.bulk_create([BankUse(teacher=teacher, question_id=i) for i in ids],
                                    ignore_conflicts=True)


# ─────────────────────────────────────────────────────────────
#  Hand-written questions (the question editor) on teachers' papers
# ─────────────────────────────────────────────────────────────
# Types a printed paper can carry. Accounting statements and passage-based
# comprehension need their own layouts, so they stay quiz-only for now.
_PAPER_TYPES = ("mcq", "structured", "math", "fill_blank", "essay", "multipart", "table")


def _scheme(raw, marks: int, answer: str, extra=None) -> list:
    """Any stored marking scheme (or a plain answer) as a paper marking scheme."""
    award = f"Award {marks} mark{'s' if marks != 1 else ''} for a correct answer"
    if isinstance(raw, list) and raw and all(isinstance(g, dict) for g in raw):
        return raw
    if isinstance(raw, dict) and raw.get("points"):
        return [{"part": "", "award": raw.get("award") or award, "marks": marks,
                 "points": [str(p) for p in raw["points"]]}]
    if isinstance(raw, list) and raw:
        return [{"part": "", "award": award, "marks": marks, "points": [str(p) for p in raw]}]
    points = [str(a).strip() for a in ([answer] + list(extra or [])) if str(a or "").strip()]
    return [{"part": "", "award": award, "marks": marks, "points": points}] if points else []


def from_question(q):
    """A hand-written Question as a paper question, or None if it cannot print."""
    if q.question_type not in _PAPER_TYPES or q.passage_id or not q.substrand_id:
        return None
    data = {"substrand_id": q.substrand_id, "question_text": q.question_text or "",
            "bloom_level": q.bloom_level or "", "command_verb": q.command_verb or ""}
    try:
        if q.question_image:
            data["diagram"] = {"url": q.question_image.url, "alt": "Figure for this question"}
    except Exception:
        pass

    if q.question_type == "mcq":
        opts = {k: v for k, v in (("A", q.option_a), ("B", q.option_b),
                                  ("C", q.option_c), ("D", q.option_d)) if (v or "").strip()}
        key = (q.correct_answer or "").strip().upper()[:1]
        if len(opts) < 2 or key not in opts:
            return None
        data.update(type="mcq", marks=1, options=opts, correct_answer=key)
        return data

    marks = max(1, int(q.max_marks or 1))
    data.update(type="structured", marks=marks)

    if q.question_type == "multipart":
        parts, scheme = [], []
        for p in q.parts.all().order_by("part_label"):
            pm = max(1, int(p.max_marks or 1))
            text = p.question_text or ""
            if p.question_type == "mcq":
                text += "".join(f"\n{k}) {v}" for k, v in (("A", p.option_a), ("B", p.option_b),
                                                           ("C", p.option_c), ("D", p.option_d)) if v)
            parts.append({"label": p.part_label, "question_text": text, "marks": pm})
            for g in _scheme(p.marking_scheme, pm, p.correct_answer):
                scheme.append({**g, "part": p.part_label})
        if not parts or not scheme:
            return None
        data.update(parts=parts, marking_scheme=scheme,
                    marks=sum(p["marks"] for p in parts))
        return data

    if q.question_type == "table":
        rows = (q.table_data or {}).get("rows") or []
        if len(rows) < 2:
            return None
        cells = [[("" if c.get("e") else str(c.get("v") or "")) for c in r] for r in rows]
        answers = [str(c.get("a")) for r in rows for c in r if c.get("e") and c.get("a")]
        data["table"] = {"headers": cells[0], "rows": cells[1:]}
        data["marking_scheme"] = _scheme(q.marking_scheme, marks, "", answers)
        return data if data["marking_scheme"] else None

    extra = q.correct_answers if isinstance(q.correct_answers, list) else []
    data["marking_scheme"] = _scheme(q.marking_scheme, marks, q.correct_answer, extra)
    return data if data["marking_scheme"] else None


def sync_handwritten(subs) -> None:
    """Mirror the editor's questions for these sub-strands into the bank, and
    keep each mirror in step with its question (edits, deletions)."""
    from questions.models import BankQuestion, Question

    have = {b.source_question_id: b for b in BankQuestion.objects.filter(
        substrand__in=subs, source="teacher").exclude(source_question=None)}
    for q in (Question.objects.filter(substrand__in=subs)
              .select_related("substrand").prefetch_related("parts")):
        try:
            data = from_question(q)
        except Exception as e:
            logger.warning("question %s could not be banked: %s", q.id, e)
            data = None
        mirror = have.get(q.id)
        if data is None:
            if mirror and mirror.status == BankQuestion.OK:
                mirror.status = BankQuestion.RETIRED
                mirror.save(update_fields=["status"])
            continue
        fields = dict(substrand_id=q.substrand_id, qtype=data["type"], marks=data["marks"],
                      has_figure=_has_figure(data), data=data, status=BankQuestion.OK)
        if mirror is None:
            BankQuestion.objects.create(fingerprint=f"question:{q.id}", source="teacher",
                                        source_question=q, created_by=q.created_by, **fields)
        elif mirror.data != data or mirror.status != BankQuestion.OK:
            for k, v in fields.items():
                setattr(mirror, k, v)
            mirror.save()
    # A question deleted from the editor leaves its mirror behind: retire it.
    BankQuestion.objects.filter(substrand__in=subs, source="teacher",
                                source_question=None).update(status=BankQuestion.RETIRED)


# ─────────────────────────────────────────────────────────────
#  Approved questions from uploaded PDFs (admin Library review)
# ─────────────────────────────────────────────────────────────
_SUBPART = re.compile(r"^\s*(\d+)\s*\(?\s*([a-z]|i{1,3}|iv|v)\s*\)?\s*$", re.I)
_OPT = re.compile(r"^\s*\(?([A-Ha-h])[\).:\-]\s*(.*)$", re.S)


def _options(raw) -> dict:
    """['A. 12', 'B) 14', ...] -> {'A': '12', 'B': '14'}"""
    out = {}
    for i, o in enumerate(raw or []):
        m = _OPT.match(str(o))
        k, v = (m.group(1).upper(), m.group(2).strip()) if m else ("ABCDEFGH"[i], str(o).strip())
        if v:
            out[k] = v
    return out


def _mcq_key(answer: str, opts: dict):
    a = (answer or "").strip()
    m = re.match(r"^\(?([A-Ha-h])\b[\).:]?", a)
    if m and m.group(1).upper() in opts:
        return m.group(1).upper()
    for k, v in opts.items():                       # the answer written out in full
        if a and a.rstrip(".").lower() == v.rstrip(".").lower():
            return k
    return None


def from_extracted(q):
    """One approved PDF question as a paper question, or None if it cannot print
    on its own (no answer, a figure we don't have, an MCQ with no clear key)."""
    text = (q.edited_text or q.original_text or "").strip()
    answer = (q.edited_answer or q.original_answer or "").strip()
    if not text or not q.substrand_id:
        return None
    data = {"substrand_id": q.substrand_id, "question_text": text}
    try:
        if q.figure:
            data["diagram"] = {"url": q.figure.url, "alt": "Figure for this question"}
    except Exception:
        pass
    if q.refers_to_figure and "diagram" not in data:
        return None
    opts = _options(q.options)
    if len(opts) >= 2:
        key = _mcq_key(answer, opts)
        if not key:
            return None
        data.update(type="mcq", marks=1, options=opts, correct_answer=key)
        return data
    if not answer:
        return None
    marks = max(1, int(q.marks or 1))
    data.update(type="structured", marks=marks, marking_scheme=_scheme(None, marks, answer))
    return data


def _group_subparts(items):
    """'3(a)', '3(b)' from the same PDF become one question with parts."""
    groups, out = {}, []
    for q, d in items:
        m = _SUBPART.match(q.label or "")
        if m and d.get("type") == "structured" and "diagram" not in d:
            groups.setdefault((q.resource_id, m.group(1), q.substrand_id), []).append((q, d, m.group(2)))
        else:
            out.append((f"extracted:{q.id}", d))
    for (_res, num, sub), parts in groups.items():
        if len(parts) == 1:
            q, d, _ = parts[0]
            out.append((f"extracted:{q.id}", d))
            continue
        scheme = []
        for _q, d, lab in parts:
            scheme += [{**g, "part": f"({lab})"} for g in d["marking_scheme"]]
        out.append((
            "extracted:" + "+".join(str(q.id) for q, _, _ in parts),
            {"substrand_id": sub, "type": "structured", "question_text": "",
             "parts": [{"label": f"({lab})", "question_text": d["question_text"], "marks": d["marks"]}
                       for _q, d, lab in parts],
             "marking_scheme": scheme, "marks": sum(d["marks"] for _q, d, _ in parts)}))
    return out


def sync_library(subs) -> None:
    """Mirror approved PDF questions for these sub-strands into the bank, and
    retire mirrors whose question was un-approved, re-mapped or edited away."""
    from library.models import approved_question_pool
    from questions.models import BankQuestion

    # Approved, from a resource marked as a generator source, not archived.
    approved = (approved_question_pool().filter(substrand__in=subs)
                .order_by("resource_id", "page", "order"))
    items = []
    for q in approved:
        try:
            d = from_extracted(q)
        except Exception as e:
            logger.warning("extracted question %s could not be banked: %s", q.id, e)
            d = None
        if d:
            items.append((q, d))
    live = set()
    have = {b.fingerprint: b for b in BankQuestion.objects.filter(substrand__in=subs, source="library")}
    for fp, data in _group_subparts(items):
        live.add(fp)
        fields = dict(substrand_id=data["substrand_id"], qtype=data["type"], marks=data["marks"],
                      has_figure=_has_figure(data), data=data, status=BankQuestion.OK)
        b = have.get(fp)
        if b is None:
            BankQuestion.objects.update_or_create(fingerprint=fp, defaults={**fields, "source": "library"})
        elif b.data != data or b.status != BankQuestion.OK:
            for k, v in fields.items():
                setattr(b, k, v)
            b.save()
    stale = [b.pk for fp, b in have.items() if fp not in live and b.status == BankQuestion.OK]
    if stale:
        BankQuestion.objects.filter(pk__in=stale).update(status=BankQuestion.RETIRED)
