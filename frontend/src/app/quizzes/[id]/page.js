"use client";
import Image from "next/image"; 
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  Zap,
  Flag,
  RotateCcw,
  Trophy,
  ChevronRight,
  Send,
  Loader2,
  X,
  Menu,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

// ─── Timer ────────────────────────────────────────────────────────────────────
function useTimer(totalSeconds, onExpire) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const pct = (remaining / totalSeconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = pct < 20;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return { display, pct, isUrgent, remaining };
}

// ─── MCQ Option ───────────────────────────────────────────────────────────────
function MCQOption({ letter, text, selected, onClick, disabled }) {
  const letters = { A: 0, B: 1, C: 2, D: 3 };
  const colors = [
    {
      ring: "ring-blue-500",
      bg: "bg-blue-500",
      pill: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    },
    {
      ring: "ring-emerald-500",
      bg: "bg-emerald-500",
      pill: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    },
    {
      ring: "ring-amber-500",
      bg: "bg-amber-500",
      pill: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    },
    {
      ring: "ring-rose-500",
      bg: "bg-rose-500",
      pill: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    },
  ];
  const c = colors[letters[letter] ?? 0];

  return (
    <motion.button
      whileHover={!disabled ? { x: 4 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
        selected
          ? `border-transparent ${c.ring} ring-2 bg-white/8`
          : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
      } ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      <div
        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
          selected
            ? `${c.bg} border-transparent text-white`
            : `${c.pill} border`
        }`}
      >
        {letter}
      </div>
      <span
        className={`text-sm leading-relaxed transition-colors ${selected ? "text-white font-medium" : "text-white/70"}`}
      >
        {text}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto flex-shrink-0"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </motion.div>
      )}
    </motion.button>
  );
}

// ─── Text answer input ────────────────────────────────────────────────────────
function TextAnswer({ value, onChange, type, placeholder }) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={type === "essay" ? 8 : type === "structured" ? 5 : 2}
        placeholder={placeholder}
        style={{
          backgroundColor: "#ffffff",
          color: "#111827",
          borderColor: "#d1d5db",
        }}
        className="w-full border-2 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed"
        onFocus={(e) => (e.target.style.borderColor = "#10b981")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border, #e5e7eb)")}
      />
      <div
        className="absolute bottom-3 right-3 text-xs font-medium"
        style={{ color: "var(--text-muted, #9ca3af)" }}
      >
        {value.length} chars
      </div>
    </div>
  );
}

// ─── Question nav dots ────────────────────────────────────────────────────────
function QuestionNav({ questions, answers, currentIdx, onJump, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 p-3 rounded-l-2xl"
          style={{
            background: "rgba(9,9,15,0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRight: "none",
          }}
        >
          {questions.map((_, i) => {
            const answered = answers[i] !== undefined && answers[i] !== "";
            const current = i === currentIdx;
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                title={`Q${i + 1}`}
                className={`transition-all rounded-lg font-bold text-[10px] flex items-center justify-center ${
                  current
                    ? "w-8 h-8 bg-emerald-500 text-white"
                    : answered
                      ? "w-6 h-6 bg-emerald-500/30 text-emerald-400 hover:bg-emerald-500/50"
                      : "w-6 h-6 bg-white/8 text-white/30 hover:bg-white/15"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Submit confirm modal ─────────────────────────────────────────────────────
function SubmitModal({ open, onConfirm, onCancel, unanswered, submitting }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            className="w-full max-w-sm rounded-3xl p-7"
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <Send className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              Submit Quiz?
            </h3>
            {unanswered > 0 ? (
              <p className="text-sm text-amber-400 text-center mb-5 leading-relaxed">
                You have <strong>{unanswered}</strong> unanswered question
                {unanswered !== 1 ? "s" : ""}. You can still go back and answer
                them.
              </p>
            ) : (
              <p className="text-sm text-white/50 text-center mb-5">
                All questions answered. Ready to submit!
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Now"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────
function ResultsScreen({ result, quiz }) {
  const score = Math.round(result.score ?? 0);
  const passed = score >= (quiz?.passing_score ?? 75);
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Score ring */}
        <div className="relative flex flex-col items-center mb-8">
          <svg width="160" height="160" className="-rotate-90 mb-4">
            <circle
              cx="80"
              cy="80"
              r="68"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="68"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 68}
              initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 68 * (1 - score / 100),
              }}
              transition={{
                duration: 1.5,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.3,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white">{score}%</span>
            <span className="text-xs text-white/40 mt-1">
              {passed ? "Passed ✓" : "Keep trying"}
            </span>
          </div>
        </div>

        <div
          className="rounded-3xl p-7 mb-4"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            {passed ? "🎉 Well done!" : "📚 Keep going!"}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                label: "Marks",
                value: `${result.total_marks_awarded ?? 0} / ${result.total_max_marks ?? 0}`,
              },
              {
                label: "Questions",
                value: `${result.correct_answers ?? "—"} correct`,
              },
              {
                label: "Time",
                value: result.time_taken
                  ? `${Math.floor(result.time_taken / 60)}m ${result.time_taken % 60}s`
                  : "—",
              },
              { label: "Pass mark", value: `${quiz?.passing_score ?? 75}%` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white/5 rounded-2xl p-3 text-center"
              >
                <p className="text-xs text-white/30 font-medium mb-0.5">
                  {label}
                </p>
                <p className="text-base font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link href="/quizzes" className="flex-1">
              <button className="w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-all">
                Browse Quizzes
              </button>
            </Link>
            <Link href={`/attempts/${result.attempt_id}`} className="flex-1">
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition-all">
                Review Answers
              </button>
            </Link>
          </div>
        </div>

        <Link href="/progress">
          <button className="w-full py-3 rounded-xl text-sm font-semibold text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-2">
            View Progress <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Main quiz-take page ──────────────────────────────────────────────────────
export default function QuizTakePage({ params }) {
  const { user } = useAuth();
  const router = useRouter();
  const { id: quizId } = use(params);

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [result, setResult] = useState(null);
  const [showNav, setShowNav] = useState(true);
  const [flagged, setFlagged] = useState(new Set());
  const [attemptId, setAttemptId] = useState(null);

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.values(answers).filter(
    (v) => v !== undefined && v !== "",
  ).length;
  const unanswered = totalQ - answeredCount;

  // ── Load quiz ──
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!quizId) return;
    const token = localStorage.getItem("accessToken");

    const safeFetch = async (url, opts = {}) => {
      const res = await fetch(url, opts);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error(
          `Expected JSON but got HTML from ${url} (status ${res.status}). Check your API URL and auth token.`,
        );
      }
      return res.json();
    };

    (async () => {
      try {
        const data = await safeFetch(`${API}/quizzes/${quizId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuiz(data);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("Failed to load quiz:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, quizId, router]);

  const handleAnswer = useCallback(
    (value) => {
      setAnswers((prev) => ({ ...prev, [currentIdx]: value }));
    },
    [currentIdx],
  );

  const handleQuizSubmit = async () => {
    try {
      setSubmitting(true);

      const answersDict = {};
      questions.forEach((question, idx) => {
        if (answers[idx]) {
          answersDict[question.id] = answers[idx];
        }
      });

      console.log("Submitting:", answersDict);

      const response = await fetch(`${API}/quizzes/submit/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_id: parseInt(quizId),
          answers: answersDict,
        }),
      });

      const text = await response.text();

      if (response.ok) {
        const data = JSON.parse(text);
        const attemptId = data.attempt_id || data.id;
        router.replace(`/attempts/${attemptId}`);
      } else {
        alert(`Error: ${text.substring(0, 200)}`);
      }
    } catch (error) {
      console.error("Quiz submission failed:", error);
      alert("Submission failed: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(currentIdx) ? next.delete(currentIdx) : next.add(currentIdx);
      return next;
    });
  };

  // ── Timer expiry ──
  const handleTimerExpire = useCallback(() => {
    if (!result) setShowSubmitModal(true);
  }, [result]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Loading quiz…</p>
        </div>
      </div>
    );
  }

  // ── Results ──
  if (result) return <ResultsScreen result={result} quiz={quiz} />;

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-sm">No questions found.</p>
          <Link href="/quizzes">
            <button className="mt-4 text-emerald-400 text-sm underline">
              Back to Quizzes
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isMCQ = currentQ.question_type === "mcq";
  const isFillBlank = currentQ.question_type === "fill_blank";
  const isMath = currentQ.question_type === "math";
  const isText =
    currentQ.question_type === "structured" ||
    currentQ.question_type === "essay";

  const progressPct = (answeredCount / totalQ) * 100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "var(--bg, #f9fafb)",
        color: "var(--text, #111827)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <SubmitModal
        open={showSubmitModal}
        onConfirm={handleQuizSubmit}
        onCancel={() => setShowSubmitModal(false)}
        unanswered={unanswered}
        submitting={submitting}
      />

      <QuestionNav
        questions={questions}
        answers={answers}
        currentIdx={currentIdx}
        onJump={setCurrentIdx}
        show={showNav}
      />

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{
          background: "var(--bg-secondary, #f3f4f6)",
          borderColor: "var(--border, #e5e7eb)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/quizzes">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/8 transition-colors border border-white/8">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </Link>

          {/* Progress bar */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">
                {answeredCount}/{totalQ} answered
              </span>
              <span className="text-[10px] text-white/30">{quiz?.title}</span>
            </div>
          </div>

          {/* Timer */}
          {quiz?.duration_minutes && (
            <TimerBadge
              totalSeconds={quiz.duration_minutes * 60}
              onExpire={handleTimerExpire}
            />
          )}

          <button
            onClick={() => setShowNav((p) => !p)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/8 transition-colors border border-white/8"
          >
            <Menu className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* ── Question ── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question header */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-400">
                    {currentIdx + 1}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white/30 uppercase tracking-wide">
                      {currentQ.question_type?.replace("_", " ") || "MCQ"}
                    </span>
                    <span className="text-xs text-white/20">•</span>
                    <span className="text-xs text-white/30">
                      {currentQ.max_marks} mark
                      {currentQ.max_marks !== 1 ? "s" : ""}
                    </span>
                    {flagged.has(currentIdx) && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flagged
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFlag}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                  flagged.has(currentIdx)
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-white/20 hover:text-white/50 hover:bg-white/5"
                }`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Question text */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border, #e5e7eb)",
              }}
            >
              <p
                className="text-base leading-relaxed font-medium"
                style={{ color: "var(--text, #111827)" }}
              >
                {currentQ.question_text}
              </p>
            </div>

            {/* Question Image (if exists) */}
            {currentQ.question_image_url && (
              <div className="mb-6 relative">
                <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-white/10">
                  <Image
                    src={currentQ.question_image_url}
                    alt="Question diagram"
                    width={800}
                    height={600}
                    className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(currentQ.question_image_url, "_blank")}
                    priority={currentIdx === 0}
                  />
                </div>
                <p className="text-xs text-white/30 text-center mt-2">
                  Click image to view full size
                </p>
              </div>
            )}

            {/* MCQ */}
            {isMCQ && (
              <div className="space-y-3">
                {["A", "B", "C", "D"].map((letter) => {
                  const key = `option_${letter.toLowerCase()}`;
                  const text = currentQ[key];
                  if (!text) return null;
                  return (
                    <MCQOption
                      key={letter}
                      letter={letter}
                      text={text}
                      selected={answers[currentIdx] === letter}
                      onClick={() => handleAnswer(letter)}
                    />
                  );
                })}
              </div>
            )}

            {/* Fill blank / Math */}
            {(isFillBlank || isMath) && (
              <div>
                <p className="text-xs text-white/30 mb-3 uppercase tracking-wide font-semibold">
                  {isMath
                    ? "Enter your answer (numbers only)"
                    : "Type your answer"}
                </p>
                <input
                  type="text"
                  value={answers[currentIdx] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={
                    isMath ? "e.g. 42 or x = 5" : "Type your answer here…"
                  }
                  style={{
                    backgroundColor: "var(--input-bg, #ffffff)",
                    color: "var(--input-text, #111827)",
                    borderColor: "var(--border, #e5e7eb)",
                  }}
                  className="w-full border-2 rounded-2xl px-5 py-4 text-base font-medium outline-none focus:border-emerald-500 transition-all"
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--border, #e5e7eb)")
                  }
                />
              </div>
            )}

            {/* Structured / Essay */}
            {isText && (
              <div>
                <p className="text-xs text-white/30 mb-3 uppercase tracking-wide font-semibold">
                  {currentQ.question_type === "essay"
                    ? "Write your essay below"
                    : "Write your answer — use full sentences"}
                </p>
                <TextAnswer
                  value={answers[currentIdx] ?? ""}
                  onChange={handleAnswer}
                  type={currentQ.question_type}
                  placeholder={
                    currentQ.question_type === "essay"
                      ? "Begin your essay here…"
                      : "Explain your answer in detail…"
                  }
                />
                {currentQ.max_marks > 1 && (
                  <p className="text-xs text-white/20 mt-2">
                    This question is worth {currentQ.max_marks} marks — provide
                    a detailed answer.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-4"
        style={{
          background: "var(--bg-secondary, #f3f4f6)",
          borderColor: "var(--border, #e5e7eb)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {currentIdx < totalQ - 1 ? (
            <button
              onClick={() => setCurrentIdx((p) => p + 1)}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex-1 h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-white"
              style={{
                background: "linear-gradient(135deg, #10b981, #0891b2)",
              }}
            >
              <Send className="w-4 h-4" /> Submit Quiz
            </button>
          )}

          {/* Quick submit */}
          {currentIdx < totalQ - 1 && unanswered === 0 && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/25 transition-all flex-shrink-0"
              title="Submit now (all answered)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timer badge (separate to avoid full re-render) ───────────────────────────
function TimerBadge({ totalSeconds, onExpire }) {
  const { display, isUrgent } = useTimer(totalSeconds, onExpire);
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${
        isUrgent
          ? "bg-rose-500/20 border-rose-500/40 animate-pulse"
          : "bg-white/5 border-white/10"
      }`}
    >
      <Clock
        className={`w-3.5 h-3.5 ${isUrgent ? "text-rose-400" : "text-white/40"}`}
      />
      <span
        className={`text-sm font-bold tabular-nums ${isUrgent ? "text-rose-400" : "text-white/60"}`}
      >
        {display}
      </span>
    </div>
  );
}