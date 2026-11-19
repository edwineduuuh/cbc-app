"""Schemes of work, lesson plans and records of work, built on the KICD designs.

What is decided by code, from the curriculum tables, and never by the model:
  - which sub-strands a term covers, in what order, in which week and lesson
    (from each sub-strand's KICD "suggested duration");
  - the quick-check questions (from the vetted StadiSpace question bank);
  - that a lesson plan's timings add up to the lesson length.

What the model writes, from that sub-strand's KICD outcomes and experiences:
  - how a sub-strand's outcomes and experiences split across its lessons;
  - the steps of a lesson.

If the model is unavailable, a scheme is still produced: the KICD outcomes
and experiences are shared out across the lessons by code.
"""
from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from django.core.cache import caches
from django.db.models import Count

from .generation import generate_json
from .models import Question, Substrand, Topic

logger = logging.getLogger("generation")

DEFAULT_LESSONS = 2          # a sub-strand with no suggested duration
BREAKDOWN_VERSION = 2        # bump to invalidate cached lesson breakdowns
ASSESSMENT_DEFAULT = ["Oral questions", "Observation", "Written exercise"]


# ── curriculum order ────────────────────────────────────────────────────────

def _code_key(code):
    """'2.10' sorts after '2.9'."""
    return tuple(int(x) for x in re.findall(r"\d+", code or "")) or (999,)


def ordered_substrands(grade, subject_id, strand_ids=None):
    qs = (Substrand.objects.select_related("topic", "topic__subject")
          .filter(topic__grade=grade, topic__subject_id=subject_id)
          .exclude(learning_outcomes=[]))
    if strand_ids:
        qs = qs.filter(topic_id__in=strand_ids)
    return sorted(qs, key=lambda s: (_code_key(s.topic.kicd_code), s.topic.order or 0, s.topic.name,
                                     _code_key(s.kicd_code), s.order or 0, s.name))


def lessons_for(s, default=DEFAULT_LESSONS) -> int:
    m = re.search(r"\d+", s.suggested_duration or "")
    return max(1, int(m.group())) if m else default


def clean_name(name: str) -> str:
    """A few KICD imports glued the sub-strand's description onto its name
    ('Integers Simple and combined operations on Integers'). Show the name."""
    words = (name or "").split()
    if len(words) > 4 and words[-1].lower() == words[0].lower():
        return words[0]
    return name or ""


def _clean_list(items):
    """KICD lists sometimes open with a heading line ('Core Competencies to be
    developed:'). Drop those."""
    out = []
    for x in items or []:
        t = x if isinstance(x, str) else (x.get("text") or x.get("outcome") or "") if isinstance(x, dict) else str(x)
        t = t.strip()
        if t and not t.endswith(":"):
            out.append(t)
    return out


# ── the term plan (pure code) ───────────────────────────────────────────────

def _fit(stream, target):
    """Give each sub-strand a share of `target` lessons in proportion to what
    KICD suggests for it - stretching when the term has room, squeezing when it
    has not - with every sub-strand keeping at least one lesson."""
    groups = []
    for s, k, n in stream:
        if not groups or groups[-1][0].id != s.id:
            groups.append([s, 0])
        groups[-1][1] += 1
    if not groups or target <= 0:
        return []
    total = sum(g[1] for g in groups)
    exact = [g[1] * target / total for g in groups]
    alloc = [max(1, int(x)) for x in exact]
    # Hand out what rounding down left over, largest remainders first.
    order = sorted(range(len(groups)), key=lambda i: exact[i] - int(exact[i]), reverse=True)
    i = 0
    while sum(alloc) < target and order:
        alloc[order[i % len(order)]] += 1
        i += 1
    while sum(alloc) > target:
        j = max(range(len(alloc)), key=lambda x: alloc[x])
        if alloc[j] == 1:
            break
        alloc[j] -= 1
    out = []
    for (s, _), a in zip(groups, alloc):
        out += [(s, k, a) for k in range(1, a + 1)]
    return out[:target]


def plan_term(subs, *, weeks, lessons_per_week, term=1, break_weeks=None, whole_subject=False,
              first_week=1, reserve=0):
    """Lay the sub-strands out over the term's lesson slots.

    whole_subject: the design is a year's work, so term N takes the Nth third
    of it - term 2 starts where term 1 ended.
    Returns (rows, warnings). A row is a lesson slot, or a break week.
    """
    break_weeks = {int(k): v for k, v in (break_weeks or {}).items()}
    week_numbers = list(range(first_week, first_week + weeks))   # as the school numbers them
    teaching = [w for w in week_numbers if w not in break_weeks]
    capacity = len(teaching) * lessons_per_week
    warnings = []

    # A sub-strand missing its suggested duration gets its siblings' average,
    # not a token two lessons.
    known = [lessons_for(s, 0) for s in subs if lessons_for(s, 0)]
    default = round(sum(known) / len(known)) if known else DEFAULT_LESSONS
    stream = []                                  # (substrand, lesson k of n)
    for s in subs:
        n = lessons_for(s, default)
        stream += [(s, k, n) for k in range(1, n + 1)]
    if whole_subject and stream:
        t = min(max(int(term or 1), 1), 3)
        a, b = round(len(stream) * (t - 1) / 3), round(len(stream) * t / 3)
        stream = stream[a:b]

    # Revision / exam lessons only when the teacher asked for them.
    reserve = max(0, min(int(reserve or 0), capacity))
    target = capacity - reserve
    if len(stream) > target:
        warnings.append(f"The curriculum suggests {len(stream)} lessons for this but the term has "
                        f"{target}. Each sub-strand was given fewer lessons to fit - "
                        f"consider ticking fewer strands.")
    stream = _fit(stream, target) if stream else []
    rows, i = [], 0
    for w in week_numbers:
        if w in break_weeks:
            rows.append({"week": w, "break": break_weeks[w] or "No lessons"})
            continue
        for lesson in range(1, lessons_per_week + 1):
            if i < len(stream):
                s, k, n = stream[i]
                rows.append({"week": w, "lesson": lesson, "substrand_id": s.id,
                             "strand": s.topic.name, "substrand": clean_name(s.name),
                             "strand_code": s.topic.kicd_code or "",
                             "kicd_code": s.kicd_code or "", "part": k, "of": n})
            else:
                # Reserved slots at the end: revision, then an end-of-term assessment.
                last = (i == capacity - 1)
                rows.append({"week": w, "lesson": lesson, "substrand_id": None,
                             "strand": "", "substrand": "End-of-term assessment" if last else "Revision",
                             "kicd_code": "", "part": 0, "of": 0})
            i += 1
    return rows, warnings


# ── per-lesson detail for a sub-strand ──────────────────────────────────────

BREAKDOWN_SYSTEM = (
    "You are a Kenyan CBE curriculum specialist. You split one sub-strand of the "
    "official KICD curriculum design into lessons for a scheme of work. Every outcome "
    "and experience you write must come from the design you are given - you do not add "
    "content that is not in it. Reply with JSON only."
)


def _breakdown_prompt(s, n, notes=""):
    def lines(xs):
        return "\n".join(f"- {x}" for x in xs) or "- (none listed)"
    return f"""Grade {s.topic.grade} {s.topic.subject.name}
Strand: {s.topic.kicd_code or ''} {s.topic.name}
Sub-strand: {s.kicd_code or ''} {clean_name(s.name)} ({n} lessons)

KICD specific learning outcomes:
{lines(_clean_list(s.learning_outcomes))}

KICD suggested learning experiences:
{lines(_clean_list(s.learning_experiences))}

KICD key inquiry questions:
{lines(_clean_list(s.inquiry_questions))}

KICD suggested resources:
{lines(_clean_list(s.resources))}

{("About this class (adapt the activities and resources to it, never the outcomes): " + notes) if notes else ""}
Split this sub-strand into exactly {n} lessons, in teaching order, the way an
experienced Kenyan teacher writes a scheme of work:
- Every KICD outcome and experience is covered, and the lessons build from simple
  to applied. With more lessons than outcomes, break each outcome into smaller
  steps (e.g. addition and subtraction first, then multiplication, then division,
  then order of operations, then real-life use).
- If there are 3 or more lessons, the LAST lesson consolidates the sub-strand:
  learners review it and do an assessment task (quiz, self-assessment).
For each lesson give:
  outcomes     - 1 to 3 outcomes completing "By the end of the lesson, the learner
                 should be able to:", lower-case verb first (e.g. "perform division of
                 integers accurately"). Never repeat that lead-in.
  experiences  - 2 to 3 activities completing "The learner is guided to:", lower-case
                 verb first (e.g. "discuss with peers ...", "play games involving ...").
                 Never repeat that lead-in.
  inquiry_question - one of the KICD key inquiry questions above, word for word
  resources    - start with "Learner's course book" and "Teacher's guide", then 1 or 2
                 that fit the lesson (Charts, Number cards, Realia, Pictures,
                 Digital devices, ...)
  assessment   - exactly 2 methods, varied across lessons, from: Written exercise,
                 Oral questions, Observation, Peer assessment, Self-assessment, Quiz,
                 Practical task, Checklist

Return JSON: {{"lessons": [{{"outcomes": [...], "experiences": [...], "inquiry_question": "...",
  "resources": [...], "assessment": [...]}}]}}"""


def _fallback_breakdown(s, n):
    """No model: share the KICD lists out across the lessons by code."""
    outs = _clean_list(s.learning_outcomes) or [f"learn about {s.name.lower()}"]
    exps = _clean_list(s.learning_experiences) or ["discuss in groups", "do a class activity"]
    kiq = _clean_list(s.inquiry_questions)
    res = _clean_list(s.resources)
    lessons = []
    for k in range(n):
        lessons.append({
            "outcomes": [outs[j] for j in range(len(outs)) if j % n == k] or [outs[k % len(outs)]],
        # (fallback resources/assessment below follow the usual scheme format)
            "experiences": [exps[j] for j in range(len(exps)) if j % n == k] or [exps[k % len(exps)]],
            "inquiry_question": kiq[k % len(kiq)] if kiq else "",
            "resources": ["Learner's course book", "Teacher's guide"] + res[:2],
            "assessment": [ASSESSMENT_DEFAULT[k % 3], ASSESSMENT_DEFAULT[(k + 1) % 3]],
        })
    return lessons


def _valid_lessons(data, n):
    rows = (data or {}).get("lessons") if isinstance(data, dict) else None
    if not isinstance(rows, list) or len(rows) != n:
        return None
    out = []
    for r in rows:
        if not isinstance(r, dict):
            return None
        out.append({
            "outcomes": [str(x).strip() for x in (r.get("outcomes") or []) if str(x).strip()][:4],
            "experiences": [str(x).strip() for x in (r.get("experiences") or []) if str(x).strip()][:5],
            "inquiry_question": str(r.get("inquiry_question") or "").strip(),
            "resources": [str(x).strip() for x in (r.get("resources") or []) if str(x).strip()][:5],
            "assessment": [str(x).strip() for x in (r.get("assessment") or []) if str(x).strip()][:4],
        })
        if not out[-1]["outcomes"]:
            return None
    return out


def _cache_key(s, n):
    return f"studio:breakdown:v{BREAKDOWN_VERSION}:{s.id}:{n}"


def cached_breakdown(s, n):
    try:
        return caches["grades"].get(_cache_key(s, n))
    except Exception:
        return None


def ai_breakdown(s, n, *, user=None, notes=""):
    """Model-written lessons, or None. Safe to run in a worker thread."""
    try:
        data = generate_json(_breakdown_prompt(s, n, notes), BREAKDOWN_SYSTEM, max_tokens=900 + 450 * n,
                             task="studio-scheme", user=user)
        return _valid_lessons(data, n)
    except Exception as e:
        logger.warning("scheme breakdown failed for substrand %s: %s", s.id, e)
        return None


def lesson_breakdown(s, n, *, user=None, lessons=None, notes=""):
    """The n lessons of sub-strand s. Cached and shared: once any teacher has
    planned this sub-strand in n lessons, the next one gets it instantly.
    A teacher's own notes make it personal, so it neither reads nor writes
    the shared cache."""
    hit = None if notes else cached_breakdown(s, n)
    if hit:
        return hit, "cache"
    if lessons is None:
        lessons = ai_breakdown(s, n, user=user, notes=notes)
    if not lessons:
        return _fallback_breakdown(s, n), "kicd"
    if notes:
        return lessons, "ai"
    try:
        caches["grades"].set(_cache_key(s, n), lessons, None)
    except Exception:
        pass
    return lessons, "ai"


def practice_counts(sub_ids):
    return dict(Question.objects.filter(substrand_id__in=sub_ids)
                .values("substrand_id").annotate(n=Count("id")).values_list("substrand_id", "n"))


def build_scheme(inputs, *, user=None):
    subs = ordered_substrands(inputs["grade"], inputs["subject"], inputs.get("strands"))
    if not subs:
        raise ValueError("No sub-strands with KICD outcomes for this selection.")
    rows, warnings = plan_term(
        subs, weeks=inputs["weeks"], lessons_per_week=inputs["lessons_per_week"],
        term=inputs.get("term", 1), break_weeks=inputs.get("break_weeks"),
        whole_subject=not inputs.get("strands"), first_week=inputs.get("first_week") or 1,
        reserve=inputs.get("reserve") or 0)
    notes = (inputs.get("notes") or "").strip()

    needed = {}                                  # substrand id -> n lessons used
    for r in rows:
        if r.get("substrand_id"):
            needed[r["substrand_id"]] = r["of"]
    by_id = {s.id: s for s in subs}
    # Cache lookups here; only the model calls run in parallel workers.
    misses = [sid for sid in needed if notes or not cached_breakdown(by_id[sid], needed[sid])]
    written = {}
    if misses:
        def one(sid):
            from django.db import connection
            try:
                return sid, ai_breakdown(by_id[sid], needed[sid], user=user, notes=notes)
            finally:
                connection.close()
        with ThreadPoolExecutor(max_workers=min(8, len(misses))) as pool:
            written = dict(pool.map(one, misses))
    details = {sid: lesson_breakdown(by_id[sid], needed[sid], user=user, notes=notes,
                                     lessons=(written.get(sid) or []) if sid in misses else None)
               for sid in needed}

    used_fallback = any(src == "kicd" for _, src in details.values())
    practice = practice_counts(list(needed))
    monday = _parse_date(inputs.get("start_date"))
    for r in rows:
        if monday:
            ws = monday + timedelta(weeks=r["week"] - (inputs.get("first_week") or 1))
            r["dates"] = f"{ws:%d %b} - {ws + timedelta(days=4):%d %b}"
        sid = r.get("substrand_id")
        if not sid:
            if "break" not in r:
                r.update({"outcomes": ["revise the work covered this term"] if r["substrand"] == "Revision"
                          else ["demonstrate what they have learnt this term"],
                          "experiences": [], "inquiry_question": "", "resources": [],
                          "assessment": ["Written test"] if r["substrand"] != "Revision" else ["Oral questions"],
                          "remarks": ""})
            continue
        lessons, _ = details[sid]
        L = lessons[r["part"] - 1]
        r.update({**L, "remarks": "", "practice_questions": practice.get(sid, 0)})
    if used_fallback:
        warnings.append("Some lessons were laid out straight from the KICD design because the "
                        "writing assistant was unavailable - edit them as you like.")

    s0 = subs[0]
    return {
        "kind": "scheme_of_work",
        "title": f"Grade {s0.topic.grade} {s0.topic.subject.name} - Term {inputs.get('term', 1)} Scheme of Work",
        "meta": {k: inputs.get(k) for k in ("school", "teacher", "class_name", "term", "year",
                                            "weeks", "lessons_per_week", "start_date", "first_week")}
                | {"grade": s0.topic.grade, "subject": s0.topic.subject.name},
        "rows": rows,
        "warnings": warnings,
        "covers": ", ".join(dict.fromkeys(r["strand"] for r in rows if r.get("strand"))),
    }


def _parse_date(v):
    try:
        return date.fromisoformat(str(v)) if v else None
    except ValueError:
        return None


# ── lesson plan ─────────────────────────────────────────────────────────────

PLAN_SYSTEM = (
    "You are an experienced Kenyan CBE teacher writing a lesson plan in the KICD "
    "format. You ground every outcome in the curriculum design you are given and "
    "write practical, learner-centred steps for a real Kenyan classroom. Reply with JSON only."
)


def _plan_prompt(s, inputs, scheme_row):
    focus = (inputs.get("focus") or "").strip()
    row = ""
    if scheme_row:
        row = ("\nThis lesson comes from the teacher's scheme of work, which planned:\n"
               f"- outcomes: {'; '.join(scheme_row.get('outcomes') or [])}\n"
               f"- experiences: {'; '.join(scheme_row.get('experiences') or [])}\n"
               f"- inquiry question: {scheme_row.get('inquiry_question') or ''}\n")
    def lines(xs):
        return "\n".join(f"- {x}" for x in xs) or "- (none listed)"
    return f"""Grade {s.topic.grade} {s.topic.subject.name} - a {inputs['minutes']}-minute lesson.
Strand: {s.topic.name}
Sub-strand: {s.name}
{row}
KICD specific learning outcomes for the sub-strand:
{lines(_clean_list(s.learning_outcomes))}

KICD suggested learning experiences:
{lines(_clean_list(s.learning_experiences))}

KICD key inquiry questions:
{lines(_clean_list(s.inquiry_questions))}

KICD core competencies: {'; '.join(_clean_list(s.core_competencies)[:4]) or '(not listed)'}
KICD values: {'; '.join(_clean_list(s.values)[:4]) or '(not listed)'}
KICD pertinent and contemporary issues: {'; '.join(_clean_list(s.pertinent_issues)[:4]) or '(not listed)'}
KICD suggested resources: {'; '.join(_clean_list(s.resources)[:6]) or '(not listed)'}
{f'The teacher says: {focus}' if focus else ''}

Write ONE lesson. Its outcomes must be a lesson-sized part of the KICD outcomes above
(knowledge, skill and attitude where they fit). Steps must be things learners DO.
Give minutes for every part.

Return JSON:
{{"outcomes": ["..."], "inquiry_questions": ["..."], "resources": ["..."],
  "competencies": ["<competency>: <how this lesson develops it>"], "values": ["..."],
  "pcis": ["..."], "links": ["<other learning area>"],
  "introduction": {{"minutes": n, "teacher": "...", "learners": "..."}},
  "development": [{{"title": "Step 1: ...", "minutes": n, "teacher": "...", "learners": "..."}}],
  "conclusion": {{"minutes": n, "teacher": "...", "learners": "..."}},
  "differentiation": {{"support": "...", "extension": "..."}},
  "extended_activity": "...", "assessment": ["..."]}}"""


def fix_timings(plan, minutes):
    """Make the parts add up to the lesson length exactly - by code, not trust."""
    parts = [plan.get("introduction") or {}] + list(plan.get("development") or []) + [plan.get("conclusion") or {}]
    raw = []
    for p in parts:
        try:
            raw.append(max(1, int(float(p.get("minutes") or 0))))
        except (TypeError, ValueError):
            raw.append(1)
    total = sum(raw) or 1
    scaled = [max(1, round(m * minutes / total)) for m in raw]
    diff = minutes - sum(scaled)
    # Put any rounding difference into the longest development step.
    dev_idx = list(range(1, len(parts) - 1)) or [0]
    j = max(dev_idx, key=lambda i: scaled[i])
    scaled[j] = max(1, scaled[j] + diff)
    for p, m in zip(parts, scaled):
        p["minutes"] = m
    plan["introduction"], plan["development"], plan["conclusion"] = parts[0], parts[1:-1], parts[-1]
    return plan


def quick_check(s, n=3):
    """Vetted bank questions for the end of the lesson - never invented."""
    out = []
    qs = Question.objects.filter(substrand=s)
    if not qs.exists():
        # Many bank questions are filed under the strand only.
        qs = Question.objects.filter(topic=s.topic, substrand__isnull=True)
    for q in qs.order_by("?")[:n]:
        ans = q.correct_answer or ""
        if q.question_type == "mcq":
            opts = {k: getattr(q, f"option_{k.lower()}") for k in "ABCD"}
            ans = f"{ans}. {opts.get(str(ans).strip().upper()[:1], '')}".strip(". ")
        out.append({"id": q.id, "question": q.question_text, "answer": ans,
                    "options": [getattr(q, f"option_{k}") for k in "abcd" if getattr(q, f"option_{k}")]})
    return out


def build_lesson_plan(inputs, *, user=None):
    s = Substrand.objects.select_related("topic", "topic__subject").get(pk=inputs["substrand"])
    minutes = int(inputs.get("minutes") or 40)
    data = generate_json(_plan_prompt(s, inputs, inputs.get("scheme_row")), PLAN_SYSTEM,
                         max_tokens=3500, task="studio-lesson-plan", user=user)
    if not isinstance(data, dict) or not data.get("development"):
        raise ValueError("The lesson could not be written. Try again.")
    plan = {k: data.get(k) for k in ("outcomes", "inquiry_questions", "resources", "competencies",
                                     "values", "pcis", "links", "introduction", "development",
                                     "conclusion", "differentiation", "extended_activity", "assessment")}
    fix_timings(plan, minutes)
    plan["quick_check"] = quick_check(s)
    return {
        "kind": "lesson_plan",
        "title": f"{clean_name(s.name)} - Grade {s.topic.grade} {s.topic.subject.name} lesson plan",
        "meta": {k: inputs.get(k) for k in ("school", "teacher", "class_name", "roll", "date",
                                            "term", "week", "lesson")}
                | {"grade": s.topic.grade, "subject": s.topic.subject.name, "minutes": minutes,
                   "strand": s.topic.name, "substrand": clean_name(s.name), "kicd_code": s.kicd_code or "",
                   "strand_code": s.topic.kicd_code or ""},
        "plan": plan,
        "covers": f"{s.topic.name} › {s.name}",
    }


# ── record of work (no AI: instant) ─────────────────────────────────────────

def record_from_rows(rows):
    weeks = {}
    for r in rows:
        w = weeks.setdefault(r["week"], {"week": r["week"], "dates": r.get("dates", ""),
                                         "break": r.get("break"), "rows": []})
        if r.get("break"):
            continue
        weeks[w["week"]]["rows"].append({
            "lesson": r.get("lesson"), "strand": r.get("strand", ""), "substrand": r.get("substrand", ""),
            "work": "; ".join(r.get("outcomes") or []) or r.get("substrand", ""),
            "status": "", "date": "", "remarks": "", "carried_from": None,
        })
    return [weeks[k] for k in sorted(weeks)]


def build_record(inputs, scheme=None):
    meta = {k: inputs.get(k) for k in ("school", "teacher", "tsc_number", "class_name", "start_date")}
    first_week = inputs.get("first_week") or 1
    if scheme is not None:
        first_week = ((scheme.payload or {}).get("meta") or {}).get("first_week") or 1
        p = scheme.payload or {}
        rows = p.get("rows") or []
        meta.update({"grade": (p.get("meta") or {}).get("grade"), "subject": (p.get("meta") or {}).get("subject"),
                     "term": (p.get("meta") or {}).get("term"), "year": (p.get("meta") or {}).get("year")})
        title = (p.get("title") or "Scheme").replace("Scheme of Work", "Record of Work")
    else:
        subs = ordered_substrands(inputs["grade"], inputs["subject"], inputs.get("strands"))
        if not subs:
            raise ValueError("No sub-strands with KICD outcomes for this selection.")
        rows, _ = plan_term(subs, weeks=inputs["weeks"], lessons_per_week=inputs["lessons_per_week"],
                            term=inputs.get("term", 1), break_weeks=inputs.get("break_weeks"),
                            whole_subject=not inputs.get("strands"), first_week=first_week)
        for r in rows:
            r["outcomes"] = []
        s0 = subs[0]
        meta.update({"grade": s0.topic.grade, "subject": s0.topic.subject.name,
                     "term": inputs.get("term"), "year": inputs.get("year")})
        title = f"Grade {s0.topic.grade} {s0.topic.subject.name} - Term {inputs.get('term', 1)} Record of Work"
    monday = _parse_date(inputs.get("start_date"))
    weeks = record_from_rows(rows)
    if monday:
        for w in weeks:
            ws = monday + timedelta(weeks=w["week"] - first_week)
            w["dates"] = f"{ws:%d %b} - {ws + timedelta(days=4):%d %b}"
            w["monday"] = ws.isoformat()
    return {"kind": "record_of_work", "title": title, "meta": meta, "weeks": weeks,
            "covers": ", ".join(dict.fromkeys(r["strand"] for w in weeks for r in w["rows"] if r["strand"]))}
