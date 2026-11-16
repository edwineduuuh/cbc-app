"""
Parse the official KICD rationalised curriculum designs in kicd_raw/ into one
reviewable JSON file per sub-strand in kicd_parsed/.

    python manage.py ingest_kicd                  # everything not yet parsed
    python manage.py ingest_kicd --only grade8-mathematics
    python manage.py ingest_kicd --force          # re-parse even if JSON exists
    python manage.py ingest_kicd --no-ai          # tier 1 only, zero API calls

WHY JSON AND NOT STRAIGHT TO THE DATABASE
The parser gets tuned many times; re-reading 8,800 PDF pages each round is slow
and the result needs eyeballing. kicd_parsed/ is committed to git, so a parser
change shows up as a readable diff of which outcomes moved, and the curriculum
can be rebuilt on any machine without the copyrighted PDFs.

HOW NOTHING GETS DROPPED SILENTLY
Every content page runs a cascade until something yields valid data:

  tier 1  PyMuPDF find_tables()      free, verbatim cells, handles ~all pages
  tier 2  Gemini Flash-Lite on that page's text     (merged/broken cells)
  tier 3  Gemini Flash vision on a render of it     (scanned/rotated pages)
  tier 4  recorded in kicd_parsed/_unresolved.json and the command exits 1

Validation runs before anything is written: a sub-strand needs a name and at
least one learning outcome that reads like an outcome. Failures are never
written as empty records - they are reported and the exit code is non-zero.
"""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import fitz
from django.conf import settings
from django.core.management.base import BaseCommand

RAW_DIR = Path(settings.BASE_DIR) / "kicd_raw"
OUT_DIR = Path(settings.BASE_DIR) / "kicd_parsed"

TEXT_MODEL = "gemini-2.5-flash-lite"   # tier 2: cheap structured extraction
VISION_MODEL = "gemini-2.5-flash"      # tier 3: only for pages with no text

# ─── column / block recognition ────────────────────────────────────────────
# The Kiswahili and Fasihi designs are written in Kiswahili, so every header
# and stem below carries both wordings. Without this, those files parse to
# nothing at all while looking like a clean run.
H_SUBSTRAND = re.compile(r"sub\s*-?\s*strand|mada\s+ndogo", re.I)
H_STRAND = re.compile(r"\bstrand\b|\bmada\b", re.I)
H_OUTCOMES = re.compile(r"specific\s+learning\s+outcomes?|matokeo\s+maalum", re.I)
H_EXPERIENCES = re.compile(r"learning\s+experiences?|shughuli\s+za\s+ujifunzaji", re.I)
H_INQUIRY = re.compile(r"inquiry\s+question|(swali|maswali)\s+dadisi", re.I)
H_RUBRIC = re.compile(r"exceed\w*\s+expectation|kuzidisha\s+matarajio", re.I)
H_INDICATOR = re.compile(r"level|indicator|vigezo", re.I)

BLOCKS = [
    ("core_competencies", re.compile(r"^core\s+competenc|^umilisi\b", re.I)),
    ("values", re.compile(r"^values?\b|^maadili\b", re.I)),
    ("pertinent_issues", re.compile(
        r"^pertinent\s+and\s+contemporary|^pcis?\b|^masuala\s+mtambuko", re.I)),
    ("links_to_other_areas", re.compile(
        r"^link(s|age)?\s+to\s+other|^uhusiano\b", re.I)),
    ("resources", re.compile(
        r"^suggested\s+(non[- ]formal|resources)|^resources?\b|^nyenzo\b", re.I)),
]

SUBSTRAND_CODE = re.compile(r"^\s*(\d+\.\d+(?:\.\d+)?)\s*(.*)$", re.S)
STRAND_CODE = re.compile(r"^\s*(\d+\.0|\d+\.\d+)?\s*(.*)$", re.S)
# "(6 lessons)" in English designs, "(Vipindi 2)" in Kiswahili ones. Tolerates
# line wrapping inside the brackets and a repeated "lessons lessons" typo that
# appears in some Grade 10 files.
DURATION = re.compile(
    r"\(\s*(?:(\d+)\s*(?:lessons?\s*)+|vipindi\s*(\d+))\s*\)?", re.I)
# a) / b) / (i) / i. / bullet - the ways KICD enumerates outcomes.
# Built from BULLET_CHARS (defined below) so every glyph the designs use counts.
ENUM = None  # assigned once BULLET_CHARS exists
# Stems that introduce a list and are not themselves content.
STEM_OUTCOME = re.compile(
    r"^.*?(?:should\s+be\s+able\s+to|mwanafunzi\s+aweze)\s*:?", re.I | re.S)
STEM_EXPERIENCE = re.compile(
    r"^\s*(?:the\s+learner\s+is\s+guided\s+to|mwanafunzi\s+aelekezwe)\s*:?", re.I)
# Rubric indicator phrasing, used to spot a headerless continuation page.
RUBRIC_INDICATOR_LEAD = re.compile(r"^(ability\s+to|uwezo\s+wa)\b", re.I)
# A bare column heading. If one of these ends up as a strand or sub-strand
# name, a header row was read as data and the record must be rejected.
HEADER_WORD = re.compile(
    r"^(sub\s*-?\s*strand|strand|specific\s+learning\s+outcomes?|"
    r"suggested\s+learning\s+experiences?|learning\s+experiences?|"
    r"(suggested\s+)?key\s+inquiry\s+questions?|inquiry\s+questions?|"
    r"level\s+indicators?|indicators?|s/?no|"
    r"mada(\s+ndogo)?|matokeo(\s+maalum)?|shughuli(\s+za\s+ujifunzaji)?|"
    r"(swali|maswali)\s+dadisi|vigezo)\s*:?\s*$", re.I)


BULLET_CHARS = "•∙●○▪■◦‣·⁃�"
BULLET_RE = re.compile(f"[{BULLET_CHARS}]")
ENUM = re.compile(
    r"(?:^|\n)\s*(?:[a-z]\)|\([a-z]+\)|[ivx]+\.|[-" + BULLET_CHARS + r"])\s+", re.I)


def clean(s):
    """Normalise a raw PDF cell into readable text without losing characters."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    # Designs use several bullet glyphs and PyMuPDF renders some as U+FFFD.
    # Normalise them all to one marker so enumeration splits consistently -
    # the Grade 10 files use U+25CF, which an ASCII-only rule silently misses.
    s = BULLET_RE.sub("\n• ", s)
    # Rejoin words broken across lines ("sub- strand" -> "sub-strand").
    s = re.sub(r"-\s*\n\s*", "-", s)
    s = re.sub(r"-\s+(?=[a-z])", "-", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip(" \n ")


def flatten(s):
    """Collapse the line wrapping a PDF cell imposes on a single sentence."""
    return re.sub(r"[ \t]+", " ", re.sub(r"\s*\n\s*", " ", s)).strip()


def split_items(text):
    """Split an enumerated cell into a list, dropping the stem sentence."""
    text = clean(text)
    if not text:
        return []
    # Drop "By the end of the sub-strand, the learner should be able to:"
    text = STEM_OUTCOME.sub("", text)
    text = STEM_EXPERIENCE.sub("", text)
    parts = [p for p in ENUM.split(text) if p and p.strip()]
    if len(parts) <= 1:
        # No enumeration markers: one wrapped sentence, not one item per line.
        parts = [text]
    out = []
    for p in parts:
        p = flatten(clean(p)).rstrip(" ,;")
        p = re.sub(r"^[a-z]\)\s*", "", p, flags=re.I)
        if len(p) > 3:
            out.append(p)
    return out


def split_questions(text):
    """Key inquiry questions: split on the question mark, not on line breaks."""
    flat = flatten(clean(text))
    if not flat:
        return []
    flat = re.sub(r"^\s*(?:[a-z]\)|\([a-z]+\)|[-•∙])\s+", "", flat, flags=re.I)
    parts = [flatten(q) for q in re.findall(r"[^?]*\?", flat)]
    parts = [q for q in parts if len(q) > 8]
    return parts or ([flat] if len(flat) > 8 else [])


def title_from_cell(cell):
    """Pull a strand / sub-strand title out of its table cell.

    The cell holds the title wrapped over several lines, sometimes followed by
    a bulleted list of sub-topics and a lesson count. Taking the first line
    truncates the title ("1.3 Quadratic Expressions and Equations 1" -> noise);
    taking everything swallows the sub-topic list. So: cut at the first bullet,
    then flatten what remains.
    """
    text = clean(cell or "")
    if not text:
        return ""
    head = BULLET_RE.split(text)[0]
    return flatten(head).strip(" •-–:,;.")


def canonical_strand(p, name):
    """Keep one spelling per strand within a file.

    The designs are inconsistent about capitalisation - "Statistics and
    Probability" on one page, "Statistics and probability" on the next. Those
    are one strand, and letting both through creates two Topic rows with the
    sub-strands split between them.
    """
    if not name:
        return name
    key = name.lower().strip()
    return p.strand_names.setdefault(key, name)


def is_title_like(name):
    """A plausible un-numbered sub-strand title, not a wrapped fragment."""
    words = [w for w in name.split() if re.search(r"[A-Za-z]", w)]
    if len(words) < 1 or not name[:1].isupper():
        return False
    # Fragments are lower-case continuations ("equations to real") or open with
    # a connective.
    if re.match(r"^(and|or|to|of|in|the|a|for|with|as)\b", name, re.I):
        return False
    return True


def looks_like_outcome(s):
    """Guard against header fragments being stored as learning outcomes."""
    s = s.strip()
    if len(s) < 12 or len(s.split()) < 3:
        return False
    if re.match(r"^(strand|sub\s*-?\s*strand|specific|suggested|core|values|level|"
                r"mada|matokeo|shughuli|umilisi|maadili|vigezo)\b", s, re.I):
        return False
    return True


# ─── table classification ──────────────────────────────────────────────────
def header_of(rows):
    return [clean(c or "") for c in rows[0]] if rows else []


def is_substrand_table(rows):
    h = " | ".join(header_of(rows))
    return bool(H_SUBSTRAND.search(h) and H_OUTCOMES.search(h))


def rubric_rows(rows):
    """Return the rubric rows with the header row first.

    Some designs put a title row ("Suggested Assessment Rubric") above the
    column headings, so the real header is the second row.
    """
    if not rows:
        return None
    if H_RUBRIC.search(" | ".join(header_of(rows))):
        return rows
    first = " | ".join(header_of(rows))
    if (re.search(r"assessment\s+rubric|vigezo\s+vya\s+upimaji", first, re.I)
            and len(rows) > 1 and H_RUBRIC.search(" | ".join(
                clean(c or "") for c in rows[1]))):
        return rows[1:]
    return None


def is_rubric_table(rows):
    return rubric_rows(rows) is not None


def looks_like_rubric_body(rows):
    """True if these rows are rubric descriptors, header or not.

    Rubric tables are the same width as the sub-strand table, so without this
    an unrecognised rubric header falls through to the sub-strand continuation
    handler and "Ability to represent integers..." gets stored as a strand.
    """
    hits = 0
    for row in rows[:6]:
        for cell in row[:2]:
            if RUBRIC_INDICATOR_LEAD.match(clean(cell or "")):
                hits += 1
                break
    return hits >= 1


def column_map(header):
    """Map the five design columns to indices, tolerating reordering."""
    idx = {}
    for i, c in enumerate(header):
        # Sub-strand must be tested first: "Mada Ndogo" contains "Mada".
        if H_SUBSTRAND.search(c):
            idx["substrand"] = i
        elif H_STRAND.search(c):
            idx.setdefault("strand", i)
        elif H_OUTCOMES.search(c):
            idx["outcomes"] = i
        elif H_EXPERIENCES.search(c):
            idx["experiences"] = i
        elif H_INQUIRY.search(c):
            idx["inquiry"] = i
    return idx


def block_kind(cell):
    """Identify a full-width block and return its body with the heading removed.

    The heading is either its own line ("Values:") or a prefix of the first
    line ("Pertinent and contemporary issues (PCIs): Self-esteem: as the ...").
    Stripping to the first colon in the whole cell would eat the first item's
    own label ("Citizenship:"), which is part of the content.
    """
    c = clean(cell)
    for key, pat in BLOCKS:
        if pat.match(c):
            lines = c.split("\n")
            head, rest = lines[0], "\n".join(lines[1:])
            after = re.sub(r"^[^:]*:\s*", "", head) if ":" in head else ""
            body = "\n".join(x for x in (after, rest) if x.strip()).strip()
            return key, body or c
    return None, None


# ─── tier 2 / 3: Gemini, only for pages tier 1 could not read ──────────────
_client = None


def gemini():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


AI_PROMPT = """You are extracting data from one page of an official KICD
curriculum design. Return ONLY a JSON array, no prose, no code fence.

Each element describes one sub-strand found on the page:
{"kicd_code": "1.2", "name": "Fractions", "suggested_duration": "6 lessons",
 "learning_outcomes": ["..."], "learning_experiences": ["..."],
 "inquiry_questions": ["..."], "core_competencies": ["..."],
 "values": ["..."], "pertinent_issues": ["..."], "links_to_other_areas": ["..."]}

Rules:
- Copy text VERBATIM from the page. Never paraphrase, summarise or invent.
- Omit a key entirely if that content is not on the page.
- If the page contains no sub-strand at all, return [].
"""


def ai_extract_text(page_text):
    r = gemini().models.generate_content(
        model=TEXT_MODEL,
        contents=f"{AI_PROMPT}\n\n--- PAGE TEXT ---\n{page_text}",
        config={"temperature": 0, "max_output_tokens": 4096,
                "response_mime_type": "application/json"},
    )
    return json.loads(r.text)


def ai_extract_image(page):
    png = page.get_pixmap(dpi=170).tobytes("png")
    from google.genai import types
    r = gemini().models.generate_content(
        model=VISION_MODEL,
        contents=[types.Part.from_bytes(data=png, mime_type="image/png"), AI_PROMPT],
        config={"temperature": 0, "max_output_tokens": 4096,
                "response_mime_type": "application/json"},
    )
    return json.loads(r.text)


# ─── per-file parse ────────────────────────────────────────────────────────
class Parsed:
    def __init__(self, grade, subject, source):
        self.grade = grade
        self.subject = subject
        self.source = source
        self.general_outcomes = []
        self.substrands = []      # list of dicts
        self.rubrics = {}         # strand name -> rubric rows
        self.unresolved = []      # [{page, reason}]
        self.ai_pages = []        # pages that needed tier 2/3
        # Both the sub-strand table and the rubric spill onto following pages
        # without re-emitting their header row, so remember each layout in
        # order to read the continuation. Without this, designs that only
        # print the header once per strand lose almost every page.
        self.last_rubric_cols = None
        self.last_substrand_cols = None
        self.last_substrand_width = 0
        self.in_appendix = False
        # lowercased strand name -> the spelling first seen, so one strand
        # never splits in two over capitalisation.
        self.strand_names = {}

    def current(self):
        return self.substrands[-1] if self.substrands else None


def parse_general_outcomes(doc):
    """The 'SUBJECT GENERAL LEARNING OUTCOMES' page, early in the front matter.

    The table of contents names this section too, and its entries are dotted
    leaders ending in a page number - so TOC pages are excluded outright and
    any surviving leader lines are dropped.
    """
    for page in doc:
        t = page.get_text()
        if re.search(r"table\s+of\s+content", t, re.I):
            continue
        if not re.search(r"^\s*(subject\s+)?general\s+learning\s+outcomes\s*$",
                         t, re.I | re.M):
            continue
        body = re.split(r"general\s+learning\s+outcomes[^\n]*\n", t, flags=re.I)
        if len(body) < 2:
            continue
        # This list is numbered "1. 2. 3." rather than lettered, so split on
        # the numbering here instead of widening ENUM (which would cut
        # decimals apart inside ordinary learning outcomes).
        chunk = flatten(clean(body[1][:6000]))
        numbered = [flatten(x) for x in re.split(r"(?:^|\s)\d+\.\s+", chunk) if x.strip()]
        items = numbered if len(numbered) > 1 else split_items(body[1][:6000])
        keep = [i for i in items
                if looks_like_outcome(i) and "...." not in i
                and not re.search(r"\.{3,}\s*\d+\s*$", i)]
        if keep:
            return keep[:20]
    return []


def new_substrand(p, code, name, duration, page_no):
    p.substrands.append({
        "grade": p.grade,
        "subject": p.subject,
        "strand": p.cur_strand,
        "strand_code": p.cur_strand_code,
        "kicd_code": code,
        "name": name,
        "suggested_duration": duration,
        "learning_outcomes": [],
        "learning_experiences": [],
        "inquiry_questions": [],
        "core_competencies": [],
        "values": [],
        "pertinent_issues": [],
        "links_to_other_areas": [],
        "resources": [],
        "general_outcomes": p.general_outcomes,
        "kicd_source": f"{p.source}#p{page_no}",
    })


def parse_substrand_table(p, rows, page_no):
    idx = column_map(header_of(rows))
    if "substrand" not in idx or "outcomes" not in idx:
        return False
    p.last_substrand_cols = idx
    p.last_substrand_width = max(len(r) for r in rows)
    return parse_substrand_rows(p, rows[1:], idx, page_no)


def parse_substrand_continuation(p, rows, page_no):
    """The sub-strand table continued on a later page with no header row.

    Many designs print the five column headings once per strand and then run
    the table across several pages. Those pages carry a blank first row, so
    they are only readable by reusing the layout from the last real header.
    """
    idx = p.last_substrand_cols
    if not idx or not rows:
        return False
    if abs(max(len(r) for r in rows) - p.last_substrand_width) > 1:
        return False
    # A rubric is the same width as the sub-strand table. Never read one as
    # curriculum - that silently turns level indicators into strands.
    if looks_like_rubric_body(rows):
        return False
    # Must not be a header row we simply failed to recognise.
    if any(clean(c or "") for c in rows[0][:2]) and column_map(header_of(rows)):
        if "outcomes" in column_map(header_of(rows)):
            return False
    return parse_substrand_rows(p, rows, idx, page_no)


def parse_substrand_rows(p, rows, idx, page_no):
    got = False
    for row in rows:
        cells = [clean(c or "") for c in row]
        if not any(cells):
            continue

        # Full-width attachment block (Core competencies / Values / PCIs / ...)
        if cells[0] and not any(cells[1:]):
            key, val = block_kind(cells[0])
            cur = p.current()
            if key and cur is not None:
                cur[key].extend([v for v in split_items(val) if len(v) > 3])
                got = True
            continue

        strand_cell = cells[idx["strand"]] if "strand" in idx and idx["strand"] < len(cells) else ""
        sub_cell = cells[idx["substrand"]] if idx["substrand"] < len(cells) else ""

        if strand_cell:
            m = STRAND_CODE.match(strand_cell)
            p.cur_strand_code = (m.group(1) or "").strip() if m else ""
            # Flatten, do not take the first line: "1.0 Numbers and Algebra"
            # wraps across lines and first-line-only yields just "Numbers".
            p.cur_strand = canonical_strand(p, title_from_cell(
                m.group(2) if m else strand_cell))

        if sub_cell:
            m = SUBSTRAND_CODE.match(sub_cell)
            code = m.group(1) if m else ""
            rest = m.group(2) if m else sub_cell
            dur = DURATION.search(rest)
            duration = f"{dur.group(1) or dur.group(2)} lessons" if dur else ""
            # Cell layout is: title, lesson count, then the sub-topic list.
            # Some designs list sub-topics with no bullet, so cutting at the
            # lesson count is what stops "Algebraic Expressions" becoming
            # "Algebraic Expressions Factorizing, simplifying...".
            name = title_from_cell(rest[:dur.start()] if dur
                                   else DURATION.sub("", rest))
            # Only a numbered cell starts a new sub-strand. Un-numbered cells
            # are the bulleted sub-topic list or the tail of a wrapped cell,
            # and treating those as sub-strands invents entries like
            # "equations to real" or "- Application of".
            if name and (code or p.current() is None or is_title_like(name)):
                new_substrand(p, code, name, duration, page_no)
                got = True

        cur = p.current()
        if cur is None:
            continue
        for key, col, splitter in (("learning_outcomes", "outcomes", split_items),
                                   ("learning_experiences", "experiences", split_items),
                                   ("inquiry_questions", "inquiry", split_questions)):
            if col in idx and idx[col] < len(cells) and cells[idx[col]]:
                cur[key].extend(splitter(cells[idx[col]]))
                got = True
    return got


def parse_rubric_table(p, rows):
    rows = rubric_rows(rows) or rows
    header = header_of(rows)
    cols = {}
    for i, c in enumerate(header):
        cl = c.lower()
        if "exceed" in cl or "kuzidisha" in cl:
            cols["exceeds"] = i
        elif "meet" in cl or "kufikia" in cl:
            cols["meets"] = i
        elif "approach" in cl or "kukaribia" in cl:
            cols["approaches"] = i
        elif "below" in cl or "chini ya" in cl:
            cols["below"] = i
        elif H_INDICATOR.search(cl):
            cols.setdefault("indicator", i)
    if "exceeds" not in cols:
        return False
    cols.setdefault("indicator", 0)
    out = []
    for row in rows[1:]:
        cells = [clean(c or "") for c in row]
        if not any(cells):
            continue
        entry = {k: flatten(cells[i]) if i < len(cells) else "" for k, i in cols.items()}
        if entry.get("indicator") and any(entry.get(k) for k in ("exceeds", "meets")):
            out.append(entry)
    if out:
        p.rubrics.setdefault(p.cur_strand or "", []).extend(out)
        p.last_rubric_cols = cols
        return True
    return False


def parse_headerless_rubric(p, rows):
    """Read a rubric whose header row was never emitted or recognised.

    Column order is fixed across every design: indicator, then Exceeds, Meets,
    Approaches, Below Expectations.
    """
    out = []
    for row in rows:
        cells = [flatten(clean(c or "")) for c in row]
        if not any(cells):
            continue
        ind = next((c for c in cells[:2] if RUBRIC_INDICATOR_LEAD.match(c)), "")
        if not ind:
            continue
        rest = [c for c in cells[cells.index(ind) + 1:] if c]
        if len(rest) < 2:
            continue
        keys = ["exceeds", "meets", "approaches", "below"]
        entry = {"indicator": ind}
        entry.update({k: v for k, v in zip(keys, rest)})
        out.append(entry)
    if out:
        p.rubrics.setdefault(p.cur_strand or "", []).extend(out)
        return True
    return False


def parse_rubric_continuation(p, rows):
    """A rubric table continued on the next page, with no header row of its own."""
    cols = p.last_rubric_cols
    if not cols or not rows:
        return False
    width = max(len(r) for r in rows)
    if width < max(cols.values()) + 1:
        return False
    out = []
    for row in rows:
        cells = [clean(c or "") for c in row]
        if not any(cells):
            continue
        ind = cells[cols["indicator"]] if cols["indicator"] < len(cells) else ""
        # Rubric indicators read "Ability to ..." / "Uwezo wa ..." throughout.
        if not RUBRIC_INDICATOR_LEAD.match(ind):
            return False
        entry = {k: flatten(cells[i]) if i < len(cells) else "" for k, i in cols.items()}
        if any(entry.get(k) for k in ("exceeds", "meets")):
            out.append(entry)
    if out:
        p.rubrics.setdefault(p.cur_strand or "", []).extend(out)
        return True
    return False


def validate(sub):
    """Reject anything that is not really a sub-strand.

    These guards exist because a rubric table is the same shape as the
    sub-strand table: without them, level indicators ("Ability to multiply")
    and numbering fragments ("1. 0") get stored as real curriculum, and the
    run still reports success.
    """
    name = (sub.get("name") or "").strip()
    if not name:
        return "no name"
    if RUBRIC_INDICATOR_LEAD.match(name):
        return f"name is a rubric indicator, not a sub-strand: {name!r}"
    if not re.search(r"[A-Za-z]{3}", name):
        return f"name has no real word: {name!r}"
    if len(name) < 3:
        return f"name too short: {name!r}"
    # A column heading that leaked into the data instead of being consumed as
    # a header row. Storing it would create a strand literally called "Strand".
    if HEADER_WORD.match(name):
        return f"name is a column heading: {name!r}"
    strand = (sub.get("strand") or "").strip()
    if strand and (RUBRIC_INDICATOR_LEAD.match(strand)
                   or not re.search(r"[A-Za-z]{3}", strand)):
        return f"strand looks like a fragment: {strand!r}"
    good = [o for o in sub["learning_outcomes"] if looks_like_outcome(o)]
    if not good:
        return "no usable learning outcome"
    sub["learning_outcomes"] = good
    return None


def parse_file(path, use_ai, log):
    name = path.stem
    m = re.match(r"grade(\d+)-(.+)$", name, re.I)
    if not m:
        raise ValueError(
            f"{path.name}: filename must be grade{{N}}-{{subject-slug}}.pdf "
            f"(see kicd_raw/README.md). Refusing to guess the grade/subject."
        )
    grade, subject = int(m.group(1)), m.group(2).lower()

    doc = fitz.open(path)
    p = Parsed(grade, subject, path.name)
    p.cur_strand, p.cur_strand_code = "", ""
    p.general_outcomes = parse_general_outcomes(doc)

    for i, page in enumerate(doc, start=1):
        text = page.get_text()

        # Appendices sit at the end and repeat assessment methods/resources
        # already captured per sub-strand. Once we reach them, we are done.
        # Only the appendix's own title page counts: the table of contents
        # lists every appendix by name and must not trip this.
        head = text[:300]
        if (re.search(r"\bAPPENDIX\s+\d*\s*:?", head, re.I)
                and not re.search(r"table\s+of\s+content", text, re.I)):
            p.in_appendix = True
        if p.in_appendix:
            continue

        tables = page.find_tables().tables
        handled = False

        for t in tables:
            try:
                rows = t.extract()
            except Exception:
                continue
            if not rows:
                continue
            if is_substrand_table(rows):
                handled = parse_substrand_table(p, rows, i) or handled
            elif is_rubric_table(rows):
                handled = parse_rubric_table(p, rows) or handled
            elif parse_rubric_continuation(p, rows):
                handled = True
            elif looks_like_rubric_body(rows):
                # Rubric rows whose header was never recognised. Consume them
                # so they cannot be misread as curriculum downstream.
                handled = parse_headerless_rubric(p, rows) or True
            elif parse_substrand_continuation(p, rows, i):
                handled = True
            elif p.current() is not None and rows and rows[0] and rows[0][0]:
                key, val = block_kind(rows[0][0])
                if key:
                    p.current()[key].extend(split_items(val))
                    handled = True

        if handled:
            continue

        # Continuation block on a page whose table did not re-emit the header.
        key, val = (None, None)
        for k, pat in BLOCKS:
            mm = re.search(pat.pattern.lstrip("^"), text, re.I)
            if mm:
                key, val = k, text[mm.start():]
                break
        if key and p.current() is not None:
            p.current()[key].extend([v for v in split_items(val) if len(v) > 3])
            continue

        # Front matter / appendices carry no sub-strand data; not a failure.
        if re.search(r"foreword|preface|acknowledge|table of content|national goals|"
                     r"appendix|essence statement|general learning outcomes|"
                     r"first published|all rights reserved|isbn|"
                     r"lesson allocation|summary of strands|"
                     r"learning outcomes for (junior|senior|upper|lower)|"
                     r"nationhood|moral and religious values|"
                     r"social[- ]economic|individual development|self[- ]fulfilment",
                     text, re.I):
            continue
        if len(text.strip()) < 200 and not tables:
            continue

        # Tier 2 / 3.
        if not use_ai:
            p.unresolved.append({"page": i, "reason": "tier 1 found no sub-strand table"})
            continue
        try:
            if len(text.strip()) >= 200:
                items = ai_extract_text(text)
                p.ai_pages.append({"page": i, "tier": 2})
            else:
                items = ai_extract_image(page)
                p.ai_pages.append({"page": i, "tier": 3})
        except Exception as e:
            p.unresolved.append({"page": i, "reason": f"ai tier failed: {e}"})
            continue

        if not items:
            continue
        for it in items:
            new_substrand(p, it.get("kicd_code", ""), clean(it.get("name", "")),
                          it.get("suggested_duration", ""), i)
            cur = p.current()
            for k in ("learning_outcomes", "learning_experiences", "inquiry_questions",
                      "core_competencies", "values", "pertinent_issues",
                      "links_to_other_areas"):
                v = it.get(k) or []
                cur[k].extend([clean(x) for x in v if clean(x)])

    # Attach each strand's rubric, dedupe, validate.
    kept, bad = [], []
    for sub in p.substrands:
        for k in ("learning_outcomes", "learning_experiences", "inquiry_questions",
                  "core_competencies", "values", "pertinent_issues",
                  "links_to_other_areas", "resources"):
            seen, uniq = set(), []
            for v in sub[k]:
                if v not in seen:
                    seen.add(v)
                    uniq.append(v)
            sub[k] = uniq
        sub["assessment_rubric"] = p.rubrics.get(sub["strand"], [])
        why = validate(sub)
        (bad if why else kept).append(
            {**sub, "_why": why} if why else sub)

    for b in bad:
        p.unresolved.append({
            "page": b["kicd_source"].split("#p")[-1],
            "reason": f"sub-strand {b.get('kicd_code','?')} {b.get('name','?')!r}: {b['_why']}",
        })
    p.substrands = kept
    return p


class Command(BaseCommand):
    help = "Parse kicd_raw/*.pdf into kicd_parsed/*.json (one file per sub-strand)."

    def add_arguments(self, parser):
        parser.add_argument("--only", default=None,
                            help="Parse a single file stem, e.g. grade8-mathematics")
        parser.add_argument("--force", action="store_true",
                            help="Re-parse files that already have JSON output")
        parser.add_argument("--no-ai", action="store_true",
                            help="Tier 1 only; record failures instead of calling Gemini")

    def handle(self, *args, **opts):
        if not RAW_DIR.exists():
            raise SystemExit(f"{RAW_DIR} does not exist. See kicd_raw/README.md")
        OUT_DIR.mkdir(exist_ok=True)

        pdfs = sorted(RAW_DIR.glob("*.pdf"))
        if opts["only"]:
            pdfs = [p for p in pdfs if p.stem == opts["only"]]
            if not pdfs:
                raise SystemExit(f"No kicd_raw/{opts['only']}.pdf")
        if not pdfs:
            raise SystemExit(f"No PDFs in {RAW_DIR}. See kicd_raw/README.md")

        use_ai = not opts["no_ai"]
        if use_ai and not getattr(settings, "GEMINI_API_KEY", ""):
            self.stdout.write(self.style.WARNING(
                "GEMINI_API_KEY not set - running tier 1 only (--no-ai)."))
            use_ai = False

        all_unresolved, totals = [], {"files": 0, "subs": 0, "ai": 0, "skipped": 0}
        for path in pdfs:
            done = OUT_DIR / f"_{path.stem}.done"
            if done.exists() and not opts["force"]:
                totals["skipped"] += 1
                continue
            try:
                p = parse_file(path, use_ai, self.stdout)
            except Exception as e:
                all_unresolved.append({"file": path.name, "page": "-", "reason": str(e)})
                self.stdout.write(self.style.ERROR(f"  {path.name}: {e}"))
                continue

            # One file per source design, strands nested inside.
            #
            # Not one file per sub-strand: that was ~2,400 files and most of
            # the bytes were the same `general_outcomes` list copied into
            # every one. This keeps the diff readable (a parser change shows
            # exactly which outcomes moved, inside the design they came from)
            # while staying a sane thing to commit.
            for stale in OUT_DIR.glob(f"{path.stem}-*.json"):
                stale.unlink()

            strands = {}
            for sub in p.substrands:
                entry = strands.setdefault(sub["strand"], {
                    "strand": sub["strand"],
                    "strand_code": sub.get("strand_code", ""),
                    "assessment_rubric": sub.get("assessment_rubric") or [],
                    "substrands": [],
                })
                strands[sub["strand"]] = entry
                entry["substrands"].append({
                    k: v for k, v in sub.items()
                    if k not in ("grade", "subject", "strand", "strand_code",
                                 "assessment_rubric", "general_outcomes")
                })

            doc_out = {
                "source_pdf": path.name,
                "grade": p.grade,
                "subject": p.subject,
                "general_outcomes": p.general_outcomes,
                "strands": sorted(strands.values(),
                                  key=lambda s: (s["strand_code"], s["strand"])),
            }
            (OUT_DIR / f"{path.stem}.json").write_text(
                json.dumps(doc_out, indent=1, ensure_ascii=False), encoding="utf-8")

            for u in p.unresolved:
                all_unresolved.append({"file": path.name, **u})

            totals["files"] += 1
            totals["subs"] += len(p.substrands)
            totals["ai"] += len(p.ai_pages)
            done.write_text(f"{len(p.substrands)} substrands", encoding="utf-8")

            flag = "" if not p.unresolved else f"  [{len(p.unresolved)} unresolved]"
            ai = "" if not p.ai_pages else f"  [ai:{len(p.ai_pages)}]"
            self.stdout.write(
                f"  {path.name:46} {len(p.substrands):>3} sub-strands{ai}{flag}")

        self.stdout.write(
            f"\n{totals['files']} files parsed, {totals['skipped']} skipped, "
            f"{totals['subs']} sub-strands written, {totals['ai']} pages needed AI")

        unresolved_path = OUT_DIR / "_unresolved.json"
        if all_unresolved:
            unresolved_path.write_text(
                json.dumps(all_unresolved, indent=1, ensure_ascii=False), encoding="utf-8")
            self.stdout.write(self.style.ERROR(
                f"\n{len(all_unresolved)} unresolved - written to {unresolved_path}"))
            for u in all_unresolved[:25]:
                self.stdout.write(f"  {u['file']} p{u['page']}: {u['reason'][:100]}")
            if len(all_unresolved) > 25:
                self.stdout.write(f"  ... and {len(all_unresolved) - 25} more")
            # Non-zero exit: nothing downstream should treat this as a clean run.
            sys.exit(1)

        if unresolved_path.exists():
            unresolved_path.unlink()
        self.stdout.write(self.style.SUCCESS("\nNothing unresolved."))
