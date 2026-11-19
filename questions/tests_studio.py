"""Schemes of work, lesson plans and records of work."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import caches
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from questions import studio
from questions.models import GeneratedOutput, Question, Subject, Substrand, Topic

User = get_user_model()


def client_for(u):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(u).access_token}")
    return c


class Base(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.core.management import call_command
        call_command("createcachetable", verbosity=0)   # production does this on boot

    def setUp(self):
        caches["grades"].clear()
        self.fac = User.objects.create_user("fac", "f@x.invalid", "pw-123456", role="teacher")
        self.stu = User.objects.create_user("stu", "s@x.invalid", "pw-123456", role="student")
        self.maths = Subject.objects.create(name="Mathematics", slug="maths")
        # Deliberately created out of order: KICD codes decide the order.
        alg = Topic.objects.create(subject=self.maths, grade=7, name="Algebra", slug="alg", kicd_code="2.0")
        num = Topic.objects.create(subject=self.maths, grade=7, name="Numbers", slug="num", kicd_code="1.0")
        self.fractions = Substrand.objects.create(topic=num, name="Fractions", kicd_code="1.2",
                                                  suggested_duration="3 lessons",
                                                  learning_outcomes=["add fractions", "subtract fractions"],
                                                  learning_experiences=["use fraction strips"],
                                                  inquiry_questions=["Where do we use fractions?"])
        self.whole = Substrand.objects.create(topic=num, name="Whole Numbers", kicd_code="1.1",
                                              suggested_duration="2 lessons",
                                              learning_outcomes=["read numbers", "write numbers"])
        self.expr = Substrand.objects.create(topic=alg, name="Algebraic Expressions", kicd_code="2.1",
                                             suggested_duration="4 lessons",
                                             learning_outcomes=["form expressions", "simplify expressions"],
                                             core_competencies=["Core Competencies to be developed:",
                                                                "Critical thinking: simplifying"])
        alg.assessment_rubric = [{"indicator": "Forms expressions", "meets": "correctly"}]
        alg.save()
        for i in range(4):
            Question.objects.create(topic=alg, substrand=self.expr, question_type="mcq",
                                    question_text=f"Simplify {i}x + x", option_a=f"{i + 1}x", option_b="x",
                                    correct_answer="A")

    @staticmethod
    def fake_breakdown(prompt, system="", **kw):
        n = int(prompt.split("Split this sub-strand into exactly ")[1].split()[0])
        return {"lessons": [{"outcomes": [f"outcome {k + 1}"], "experiences": ["discuss"],
                             "inquiry_question": "Why?", "resources": ["chart"],
                             "assessment": ["oral questions"]} for k in range(n)]}


class TermPlan(Base):
    def test_order_follows_kicd_codes(self):
        subs = studio.ordered_substrands(7, self.maths.id)
        self.assertEqual([s.name for s in subs], ["Whole Numbers", "Fractions", "Algebraic Expressions"])

    def test_lessons_laid_out_with_break_weeks_and_revision(self):
        subs = studio.ordered_substrands(7, self.maths.id)
        rows, warnings = studio.plan_term(subs, weeks=4, lessons_per_week=3, break_weeks={"2": "Half-term"})
        self.assertEqual(rows[3], {"week": 2, "break": "Half-term"})
        lessons = [r for r in rows if "break" not in r]
        self.assertEqual(len(lessons), 9)                       # 3 teaching weeks x 3
        self.assertEqual([r["substrand"] for r in lessons[:2]], ["Whole Numbers"] * 2)
        self.assertEqual(lessons[-1]["substrand"], "Algebraic Expressions")
        self.assertEqual(sum(1 for r in lessons if r["substrand_id"]), 9)

    def test_spare_room_is_filled_by_stretching_not_revision(self):
        subs = studio.ordered_substrands(7, self.maths.id, [self.whole.topic_id])   # 2 + 3 lessons
        rows, warnings = studio.plan_term(subs, weeks=2, lessons_per_week=5)        # 10 slots
        names = [r["substrand"] for r in rows]
        self.assertNotIn("Revision", names)
        self.assertEqual((names.count("Whole Numbers"), names.count("Fractions")), (4, 6))
        self.assertEqual(rows[0]["of"], 4)
        self.assertFalse(warnings)

    def test_revision_only_when_asked_for(self):
        subs = studio.ordered_substrands(7, self.maths.id, [self.whole.topic_id])
        rows, _ = studio.plan_term(subs, weeks=2, lessons_per_week=5, reserve=3)
        names = [r["substrand"] for r in rows]
        self.assertEqual(names[-3:], ["Revision", "Revision", "End-of-term assessment"])

    def test_too_much_for_the_term_is_squeezed_and_said(self):
        subs = studio.ordered_substrands(7, self.maths.id)
        rows, warnings = studio.plan_term(subs, weeks=1, lessons_per_week=4)
        self.assertEqual(len(rows), 4)
        self.assertEqual({r["substrand"] for r in rows},
                         {"Whole Numbers", "Fractions", "Algebraic Expressions"})   # none dropped
        self.assertIn("fewer lessons", warnings[0])

    def test_whole_subject_terms_follow_on(self):
        subs = studio.ordered_substrands(7, self.maths.id)          # 9 lessons over the year
        t1, _ = studio.plan_term(subs, weeks=3, lessons_per_week=1, term=1, whole_subject=True)
        t3, _ = studio.plan_term(subs, weeks=3, lessons_per_week=1, term=3, whole_subject=True)
        self.assertEqual(t1[0]["substrand"], "Whole Numbers")
        self.assertEqual(t3[-1]["substrand"], "Algebraic Expressions")


class Scheme(Base):
    def inputs(self, **kw):
        return {"grade": 7, "subject": self.maths.id, "strands": [], "term": 1, "weeks": 3,
                "lessons_per_week": 3, "break_weeks": {}, "start_date": "2027-01-04", **kw}

    def test_scheme_rows_are_filled_and_breakdowns_cached(self):
        with mock.patch("questions.studio.generate_json", side_effect=self.fake_breakdown) as ai:
            strands = [self.whole.topic_id, self.expr.topic_id]
            p = studio.build_scheme(self.inputs(strands=strands))
            calls = ai.call_count
            studio.build_scheme(self.inputs(strands=strands))
            self.assertEqual(ai.call_count, calls)                 # second teacher: from cache
        first = p["rows"][0]
        self.assertEqual(first["outcomes"], ["outcome 1"])
        self.assertEqual(first["dates"], "04 Jan - 08 Jan")
        expr_row = next(r for r in p["rows"] if r.get("substrand") == "Algebraic Expressions")
        self.assertEqual(expr_row["practice_questions"], 4)       # vetted bank link

    def test_scheme_still_made_from_kicd_when_ai_is_down(self):
        with mock.patch("questions.studio.generate_json", side_effect=RuntimeError("down")):
            p = studio.build_scheme(self.inputs(weeks=2))
        self.assertEqual(p["rows"][0]["outcomes"], ["read numbers"])
        self.assertTrue(any("KICD design" in w for w in p["warnings"]))

    def test_wrong_lesson_count_from_ai_falls_back(self):
        with mock.patch("questions.studio.generate_json", return_value={"lessons": [{"outcomes": ["x"]}]}):
            lessons, src = studio.lesson_breakdown(self.fractions, 3)
        self.assertEqual((len(lessons), src), (3, "kicd"))


class LessonPlan(Base):
    def test_timings_always_add_up(self):
        plan = {"introduction": {"minutes": 7}, "development": [{"minutes": 13}, {"minutes": 19}],
                "conclusion": {"minutes": 3}}
        studio.fix_timings(plan, 35)
        total = plan["introduction"]["minutes"] + sum(s["minutes"] for s in plan["development"]) \
            + plan["conclusion"]["minutes"]
        self.assertEqual(total, 35)

    def test_plan_has_rubric_and_bank_quick_check(self):
        ai = {"outcomes": ["form expressions"], "introduction": {"minutes": 5, "teacher": "t", "learners": "l"},
              "development": [{"title": "Step 1", "minutes": 50, "teacher": "t", "learners": "l"}],
              "conclusion": {"minutes": 5, "teacher": "t", "learners": "l"}}
        with mock.patch("questions.studio.generate_json", return_value=ai):
            p = studio.build_lesson_plan({"substrand": self.expr.id, "minutes": 40})
        plan = p["plan"]
        self.assertEqual(plan["introduction"]["minutes"] + plan["development"][0]["minutes"]
                         + plan["conclusion"]["minutes"], 40)
        self.assertNotIn("rubric", plan)
        self.assertEqual(len(plan["quick_check"]), 3)
        self.assertTrue(all(q["question"].startswith("Simplify") for q in plan["quick_check"]))


class Endpoints(Base):
    def test_students_cannot_use_the_tools(self):
        c = client_for(self.stu)
        for url in ("/api/facilitator/schemes/generate/", "/api/facilitator/plans/generate/",
                    "/api/facilitator/records/"):
            self.assertEqual(c.post(url, {}, format="json").status_code, 403, url)

    @mock.patch("questions.studio_views.launch")
    def test_scheme_then_plan_from_a_row_then_record(self, launch):
        c = client_for(self.fac)
        r = c.post("/api/facilitator/schemes/generate/",
                   {"grade": 7, "subject": self.maths.id, "weeks": 3, "lessons_per_week": 3,
                    "break_weeks": {"2": "Half-term"}, "school": "Kilimani JS"}, format="json")
        self.assertEqual(r.status_code, 202, r.content)
        launch.assert_called_once()
        scheme = GeneratedOutput.objects.get(pk=r.json()["id"])
        with mock.patch("questions.studio.generate_json", side_effect=self.fake_breakdown):
            scheme.payload = studio.build_scheme(scheme.inputs)
        scheme.status = "ready"
        scheme.save()

        r = c.post("/api/facilitator/plans/generate/", {"scheme_id": scheme.id, "row": 0, "minutes": 40},
                   format="json")
        self.assertEqual(r.status_code, 202, r.content)
        plan = GeneratedOutput.objects.get(pk=r.json()["id"])
        self.assertEqual(plan.inputs["substrand"], self.whole.id)
        self.assertEqual(plan.inputs["school"], "Kilimani JS")         # carried from the scheme
        self.assertEqual(plan.inputs["scheme_row"]["outcomes"], ["outcome 1"])

        r = c.post("/api/facilitator/records/", {"scheme_id": scheme.id, "tsc_number": "123456",
                                                 "start_date": "2027-01-04"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        rec = GeneratedOutput.objects.get(pk=r.json()["id"])
        weeks = rec.payload["weeks"]
        self.assertEqual(weeks[1]["break"], "Half-term")
        self.assertEqual(len(weeks[0]["rows"]), 3)
        self.assertEqual(weeks[0]["rows"][0]["status"], "")
        self.assertEqual(weeks[2]["monday"], "2027-01-18")
        self.assertEqual(rec.source_id, scheme.id)

    def test_record_from_scratch_is_instant(self):
        r = client_for(self.fac).post("/api/facilitator/records/",
                                      {"grade": 7, "subject": self.maths.id, "weeks": 2,
                                       "lessons_per_week": 2}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["status"], "ready")

    def test_other_teachers_schemes_are_off_limits(self):
        other = User.objects.create_user("o", "o@x.invalid", "pw-123456", role="teacher")
        s = GeneratedOutput.objects.create(teacher=other, tool="scheme_of_work", title="x",
                                           payload={"rows": []}, inputs={}, status="ready")
        r = client_for(self.fac).post("/api/facilitator/records/", {"scheme_id": s.id}, format="json")
        self.assertEqual(r.status_code, 400)


class SchoolWeekNumbers(Base):
    def test_first_week_number_and_breaks_use_school_numbering(self):
        subs = studio.ordered_substrands(7, self.maths.id)
        rows, _ = studio.plan_term(subs, weeks=3, lessons_per_week=2, first_week=4,
                                   break_weeks={"5": "Half-term"})
        self.assertEqual([r["week"] for r in rows], [4, 4, 5, 6, 6])
        self.assertEqual(rows[2]["break"], "Half-term")

    def test_teacher_notes_bypass_the_shared_cache(self):
        with mock.patch("questions.studio.generate_json", side_effect=self.fake_breakdown) as ai:
            studio.lesson_breakdown(self.fractions, 3)
            studio.lesson_breakdown(self.fractions, 3, notes="rural school, no lab")
        self.assertEqual(ai.call_count, 2)
        self.assertIn("rural school", ai.call_args_list[1][0][0])


class Names(Base):
    def test_glued_names_are_tidied(self):
        self.assertEqual(studio.clean_name("Integers Simple and combined operations on Integers"), "Integers")
        self.assertEqual(studio.clean_name("Cubes and Cube Roots"), "Cubes and Cube Roots")

    def test_missing_duration_takes_the_siblings_average(self):
        self.fractions.suggested_duration = ""
        self.fractions.save()
        subs = studio.ordered_substrands(7, self.maths.id)          # 2, ?, 4 -> ? = 3
        rows, _ = studio.plan_term(subs, weeks=1, lessons_per_week=9)
        self.assertEqual(sum(1 for r in rows if r["substrand"] == "Fractions"), 3)
