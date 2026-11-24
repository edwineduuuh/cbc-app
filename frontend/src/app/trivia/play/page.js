"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X, Flame, Loader2, ArrowRight, Volume2, VolumeX } from "lucide-react";
import Results from "@/components/trivia/Results";
import { DIFF, OPTION_COLORS, card, muted, play, setSound, soundOn, triviaApi } from "@/components/trivia/shared";

const LETTERS = "ABCDEF";

function TimerRing({ left, limit }) {
  const size = 58, r = 24, c = 2 * Math.PI * r;
  const frac = limit ? Math.max(0, left / limit) : 0;
  const color = frac > 0.5 ? "#3CCB8B" : frac > 0.25 ? "#E8B65B" : "#F07178";
  return (
    <div className="relative" style={{ width: size, height: size }} role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }} />
      </svg>
      <motion.span key={Math.ceil(left)} initial={{ scale: left <= 5 ? 1.35 : 1 }} animate={{ scale: 1 }}
        className="absolute inset-0 flex items-center justify-center text-lg font-extrabold" style={{ color }}>
        {Math.ceil(left)}
      </motion.span>
    </div>
  );
}

function Countdown({ onDone }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) { onDone(); return; }
    const t = setTimeout(() => setN((x) => x - 1), 650);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="flex-1 flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.p key={n} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
          className="text-8xl font-extrabold" style={{ color: n ? "#F5F7FA" : "#20B8A6" }}>
          {n || "GO!"}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function Game() {
  const router = useRouter();
  const params = useSearchParams();
  const resumeId = params.get("game");
  const startParams = useRef({ mode: params.get("mode") || "quick", category: params.get("category") || "",
    difficulty: params.get("difficulty") || "mixed" });

  const [phase, setPhase] = useState(resumeId ? "loading" : "countdown");
  const [game, setGame] = useState(null);
  const [q, setQ] = useState(null);
  const [left, setLeft] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [typed, setTyped] = useState("");
  const [fb, setFb] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sound, setSoundState] = useState(soundOn);   // client-only page (useSearchParams)
  const [advanceIn, setAdvanceIn] = useState(0);
  const deadline = useRef(0);
  const lastTick = useRef(99);
  const sending = useRef(false);
  const advanceTimer = useRef(null);
  const resumed = useRef(!!resumeId);          // opened on an existing game (no "play again")
  const [power, setPower] = useState(null);     // server's power-up state for this question
  const [powerBusy, setPowerBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast({ text, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  const starting = useRef(false);


  const showQuestion = useCallback((question) => {
    if (question.done) return false;
    setQ(question);
    setChosen(null);
    setTyped("");
    setFb(null);
    setScore(question.score ?? 0);
    setStreak(question.streak ?? 0);
    setPower(question.power || null);
    deadline.current = Date.now() + question.seconds_left * 1000;
    lastTick.current = 99;
    setLeft(question.seconds_left);
    setPhase("question");
    return true;
  }, []);

  const finishGame = useCallback(async (gid, abandon = false) => {
    setPhase("loading");
    try {
      const r = await triviaApi(`games/${gid}/finish/`, { method: "POST", body: { abandon } });
      setResults(r);
      setPhase("results");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }, []);

  const loadNext = useCallback(async (gid) => {
    clearTimeout(advanceTimer.current);
    setPhase("loading");
    try {
      const next = await triviaApi(`games/${gid}/question/`);
      if (!showQuestion(next)) await finishGame(gid);
    } catch (e) {
      if (e.status === 409) await finishGame(gid);
      else { setError(e.message); setPhase("error"); }
    }
  }, [showQuestion, finishGame]);

  // Resume an open game after a refresh.
  useEffect(() => {
    if (!resumeId) return;
    setGame({ id: Number(resumeId) });
    triviaApi(`games/${resumeId}/question/`)
      .then((next) => {
        setGame({ id: Number(resumeId), mode: next.mode, total: next.total });
        if (!showQuestion(next)) finishGame(resumeId);
      })
      .catch((e) => {
        if (e.status === 409) triviaApi(`games/${resumeId}/`).then((r) => { setResults(r); setPhase("results"); })
          .catch(() => router.replace("/trivia"));
        else { setError(e.message); setPhase("error"); }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setPhase("loading");
    const sp = startParams.current;
    try {
      const r = await triviaApi("games/start/", { method: "POST",
        body: { mode: sp.mode, category: sp.category || null, difficulty: sp.difficulty } });
      setGame(r.game);
      router.replace(`/trivia/play?game=${r.game.id}`, { scroll: false });
      showQuestion(r.question);
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }, [router, showQuestion]);

  const submit = useCallback(async (answer) => {
    if (sending.current || !q || !game) return;
    sending.current = true;
    setPhase("sending");
    try {
      const r = await triviaApi(`games/${game.id}/answer/`, { method: "POST", body: { position: q.position, answer } });
      if (r.retry) {
        // Second chance: cross out the wrong pick, keep the clock running.
        play("wrong");
        setPower((pw) => pw && { ...pw, q: { ...pw.q, second: false,
          wrong: r.wrong_index != null ? [...pw.q.wrong, r.wrong_index] : pw.q.wrong } });
        setChosen(null);
        setTyped("");
        deadline.current = Date.now() + r.seconds_left * 1000;
        flash("🛡️ Second chance! Try again");
        setPhase("question");
        return;
      }
      setFb(r);
      if (r.earned_powerups?.length) {
        setTimeout(() => { play("badge"); flash(`You earned ${r.earned_powerups.map((e) => `${e.icon} ${e.name}`).join(" + ")}!`); }, 500);
      }
      setScore(r.score);
      setStreak(r.streak);
      play(r.correct ? "correct" : "wrong");
      setPhase("feedback");
      const wait = Math.min(12000, Math.max(r.feedback_ms || 2200,
        1600 + (r.explanation || "").length * 35 + (r.explanation_image ? 3500 : 0)));
      setAdvanceIn(wait);
      advanceTimer.current = setTimeout(() => {
        if (r.game_over) { setResults(r.results); setPhase("results"); }
        else loadNext(game.id);
      }, wait);
    } catch (e) {
      if (e.status === 409) await loadNext(game.id);
      else { setError(e.message); setPhase("error"); }
    } finally {
      sending.current = false;
    }
  }, [q, game, loadNext, flash]);

  // The clock. The server decides what counts as late; this just shows it.
  useEffect(() => {
    if (phase !== "question") return;
    const t = setInterval(() => {
      const l = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(l);
      const whole = Math.ceil(l);
      if (whole <= 5 && whole > 0 && whole < lastTick.current) { lastTick.current = whole; play("tick"); }
      if (l <= 0) { clearInterval(t); submit(null); }
    }, 100);
    return () => clearInterval(t);
  }, [phase, submit]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const skipWait = () => {
    clearTimeout(advanceTimer.current);
    if (fb?.game_over) { setResults(fb.results); setPhase("results"); }
    else loadNext(game.id);
  };

  const activatePower = async (kind) => {
    if (phase !== "question" || powerBusy || !game || !q) return;
    setPowerBusy(true);
    try {
      const r = await triviaApi(`games/${game.id}/powerup/`, { method: "POST", body: { type: kind, position: q.position } });
      setPower(r.power);
      deadline.current = Date.now() + r.seconds_left * 1000;
      play("xp");
      if (kind === "time") flash(`⏳ +${r.added_seconds} seconds`);
      if (kind === "fifty") flash("✂️ Two wrong answers gone");
      if (kind === "second") flash("🛡️ Second chance ready");
      if (kind === "double") flash("💎 Double points on this one");
    } catch (e) {
      flash(e.message);
    } finally {
      setPowerBusy(false);
    }
  };

  const choose = (i) => {
    if (phase !== "question") return;
    setChosen(i);
    submit(i);
  };

  const leave = async () => {
    setConfirmExit(false);
    clearTimeout(advanceTimer.current);
    if (!game) return router.push("/trivia");
    if (game.mode === "survival" || results) return finishGame(game.id, true);
    try { await triviaApi(`games/${game.id}/finish/`, { method: "POST", body: { abandon: true } }); } catch {}
    router.push("/trivia");
  };

  const playAgain = !resumed.current && startParams.current.mode !== "daily"
    ? () => {
        starting.current = false;
        setResults(null); setGame(null); setQ(null); setScore(0); setStreak(0); setPhase("countdown");
      }
    : null;

  if (phase === "results" && results) return <Results res={results} onPlayAgain={playAgain} />;

  if (phase === "error") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🤔</p>
        <p className="text-lg font-semibold mb-6">{error}</p>
        <Link href="/trivia" className="rounded-2xl px-6 py-3 font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>Back to Trivia</Link>
      </div>
    );
  }

  const options = q?.options || [];
  const isTF = q?.type === "true_false";
  const pq = power?.q || { hidden: [], wrong: [], used: [], extra: 0 };
  const answered = phase === "feedback" || phase === "sending";
  const total = q?.total ?? game?.total;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-10 min-h-[calc(100vh-80px)] flex flex-col" style={{ color: "#F5F7FA" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setConfirmExit(true)} aria-label="Leave game" className="p-2.5 rounded-full" style={card}><X className="w-4 h-4" /></button>
        <div className="flex-1">
          {total ? (
            <div className="flex gap-1" aria-label={`Question ${(q?.number || 0)} of ${total}`}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="h-2 flex-1 rounded-full" style={{
                  background: i < (q?.position ?? 0) + (answered ? 1 : 0) ? "#20B8A6" : i === (q?.position ?? -1) ? "rgba(32,184,166,0.45)" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          ) : q ? <p className="text-sm font-bold">Question {q.number} · survive as long as you can</p> : null}
        </div>
        <button onClick={() => { setSound(!sound); setSoundState(!sound); }} aria-label={sound ? "Sound off" : "Sound on"} className="p-2.5 rounded-full" style={card}>
          {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" style={muted} />}
        </button>
      </div>

      {phase === "countdown" && <Countdown onDone={begin} />}
      {phase === "loading" && <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#20B8A6" }} /></div>}

      {q && ["question", "sending", "feedback"].includes(phase) && (
        <AnimatePresence mode="wait">
          <motion.div key={q.position} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${q.category.color}26`, color: q.category.color }}>{q.category.icon} {q.category.name}</span>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: DIFF[q.difficulty]?.color }}>{DIFF[q.difficulty]?.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={muted}>Score</p>
                  <motion.p key={score} initial={{ scale: 1.3, color: "#E8B65B" }} animate={{ scale: 1, color: "#F5F7FA" }} className="text-xl font-extrabold leading-none">{score.toLocaleString()}</motion.p>
                </div>
                {streak >= 2 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-sm font-extrabold" style={{ background: "rgba(255,159,90,0.16)", color: "#FF9F5A" }}>
                    <Flame className="w-4 h-4" fill="currentColor" />{streak}
                  </motion.span>
                )}
                <TimerRing left={answered ? (fb?.timed_out ? 0 : left) : left} limit={q.time_limit + (pq.extra || 0)} />
              </div>
            </div>

            {q.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.image} alt={q.image_alt || "Picture for this question"}
                className={`w-full rounded-2xl object-contain mb-4 ${q.type === "picture" ? "max-h-[42vh]" : "max-h-56"}`}
                style={{ background: "#0F1F3D" }} />
            )}
            <h1 className={`font-extrabold leading-snug mb-5 ${q.text.length > 120 ? "text-xl" : "text-2xl sm:text-3xl"}`}>{q.text}</h1>

            {q.type === "short" ? (
              <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) submit(typed.trim()); }} className="flex gap-2">
                <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered} maxLength={120}
                  placeholder="Type your answer" aria-label="Your answer"
                  className="flex-1 rounded-2xl px-4 py-4 text-lg font-semibold outline-none" style={{ background: "#14243A", border: "2px solid #26384F" }} />
                <button disabled={answered || !typed.trim()} className="rounded-2xl px-5 font-extrabold disabled:opacity-40" style={{ background: "#20B8A6", color: "#080F1D" }}>Go</button>
              </form>
            ) : (
              <div className={`grid gap-3 ${isTF ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                {options.map((opt, i) => {
                  const isRight = fb && fb.correct_index === i;
                  const isWrongPick = (fb && chosen === i && !fb.correct) || (!fb && pq.wrong.includes(i));
                  const gone = !fb && pq.hidden.includes(i);
                  const dim = (fb && !isRight && !isWrongPick) || gone;
                  const base = isTF ? (i === 0 ? "#3CCB8B" : "#F07178") : OPTION_COLORS[i % OPTION_COLORS.length];
                  return (
                    <motion.button key={i} disabled={answered || gone || pq.wrong.includes(i)} onClick={() => choose(i)}
                      aria-hidden={gone || undefined}
                      whileTap={!answered ? { scale: 0.97 } : {}} whileHover={!answered ? { y: -2 } : {}}
                      animate={isWrongPick ? { x: [0, -10, 10, -6, 6, 0] } : isRight ? { scale: [1, 1.04, 1] } : {}}
                      transition={{ duration: 0.4 }}
                      className={`relative flex items-center gap-3 rounded-2xl text-left font-bold ${isTF ? "justify-center py-8 text-2xl" : "px-4 py-4 text-base sm:text-lg min-h-[64px]"}`}
                      style={{
                        background: isRight ? "rgba(60,203,139,0.22)" : isWrongPick ? "rgba(240,113,120,0.22)" : chosen === i ? `${base}33` : "#14243A",
                        border: `2px solid ${isRight ? "#3CCB8B" : isWrongPick ? "#F07178" : chosen === i ? base : "#26384F"}`,
                        opacity: gone ? 0.12 : dim ? 0.45 : 1,
                        textDecoration: gone ? "line-through" : "none",
                      }}>
                      {!isTF && (
                        <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold" style={{ background: base, color: "#080F1D" }}>{LETTERS[i]}</span>
                      )}
                      <span className="flex-1">{isTF ? (i === 0 ? "✓ TRUE" : "✗ FALSE") : opt}</span>
                      {isRight && <span className="text-xl">✅</span>}
                      {isWrongPick && <span className="text-xl">❌</span>}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {power?.allowed && power.kinds.length > 0 && !fb && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {power.kinds.map((k) => {
                    const have = power.inventory[k.key] || 0;
                    const usedHere = pq.used.includes(k.key);
                    const fiftyNA = k.key === "fifty" && (q.type === "true_false" || q.type === "short" || options.length < 3);
                    const off = phase !== "question" || powerBusy || have <= 0 || usedHere || fiftyNA || power.left_this_game <= 0;
                    return (
                      <motion.button key={k.key} onClick={() => activatePower(k.key)} disabled={off}
                        whileTap={!off ? { scale: 0.9 } : {}} whileHover={!off ? { y: -2 } : {}}
                        title={`${k.name}: ${k.description}`} aria-label={`${k.name} (${have} left)`}
                        className="relative flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-bold disabled:opacity-35"
                        style={{ background: usedHere ? "rgba(232,182,91,0.22)" : "#14243A",
                                 border: `1px solid ${usedHere ? "#E8B65B" : "#26384F"}` }}>
                        <span className="text-lg leading-none">{k.icon}</span>
                        <span className="hidden sm:inline">{k.name}</span>
                        <span className="rounded-full px-1.5 text-[11px] font-extrabold"
                          style={{ background: have ? "#E8B65B" : "#26384F", color: have ? "#080F1D" : "#A9B9CC" }}>{have}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-[11px] mt-1.5" style={muted}>
                  {power.left_this_game > 0 ? `Power-ups: ${power.left_this_game} more this game` : "No more power-ups this game"}
                  {pq.second ? " · 🛡️ second chance ready" : ""}{pq.double ? " · 💎 double points on" : ""}
                </p>
              </div>
            )}

            <AnimatePresence>
              {fb && (
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-5 rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: fb.correct ? "rgba(60,203,139,0.12)" : "rgba(240,113,120,0.10)", border: `1px solid ${fb.correct ? "rgba(60,203,139,0.4)" : "rgba(240,113,120,0.35)"}` }}
                  aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-extrabold" style={{ color: fb.correct ? "#3CCB8B" : "#F07178" }}>
                      {fb.correct ? (fb.milestone ? `🔥 ${fb.milestone} in a row!` : "Correct!") : fb.timed_out ? "Time's up!" : "Not quite"}
                    </p>
                    {fb.points > 0 && (
                      <motion.span initial={{ y: 10, scale: 0.6 }} animate={{ y: 0, scale: 1 }} className="text-xl font-extrabold" style={{ color: "#E8B65B" }}>{fb.double ? "💎 " : ""}+{fb.points}</motion.span>
                    )}
                  </div>
                  {!fb.correct && <p className="text-sm mt-1">Answer: <b>{fb.correct_answer}</b></p>}
                  {fb.explanation && <p className="text-sm mt-2" style={{ color: "#CFE0F5" }}>💡 <b>Did you know?</b> {fb.explanation}</p>}
                  {fb.explanation_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fb.explanation_image} alt="Picture explaining the answer"
                      className="mt-3 w-full max-h-64 object-contain rounded-xl" style={{ background: "#0F1F3D" }} />
                  )}
                  <div className="flex items-center justify-end mt-3">
                    <button onClick={skipWait} className="rounded-xl px-4 py-2 text-sm font-extrabold flex items-center gap-1.5" style={{ background: "#F5F7FA", color: "#080F1D" }}>
                      {fb.game_over ? "See results" : "Next"} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <motion.div className="absolute left-0 bottom-0 h-1" style={{ background: fb.correct ? "#3CCB8B" : "#F07178" }}
                    initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: advanceIn / 1000, ease: "linear" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}
            className="fixed left-1/2 top-4 z-[95] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-xl"
            style={{ background: "#E8B65B", color: "#080F1D" }} role="status">
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmExit && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(4,10,20,0.8)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-sm w-full rounded-3xl p-6 text-center" style={{ background: "#0F1F3D", border: "1px solid #26384F" }}>
              <p className="text-4xl mb-2">{game?.mode === "survival" ? "🏁" : "🚪"}</p>
              <p className="text-lg font-extrabold">{game?.mode === "survival" ? "End this run?" : "Leave this game?"}</p>
              <p className="text-sm mt-1 mb-5" style={muted}>
                {game?.mode === "survival" ? "Your run so far still counts." : "Unfinished games don't earn XP."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfirmExit(false)} className="rounded-2xl py-3 font-bold" style={card}>Keep playing</button>
                <button onClick={leave} className="rounded-2xl py-3 font-extrabold" style={{ background: "#F07178", color: "#080F1D" }}>
                  {game?.mode === "survival" ? "End run" : "Leave"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlayPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#20B8A6" }} /></div>}>
        <Game />
      </Suspense>
    </MotionConfig>
  );
}
