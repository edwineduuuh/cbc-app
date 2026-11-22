"""Every AI marking call is time-limited, and an AI failure is never a wrong mark."""
import time
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

from questions import ai_grading as ag


def _q(qt, key, marks=1, text="What is it?"):
    return SimpleNamespace(id=7, question_type=qt, question_text=text, correct_answer=key,
                           correct_answers=None, max_marks=marks, explanation="",
                           topic=SimpleNamespace(grade=6, subject=SimpleNamespace(name="Science")))


class Counter:
    def __init__(self, reply="FALSE", delay=0):
        self.calls, self.reply, self.delay = [], reply, delay

    def __call__(self, prompt, *a, **k):
        self.calls.append(prompt)
        time.sleep(self.delay)
        return self.reply


class Deadline(SimpleTestCase):
    def test_slow_ai_is_cut_off(self):
        with mock.patch.object(ag, "_call_ai_now", Counter(delay=3)):
            t = time.time()
            with self.assertRaises(ag.MarkingTimeout):
                ag._call_ai("hi", deadline=0.3)
            self.assertLess(time.time() - t, 1)

    def test_claude_client_has_no_hidden_retries(self):
        with mock.patch.object(ag.anthropic, "Anthropic") as A:
            ag._get_claude()
        self.assertEqual(A.call_args.kwargs["max_retries"], 0)
        self.assertLess(A.call_args.kwargs["timeout"], 60)


class FailureIsNotWrong(SimpleTestCase):
    def test_structured_ai_failure_is_unmarked(self):
        def boom(*a, **k):
            raise ag.MarkingTimeout("slow")
        with mock.patch.object(ag, "_call_ai_now", boom):
            r = ag._grade_with_ai(_q("structured", "The heart pumps blood round the body", 2),
                                  "it moves blood")
        self.assertTrue(r["unmarked"])
        self.assertNotIn("Not quite", r["feedback"])

    def test_unmarked_result_is_not_cached(self):
        q = _q("structured", "x", 2)
        q.parts = SimpleNamespace(all=lambda: [])
        unmarked = ag._unmarked_result(2)
        with mock.patch.object(ag, "_route", return_value=unmarked), \
             mock.patch.object(ag, "_augment_feedback", lambda q, r: r), \
             mock.patch.object(ag.grade_cache, "get", return_value=None), \
             mock.patch.object(ag.grade_cache, "set") as cache_set:
            ag.grade_answer(q, "anything")
        cache_set.assert_not_called()


class KeyFirst(SimpleTestCase):
    def test_short_structured_key_needs_no_ai(self):
        def no_ai(*a, **k):
            raise AssertionError("AI called")
        with mock.patch.object(ag, "_call_ai_now", no_ai):
            r = ag._grade_with_ai(_q("structured", "Photosynthesis", 2), "photosynthesis.")
        self.assertEqual(r["marks_awarded"], 2)


class MathSpeed(SimpleTestCase):
    def setUp(self):
        self.store = {}
        self.p1 = mock.patch.object(ag.grade_cache, "get", side_effect=lambda k: self.store.get(k))
        self.p2 = mock.patch.object(ag.grade_cache, "set", side_effect=lambda k, v, t=None: self.store.__setitem__(k, v))
        self.p1.start(); self.p2.start()

    def tearDown(self):
        self.p1.stop(); self.p2.stop()

    def test_working_is_written_once_per_question(self):
        ai = Counter(reply="Step 1: 3 + 4 = 7")
        with mock.patch.object(ag, "_call_ai_now", ai):
            a = ag._grade_math(_q("math", "7", text="3 + 4"), "7")
            b = ag._grade_math(_q("math", "7", text="3 + 4"), "7")
        self.assertTrue(a["is_correct"] and b["is_correct"])
        self.assertEqual(len(ai.calls), 1)

    def test_plainly_wrong_number_skips_the_verdict(self):
        ai = Counter(reply="Step 1: ...")
        with mock.patch.object(ag, "_call_ai_now", ai):
            r = ag._grade_math(_q("math", "28", text="next in 99, 80, 63, 50, 39"), "32")
        self.assertEqual(r["marks_awarded"], 0)
        self.assertEqual(len(ai.calls), 1, [c[:80] for c in ai.calls])  # the solution only

    def test_verdict_and_solution_run_together(self):
        ai = Counter(reply="FALSE", delay=0.6)
        with mock.patch.object(ag, "_call_ai_now", ai):
            t = time.time()
            ag._grade_math(_q("math", "2x + 3", text="Simplify x + x + 3"), "x squared")
            self.assertLess(time.time() - t, 1.1)        # 2 calls of 0.6s, in parallel
        self.assertEqual(len(ai.calls), 2)

    def test_no_verdict_is_unmarked(self):
        def boom(prompt, *a, **k):
            raise ag.MarkingTimeout("slow")
        with mock.patch.object(ag, "_call_ai_now", boom):
            r = ag._grade_math(_q("math", "2x + 3", text="Simplify x + x + 3"), "x squared")
            time.sleep(0.2)                                # let the abandoned call settle
        self.assertTrue(r["unmarked"])
