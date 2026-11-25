"""Tables are marked against the key instantly; the AI is only a capped extra."""
import time
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

from questions import ai_grading
from questions.ai_grading import _grade_table


def _q(rows, max_marks=6):
    return SimpleNamespace(id=1, question_text="Complete the table.", correct_answer="", explanation="",
                           max_marks=max_marks, table_data={"rows": rows, "marking": "ai"},
                           subject=None, language="english")


INDICATORS = [
    [{"v": "Indicator", "e": False}, {"v": "Acidic Solution", "e": False}, {"v": "Basic Solution", "e": False}],
    [{"v": "Methyl orange", "e": False}, {"v": "", "e": True, "a": "Red"}, {"v": "", "e": True, "a": "Yellow"}],
    [{"v": "Litmus", "e": False}, {"v": "", "e": True, "a": "Red"}, {"v": "", "e": True, "a": "Blue"}],
    [{"v": "Phenolphthalein", "e": False}, {"v": "", "e": True, "a": "Colourless"}, {"v": "", "e": True, "a": "Pink"}],
]


def _no_ai(*a, **k):
    raise AssertionError("the AI must not be called for short keys")


class ShortKeysNeedNoAI(SimpleTestCase):
    def test_guessed_answers_are_marked_instantly(self):
        ans = {"1_1": "Blue", "1_2": "Red", "2_1": "red", "2_2": "Blue", "3_1": "colorless", "3_2": "Pink "}
        with mock.patch.object(ai_grading, "_call_ai", _no_ai):
            t = time.time()
            r = _grade_table(_q(INDICATORS), ans)
            self.assertLess(time.time() - t, 1)
        self.assertEqual(r["marks_awarded"], 4)              # litmus x2, colourless (typo), pink
        self.assertTrue(any("Methyl orange (Acidic Solution)" in m for m in r["points_missed"]))

    def test_all_right(self):
        ans = {"1_1": "Red", "1_2": "Yellow", "2_1": "Red", "2_2": "Blue", "3_1": "Colourless", "3_2": "Pink"}
        with mock.patch.object(ai_grading, "_call_ai", _no_ai):
            r = _grade_table(_q(INDICATORS), ans)
        self.assertTrue(r["is_correct"])

    def test_numbers_by_value_not_typo(self):
        rows = [[{"v": "n", "e": False}, {"v": "Square", "e": False}],
                [{"v": "7", "e": False}, {"v": "", "e": True, "a": "49"}],
                [{"v": "3", "e": False}, {"v": "", "e": True, "a": "9"}]]
        with mock.patch.object(ai_grading, "_call_ai", _no_ai):
            r = _grade_table(_q(rows, 2), {"1_1": "94", "2_1": "9.0"})
        self.assertEqual(r["marks_awarded"], 1)

    def test_unlabelled_rows_any_order(self):
        rows = [[{"v": "Device", "e": False}, {"v": "Role", "e": False}],
                [{"v": "", "e": True, "a": "Keyboard"}, {"v": "", "e": True, "a": "Input"}],
                [{"v": "", "e": True, "a": "Monitor"}, {"v": "", "e": True, "a": "Output"}]]
        ans = {"1_0": "Monitor", "1_1": "Output", "2_0": "Keyboard", "2_1": "Input"}
        with mock.patch.object(ai_grading, "_call_ai", _no_ai):
            r = _grade_table(_q(rows, 4), ans)
        self.assertTrue(r["is_correct"])


class PhraseKeysUseCappedAI(SimpleTestCase):
    ROWS = [[{"v": "Part", "e": False}, {"v": "Function", "e": False}],
            [{"v": "Root", "e": False}, {"v": "", "e": True, "a": "absorbs water and mineral salts from the soil"}]]

    def test_slow_ai_falls_back_to_key_match(self):
        def slow(*a, **k):
            time.sleep(3)
            return "MARKS: 2"
        with mock.patch.object(ai_grading, "_call_ai_now", slow), \
             mock.patch.object(ai_grading, "_call_claude", slow), \
             mock.patch.object(ai_grading, "AI_HARD_LIMIT", 1), \
             mock.patch.object(ai_grading, "TABLE_AI_DEADLINE_SECONDS", 0.5):
            t = time.time()
            r = _grade_table(_q(self.ROWS, 2), {"1_1": "takes in water"})
            self.assertLess(time.time() - t, 3)
        self.assertEqual(r["marks_awarded"], 0)
        self.assertIn("absorbs water", r["points_missed"][0])
        self.assertTrue(r["unmarked"])                      # not final, so never cached

    def test_ai_can_accept_a_rewording(self):
        with mock.patch.object(ai_grading, "_call_ai", lambda *a, **k: "MARKS: 2\nFEEDBACK: Good."):
            r = _grade_table(_q(self.ROWS, 2), {"1_1": "it takes up water and minerals from soil"})
        self.assertEqual(r["marks_awarded"], 2)
