"""
scan_arithmetic_answers.py

Flags PLAIN-LANGUAGE, BIG-NUMBER arithmetic questions whose STORED answer
doesn't match any obvious operation (+, −, ×, ÷) on the numbers in the
question — catching authoring typos like "183654 + 264907" stored as 448661
instead of 448561.

Heuristic, no AI. To stay precise (few false positives) it only looks at
questions that:
  * have NO maths notation (no $, \\, =, ^, fractions, logs, variables) —
    i.e. real word problems, not algebra/geometry; and
  * have exactly two "large" numbers (>= --min-number, default 100) —
    the place authoring typos hide and pupils can't easily self-check.

It then flags any where the stored answer isn't the sum, difference, product
or quotient of those two numbers, sorted by how close the nearest operation is
(a tiny gap ~ a typo).

Usage:
  python manage.py scan_arithmetic_answers
  python manage.py scan_arithmetic_answers --grade 5
  python manage.py scan_arithmetic_answers --min-number 1000
"""
import re

from django.core.management.base import BaseCommand
from questions.models import Question

_NUM = re.compile(r"\d+")
# Grouped numbers with comma OR space separators: "1,234,567" / "264 907"
_GROUPED = re.compile(r"\d{1,3}(?:[ ,]\d{3})+")
# Algebra / geometry / notation / rounding → skip (these aren't plain sums)
_NOTATION = re.compile(
    r"[$\\^=<>≤≥√/]|\b(log|sqrt|gradient|intercept|equation|simplify|evaluate|"
    r"expression|simultaneous|coordinate|vector|matrix|frac|round|nearest|"
    r"estimate|approximate)\b",
    re.I,
)


def _normalize(text):
    return _GROUPED.sub(lambda m: m.group(0).replace(" ", "").replace(",", ""), text or "")


def _big_numbers(text, threshold):
    nums = [int(n) for n in _NUM.findall(_normalize(text))]
    return [n for n in nums if n >= threshold]


def _stored_numeric(q):
    out = set()
    raws = [q.correct_answer]
    if isinstance(q.correct_answers, list):
        raws += q.correct_answers
    for raw in raws:
        if raw is None:
            continue
        s = _normalize(str(raw).strip())
        if re.fullmatch(r"-?\d+", s):
            out.add(int(s))
    return out


def _ascii(s):
    return "".join(ch if ord(ch) < 128 else "?" for ch in s)


class Command(BaseCommand):
    help = "Flag big-number word-problem questions whose stored answer doesn't match the arithmetic."

    def add_arguments(self, parser):
        parser.add_argument("--grade", type=int, help="Limit to one grade")
        parser.add_argument("--min-number", type=int, default=100,
                            help="Only consider operands this large (default 100)")
        parser.add_argument("--limit", type=int, default=0, help="Stop after N flags")

    def handle(self, *args, **opts):
        threshold = opts["min_number"]
        qs = (Question.objects
              .exclude(correct_answer="")
              .select_related("topic", "topic__subject"))
        if opts.get("grade"):
            qs = qs.filter(topic__grade=opts["grade"])

        checked = 0
        flagged = []
        for q in qs:
            text = q.question_text or ""
            if _NOTATION.search(text):
                continue  # algebra/geometry/notation — not a plain sum
            stored = _stored_numeric(q)
            if not stored:
                continue
            nums = _big_numbers(text, threshold)
            nums = [n for n in nums if n not in stored]
            if len(nums) != 2:
                continue  # need exactly two operands to verify cleanly
            checked += 1
            a, b = sorted(nums, reverse=True)
            cands = {"sum": a + b, "difference": a - b, "product": a * b}
            if b and a % b == 0:
                cands["quotient"] = a // b
            if stored & set(cands.values()):
                continue  # matches an obvious operation — looks fine
            best = min(
                ((abs(v - s), op, v) for s in stored for op, v in cands.items()),
                key=lambda t: t[0],
            )
            flagged.append((best[0], q, sorted(stored), nums, best[1], best[2]))

        flagged.sort(key=lambda x: x[0])
        shown = 0
        for gap, q, stored, nums, op, val in flagged:
            if opts.get("limit") and shown >= opts["limit"]:
                break
            shown += 1
            g = getattr(q.topic, "grade", "?")
            self.stdout.write(self.style.WARNING(
                f"\n[Q{q.id}] G{g} | stored={stored} | numbers={nums}"))
            self.stdout.write(f"   nearest: {op} = {val}  (off by {gap})")
            self.stdout.write(f"   Q: {_ascii(q.question_text[:160])}")

        self.stdout.write(self.style.SUCCESS(
            f"\nChecked {checked} plain big-number questions. Flagged {len(flagged)}."))
