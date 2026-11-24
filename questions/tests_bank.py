"""The question bank: pay once, reuse; never repeat for a teacher."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from questions import assessments, bank
from questions.models import BankQuestion, BankUse, Subject, Substrand, Topic

User = get_user_model()


def mcq(sid, n):
    return {"type": "mcq", "marks": 1, "substrand_id": sid, "question_text": f"MCQ number {n}?",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correct_answer": "B"}


def struct(sid, n, fig=False):
    q = {"type": "structured", "marks": 4, "substrand_id": sid, "question_text": f"Structured {n}",
         "parts": [{"label": "a", "question_text": "Work it out", "marks": 4}],
         "marking_scheme": [{"part": "a", "award": "4 marks", "marks": 4, "points": ["x"]}]}
    if fig:
        q["diagram"] = {"url": "/api/diagrams/pabc.svg", "alt": "a triangle", "exact": True}
    return q


class Bank(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = User.objects.create_user("bk1", "bk1@example.invalid", "pw-12345!", role="teacher")
        cls.other = User.objects.create_user("bk2", "bk2@example.invalid", "pw-12345!", role="teacher")
        subj = Subject.objects.create(name="Mathematics", slug="maths")
        topic = Topic.objects.create(subject=subj, grade=7, name="Numbers", slug="numbers")
        cls.s1 = Substrand.objects.create(topic=topic, name="Whole Numbers", learning_outcomes=["read numbers"])
        cls.s2 = Substrand.objects.create(topic=topic, name="Fractions", learning_outcomes=["add fractions"])

    def fill(self):
        qs = [mcq(self.s1.id, i) for i in range(3)] + [mcq(self.s2.id, i + 10) for i in range(3)]
        qs += [struct(self.s1.id, 1, fig=True), struct(self.s2.id, 2), struct(self.s1.id, 3), struct(self.s2.id, 4)]
        return bank.save_to_bank(qs)

    def test_saves_once_and_skips_bad_questions(self):
        self.assertEqual(self.fill(), 10)
        self.assertEqual(self.fill(), 0)                                  # duplicates ignored
        bad = [dict(mcq(self.s1.id, 99), off_design=True),
               {"type": "structured", "marks": 3, "substrand_id": self.s1.id, "question_text": "no scheme"}]
        self.assertEqual(bank.save_to_bank(bad), 0)

    def test_full_bank_writes_nothing_and_never_repeats_for_a_teacher(self):
        self.fill()
        no_ai = mock.patch.object(assessments, "generate_json", side_effect=AssertionError("AI called"))
        with no_ai:
            p = assessments.generate_assessment([self.s1, self.s2], count=6, description="",
                                                mcq_ratio=0.5, user=self.teacher, verify=False,
                                                diagrams=False)
        self.assertEqual(len(p["questions"]), 6)
        self.assertEqual(p["from_bank"], 6)
        self.assertEqual(BankUse.objects.filter(teacher=self.teacher).count(), 6)
        first = {q["bank_id"] for q in p["questions"]}
        again = bank.pick([self.s1, self.s2], n_mcq=3, n_struct=3, figures=0, teacher=self.teacher)
        self.assertFalse(first & {q["bank_id"] for q in again})           # no repeats for this teacher
        other = bank.pick([self.s1, self.s2], n_mcq=3, n_struct=3, figures=0, teacher=self.other)
        self.assertEqual(len(other), 6)                                   # another teacher can have them

    def test_partial_bank_writes_only_the_shortfall(self):
        bank.save_to_bank([mcq(self.s1.id, 1), mcq(self.s2.id, 2)])
        seen = {}

        def fake(prompt, system, **k):
            seen["prompt"] = prompt
            return {"title": "T", "questions": [dict(mcq(0, 50), sub=1), dict(mcq(0, 51), sub=2)]}
        with mock.patch.object(assessments, "generate_json", fake):
            p = assessments.generate_assessment([self.s1, self.s2], count=4, description="",
                                                mcq_ratio=1.0, user=self.teacher, verify=False,
                                                diagrams=False)
        self.assertEqual(p["from_bank"], 2)
        self.assertEqual(len(p["questions"]), 4)
        self.assertIn("Produce exactly 2 questions", seen["prompt"])
        self.assertIn("already on the paper", seen["prompt"])

    def test_figures_come_from_the_bank_first(self):
        self.fill()
        got = bank.pick([self.s1, self.s2], n_mcq=0, n_struct=2, figures=1, teacher=self.teacher)
        self.assertEqual(sum(1 for q in got if q.get("diagram")), 1)

    def test_specific_requests_are_written_fresh(self):
        self.assertFalse(bank.wants_fresh(""))
        self.assertFalse(bank.wants_fresh("Make at least 2 to 3 diagrams."))
        self.assertFalse(bank.wants_fresh("mostly structured questions"))
        self.assertTrue(bank.wants_fresh("include a question about our school farm in Kericho"))


class HandWritten(TestCase):
    """Questions typed in the question editor go onto teachers' papers."""

    @classmethod
    def setUpTestData(cls):
        from questions.models import Question
        cls.teacher = User.objects.create_user("hw1", "hw1@example.invalid", "pw-12345!", role="teacher")
        subj = Subject.objects.create(name="Mathematics", slug="maths")
        topic = Topic.objects.create(subject=subj, grade=7, name="Numbers", slug="numbers")
        cls.sub = Substrand.objects.create(topic=topic, name="Factors", learning_outcomes=["find LCM"])
        cls.mcq = Question.objects.create(
            topic=topic, substrand=cls.sub, question_type="mcq", question_text="LCM of 12 and 18?",
            option_a="6", option_b="36", option_c="72", option_d="216", correct_answer="B")
        cls.math = Question.objects.create(
            topic=topic, substrand=cls.sub, question_type="math", question_text="Find the GCD of 84 and 126.",
            correct_answer="42", max_marks=2)
        cls.no_sub = Question.objects.create(topic=topic, question_type="mcq", question_text="unfiled",
                                             option_a="1", option_b="2", correct_answer="A")

    def test_my_questions_fill_the_paper_for_free(self):
        no_ai = mock.patch.object(assessments, "generate_json", side_effect=AssertionError("AI called"))
        with no_ai:
            p = assessments.generate_assessment([self.sub], count=2, description="", mcq_ratio=0.5,
                                                user=self.teacher, verify=False, diagrams=False)
        texts = {q["question_text"] for q in p["questions"]}
        self.assertEqual(texts, {"LCM of 12 and 18?", "Find the GCD of 84 and 126."})
        gcd = next(q for q in p["questions"] if q["type"] == "structured")
        self.assertEqual(gcd["marks"], 2)
        self.assertIn("42", gcd["marking_scheme"][0]["points"])

    def test_hand_written_comes_before_generated(self):
        bank.save_to_bank([mcq(self.sub.id, 1), mcq(self.sub.id, 2)])
        got = bank.pick([self.sub], n_mcq=1, n_struct=0, figures=0, teacher=self.teacher)
        self.assertEqual(got[0]["question_text"], "LCM of 12 and 18?")

    def test_edits_and_deletes_follow_the_editor(self):
        bank.sync_handwritten([self.sub])
        self.mcq.question_text = "Find the LCM of 12 and 18."
        self.mcq.save()
        got = bank.pick([self.sub], n_mcq=1, n_struct=0, figures=0, teacher=self.teacher)
        self.assertEqual(got[0]["question_text"], "Find the LCM of 12 and 18.")
        self.math.delete()
        bank.sync_handwritten([self.sub])
        self.assertFalse(BankQuestion.objects.filter(status="ok", source="teacher", qtype="structured").exists())

    def test_a_question_without_a_substrand_is_not_used(self):
        bank.sync_handwritten([self.sub])
        self.assertFalse(BankQuestion.objects.filter(data__question_text="unfiled").exists())
