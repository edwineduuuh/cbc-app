"""A question with parts keeps its per-part results, whatever its type."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from questions.views import _build_detailed_feedback


class PartResultsKept(SimpleTestCase):
    def test_math_question_with_parts_keeps_part_results(self):
        q = SimpleNamespace(id=8, question_type="math", question_text="Evaluate 540396 - 726450 / 3",
                            correct_answer="", explanation="")
        parts = [{"part_id": 1, "part_label": "a", "marks_awarded": 1, "max_marks": 1, "is_correct": True,
                  "feedback": "Good.", "study_tip": "Step 1: Divide first."},
                 {"part_id": 2, "part_label": "b", "marks_awarded": 0, "max_marks": 1, "is_correct": False,
                  "feedback": "Not quite.", "study_tip": "", "correct_answer": "8000"}]
        result = {"marks_awarded": 1, "max_marks": 2, "is_correct": False, "feedback": "(a) Good.\n\n(b) Not quite.",
                  "part_results": parts}
        fb = _build_detailed_feedback([q], [result], {"8": {"1": "298246", "2": "800"}}, {})["8"]
        self.assertEqual(fb["question_type"], "multipart")
        self.assertEqual([p["part_label"] for p in fb["part_results"]], ["a", "b"])
