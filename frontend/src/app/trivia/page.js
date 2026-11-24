"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Trophy, Medal, Play, X, Volume2, VolumeX, ChevronRight, Loader2, CalendarCheck } from "lucide-react";
import { DIFF, LevelRing, XPBar, card, muted, play, setSound, soundOn, triviaApi } from "@/components/trivia/shared";

const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

/** Pick category + difficulty before Quick Play / Category Challenge. */
function SetupSheet({ mode, categories, initialCategory, onClose, onGo }) {
  const needsCat = mode.key === "category";
  const [cat, setCat] = useState(initialCategory ?? (needsCat ? null : ""));
  const [diff, setDiff] = useState("mixed");
  const usable = categories.filter((c) => c.questions > 0);
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(4,10,20,0.78)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label={`${mode.name} setup`}>
      <motion.div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[88vh] overflow-y-auto"
        style={{ background: "#0F1F3D", border: "1px solid #26384F" }}
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">{mode.icon} {mode.name}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full" style={{ background: "#14243A" }}><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={muted}>Category</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {!needsCat && (
            <button onClick={() => setCat("")} className="rounded-2xl px-3 py-3 text-left text-sm font-semibold"
              style={{ background: cat === "" ? "rgba(32,184,166,0.18)" : "#14243A", border: `2px solid ${cat === "" ? "#20B8A6" : "transparent"}` }}>
              🎲 Random mix
            </button>
          )}
          {usable.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className="rounded-2xl px-3 py-3 text-left text-sm font-semibold"
              style={{ background: cat === c.id ? `${c.color}22` : "#14243A", border: `2px solid ${cat === c.id ? c.color : "transparent"}` }}>
              {c.icon} {c.name}
              <span className="block text-[11px] font-normal" style={muted}>{c.questions} question{c.questions === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={muted}>Difficulty</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {["mixed", "easy", "medium", "hard", "expert"].map((d) => (
            <button key={d} onClick={() => setDiff(d)} className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: diff === d ? DIFF[d].color : "#14243A", color: diff === d ? "#080F1D" : DIFF[d].color }}>
              {DIFF[d].label}
            </button>
          ))}
        </div>
        <button disabled={needsCat && !cat} onClick={() => onGo({ category: cat || "", difficulty: diff })}
          className="w-full rounded-2xl py-4 text-lg font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(90deg,#20B8A6,#3CCB8B)", color: "#080F1D" }}>
          <Play className="w-5 h-5" fill="currentColor" /> Let&apos;s play
        </button>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl p-3.5" style={card}>
      <p className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{label}</p>
      <p className="text-xl font-extrabold mt-0.5 truncate">{value}</p>
    </div>
  );
}

export default function TriviaHome() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(null);          // {mode, category?}
  const [sound, setSoundState] = useState(true);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    triviaApi("home/").then((d) => { setSoundState(soundOn()); setData(d); }).catch((e) => setError(e.message));
  }, []);

  const go = (mode, opts = {}) => {
    play("start");
    setGoing(true);
    const q = new URLSearchParams({ mode, ...(opts.category ? { category: opts.category } : {}),
      ...(opts.difficulty && opts.difficulty !== "mixed" ? { difficulty: opts.difficulty } : {}) });
    router.push(`/trivia/play?${q}`);
  };
  const openMode = (m, category) => {
    if (m.key === "quick" || m.key === "category") setSetup({ mode: m, category });
    else go(m.key);
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🧠</p>
        <p className="text-lg font-semibold mb-2">Trivia couldn&apos;t load</p>
        <p className="text-sm" style={muted}>{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-56 rounded-3xl animate-pulse" style={card} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl animate-pulse" style={card} />)}</div>
      </div>
    );
  }

  const p = data.player;
  const quick = data.modes.find((m) => m.key === "quick");
  const daily = data.daily;

  return (
    <MotionConfig reducedMotion="user">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ color: "#F5F7FA" }}>
        {/* ── Hero ── */}
        <motion.section {...fade} className="relative overflow-hidden rounded-3xl p-5 sm:p-8 mb-6"
          style={{ background: "radial-gradient(120% 140% at 0% 0%, #1B4B5A 0%, #14243A 45%, #1A1840 100%)", border: "1px solid #26384F" }}>
          <div aria-hidden className="absolute -right-10 -top-10 text-[180px] opacity-[0.07] select-none rotate-12">🧠</div>
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-extrabold tracking-[0.3em] mb-2" style={{ color: "#20B8A6" }}>STADISPACE TRIVIA</p>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                Play. Discover.<br /><span style={{ background: "linear-gradient(90deg,#20B8A6,#E8B65B)", WebkitBackgroundClip: "text", color: "transparent" }}>Challenge your brain.</span>
              </h1>
              <p className="text-sm sm:text-base mt-3 max-w-md" style={muted}>
                Quick rounds, surprising facts and badges to collect. Separate from your school marks - this one&apos;s just for fun.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }} disabled={!quick?.available || going}
                  onClick={() => quick && openMode(quick)}
                  className="rounded-2xl px-7 py-4 text-lg font-extrabold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(90deg,#20B8A6,#3CCB8B)", color: "#080F1D", boxShadow: "0 10px 30px rgba(32,184,166,0.35)" }}>
                  {going ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" fill="currentColor" />} Play
                </motion.button>
                <Link href="/trivia/leaderboard" className="rounded-2xl px-4 py-3.5 text-sm font-semibold flex items-center gap-2" style={card}>
                  <Trophy className="w-4 h-4" style={{ color: "#E8B65B" }} /> Leaderboards
                </Link>
                <Link href="/trivia/badges" className="rounded-2xl px-4 py-3.5 text-sm font-semibold flex items-center gap-2" style={card}>
                  <Medal className="w-4 h-4" style={{ color: "#B48EF5" }} /> Badges {p.badges}/{p.badges_total}
                </Link>
                <button onClick={() => { setSound(!sound); setSoundState(!sound); if (!sound) setTimeout(() => play("correct"), 0); }}
                  aria-label={sound ? "Turn sound off" : "Turn sound on"} aria-pressed={sound}
                  className="rounded-2xl p-3.5" style={card}>
                  {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" style={muted} />}
                </button>
              </div>
            </div>
            <div className="lg:w-80 rounded-2xl p-4" style={{ background: "rgba(8,19,33,0.55)", border: "1px solid #26384F" }}>
              <div className="flex items-center gap-4 mb-3">
                <LevelRing level={p.level} />
                <div className="min-w-0">
                  <p className="font-extrabold text-lg truncate">{p.level.name}</p>
                  <p className="text-sm" style={muted}><b style={{ color: "#E8B65B" }}>{p.xp.toLocaleString()}</b> XP · best {p.best_score.toLocaleString()} pts</p>
                </div>
              </div>
              <XPBar level={p.level} />
            </div>
          </div>
        </motion.section>


        {/* ── Power-ups ── */}
        {data.powerups && data.powerups.items.length > 0 && (
          <motion.section {...fade} transition={{ delay: 0.03 }} className="rounded-3xl p-4 sm:p-5 mb-6" style={card}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-extrabold">Your power-ups</h2>
              <p className="text-xs" style={muted}>Up to {data.powerups.per_game} per game{data.powerups.in_daily ? "" : " · not in the Daily Challenge"}</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {data.powerups.items.map((pu) => (
                <div key={pu.key} className="rounded-2xl p-3 flex items-start gap-3" style={{ background: "rgba(8,19,33,0.55)" }}>
                  <span className="text-2xl leading-none">{pu.icon}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{pu.name} <span className="ml-1 rounded-full px-1.5 text-[11px] font-extrabold"
                      style={{ background: pu.have ? "#E8B65B" : "#26384F", color: pu.have ? "#080F1D" : "#A9B9CC" }}>{pu.have}/{pu.max}</span></p>
                    <p className="text-[11px] mt-0.5" style={muted}>{pu.description}</p>
                    {pu.earn && <p className="text-[11px] mt-0.5" style={{ color: "#20B8A6" }}>Earn: {pu.earn}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Daily challenge ── */}
        {daily.enabled && (daily.available || daily.status !== "not_started") && (
          <motion.section {...fade} transition={{ delay: 0.05 }} className="rounded-3xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: "linear-gradient(100deg, rgba(232,182,91,0.16), rgba(32,184,166,0.08))", border: "1px solid rgba(232,182,91,0.35)" }}>
            <div className="text-4xl">📅</div>
            <div className="flex-1">
              <p className="text-xs font-extrabold tracking-widest" style={{ color: "#E8B65B" }}>DAILY CHALLENGE · {new Date(daily.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</p>
              <p className="text-lg font-bold mt-0.5">
                {daily.status === "done" ? `Done! ${daily.correct}/${daily.total} correct · ${daily.score.toLocaleString()} points`
                  : `${daily.questions} questions · ${DIFF[daily.difficulty]?.label || "Mixed"} · same for everyone today`}
              </p>
              <p className="text-sm" style={muted}>
                {daily.status === "done" ? "A new challenge starts at midnight." : "One official try - make it count."}
              </p>
            </div>
            {daily.status === "done" ? (
              <div className="flex gap-2">
                {data.leaderboards.enabled && data.leaderboards.daily && (
                  <Link href="/trivia/leaderboard?board=daily" className="rounded-2xl px-4 py-3 text-sm font-bold" style={card}>See ranking</Link>
                )}
                <Link href={`/trivia/games/${daily.game_id}`} className="rounded-2xl px-4 py-3 text-sm font-bold flex items-center gap-1.5" style={{ background: "#E8B65B", color: "#080F1D" }}>
                  <CalendarCheck className="w-4 h-4" /> Review
                </Link>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} disabled={!daily.available} onClick={() => go("daily")}
                className="rounded-2xl px-6 py-3.5 font-extrabold disabled:opacity-40" style={{ background: "#E8B65B", color: "#080F1D" }}>
                {daily.status === "in_progress" ? "Continue" : "Start challenge"}
              </motion.button>
            )}
          </motion.section>
        )}

        {/* ── Today's allowance ── */}
        {data.allowance?.per_day && (
          data.allowance.left > 0 ? (
            <p className="text-sm mb-3" style={muted}>
              <b style={{ color: "#20B8A6" }}>{data.allowance.left}</b> of {data.allowance.per_day} questions left today
            </p>
          ) : (
            <div className="rounded-2xl p-4 mb-4 text-sm" style={{ background: "rgba(232,182,91,0.12)", border: "1px solid rgba(232,182,91,0.35)" }}>
              <b>That&apos;s all {data.allowance.per_day} questions for today.</b> New ones open at midnight
              {daily.status === "not_started" && daily.available ? " - the Daily Challenge is still waiting for you." : "."}
            </div>
          )
        )}

        {/* ── Modes ── */}
        {data.modes.some((m) => m.key !== "daily" && m.available) && <h2 className="text-lg font-extrabold mb-3">Choose your challenge</h2>}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {data.modes.filter((m) => m.key !== "daily" && m.available).map((m, i) => (
            <motion.button key={m.key} {...fade} transition={{ delay: 0.04 * i }}
              whileHover={m.available ? { y: -4 } : {}} whileTap={m.available ? { scale: 0.97 } : {}}
              disabled={!m.available} onClick={() => openMode(m)}
              className="text-left rounded-3xl p-4 sm:p-5 relative overflow-hidden disabled:opacity-50" style={card}>
              <div className="text-3xl sm:text-4xl mb-2">{m.icon}</div>
              <p className="font-extrabold sm:text-lg">{m.name}</p>
              <p className="text-xs sm:text-sm mt-1 line-clamp-2" style={muted}>{m.description}</p>
              <p className="text-[11px] font-semibold mt-3" style={{ color: m.available ? "#20B8A6" : "#A9B9CC" }}>
                {m.key === "survival" ? `Best run: ${p.best_survival}` : `${m.questions} questions`}
              </p>
            </motion.button>
          ))}
        </div>

        {/* ── Categories ── */}
        {data.categories.some((c) => c.questions > 0) && (
          <>
            <h2 className="text-lg font-extrabold mb-3">Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {data.categories.filter((c) => c.questions > 0).map((c) => (
                <motion.button key={c.id} whileHover={c.questions ? { y: -3 } : {}} whileTap={c.questions ? { scale: 0.97 } : {}}
                  disabled={!c.questions}
                  onClick={() => openMode(data.modes.find((m) => m.key === "category") || { key: "category", name: "Category Challenge", icon: "🎯" }, c.id)}
                  className="text-left rounded-2xl p-4 disabled:opacity-45"
                  style={{ background: `linear-gradient(160deg, ${c.color}26, #14243A 70%)`, border: `1px solid ${c.color}40` }}>
                  {c.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image} alt="" className="w-9 h-9 rounded-lg object-cover mb-2" />
                    : <div className="text-2xl mb-2">{c.icon}</div>}
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-[11px] mt-0.5" style={muted}>{`${c.questions} question${c.questions === 1 ? "" : "s"}`}</p>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* ── Stats ── */}
        <h2 className="text-lg font-extrabold mb-3">Your stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Games played" value={p.games_played} />
          <Stat label="Correct answers" value={p.correct.toLocaleString()} />
          <Stat label="Accuracy" value={p.answered ? `${p.accuracy}%` : "-"} />
          <Stat label="Highest score" value={p.best_score.toLocaleString()} />
          <Stat label="Best streak" value={`🔥 ${p.best_streak}`} />
          <Stat label="Favourite category" value={p.favourite_category || "-"} />
          <Stat label="Badges" value={`${p.badges} / ${p.badges_total}`} />
          <Stat label="Total XP" value={p.xp.toLocaleString()} />
        </div>

        {data.recent.length > 0 && (
          <>
            <h2 className="text-lg font-extrabold mb-3">Recent games</h2>
            <div className="rounded-2xl overflow-hidden mb-6" style={card}>
              {data.recent.map((g, i) => (
                <Link key={g.id} href={`/trivia/games/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
                  style={i ? { borderTop: "1px solid #1F3350" } : {}}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.mode_label}{g.category ? ` · ${g.category}` : ""}</p>
                    <p className="text-xs" style={muted}>{g.correct}/{g.total} correct · +{g.xp} XP</p>
                  </div>
                  <p className="font-extrabold">{g.score.toLocaleString()}</p>
                  <ChevronRight className="w-4 h-4" style={muted} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {setup && (
          <SetupSheet mode={setup.mode} categories={data.categories} initialCategory={setup.category}
            onClose={() => setSetup(null)}
            onGo={(o) => { setSetup(null); go(setup.mode.key, o); }} />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
