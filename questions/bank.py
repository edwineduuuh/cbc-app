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
    qs = BankQuestion.objects.filter(substrand__in=subs, status=BankQuestion.OK)
    if teacher is not None and getattr(teacher, "pk", None):
        used = BankUse.objects.filter(teacher=teacher).values("question_id")
        qs = qs.exclude(pk__in=used)
    pool = list(qs.only("id", "substrand_id", "qtype", "has_figure", "times_used", "data"))
    random.shuffle(pool)
    pool.sort(key=lambda b: b.times_used)          # least used first

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
