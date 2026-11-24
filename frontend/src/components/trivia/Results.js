"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion } from "framer-motion";
import { Check, X, Clock, RotateCcw, LayoutGrid, Home, ListChecks } from "lucide-react";
import { LevelRing, XPBar, card, muted, play } from "./shared";

function CountUp({ to, duration = 1.2 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to || 0, { duration, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to, duration]);
  return <>{v.toLocaleString()}</>;
}

export function Review({ items }) {
  return (
    <ol className="space-y-3">
      {items.map((r) => (
        <li key={r.number} className="rounded-2xl p-4" style={card}>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: r.is_correct ? "rgba(60,203,139,0.18)" : "rgba(240,113,120,0.18)" }}>
              {r.is_correct ? <Check className="w-4 h-4" style={{ color: "#3CCB8B" }} /> : r.timed_out ? <Clock className="w-4 h-4" style={{ color: "#F07178" }} /> : <X className="w-4 h-4" style={{ color: "#F07178" }} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>Q{r.number} · {r.category}</p>
              <p className="font-semibold mt-0.5">{r.text}</p>
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt={r.image_alt || ""} className="mt-2 rounded-xl max-h-40 object-contain" />
              )}
              <p className="text-sm mt-2">
                <span style={muted}>Your answer: </span>
                <b style={{ color: r.is_correct ? "#3CCB8B" : "#F07178" }}>{r.timed_out && !r.your_answer ? "Time ran out" : r.your_answer || "-"}</b>
              </p>
              {!r.is_correct && <p className="text-sm"><span style={muted}>Correct answer: </span><b style={{ color: "#3CCB8B" }}>{r.correct_answer}</b></p>}
              {r.explanation && <p className="text-sm mt-2 rounded-xl px-3 py-2" style={{ background: "rgba(77,141,218,0.10)", color: "#CFE0F5" }}>💡 {r.explanation}</p>}
              {r.explanation_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.explanation_image} alt="Picture explaining the answer" className="mt-2 rounded-xl max-h-56 object-contain" style={{ background: "#0F1F3D" }} />
              )}
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: r.points ? "#E8B65B" : "#5A6B80" }}>+{r.points}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The end-of-game screen: score, XP, level, badges, records, review. */
export default function Results({ res, onPlayAgain }) {
  const [showReview, setShowReview] = useState(false);
  const [overlay, setOverlay] = useState(null);      // "level" | badge object
  const queue = [...(res.level_up ? ["level"] : []), ...(res.new_badges || [])];

  useEffect(() => {
    if (res.xp_earned) setTimeout(() => play("xp"), 500);
    if (queue.length) setTimeout(() => setOverlay(queue[0]), 1300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (overlay === "level") play("levelup");
    else if (overlay) play("badge");
  }, [overlay]);
  const nextOverlay = () => {
    const i = queue.indexOf(overlay);
    setOverlay(i >= 0 && i + 1 < queue.length ? queue[i + 1] : null);
  };

  const stars = res.accuracy >= 90 ? 3 : res.accuracy >= 60 ? 2 : res.accuracy >= 30 ? 1 : 0;
  const headline = res.status === "abandoned" ? "Game ended"
    : res.mode === "survival" ? `You survived ${res.correct} question${res.correct === 1 ? "" : "s"}!`
    : stars === 3 ? "Outstanding!" : stars === 2 ? "Great game!" : stars === 1 ? "Nice try!" : "Keep practising!";
  const record = res.records?.best_score || res.records?.best_survival;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden"
        style={{ background: "radial-gradient(120% 120% at 50% 0%, #1B4B5A, #14243A 60%)", border: "1px solid #26384F" }}>
        {record && (
          <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            className="inline-block rounded-full px-3 py-1 text-xs font-extrabold mb-3" style={{ background: "#E8B65B", color: "#080F1D" }}>
            🏆 NEW PERSONAL RECORD
          </motion.p>
        )}
        <p className="text-xs font-extrabold tracking-[0.25em]" style={{ color: "#20B8A6" }}>{res.mode_label?.toUpperCase()}{res.category ? ` · ${res.category.toUpperCase()}` : ""}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-2">{headline}</h1>
        {res.mode !== "survival" && res.status !== "abandoned" && (
          <div className="flex justify-center gap-2 mt-3 text-4xl" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + i * 0.18, type: "spring" }} style={{ filter: i < stars ? "none" : "grayscale(1) opacity(0.25)" }}>⭐</motion.span>
            ))}
          </div>
        )}
        <p className="text-6xl sm:text-7xl font-extrabold mt-4" style={{ color: "#F5F7FA" }}><CountUp to={res.score} /></p>
        <p className="text-sm" style={muted}>points</p>

        <div className="grid grid-cols-4 gap-2 mt-6">
          {[["Correct", res.correct, "#3CCB8B"], ["Wrong", res.wrong, "#F07178"], ["Accuracy", `${res.accuracy}%`, "#4D8DDA"], ["Time", `${Math.round(res.seconds)}s`, "#B48EF5"]].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl py-3" style={{ background: "rgba(8,19,33,0.5)" }}>
              <p className="text-xl font-extrabold" style={{ color: c }}>{v}</p>
              <p className="text-[11px]" style={muted}>{l}</p>
            </div>
          ))}
        </div>

        {res.level && (
          <div className="mt-6 rounded-2xl p-4 text-left flex items-center gap-4" style={{ background: "rgba(8,19,33,0.5)" }}>
            <LevelRing level={res.level} size={64} />
            <div className="flex-1 min-w-0">
              <p className="font-bold">{res.level.name} <span className="font-extrabold" style={{ color: "#E8B65B" }}>+<CountUp to={res.xp_earned} /> XP</span></p>
              <XPBar level={res.level} />
            </div>
          </div>
        )}
        {(res.xp_breakdown || []).length > 0 && (
          <ul className="mt-3 text-left text-sm space-y-1">
            {res.xp_breakdown.map((x, i) => (
              <li key={i} className="flex justify-between" style={muted}><span>{x.label}</span>{x.xp > 0 && <b style={{ color: "#E8B65B" }}>+{x.xp} XP</b>}</li>
            ))}
          </ul>
        )}
        {(res.earned_powerups || []).length > 0 && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "#E8B65B" }}>
            Power-ups earned: {res.earned_powerups.map((e) => `${e.icon} ${e.name}`).join(", ")}
          </p>
        )}
        {(res.new_badges || []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {res.new_badges.map((b) => (
              <span key={b.code} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: "rgba(180,142,245,0.16)", color: "#D9C7FF" }}>{b.icon} {b.name}</span>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {onPlayAgain && (
          <button onClick={onPlayAgain} className="rounded-2xl py-3.5 font-extrabold flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(90deg,#20B8A6,#3CCB8B)", color: "#080F1D" }}>
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        )}
        <Link href="/trivia" className="rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2" style={card}>
          <LayoutGrid className="w-4 h-4" /> Change game
        </Link>
        <button onClick={() => setShowReview((s) => !s)} className="rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2" style={card}>
          <ListChecks className="w-4 h-4" /> {showReview ? "Hide answers" : "Review answers"}
        </button>
        <Link href="/trivia" className="rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2" style={card}>
          <Home className="w-4 h-4" /> Trivia home
        </Link>
      </div>
      {showReview && <div className="mt-5"><Review items={res.review} /></div>}

      <AnimatePresence>
        {overlay && (
          <motion.div className="fixed inset-0 z-[95] flex items-center justify-center p-6" style={{ background: "rgba(4,10,20,0.85)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={nextOverlay} role="dialog" aria-modal="true">
            <motion.div key={overlay === "level" ? "level" : overlay.code} className="text-center max-w-sm"
              initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}>
              {overlay === "level" ? (
                <>
                  <p className="text-7xl mb-3">🚀</p>
                  <p className="text-sm font-extrabold tracking-[0.3em]" style={{ color: "#E8B65B" }}>LEVEL UP!</p>
                  <p className="text-4xl font-extrabold mt-2">Level {res.level.level}</p>
                  <p className="text-xl mt-1" style={{ color: "#20B8A6" }}>{res.level.name}</p>
                </>
              ) : (
                <>
                  <motion.p className="text-7xl mb-3" animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: 2, duration: 0.5 }}>{overlay.icon}</motion.p>
                  <p className="text-sm font-extrabold tracking-[0.3em]" style={{ color: "#B48EF5" }}>BADGE UNLOCKED</p>
                  <p className="text-3xl font-extrabold mt-2">{overlay.name}</p>
                  <p className="mt-1" style={muted}>{overlay.description}</p>
                  {overlay.xp > 0 && <p className="mt-2 font-bold" style={{ color: "#E8B65B" }}>+{overlay.xp} XP</p>}
                </>
              )}
              <p className="text-xs mt-6" style={muted}>Tap to continue</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
