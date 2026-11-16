"""
Stamp `bloom_level` and `command_verb` on every Question, derived from the
question text. No API calls - this is a lookup table, per Rule 1.

    python manage.py tag_questions_kicd --dry-run
    python manage.py tag_questions_kicd
    python manage.py tag_questions_kicd --retag        # overwrite existing tags
    python manage.py tag_questions_kicd --suggest-substrands

WHY DETERMINISTIC
A command verb is the first verb of the question and KICD publishes the verb
set, so matching it is a dictionary lookup. Asking a model to classify 1,067
questions would cost money, vary between runs, and be no more accurate on the
cases that matter.

Kiswahili questions are tagged too - their command verbs (eleza, taja,
fafanua) sit in the same table.
"""
import re

from django.core.management.base import BaseCommand
from django.db.models import Count

# (canonical verb, bloom level, patterns). Multi-word verbs are matched first
# so "account for" never degrades to "account", and "work out" never to "work".
VERBS = [
    # ── Remember ──────────────────────────────────────────────────────────
    ("State",        "remember",   [r"state", r"taja"]),
    ("Name",         "remember",   [r"name", r"jina"]),
    ("List",         "remember",   [r"list", r"orodhesha"]),
    ("Identify",     "remember",   [r"identify", r"tambua", r"bainisha"]),
    ("Define",       "remember",   [r"define", r"fasili"]),
    ("Mention",      "remember",   [r"mention"]),
    ("Give",         "remember",   [r"give"]),
    ("Recall",       "remember",   [r"recall"]),
    ("Match",        "remember",   [r"match", r"oanisha", r"linganisha\s+na"]),
    ("Label",        "remember",   [r"label", r"andika\s+majina"]),
    ("Write",        "remember",   [r"write\s+down", r"andika"]),
    ("Select",       "remember",   [r"select", r"choose", r"chagua", r"teua"]),
    ("Underline",    "remember",   [r"underline", r"pigia\s+mstari"]),
    ("Fill in",      "remember",   [r"fill\s+in", r"jaza"]),
    # ── Understand ────────────────────────────────────────────────────────
    ("Describe",     "understand", [r"describe", r"fafanua", r"eleza\s+kwa\s+kina"]),
    ("Explain",      "understand", [r"explain", r"eleza"]),
    ("Outline",      "understand", [r"outline"]),
    ("Summarise",    "understand", [r"summari[sz]e", r"fupisha", r"muhtasari"]),
    ("Classify",     "understand", [r"classify", r"ainisha"]),
    ("Distinguish",  "understand", [r"distinguish", r"tofautisha"]),
    ("Interpret",    "understand", [r"interpret"]),
    ("Illustrate",   "understand", [r"illustrate"]),
    ("Discuss",      "understand", [r"discuss", r"jadili"]),
    ("Compare",      "understand", [r"compare", r"linganisha"]),
    ("Contrast",     "understand", [r"contrast"]),
    # ── Apply ─────────────────────────────────────────────────────────────
    ("Work out",     "apply",      [r"work\s+out"]),
    ("Calculate",    "apply",      [r"calculate", r"compute", r"hesabu"]),
    ("Determine",    "apply",      [r"determine"]),
    ("Find",         "apply",      [r"find", r"tafuta"]),
    ("Solve",        "apply",      [r"solve", r"suluhisha", r"tegua"]),
    ("Change",       "apply",      [r"rewrite", r"change\s+the", r"geuza",
                                   r"badilisha", r"nyambua"]),
    ("Draw",         "apply",      [r"draw", r"chora"]),
    ("Sketch",       "apply",      [r"sketch"]),
    ("Construct",    "apply",      [r"construct"]),
    ("Measure",      "apply",      [r"measure", r"pima"]),
    ("Convert",      "apply",      [r"convert", r"express.*\bas\b"]),
    ("Complete",     "apply",      [r"complete", r"fill\s+in", r"kamilisha"]),
    ("Demonstrate",  "apply",      [r"demonstrate", r"onyesha"]),
    ("Show",         "apply",      [r"show\s+that", r"show"]),
    ("Use",          "apply",      [r"use\b", r"tumia"]),
    ("Arrange",      "apply",      [r"arrange", r"panga"]),
    # ── Analyze ───────────────────────────────────────────────────────────
    ("Account for",  "analyze",    [r"account\s+for"]),
    ("Analyse",      "analyze",    [r"analy[sz]e", r"chambua"]),
    ("Justify",      "analyze",    [r"justify", r"thibitisha"]),
    ("Examine",      "analyze",    [r"examine"]),
    ("Investigate",  "analyze",    [r"investigate", r"chunguza"]),
    ("Differentiate", "analyze",   [r"differentiate"]),
    ("Deduce",       "analyze",    [r"deduce", r"infer"]),
    ("Prove",        "analyze",    [r"prove"]),
    # ── Evaluate ──────────────────────────────────────────────────────────
    ("Evaluate",     "evaluate",   [r"evaluate", r"assess", r"tathmini"]),
    ("Recommend",    "evaluate",   [r"recommend", r"suggest", r"pendekeza"]),
    ("Judge",        "evaluate",   [r"judge", r"critici[sz]e"]),
    # ── Create ────────────────────────────────────────────────────────────
    ("Design",       "create",     [r"design", r"buni"]),
    ("Create",       "create",     [r"create", r"compose", r"tunga"]),
    ("Develop",      "create",     [r"develop", r"formulate", r"plan"]),
]

# Question stems with no command verb at all (most MCQs). Deliberately not
# anchored with ^: the stem usually follows a sentence of context.
STEMS = [
    ("Identify", "remember",   r"\bwhich\s+(one\s+)?of\s+(the\s+)?(following|these)"),
    ("Identify", "remember",   r"\bwhich\b|\bni\s+(kipi|gani|yupi|lipi|zipi)\b"),
    ("Calculate", "apply",     r"\bhow\s+(many|much)\b"),
    ("Describe", "understand", r"\bis\s+best\s+(described|defined)\b"),
    ("State",    "remember",   r"\bwhat\s+(is|are)\s+the\s+(name|term|word)\b"),
    ("Explain",  "understand", r"\bwhat\s+(is|are|was|were|does|do)\b|\bnini\b"),
    ("Describe", "understand", r"\bhow\s+(is|are|does|do|can|would)\b|\bvipi\b"),
    ("Account for", "analyze", r"^why\b|\bkwa\s+nini\b"),
    ("Identify", "remember",   r"^(who|when|where)\b|\b(nani|lini|wapi)\b"),
]

# Longest literal first so "work out" wins over "work".
_COMPILED = sorted(
    [(verb, bloom, re.compile(r"\b" + pat, re.I), len(pat))
     for verb, bloom, pats in VERBS for pat in pats],
    key=lambda t: -t[3],
)
_STEMS = [(v, b, re.compile(p, re.I)) for v, b, p in STEMS]


def strip_label(text):
    """Drop a leading enumeration label like 'a)' or '(i)' before matching."""
    t = (text or "").strip()
    t = re.sub(r"^\(?[a-z]\)\s*|^\(?[ivx]+\)\s*|^\d+[.)]\s*", "", t, flags=re.I)
    return t.strip()


SENTENCE_SPLIT = re.compile(r"(?<=[.!?:])\s+")
CLOZE = re.compile(r"(?:_{2,}|\.{3,}|:\s*$)", re.I)


def classify(text, qtype=None):
    """Return (command_verb, bloom_level) or ('', '') if nothing matched.

    KICD questions routinely give context first and instruct last - "Buildings
    are categorized based on their specific use. State the categories." So the
    last sentence is searched before the first; anchoring on the opening words
    misses roughly half the bank.
    """
    t = strip_label(text)
    if not t:
        return "", ""

    sentences = [s.strip() for s in SENTENCE_SPLIT.split(t) if s.strip()]
    # Instruction-last is the common shape, so search back to front.
    for sentence in reversed(sentences):
        for verb, bloom, pat, _ in _COMPILED:
            m = pat.search(sentence)
            # Must open the clause, not merely appear in it: "the learner can
            # state" is narration, "State the categories" is the instruction.
            if m and m.start() <= 25:
                return verb, bloom

    # Question stems ("which of the following", "what is") can sit anywhere.
    for verb, bloom, pat in _STEMS:
        if pat.search(t):
            return verb, bloom

    # Fill-in / completion stems carry no verb at all.
    if CLOZE.search(t):
        return "Identify", "remember"

    # Last resort: a command verb anywhere in the text.
    for verb, bloom, pat, _ in _COMPILED:
        if pat.search(t):
            return verb, bloom

    # An MCQ with no command verb and no question stem is a sentence-completion
    # item ("David, who became the second king of Israel was the son of ___").
    # Choosing the right option from four is recognition by definition, so this
    # is a classification rather than a guess. Only MCQs qualify: a structured
    # question with no identifiable verb stays untagged.
    if qtype == "mcq":
        return "Identify", "remember"
    return "", ""


class Command(BaseCommand):
    help = "Derive bloom_level and command_verb for every question (no API calls)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--retag", action="store_true",
                            help="Overwrite questions that already carry tags.")
        parser.add_argument("--suggest-substrands", action="store_true",
                            help="Report which topics have questions but no "
                                 "sub-strand assigned. Writes nothing.")

    def handle(self, *args, **opts):
        from questions.models import Question, QuestionPart, Topic

        qs = Question.objects.all()
        if not opts["retag"]:
            qs = qs.filter(command_verb="")

        total = qs.count()
        self.stdout.write(f"{total} questions to tag"
                          f"{' (use --retag to redo tagged ones)' if not opts['retag'] else ''}\n")

        from collections import Counter
        verbs, blooms, misses = Counter(), Counter(), []
        updates = []
        for q in qs.iterator(chunk_size=500):
            verb, bloom = classify(q.question_text, q.question_type)
            if not verb and q.question_type == "multipart":
                # Multipart stems carry no verb; take the first part's.
                first = q.parts.order_by("order", "part_label").first()
                if first:
                    verb, bloom = classify(first.question_text, first.question_type)
            if not verb:
                misses.append((q.id, (q.question_text or "")[:70]))
                continue
            verbs[verb] += 1
            blooms[bloom] += 1
            q.command_verb, q.bloom_level = verb, bloom
            updates.append(q)

        if updates and not opts["dry_run"]:
            Question.objects.bulk_update(updates, ["command_verb", "bloom_level"],
                                         batch_size=500)

        self.stdout.write(f"tagged      {len(updates)}")
        self.stdout.write(f"unmatched   {len(misses)}")
        self.stdout.write("\nBloom distribution:")
        for b, n in blooms.most_common():
            pct = n / max(len(updates), 1) * 100
            self.stdout.write(f"  {b:12} {n:>5}  {pct:5.1f}%  {'#' * int(pct / 2)}")
        self.stdout.write("\nTop command verbs:")
        for v, n in verbs.most_common(18):
            self.stdout.write(f"  {v:14} {n:>5}")

        if misses:
            self.stdout.write(f"\nUnmatched sample (first 15 of {len(misses)}):")
            for qid, txt in misses[:15]:
                self.stdout.write(f"  Q{qid}: {txt}")
            self.stdout.write(
                "  -> these keep empty tags rather than being guessed at; add the "
                "verb to VERBS in this file if a real pattern shows up.")

        if opts["dry_run"]:
            self.stdout.write(self.style.WARNING("\nDRY RUN - nothing written"))

        if opts["suggest_substrands"]:
            self.stdout.write("\n" + "=" * 62)
            self.stdout.write("Topics with questions but no sub-strand assigned")
            rows = (Topic.objects
                    .annotate(qs_total=Count("questions", distinct=True),
                              subs=Count("substrands", distinct=True))
                    .filter(qs_total__gt=0)
                    .order_by("-qs_total"))
            shown = 0
            for t in rows:
                unassigned = t.questions.filter(substrand__isnull=True).count()
                if not unassigned:
                    continue
                shown += 1
                self.stdout.write(
                    f"  G{t.grade} {t.subject.name[:22]:22} {t.name[:30]:30} "
                    f"{unassigned:>4} unassigned / {t.qs_total:>4} total, "
                    f"{t.subs} sub-strands available")
            if not shown:
                self.stdout.write("  none - every question has a sub-strand")
            else:
                self.stdout.write(
                    "\n  Assigning these needs a human read of each question against "
                    "the sub-strand's learning outcomes. Text similarity picks the "
                    "wrong sub-strand often enough that it would corrupt coverage "
                    "reporting, so this command only reports.")
