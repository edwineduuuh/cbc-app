"""Numeric answers: fractions, mixed numbers and a teacher's broken LaTeX key."""
from unittest import mock

from django.test import SimpleTestCase, TestCase

from questions import ai_grading
from questions.ai_grading import _balance_braces, _num_value, _rounds_to
from questions.models import Question, Subject, Topic


class NumValue(SimpleTestCase):
    def test_reads_what_people_write(self):
        third = 16 / 3
        for s, v in [("12", 12), ("-3.5", -3.5), ("1,200", 1200), ("16/3", third), ("5 1/3", third),
                     (r"\frac{16}{3}", third), (r"5\frac{1}{3}", third), (r"5\frac{1}{3", third),
                     (r"$5\dfrac{1}{3}$", third), ("5⅓", third), ("x = 4", 4)]:
            self.assertAlmostEqual(_num_value(s), v, msg=s)

    def test_not_a_plain_number(self):
        for s in ["3x + 2", "18 cm", "", r"\sqrt{2}"]:
            self.assertIsNone(_num_value(s), s)

    def test_braces_and_rounding(self):
        self.assertEqual(_balance_braces(r"5\frac{1}{3"), r"5\frac{1}{3}")
        self.assertTrue(_rounds_to("5.33", 16 / 3))
        self.assertTrue(_rounds_to("5.333", 16 / 3))
        self.assertFalse(_rounds_to("5.3", 16 / 3))      # 1 d.p. is a near miss, not exact
        self.assertFalse(_rounds_to("5.34", 16 / 3))


class BrokenKey(TestCase):
    """Teacher saved '5\\frac{1}{3' (missing brace). 5.3 used to get 0/3."""

    def setUp(self):
        subj = Subject.objects.create(name="Mathematics", slug="maths")
        topic = Topic.objects.create(subject=subj, grade=7, name="Equations", slug="eq")
        self.q = Question.objects.create(topic=topic, question_type="math", max_marks=3,
                                         question_text="Solve for $x$: $4x + 2(x - 6) = 20$",
                                         correct_answer=r"5\frac{1}{3")
        p = mock.patch.object(ai_grading, "grade_cache", mock.MagicMock(get=mock.MagicMock(return_value=None)))
        p.start()
        self.addCleanup(p.stop)

    def grade(self, ans):
        with mock.patch.object(ai_grading, "_call_ai", return_value="Step 1: Expand.") as ai:
            r = ai_grading.grade_answer(self.q, ans)
        return r, ai

    def test_exact_forms_get_full_marks(self):
        for ans in [r"5\frac{1}{3}", "16/3", "5 1/3", "5.33", "x = 5.333"]:
            r, _ = self.grade(ans)
            self.assertEqual(r["marks_awarded"], 3, ans)

    def test_one_decimal_place_is_a_near_miss_not_zero(self):
        r, _ = self.grade("5.3")
        self.assertEqual(r["marks_awarded"], 2)
        self.assertIn(r"5\frac{1}{3}", r["feedback"])         # the repaired key, not 5.33333
        self.assertNotIn(r"5\frac{1}{3 ", r["feedback"] + " ")

    def test_wrong_is_still_wrong(self):
        r, _ = self.grade("6")
        self.assertEqual(r["marks_awarded"], 0)
