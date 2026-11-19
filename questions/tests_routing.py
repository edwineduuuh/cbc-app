"""Per-service AI routing: defaults unchanged, profile switch, overrides,
fallbacks, Kiswahili on Claude, tutor pilot, PDFs stay on Claude, usage logged."""
from types import SimpleNamespace
from unittest import mock

from django.test import TestCase, override_settings

from questions import ai_routing, generation, studio, tutor
from questions.ai_routing import Route
from questions.models import ApiCall, Subject, Substrand, Topic


class Routes(TestCase):
    def test_defaults_keep_todays_models(self):
        self.assertIsNone(ai_routing.route_for("scheme"))                      # GEN_PROVIDER as before
        self.assertEqual(ai_routing.route_for("marking"), Route("anthropic", "claude-sonnet-4-6"))
        self.assertEqual(ai_routing.route_for("marking_kiswahili"), Route("anthropic", "claude-opus-4-8"))
        self.assertEqual(ai_routing.route_for("tutor").provider, "anthropic")

    @override_settings(AI_PROFILE="deepseek")
    def test_deepseek_profile_is_the_benchmarked_one(self):
        self.assertEqual(ai_routing.route_for("scheme"), Route("deepseek", "deepseek-flash"))
        self.assertEqual(ai_routing.route_for("lesson_plan"), Route("deepseek", "deepseek-flash"))
        for s in ("assessment", "pdf", "marking"):
            self.assertEqual(ai_routing.route_for(s), Route("deepseek", "deepseek-flash", True), s)
        self.assertEqual(ai_routing.route_for("marking_kiswahili"), Route("anthropic", "claude-opus-4-8"))
        self.assertEqual(ai_routing.route_for("tutor").provider, "anthropic")      # pilot off

    @override_settings(AI_PROFILE="deepseek", AI_TUTOR_PILOT=True)
    def test_tutor_pilot_switch(self):
        self.assertEqual(ai_routing.route_for("tutor"), Route("deepseek", "deepseek-flash", True))

    @override_settings(AI_PROFILE="deepseek", AI_ROUTE_OVERRIDES={"marking": "anthropic:claude-sonnet-4-6"})
    def test_one_service_can_be_overridden(self):
        self.assertEqual(ai_routing.route_for("marking"), Route("anthropic", "claude-sonnet-4-6"))
        self.assertEqual(ai_routing.route_for("scheme"), Route("deepseek", "deepseek-flash"))

    def test_task_names_map_to_services(self):
        m = ai_routing.service_for_task
        self.assertEqual([m("studio-scheme"), m("studio-lesson-plan"), m("assessment-mcq"),
                          m("assessment-review"), m("assessment-repair"), m("library_extract_read"),
                          m("library_extract_map"), m("diagram")],
                         ["scheme", "lesson_plan", "assessment", "assessment", "assessment", "pdf", "pdf", None])


class Generation(TestCase):
    @override_settings(AI_PROFILE="deepseek")
    def test_routed_call_uses_thinking_and_is_logged(self):
        seen = {}

        def fake(system, prompt, model, max_tokens, want_json, images=None, thinking=False):
            seen.update(model=model, thinking=thinking)
            return "ok", 10, 5
        with mock.patch.dict(generation._PROVIDERS, {"deepseek": fake}):
            self.assertEqual(generation.generate("p", task="assessment-mcq"), "ok")
        self.assertEqual(seen, {"model": "deepseek-flash", "thinking": True})
        call = ApiCall.objects.get(task="assessment-mcq")
        self.assertEqual((call.provider, call.tokens_in, call.tokens_out), ("deepseek", 10, 5))

    @override_settings(AI_PROFILE="deepseek")
    def test_deepseek_failure_falls_back_to_terra(self):
        def down(*a, **k):
            raise RuntimeError("deepseek down")

        def terra(system, prompt, model, max_tokens, want_json, images=None):
            return "from terra", 1, 1
        with mock.patch.dict(generation._PROVIDERS, {"deepseek": down, "openai": terra}):
            self.assertEqual(generation.generate("p", task="studio-scheme"), "from terra")
        self.assertEqual(list(ApiCall.objects.filter(task="studio-scheme").order_by("id")
                              .values_list("provider", flat=True)), ["deepseek", "openai"])

    def test_default_still_uses_gen_provider(self):
        def terra(system, prompt, model, max_tokens, want_json, images=None):
            return "t", 1, 1
        with mock.patch.dict(generation._PROVIDERS, {"openai": terra}):
            self.assertEqual(generation.generate("p", task="studio-scheme"), "t")


class Marking(TestCase):
    def test_kiswahili_stays_on_claude_opus_under_deepseek_profile(self):
        from questions import ai_grading
        with override_settings(AI_PROFILE="deepseek"), \
                mock.patch.object(ai_grading, "_call_claude", return_value="claude") as claude, \
                mock.patch.object(ai_grading, "_call_deepseek_marking", return_value="ds") as ds:
            self.assertEqual(ai_grading._call_ai("prompt", kiswahili=True), "claude")
            self.assertEqual(claude.call_args.kwargs["model"], "claude-opus-4-8")
            self.assertEqual(ai_grading._call_ai("prompt", kiswahili=False), "ds")
            ds.assert_called_once()

    def test_deepseek_marking_failure_falls_back_to_claude(self):
        from questions import ai_grading
        with override_settings(AI_PROFILE="deepseek"), \
                mock.patch.object(ai_grading, "_call_deepseek_marking", side_effect=RuntimeError("down")), \
                mock.patch.object(ai_grading, "_call_claude", return_value="claude") as claude:
            self.assertEqual(ai_grading._call_ai("prompt"), "claude")
            self.assertEqual(claude.call_args.kwargs["model"], "claude-sonnet-4-6")


class Tutor(TestCase):
    topic = SimpleNamespace(subject=SimpleNamespace(name="Mathematics"), grade=7, name="Fractions")

    @override_settings(AI_TUTOR_PILOT=True)
    def test_pilot_uses_deepseek_but_pdfs_stay_on_claude(self):
        with mock.patch.object(tutor, "_deepseek_chat", return_value="ds") as ds, \
                mock.patch.object(tutor, "_call_claude", return_value="claude") as claude:
            self.assertEqual(tutor.tutor_chat(self.topic, [{"role": "user", "content": "hi"}]), "ds")
            pdf = {"name": "x.pdf", "media_type": "application/pdf", "data": "JVBERi0="}
            self.assertEqual(tutor.tutor_chat(self.topic, [{"role": "user", "content": "see"}], attachment=pdf), "claude")
            ds.assert_called_once()

    @override_settings(AI_TUTOR_PILOT=True)
    def test_pilot_failure_falls_back_to_claude(self):
        with mock.patch.object(tutor, "_deepseek_chat", side_effect=RuntimeError("down")), \
                mock.patch.object(tutor, "_call_claude", return_value="claude"):
            self.assertEqual(tutor.tutor_chat(self.topic, [{"role": "user", "content": "hi"}]), "claude")

    def test_default_tutor_is_claude(self):
        with mock.patch.object(tutor, "_deepseek_chat") as ds, \
                mock.patch.object(tutor, "_call_claude", return_value="claude"):
            self.assertEqual(tutor.tutor_chat(self.topic, [{"role": "user", "content": "hi"}]), "claude")
            ds.assert_not_called()


class InquiryQuestion(TestCase):
    def test_kicd_wording_is_used(self):
        s = Substrand(name="Integers", inquiry_questions=["How do we carry out operations of integers in real-life situations?",
                                                          "How do we apply integers in daily activities?"])
        self.assertEqual(studio.kicd_inquiry_question("How can we use integers in our daily lives?", s, 0),
                         "How do we apply integers in daily activities?")
        self.assertEqual(studio.kicd_inquiry_question("", s, 1), "How do we apply integers in daily activities?")
        self.assertEqual(studio.kicd_inquiry_question("anything", Substrand(name="x", inquiry_questions=[]), 0), "anything")
        numbered = Substrand(name="y", inquiry_questions=["1. How do we work out the cubes of numbers?"])
        self.assertEqual(studio.kicd_inquiry_question("", numbered, 0), "How do we work out the cubes of numbers?")
