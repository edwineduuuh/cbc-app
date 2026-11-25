"""A part or answer that loses marks always says why - from the marker or the teacher's key."""
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

from questions import ai_grading as ag


def _q(key="", scheme=None, marks=2):
    return SimpleNamespace(id=9, question_type="structured", question_text="State two functions of xylem.",
                           correct_answer=key, correct_answers=None, max_marks=marks, explanation="",
                           marking_scheme=scheme,
                           topic=SimpleNamespace(grade=10, subject=SimpleNamespace(name="Biology")))


def _r(marks, fb, missed=None, mx=2):
    return {"marks_awarded": marks, "max_marks": mx, "feedback": fb, "points_missed": missed or []}


class LostMarksAreExplained(SimpleTestCase):
    def test_bare_verdict_gets_the_markers_missed_points(self):
        r = ag._ensure_lost_marks_reason(_r(1, "Partially correct.", ["Gives the stem support"]), _q(), "", False)
        self.assertEqual(r["feedback"], "Partially correct.\nWhat you missed:\nGives the stem support")

    def test_no_missed_points_uses_the_uncovered_key_points(self):
        scheme = {"points": [{"description": "Transports water and minerals", "marks": 1},
                             {"description": "Provides mechanical support to the plant", "marks": 1}]}
        r = ag._ensure_lost_marks_reason(_r(1, "Partially correct."), _q(scheme=scheme),
                                         "it transports water and minerals", False)
        self.assertIn("Provides mechanical support to the plant", r["feedback"])
        self.assertNotIn("Transports water", r["feedback"])
        self.assertEqual(r["points_missed"], ["Provides mechanical support to the plant"])

    def test_only_as_many_key_points_as_marks_lost(self):
        scheme = {"points": [{"description": f"Point number {w} here", "marks": 1}
                             for w in ("alpha", "bravo", "charlie", "delta")]}
        r = ag._ensure_lost_marks_reason(_r(1, "Partially correct."), _q(scheme=scheme), "nothing", False)
        self.assertEqual(len(r["points_missed"]), 1)

    def test_short_key_is_named(self):
        r = ag._ensure_lost_marks_reason(_r(0, "Not quite.", mx=1), _q(key="Phloem", marks=1), "xylem", False)
        self.assertEqual(r["feedback"], "Not quite.\nThe answer needed: Phloem")

    def test_real_feedback_is_left_alone(self):
        fb = "Partially correct.\nYou named transport of water but not support."
        r = ag._ensure_lost_marks_reason(_r(1, fb, ["support"]), _q(), "", False)
        self.assertEqual(r["feedback"], fb)

    def test_full_marks_and_unmarked_are_left_alone(self):
        self.assertEqual(ag._ensure_lost_marks_reason(_r(2, "Correct!"), _q(), "", False)["feedback"], "Correct!")
        u = dict(_r(0, ""), unmarked=True)
        self.assertEqual(ag._ensure_lost_marks_reason(u, _q(), "", False)["feedback"], "")

    def test_kiswahili(self):
        r = ag._ensure_lost_marks_reason(_r(1, "Sehemu ni sahihi.", ["Hoja ya pili"]), _q(), "", True)
        self.assertEqual(r["feedback"], "Sehemu ni sahihi.\nUlikosa:\nHoja ya pili")

    def test_ai_marker_returning_only_a_verdict_is_filled(self):
        reply = '{"marks_awarded": 1, "is_correct": false, "feedback": "Partially correct.", ' \
                '"points_earned": ["water"], "points_missed": ["Provides support"]}'
        q = _q(key="Transports water; provides support")
        with mock.patch.object(ag, "_call_ai", return_value=reply):
            r = ag._grade_with_ai(q, "transports water")
        self.assertEqual(r["marks_awarded"], 1)
        self.assertIn("What you missed:\nProvides support", r["feedback"])
