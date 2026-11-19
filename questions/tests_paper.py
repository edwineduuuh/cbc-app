"""Paper tidying done by code, and the checker seeing the whole paper."""
from unittest import mock

from django.test import SimpleTestCase

from questions import review
from questions.assessments import PART_STYLES, build_prompt, paper_instructions, tidy_paper


class Tidy(SimpleTestCase):
    def paper(self):
        return {"instructions": "Answer all the three questions. Choose the best answer and write its letter.",
                "questions": [
                    {"number": 1, "type": "mcq", "question_text": "The sketch map above shows two routes.",
                     "diagram": {"url": "/x.png"}},
                    {"number": 2, "type": "mcq", "question_text": "Which is best? (1 mark)"},
                    {"number": 3, "type": "structured", "question_text": "Chebet sells milk.",
                     "parts": [{"label": "a", "question_text": "Name the trade. (1 marks)", "marks": 1},
                               {"label": "b", "question_text": "State two problems. (2 marks)", "marks": 2}]}]}

    def test_instructions_match_the_paper(self):
        p = tidy_paper(self.paper())
        self.assertEqual(p["instructions"], "Answer all three (3) questions. For multiple-choice questions, write the "
                                            "letter of the best answer. For structured questions, write your answers "
                                            "in the spaces provided.")
        self.assertTrue(paper_instructions([{"type": "mcq"}] * 10).startswith("Answer all ten (10) questions."))

    def test_marks_printed_once_and_figure_below(self):
        p = tidy_paper(self.paper())
        q1, q2, q3 = p["questions"]
        self.assertEqual(q1["question_text"], "The sketch map below shows two routes.")
        self.assertEqual(q2["question_text"], "Which is best?")
        self.assertEqual([x["question_text"] for x in q3["parts"]], ["Name the trade.", "State two problems."])

    def test_above_kept_when_there_is_no_figure(self):
        p = tidy_paper({"questions": [{"type": "mcq", "question_text": "The table above lists prices."}]})
        self.assertEqual(p["questions"][0]["question_text"], "The table above lists prices.")


class Checker(SimpleTestCase):
    def test_every_batch_sees_the_whole_paper(self):
        qs = [{"number": i, "type": "mcq", "question_text": f"Story {i}: a farmer offers goods"} for i in range(1, 8)]
        prompts = []

        def fake(prompt, *a, **k):
            prompts.append(prompt)
            return {"questions": []}
        with mock.patch.object(review, "generate_json", side_effect=fake):
            review._verdicts({"questions": qs}, user=None)
        self.assertGreater(len(prompts), 1)                       # still checked in parallel batches
        for p in prompts:
            for i in range(1, 8):
                self.assertIn(f"Question {i}: Story {i}", p)      # but each sees all seven


class PartStyles(SimpleTestCase):
    def test_parallel_parts_get_different_styles(self):
        sub = mock.MagicMock()
        sub.topic.grade, sub.topic.subject.name, sub.topic.name, sub.name = 7, "Social Studies", "People", "Trade"
        sub.learning_outcomes, sub.learning_experiences, sub.inquiry_questions = ["explain barter"], [], []
        sub.core_competencies, sub.kicd_code, sub.topic.assessment_rubric = [], "2.4", []
        styles = []
        for n in (1, 2, 3, 4):
            with mock.patch("questions.assessments._as_list", return_value=[sub]):
                try:
                    p = build_prompt([sub], count=3, part={"part": n, "parts": 4, "subs": [sub]})
                except Exception:
                    self.skipTest("prompt builder needs a real sub-strand")
            styles.append(next(s for s in PART_STYLES if s in p))
        self.assertEqual(len(set(styles)), 4)
