"""
Measure what grading a real quiz actually costs, in tokens and KES.

    python manage.py grading_cost                 # first active quiz
    python manage.py grading_cost --quiz-id 42
    python manage.py grading_cost --quizzes-per-month 20 --kes-per-usd 130

Grades every question in the quiz through the REAL grading path (cache
bypassed so each one hits the API), captures token usage per call, prices it
per the model actually used, and projects a monthly per-student cost to
compare against the subscription price. MCQs cost nothing (graded
deterministically) — that shows up as zero.
"""
import json

from django.core.management.base import BaseCommand

# USD per token (input, output). Cache: writes bill 1.25x input, reads 0.10x.
_PRICES = {
    "claude-sonnet-4-6": (3 / 1e6, 15 / 1e6),
    "claude-opus-4-8":   (5 / 1e6, 25 / 1e6),
    "claude-opus-4-7":   (5 / 1e6, 25 / 1e6),
    "claude-haiku-4-5":  (1 / 1e6, 5 / 1e6),
    "claude-fable-5":    (10 / 1e6, 50 / 1e6),
}


class _NoCache:
    """Force every grade to hit the API so we measure real cost, not a cache hit."""
    def get(self, *a, **k): return None
    def set(self, *a, **k): pass
    def delete(self, *a, **k): pass


class Command(BaseCommand):
    help = "Measure the real token + KES cost of grading a quiz."

    def add_arguments(self, parser):
        parser.add_argument("--quiz-id", type=int, default=None)
        parser.add_argument("--quizzes-per-month", type=int, default=20,
                            help="For the monthly per-student projection.")
        parser.add_argument("--kes-per-usd", type=float, default=130.0)
        parser.add_argument("--sub-price", type=float, default=999.0,
                            help="Monthly subscription price to compare against.")

    def handle(self, *args, **opts):
        from questions.models import Quiz
        from questions import ai_grading as g

        quiz = (Quiz.objects.filter(pk=opts["quiz_id"]).first() if opts["quiz_id"]
                else Quiz.objects.filter(is_active=True).order_by("id").first())
        if not quiz:
            self.stderr.write("No quiz found.")
            return

        questions = list(quiz.questions.all())
        self.stdout.write(f"Quiz {quiz.id}: {quiz.title!r} — {len(questions)} questions\n")

        # Capture usage of every underlying API call.
        calls = []
        real_get = g._get_claude
        def patched_get():
            client = real_get()
            real_create = client.messages.create
            def wrapped(**p):
                r = real_create(**p)
                u = r.usage
                calls.append({
                    "model": p.get("model"),
                    "in": u.input_tokens, "out": u.output_tokens,
                    "cw": getattr(u, "cache_creation_input_tokens", 0),
                    "cr": getattr(u, "cache_read_input_tokens", 0),
                })
                return r
            client.messages.create = wrapped
            return client
        g._get_claude = patched_get
        g.grade_cache = _NoCache()  # bypass cache -> real cost each time

        def sample_answer(q):
            if q.parts.exists():
                return {str(p.id): (p.correct_answer or "sample answer") for p in q.parts.all()}
            return q.correct_answer or "sample answer"

        graded = 0
        for q in questions:
            try:
                g.grade_answer(q, sample_answer(q))
                graded += 1
            except Exception as e:
                self.stderr.write(f"  Q{q.id}: grading failed ({type(e).__name__}: {e})")

        g._get_claude = real_get  # restore

        # Price it up.
        kes = opts["kes_per_usd"]
        total_usd = 0.0
        tot = {"in": 0, "out": 0, "cw": 0, "cr": 0}
        for c in calls:
            pin, pout = _PRICES.get(c["model"], _PRICES["claude-sonnet-4-6"])
            total_usd += c["in"] * pin + c["cw"] * pin * 1.25 + c["cr"] * pin * 0.10 + c["out"] * pout
            for k in tot:
                tot[k] += c[k]

        quiz_kes = total_usd * kes
        self.stdout.write("\n--- COST OF ONE FULL QUIZ ---")
        self.stdout.write(f"API calls made        : {len(calls)} (MCQs make none — they're free)")
        self.stdout.write(f"Tokens  full-in={tot['in']}  cache-write={tot['cw']}  "
                          f"cache-read={tot['cr']}  out={tot['out']}")
        self.stdout.write(f"Cost per quiz         : ${total_usd:.4f}  (~KES {quiz_kes:.2f})")

        per_month = opts["quizzes_per_month"]
        monthly_kes = quiz_kes * per_month
        sub = opts["sub_price"]
        pct = (monthly_kes / sub * 100) if sub else 0
        self.stdout.write("\n--- MONTHLY PER-STUDENT PROJECTION ---")
        self.stdout.write(f"At {per_month} quizzes/month : ~KES {monthly_kes:.0f} in grading")
        self.stdout.write(f"Subscription price    : KES {sub:.0f}")
        self.stdout.write(f"Grading is ~{pct:.0f}% of revenue  -> "
                          f"~KES {sub - monthly_kes:.0f} gross margin per student")
        self.stdout.write(self.style.SUCCESS("\nNote: real cost is LOWER — caching makes repeat "
                                             "answers and warm prompts far cheaper than this."))
