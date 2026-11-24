import datetime
import io

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from . import engine
from .config import level_for, save_config
from .models import (TriviaAchievement, TriviaAnswer, TriviaCategory, TriviaGame, TriviaPlayerAchievement,
                     TriviaProfile, TriviaQuestion, TriviaXP)

User = get_user_model()


def client_for(user):
    c = APIClient(HTTP_HOST="localhost")
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


def make_q(cat, text, *, diff="easy", qtype="mcq", status="published", correct=0, **kw):
    opts = kw.pop("options", ["Right", "Wrong 1", "Wrong 2", "Wrong 3"])
    if qtype == "true_false":
        opts = ["True", "False"]
    if qtype == "short":
        opts, correct = [], None
    return TriviaQuestion.objects.create(category=cat, text=text, difficulty=diff, qtype=qtype, status=status,
                                         options=opts, correct_index=correct,
                                         explanation=kw.pop("explanation", "Because."),
                                         fingerprint=engine.fingerprint(text), **kw)


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.student = User.objects.create_user("kid1", "kid1@example.invalid", "pw-12345!", role="student",
                                               grade=7, first_name="Amani", last_name="Otieno")
        cls.other = User.objects.create_user("kid2", "kid2@example.invalid", "pw-12345!", role="student", grade=7)
        cls.teacher = User.objects.create_user("tch", "tch@example.invalid", "pw-12345!", role="teacher")
        cls.admin = User.objects.create_user("adm", "adm@example.invalid", "pw-12345!", role="admin")
        cls.sci = TriviaCategory.objects.get(slug="science")
        cls.geo = TriviaCategory.objects.get(slug="geography")
        cls.qs = [make_q(cls.sci, f"Science question number {i}?") for i in range(12)]
        cls.draft = make_q(cls.sci, "Unpublished secret question?", status="draft")

    def setUp(self):
        from django.core.cache import cache
        cache.clear()                                 # rate-limit counters from earlier tests
        self.c = client_for(self.student)

    def play(self, mode="quick", right=True, **body):
        r = self.c.post("/api/trivia/games/start/", {"mode": mode, **body}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        gid, q = r.json()["game"]["id"], r.json()["question"]
        last = None
        while True:
            game = TriviaGame.objects.get(pk=gid)
            correct_original = TriviaQuestion.objects.get(pk=game.question_ids[q["position"]]).correct_index
            shown = game.shown_order.index(correct_original)
            pick = shown if right else (shown + 1) % len(q["options"])
            last = self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": q["position"], "answer": pick},
                               format="json").json()
            if last["game_over"]:
                return gid, last
            q = self.c.get(f"/api/trivia/games/{gid}/question/").json()
            if q.get("done"):
                return gid, self.c.post(f"/api/trivia/games/{gid}/finish/").json()


class Gameplay(Base):
    def test_answers_are_never_sent_before_answering(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "quick"}, format="json").json()
        q = r["question"]
        self.assertNotIn("correct_index", q)
        self.assertNotIn("explanation", q)
        self.assertEqual(len(q["options"]), 4)
        self.assertEqual(r["game"]["total"], 10)

    def test_unpublished_questions_never_appear(self):
        for _ in range(5):
            g = engine.start_game(self.student, "quick")
            self.assertNotIn(self.draft.pk, g.question_ids)

    def test_full_correct_game_scores_xp_and_badges(self):
        gid, last = self.play(right=True)
        res = last["results"]
        self.assertEqual(res["correct"], 10)
        self.assertEqual(res["accuracy"], 100)
        self.assertGreaterEqual(res["score"], 10 * 100)            # 100 a question + speed bonus
        self.assertLessEqual(res["score"], 10 * 150)
        codes = {b["code"] for b in res["new_badges"]}
        self.assertIn("first-game", codes)
        self.assertIn("perfect-round", codes)
        prof = TriviaProfile.objects.get(user=self.student)
        self.assertEqual(prof.games_played, 1)
        self.assertEqual(prof.xp, 10 * 10 + sum(b["xp"] for b in res["new_badges"]))
        self.assertEqual(len(res["review"]), 10)
        self.assertTrue(res["review"][0]["explanation"])

    def test_wrong_answers_score_nothing_and_reset_streak(self):
        gid, last = self.play(right=False)
        self.assertEqual(last["results"]["score"], 0)
        self.assertEqual(TriviaProfile.objects.get(user=self.student).current_streak, 0)

    def test_cannot_answer_twice_or_a_different_question(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "quick"}, format="json").json()
        gid, pos = r["game"]["id"], r["question"]["position"]
        self.assertEqual(self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": pos + 1, "answer": 0},
                                     format="json").status_code, 409)
        self.assertEqual(self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": pos, "answer": 0},
                                     format="json").status_code, 200)
        self.assertEqual(self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": pos, "answer": 0},
                                     format="json").status_code, 409)
        self.assertEqual(TriviaAnswer.objects.filter(game_id=gid).count(), 1)

    def test_late_answer_is_timed_out_by_the_server_clock(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "quick"}, format="json").json()
        gid = r["game"]["id"]
        g = TriviaGame.objects.get(pk=gid)
        g.served_at = timezone.now() - datetime.timedelta(seconds=60)
        g.save()
        right = g.shown_order.index(0)
        out = self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": 0, "answer": right},
                          format="json").json()
        self.assertTrue(out["timed_out"])
        self.assertFalse(out["correct"])
        self.assertEqual(out["points"], 0)

    def test_speed_bonus(self):
        g = engine.start_game(self.student, "quick")
        engine.serve(g)
        g.refresh_from_db()
        out = engine.submit(g, 0, g.shown_order.index(0))
        self.assertGreater(out["points"], 140)                    # instant: close to the full 50 bonus
        engine.serve(g)
        g.refresh_from_db()
        g.served_at = timezone.now() - datetime.timedelta(seconds=19)
        g.save()
        out = engine.submit(g, 1, g.shown_order.index(0))
        self.assertLess(out["points"], 110)

    def test_scores_from_the_client_are_ignored(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "quick"}, format="json").json()
        gid = r["game"]["id"]
        out = self.c.post(f"/api/trivia/games/{gid}/answer/",
                          {"position": 0, "answer": 0, "score": 99999, "points": 99999}, format="json").json()
        self.assertLessEqual(out["score"], 150)

    def test_xp_is_paid_once(self):
        gid, _ = self.play(right=True)
        xp = TriviaProfile.objects.get(user=self.student).xp
        self.c.post(f"/api/trivia/games/{gid}/finish/")
        self.c.post(f"/api/trivia/games/{gid}/finish/")
        self.assertEqual(TriviaProfile.objects.get(user=self.student).xp, xp)
        self.assertEqual(TriviaXP.objects.filter(game_id=gid, reason="answers").count(), 1)

    def test_abandoned_game_earns_nothing(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "quick"}, format="json").json()
        gid = r["game"]["id"]
        g = TriviaGame.objects.get(pk=gid)
        self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": 0, "answer": g.shown_order.index(0)},
                    format="json")
        res = self.c.post(f"/api/trivia/games/{gid}/finish/", {"abandon": True}, format="json").json()
        self.assertEqual(res["status"], "abandoned")
        self.assertEqual(TriviaProfile.objects.get(user=self.student).xp, 0)

    def test_daily_xp_cap(self):
        save_config({"xp_daily_cap": 30})
        self.play(right=True)
        self.assertEqual(TriviaXP.objects.filter(user=self.student, reason="answers").first().amount, 30)

    def test_survival_ends_on_first_miss(self):
        r = self.c.post("/api/trivia/games/start/", {"mode": "survival"}, format="json").json()
        gid = r["game"]["id"]
        g = TriviaGame.objects.get(pk=gid)
        ok = self.c.post(f"/api/trivia/games/{gid}/answer/", {"position": 0, "answer": g.shown_order.index(0)},
                         format="json").json()
        self.assertFalse(ok["game_over"])
        self.c.get(f"/api/trivia/games/{gid}/question/")
        g.refresh_from_db()
        miss = self.c.post(f"/api/trivia/games/{gid}/answer/",
                           {"position": 1, "answer": (g.shown_order.index(0) + 1) % 4}, format="json").json()
        self.assertTrue(miss["game_over"])
        self.assertEqual(miss["results"]["correct"], 1)
        self.assertEqual(TriviaProfile.objects.get(user=self.student).best_survival, 1)

    def test_true_false_and_short_answer(self):
        tf = make_q(self.geo, "Nairobi is the capital of Kenya.", qtype="true_false", correct=0)
        sa = make_q(self.geo, "What is the capital of Kenya?", qtype="short", accepted_answers=["Nairobi"])
        g = TriviaGame.objects.create(user=self.student, mode="quick", question_ids=[tf.pk, sa.pk], total=2)
        q = engine.serve(g)
        self.assertEqual(q["options"], ["True", "False"])
        self.assertTrue(engine.submit(g, 0, 0)["correct"])
        q = engine.serve(g)
        self.assertNotIn("options", q)
        out = engine.submit(g, 1, "  the NAIROBI ")
        self.assertTrue(out["correct"])
        self.assertTrue(out["game_over"])

    def test_category_and_picture_modes_use_the_right_questions(self):
        geo_q = [make_q(self.geo, f"Geography q {i}?") for i in range(3)]
        g = engine.start_game(self.student, "category", category_id=self.geo.pk)
        self.assertEqual(set(g.question_ids), {q.pk for q in geo_q})
        with self.assertRaises(engine.GameError):
            engine.start_game(self.student, "picture")             # no picture questions yet

    def test_questions_for_older_grades_are_left_out(self):
        senior = make_q(self.geo, "Senior only?", min_grade=10)
        for _ in range(5):
            self.assertNotIn(senior.pk, engine.start_game(self.student, "quick").question_ids)

    def test_old_reviews_survive_edits_and_deletes(self):
        gid, _ = self.play(right=True)
        first = TriviaAnswer.objects.filter(game_id=gid).first()
        text = first.snapshot["text"]
        first.question.delete()
        res = self.c.get(f"/api/trivia/games/{gid}/").json()
        self.assertEqual(res["review"][0]["text"], text)


class Daily(Base):
    def test_one_official_attempt_and_same_questions_for_everyone(self):
        gid, _ = self.play(mode="daily")
        r = self.c.post("/api/trivia/games/start/", {"mode": "daily"}, format="json")
        self.assertEqual(r.status_code, 409)
        mine = TriviaGame.objects.get(pk=gid).question_ids
        theirs = engine.start_game(self.other, "daily").question_ids
        self.assertEqual(mine, theirs)
        prof = TriviaProfile.objects.get(user=self.student)
        self.assertEqual(prof.daily_done, 1)
        self.assertTrue(TriviaPlayerAchievement.objects.filter(user=self.student,
                                                                achievement__code="daily-challenger").exists())
        self.assertEqual(TriviaXP.objects.filter(user=self.student, reason="daily").count(), 1)

    def test_daily_resumes_instead_of_restarting(self):
        g1 = engine.start_game(self.student, "daily")
        g2 = engine.start_game(self.student, "daily")
        self.assertEqual(g1.pk, g2.pk)


class Badges(Base):
    def test_admin_made_badge_unlocks(self):
        TriviaAchievement.objects.create(code="two-games", name="Two Games", description="Play 2.",
                                         condition="games", threshold=2, xp_reward=5)
        self.play()
        self.assertFalse(TriviaPlayerAchievement.objects.filter(achievement__code="two-games").exists())
        self.play()
        self.assertTrue(TriviaPlayerAchievement.objects.filter(achievement__code="two-games").exists())

    def test_levels(self):
        self.assertEqual(level_for(0)["level"], 1)
        self.assertEqual(level_for(250)["name"], "Thinker")
        self.assertEqual(level_for(10 ** 6)["level"], 10)


class Leaderboards(Base):
    def test_ranks_without_personal_details(self):
        self.play()
        TriviaProfile.objects.update_or_create(user=self.other, defaults={"xp": 5})
        r = self.c.get("/api/trivia/leaderboard/?board=overall").json()
        self.assertEqual(r["rows"][0]["name"], "Amani O.")
        self.assertTrue(r["rows"][0]["you"])
        self.assertNotIn("kid1@example.invalid", str(r))
        self.assertEqual(r["you"]["rank"], 1)
        weekly = self.c.get("/api/trivia/leaderboard/?board=weekly").json()
        self.assertEqual(weekly["rows"][0]["rank"], 1)
        cat = self.c.get(f"/api/trivia/leaderboard/?board=category&category={self.sci.pk}").json()
        self.assertGreater(cat["rows"][0]["value"], 0)

    def test_opt_out_hides_you_from_others(self):
        self.play()
        self.c.post("/api/trivia/profile/", {"show_on_leaderboard": False}, format="json")
        r = client_for(self.other).get("/api/trivia/leaderboard/?board=overall").json()
        self.assertEqual(r["rows"], [])

    def test_admin_can_switch_boards_off(self):
        save_config({"leaderboards": {"weekly": False}})
        self.assertEqual(self.c.get("/api/trivia/leaderboard/?board=weekly").status_code, 404)


class Permissions(Base):
    def test_teachers_and_strangers_cannot_play(self):
        self.assertEqual(client_for(self.teacher).get("/api/trivia/home/").status_code, 403)
        self.assertEqual(APIClient(HTTP_HOST="localhost").get("/api/trivia/home/").status_code, 401)

    def test_students_cannot_manage_content(self):
        self.assertEqual(self.c.get("/api/admin/trivia/questions/").status_code, 403)
        self.assertEqual(self.c.post("/api/admin/trivia/categories/", {"name": "x"}).status_code, 403)

    def test_cannot_touch_someone_elses_game(self):
        g = engine.start_game(self.other, "quick")
        self.assertEqual(self.c.get(f"/api/trivia/games/{g.pk}/question/").status_code, 404)

    def test_home_shows_real_stats(self):
        self.play()
        h = self.c.get("/api/trivia/home/").json()
        self.assertEqual(h["player"]["games_played"], 1)
        self.assertEqual(h["player"]["favourite_category"], "Science")
        self.assertEqual(h["daily"]["status"], "not_started")
        self.assertTrue(any(m["key"] == "quick" and m["available"] for m in h["modes"]))


class AdminContent(Base):
    def setUp(self):
        super().setUp()
        self.a = client_for(self.admin)

    def test_create_validate_publish(self):
        bad = self.a.post("/api/admin/trivia/questions/", {"category": self.geo.pk, "type": "mcq", "text": "Q?",
                                                          "options": ["A", "B"]}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.a.post("/api/admin/trivia/questions/", {
            "category": self.geo.pk, "type": "mcq", "difficulty": "easy", "text": "Largest lake in Africa?",
            "options": ["Lake Victoria", "Lake Turkana", "Lake Tanganyika"], "correct_index": 0,
            "explanation": "Lake Victoria is Africa's largest lake by area."}, format="json")
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(ok.json()["status"], "draft")              # nothing goes live by accident
        qid = ok.json()["id"]
        self.a.post("/api/admin/trivia/questions/bulk/", {"ids": [qid], "action": "publish"}, format="json")
        self.assertEqual(TriviaQuestion.objects.get(pk=qid).status, "published")

    def test_picture_needs_a_picture_to_publish(self):
        r = self.a.post("/api/admin/trivia/questions/", {
            "category": self.geo.pk, "type": "picture", "text": "Which landmark?", "status": "published",
            "options": ["A", "B"], "correct_index": 0}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_duplicates_are_flagged(self):
        r = self.a.post("/api/admin/trivia/questions/", {
            "category": self.sci.pk, "type": "true_false", "text": "Science question number 1?",
            "correct_index": 0}, format="json").json()
        self.assertTrue(any("duplicate" in w for w in r["warnings"]))

    def test_csv_import_reports_every_row(self):
        csv_text = (
            "category,type,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation\n"
            "Geography,mcq,easy,Capital of Uganda?,Kampala,Nairobi,Dodoma,Kigali,A,Kampala is the capital.\n"
            "Geography,true_false,easy,The Nile flows north.,,,,,True,It flows into the Mediterranean.\n"
            "Riddles & Logic,short,medium,What has keys but no locks?,,,,,a piano|piano,\n"
            "Nowhere,mcq,easy,Bad category?,A,B,,,A,\n"
            "Science,mcq,easy,Science question number 2?,A,B,,,A,\n"
            "Geography,mcq,easy,No answer row?,A,B,,,,\n")
        f = io.BytesIO(csv_text.encode())
        f.name = "q.csv"
        r = self.a.post("/api/admin/trivia/questions/import/", {"file": f, "publish": "true"},
                        format="multipart").json()
        self.assertEqual(r["imported"], 3)
        self.assertEqual(len(r["duplicates"]), 1)
        self.assertEqual(len(r["errors"]), 2)
        self.assertTrue(TriviaQuestion.objects.get(text="What has keys but no locks?").is_teaser)

    def test_settings_and_analytics(self):
        r = self.a.patch("/api/admin/trivia/settings/", {"timers": {"easy": 25}}, format="json").json()
        self.assertEqual(r["config"]["timers"]["easy"], 25)
        self.assertEqual(r["config"]["timers"]["hard"], 12)          # untouched settings keep defaults
        self.play()
        a = self.a.get("/api/admin/trivia/analytics/").json()
        self.assertEqual(a["games"], 1)
        self.assertEqual(a["players"], 1)

    def test_categories_keep_their_admin_order(self):
        names = [c["name"] for c in self.a.get("/api/admin/trivia/categories/").json()]
        self.assertEqual(names[:3], ["General Knowledge", "Science", "Mathematics"])

    def test_category_with_questions_cannot_be_deleted(self):
        self.assertEqual(self.a.delete(f"/api/admin/trivia/categories/{self.sci.pk}/").status_code, 409)


class PowerUps(Base):
    def start(self, mode="quick"):
        g = engine.start_game(self.student, mode)
        engine.serve(g)
        g.refresh_from_db()
        return g

    def use(self, g, kind):
        return self.c.post(f"/api/trivia/games/{g.pk}/powerup/", {"type": kind, "position": g.current},
                           format="json")

    def test_new_players_start_with_one_of_each(self):
        h = self.c.get("/api/trivia/home/").json()
        self.assertEqual({i["key"]: i["have"] for i in h["powerups"]["items"]},
                         {"fifty": 1, "time": 1, "second": 1, "double": 1})

    def test_fifty_fifty_hides_two_wrong_answers_never_the_right_one(self):
        g = self.start()
        r = self.use(g, "fifty").json()
        self.assertEqual(len(r["hidden"]), 2)
        self.assertNotIn(g.shown_order.index(0), r["hidden"])
        self.assertEqual(r["power"]["inventory"]["fifty"], 0)
        self.assertEqual(self.use(g, "fifty").status_code, 400)          # none left / already used

    def test_extra_time_moves_the_server_deadline(self):
        g = self.start()
        self.use(g, "time")
        g.refresh_from_db()
        g.served_at = timezone.now() - datetime.timedelta(seconds=24)     # past 20s, inside 20+10
        g.save()
        out = engine.submit(g, 0, g.shown_order.index(0))
        self.assertTrue(out["correct"])
        self.assertFalse(out["timed_out"])

    def test_second_chance_forgives_one_wrong_answer(self):
        g = self.start()
        self.use(g, "second")
        g.refresh_from_db()
        wrong = (g.shown_order.index(0) + 1) % 4
        r = engine.submit(g, 0, wrong)
        self.assertTrue(r["retry"])
        self.assertEqual(r["wrong_index"], wrong)
        self.assertFalse(TriviaAnswer.objects.filter(game=g).exists())    # nothing recorded yet
        g.refresh_from_db()
        out = engine.submit(g, 0, g.shown_order.index(0))
        self.assertTrue(out["correct"])

    def test_second_chance_saves_a_survival_run(self):
        g = self.start("survival")
        self.use(g, "second")
        g.refresh_from_db()
        self.assertTrue(engine.submit(g, 0, (g.shown_order.index(0) + 1) % 4)["retry"])
        g.refresh_from_db()
        self.assertEqual(g.status, "active")

    def test_double_points(self):
        g = self.start()
        self.use(g, "double")
        g.refresh_from_db()
        out = engine.submit(g, 0, g.shown_order.index(0))
        self.assertTrue(out["double"])
        self.assertGreaterEqual(out["points"], 280)                       # (100 + bonus) x 2

    def test_cannot_use_what_you_dont_have_or_in_the_daily(self):
        prof = engine.profile_for(self.student)
        prof.powerups = {"fifty": 0, "time": 0, "second": 0, "double": 0}
        prof.save()
        self.assertEqual(self.use(self.start(), "time").status_code, 400)
        prof.powerups = {"fifty": 1, "time": 1, "second": 1, "double": 1}
        prof.save()
        r = self.use(self.start("daily"), "time")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Daily", r.json()["error"])

    def test_per_game_limit(self):
        save_config({"powerups": {"per_game": 1}})
        g = self.start()
        self.assertEqual(self.use(g, "time").status_code, 200)
        self.assertEqual(self.use(g, "double").status_code, 400)

    def test_streaks_earn_power_ups_up_to_the_cap(self):
        prof = engine.profile_for(self.student)
        prof.powerups = {"fifty": 0, "time": 2, "second": 0, "double": 0}
        prof.save()
        g = self.start()
        earned = []
        for pos in range(5):
            out = engine.submit(g, pos, g.shown_order.index(0))
            earned += [e["key"] for e in out["earned_powerups"]]
            if not out["game_over"]:
                engine.serve(g)
                g.refresh_from_db()
        self.assertIn("time", earned)        # 3 in a row
        self.assertIn("fifty", earned)       # 5 in a row
        inv = TriviaProfile.objects.get(user=self.student).powerups
        self.assertEqual(inv["time"], 3)     # capped at max 3
        self.assertEqual(inv["fifty"], 1)

    def test_daily_challenge_awards_second_chance(self):
        prof = engine.profile_for(self.student)
        prof.powerups = {"fifty": 0, "time": 0, "second": 0, "double": 0}
        prof.save()
        _, last = self.play(mode="daily", right=False)
        self.assertIn("second", [e["key"] for e in last["results"]["earned_powerups"]])

    def test_admin_can_switch_power_ups_off(self):
        save_config({"powerups": {"enabled": False}})
        self.assertIsNone(self.c.get("/api/trivia/home/").json()["powerups"])
        self.assertEqual(self.use(self.start(), "time").status_code, 400)


class ExplanationPicture(Base):
    def setUp(self):
        super().setUp()
        import tempfile
        from django.test import override_settings
        self._media = override_settings(MEDIA_ROOT=tempfile.mkdtemp(),
                                        DEFAULT_FILE_STORAGE="django.core.files.storage.FileSystemStorage")
        self._media.enable()
        self.addCleanup(self._media.disable)

    def png(self):
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (8, 8), (32, 184, 166)).save(buf, "PNG")
        buf.seek(0)
        buf.name = "map.png"
        return buf

    def test_picture_shown_only_after_answering_and_kept_for_review(self):
        a = client_for(self.admin)
        r = a.post("/api/admin/trivia/questions/", {
            "category": self.geo.pk, "type": "true_false", "text": "Lake Victoria is shared by three countries.",
            "correct_index": "0", "explanation": "Kenya, Uganda and Tanzania.", "status": "published",
            "explanation_image": self.png()}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["explanation_image"])
        qid = r.json()["id"]

        g = TriviaGame.objects.create(user=self.student, mode="quick", question_ids=[qid], total=1)
        before = engine.serve(g)
        self.assertNotIn("explanation_image", str(before))               # nothing given away early
        out = engine.submit(g, 0, 0)
        self.assertIn("trivia/explanations/", out["explanation_image"])
        self.assertIn("trivia/explanations/", engine.results(g)["review"][0]["explanation_image"])

        a.patch(f"/api/admin/trivia/questions/{qid}/", {"remove_explanation_image": True}, format="json")
        self.assertFalse(TriviaQuestion.objects.get(pk=qid).explanation_image)


class DailyAllowance(Base):
    def test_games_shrink_then_stop_when_todays_questions_are_used(self):
        from .config import save_config
        save_config({"daily_questions": 12})
        g = engine.start_game(self.student, "quick")
        self.assertEqual(len(g.question_ids), min(10, len(g.question_ids)))
        for i in range(len(g.question_ids)):
            engine.serve(g)
            engine.submit(g, i, 0)
        used = len(g.question_ids)
        left = engine.questions_left_today(self.student)
        self.assertEqual(left, 12 - used)
        if left > 0:
            g2 = engine.start_game(self.student, "quick")
            self.assertLessEqual(len(g2.question_ids), left)
            for i in range(len(g2.question_ids)):
                engine.serve(g2)
                engine.submit(g2, i, 0)
        with self.assertRaises(engine.GameError) as e:
            engine.start_game(self.student, "quick")
        self.assertEqual(e.exception.status, 429)
        # the Daily Challenge isn't part of the allowance
        self.assertEqual(engine.start_game(self.student, "daily").mode, "daily")
