"""MCQ explanations respond to the learner's choice; the teacher's
explanation is the source, never pasted under the result."""
import json
from unittest import mock

from django.test import TestCase

from questions import ai_grading
from questions.models import Question, Subject, Topic

TEACHER = "Barter needs a double coincidence of wants: each trader must want what the other has."


class ChoiceExplanations(TestCase):
    def setUp(self):
        patcher = mock.patch.object(ai_grading, "grade_cache", mock.MagicMock(get=mock.MagicMock(return_value=None)))
        patcher.start()
        self.addCleanup(patcher.stop)
        subj = Subject.objects.create(name="Social Studies", slug="ss")
        topic = Topic.objects.create(subject=subj, grade=7, name="Trade", slug="trade")
        self.q = Question.objects.create(
            topic=topic, question_type="mcq", max_marks=1,
            question_text="Why did traders adopt cowrie shells?",
            option_a="A trader could not always find someone who wanted his goods",
            option_b="Goods were useless elsewhere", option_c="Camels could only carry shells",
            option_d="Different languages", correct_answer="A", explanation=TEACHER)

    def fake(self, prompt, working_image=None, max_tokens=500, kiswahili=False):
        chosen = prompt.split("chose: ")[1][:1]
        self.prompts.append(prompt)
        return json.dumps({"explanation": f"Written for choice {chosen}."})

    def test_explanation_depends_on_the_choice_and_is_cached_per_option(self):
        self.prompts = []
        with mock.patch.object(ai_grading, "_call_ai", side_effect=self.fake):
            wrong = ai_grading.grade_answer(self.q, "C")
            right = ai_grading.grade_answer(self.q, "A")
            again = ai_grading.grade_answer(Question.objects.get(pk=self.q.pk), "C")
        self.assertIn("Written for choice C.", wrong["feedback"])
        self.assertTrue(wrong["feedback"].startswith("Not quite. The correct answer is Option A"))
        self.assertIn("Written for choice A.", right["feedback"])
        self.assertEqual(again["feedback"], wrong["feedback"])
        self.assertEqual(len(self.prompts), 2)                       # C and A, then C from cache
        self.assertIn(TEACHER, self.prompts[0])                      # the teacher's text is the source...
        self.assertNotIn(TEACHER, wrong["feedback"])                 # ...but is not shown

    def test_changing_the_teacher_explanation_refreshes_the_cache(self):
        self.prompts = []
        with mock.patch.object(ai_grading, "_call_ai", side_effect=self.fake):
            ai_grading.grade_answer(self.q, "B")
            Question.objects.filter(pk=self.q.pk).update(explanation="Money solved barter's problems.")
            ai_grading.grade_answer(Question.objects.get(pk=self.q.pk), "B")
        self.assertEqual(len(self.prompts), 2)

    def test_kiswahili_without_teacher_explanation_gets_no_ai(self):
        sw = Subject.objects.create(name="Kiswahili", slug="kisw")
        t = Topic.objects.create(subject=sw, grade=7, name="Sarufi", slug="sarufi")
        q = Question.objects.create(topic=t, question_type="mcq", max_marks=1, question_text="Wingi wa mtoto?",
                                    option_a="watoto", option_b="mitoto", correct_answer="A", explanation="")
        with mock.patch.object(ai_grading, "_call_ai") as ai:
            r = ai_grading.grade_answer(q, "B")
        ai.assert_not_called()
        self.assertIn("Jibu sahihi ni A) watoto", r["feedback"])

    def test_ai_failure_still_marks(self):
        with mock.patch.object(ai_grading, "_call_ai", side_effect=RuntimeError("down")):
            r = ai_grading.grade_answer(self.q, "A")
        self.assertEqual((r["marks_awarded"], r["is_correct"]), (1, True))

    def test_teacher_explanation_is_not_appended_to_structured_feedback(self):
        res = ai_grading._augment_feedback(self.q, {"feedback": "You named two materials.", "is_correct": True})
        self.assertNotIn(TEACHER, res["feedback"])
        self.assertNotIn("Explanation:", res["feedback"])
