"""
backfill_explanations.py

Generates the MISSING explanations for passage/cloze comprehension questions
(and their parts) — the ones authored with an empty `explanation` field, so a
kid who gets them wrong currently sees only "the answer is C".

Uses OPUS (claude-opus-4-8) — no Gemini. Kiswahili questions get a Kiswahili
explanation, English ones an English explanation. Grounded in the passage and
the correct answer, short and grade-appropriate. Only fills BLANK fields; never
overwrites an explanation an admin already wrote.

Usage:
  python manage.py backfill_explanations --dry-run        # preview only
  python manage.py backfill_explanations --grade 5
  python manage.py backfill_explanations --limit 20
"""
from django.core.management.base import BaseCommand

from questions.models import Question
from questions.ai_grading import (
    _call_claude, _is_kiswahili, CLAUDE_MODEL, KISWAHILI_MODEL,
)


def _opts(obj):
    return {L: (getattr(obj, f"option_{L.lower()}", "") or "").strip()
            for L in "ABCD"}


def _generate(question, target, passage_text, grade, sw):
    """target is the Question itself or one of its parts."""
    lang = "Kiswahili" if sw else "English"
    opts = _opts(target)
    opts_block = "\n".join(f"{L}. {t}" for L, t in opts.items() if t)
    correct = (getattr(target, "correct_answer", "") or "").strip()
    passage_block = (
        f"\nPASSAGE the question is based on:\n\"\"\"\n{passage_text[:2500]}\n\"\"\"\n"
        if passage_text else ""
    )
    prompt = f"""You are a kind Kenyan CBC Grade {grade} teacher.
Write a SHORT explanation, in {lang}, of WHY the correct answer is right for this
comprehension/cloze question. Write it for a Grade {grade} pupil who got it wrong.
{passage_block}
QUESTION: {target.question_text}
{('OPTIONS:\n' + opts_block) if opts_block else ''}
CORRECT ANSWER: {correct}

Rules:
- Write ONLY in {lang}. 1-3 short sentences.
- Explain the reason grounded in the passage/grammar — not just "because it is C".
- Simple words a Grade {grade} pupil understands. No symbols or jargon.
- Output ONLY the explanation text. No labels, no "Explanation:", no quotes."""
    model = KISWAHILI_MODEL if sw else CLAUDE_MODEL
    return _call_claude(prompt, max_tokens=300, model=model).strip()


class Command(BaseCommand):
    help = "Backfill blank explanations on passage/cloze questions (and parts) using Opus."

    def add_arguments(self, parser):
        parser.add_argument("--grade", type=int)
        parser.add_argument("--limit", type=int, default=0)
        parser.add_argument("--dry-run", action="store_true",
                            help="Show what would be generated without saving")

    def handle(self, *args, **opts):
        qs = (Question.objects
              .filter(passage__isnull=False)
              .select_related("topic", "topic__subject", "passage")
              .prefetch_related("parts"))
        if opts.get("grade"):
            qs = qs.filter(topic__grade=opts["grade"])

        done = 0
        dry = opts.get("dry_run")
        for q in qs:
            if opts.get("limit") and done >= opts["limit"]:
                break
            grade = q.topic.grade
            sw = _is_kiswahili(q)
            passage_text = q.passage.content if q.passage else ""
            parts = list(q.parts.all())

            targets = []
            if parts:
                targets = [p for p in parts if not (p.explanation or "").strip()]
            elif not (q.explanation or "").strip():
                targets = [q]

            for target in targets:
                if opts.get("limit") and done >= opts["limit"]:
                    break
                try:
                    text = _generate(q, target, passage_text, grade, sw)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f"  Q{q.id} target failed: {type(e).__name__}: {e}"))
                    continue
                done += 1
                where = f"Q{q.id}" + (f" part {target.part_label}" if target is not q else "")
                self.stdout.write(self.style.WARNING(f"\n[{where}] ({'SW' if sw else 'EN'})"))
                self.stdout.write(f"   {text[:200]}")
                if not dry:
                    target.explanation = text
                    target.save(update_fields=["explanation"])

        self.stdout.write(self.style.SUCCESS(
            f"\n{'(dry-run) would generate' if dry else 'Generated + saved'} "
            f"{done} explanation(s)."))
