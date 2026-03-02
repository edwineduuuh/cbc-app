"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Target,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Flame,
  Star,
  Trophy,
  ChevronRight,
  Minus,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

// ─── Animated number counter ──────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "", decimals = 0, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = parseFloat(value) || 0;
    const steps = 40;
    const increment = end / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else setDisplay(start);
    }, interval);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
      {suffix}
    </span>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function AnimatedBar({ pct, colorClass, height = "h-2.5", delay = 0 }) {
  return (
    <div
      className={`w-full bg-white/10 rounded-full ${height} overflow-hidden`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        className={`${height} rounded-full ${colorClass}`}
      />
    </div>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScorePill({ score }) {
  const { bg, text } =
    score >= 75
      ? {
          bg: "bg-emerald-500/20 border border-emerald-500/40",
          text: "text-emerald-400",
        }
      : score >= 50
        ? {
            bg: "bg-amber-500/20 border border-amber-500/40",
            text: "text-amber-400",
          }
        : {
            bg: "bg-rose-500/20 border border-rose-500/40",
            text: "text-rose-400",
          };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${bg} ${text}`}
    >
      {score.toFixed(0)}%
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  suffix = "",
  icon: Icon,
  sub,
  gradient,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-2xl p-6 ${gradient}`}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-white/70 text-sm font-medium mb-1">{label}</p>
        <p className="text-4xl font-bold text-white tracking-tight">
          <AnimatedNumber
            value={value}
            suffix={suffix}
            decimals={suffix === "%" ? 1 : 0}
          />
        </p>
        {sub && <p className="text-white/50 text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ scores }) {
  if (!scores || scores.length < 2) return null;
  const w = 80,
    h = 32;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * w;
      const y = h - ((s - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const up = last >= prev;
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} className="flex-shrink-0">
        <polyline
          fill="none"
          stroke={up ? "#34d399" : "#f87171"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
      <span
        className={`text-xs font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}
      >
        {up ? "▲" : "▼"} {Math.abs(last - prev).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Circular progress ────────────────────────────────────────────────────────
function CircleProgress({
  pct,
  size = 80,
  stroke = 7,
  color = "#34d399",
  label,
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={
              inView ? { strokeDashoffset: circ - (circ * pct) / 100 } : {}
            }
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-white/50 mt-1.5 text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Level system ─────────────────────────────────────────────────────────────
function getLevel(quizzesCompleted) {
  if (quizzesCompleted >= 100)
    return { level: 5, title: "Scholar", color: "#f59e0b", next: null };
  if (quizzesCompleted >= 50)
    return { level: 4, title: "Expert", color: "#8b5cf6", next: 100 };
  if (quizzesCompleted >= 20)
    return { level: 3, title: "Achiever", color: "#3b82f6", next: 50 };
  if (quizzesCompleted >= 5)
    return { level: 2, title: "Learner", color: "#10b981", next: 20 };
  return { level: 1, title: "Beginner", color: "#6b7280", next: 5 };
}

// ─── Subject row ──────────────────────────────────────────────────────────────
const SUBJECT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function SubjectRow({ subject, index }) {
  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  const { icon: TrendIcon, cls } =
    subject.trend === "up"
      ? { icon: TrendingUp, cls: "text-emerald-400" }
      : subject.trend === "down"
        ? { icon: TrendingDown, cls: "text-rose-400" }
        : { icon: Minus, cls: "text-white/30" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{
          background: `${color}30`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        {subject.subject.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-semibold text-white text-sm truncate">
            {subject.subject}
          </p>
          <span className="text-sm font-bold text-white ml-2 flex-shrink-0">
            {subject.average}%
          </span>
        </div>
        <AnimatedBar
          pct={parseFloat(subject.average)}
          colorClass="bg-gradient-to-r"
          delay={index * 0.07}
          height="h-1.5"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-white/30">
            {subject.count} {subject.count === 1 ? "quiz" : "quizzes"}
          </span>
          <TrendIcon className={`w-3.5 h-3.5 ${cls}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FullProgress() {
  const { user } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState("all"); // all, passed, failed

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    const token = localStorage.getItem("accessToken");
    Promise.all([
      fetch(`${API}/attempts/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/analytics/student/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([attemptsData, statsData]) => {
        setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading your progress…</p>
        </div>
      </div>
    );
  }

  // ── Derived data ──
  const completed = attempts.filter((a) => a.status === "completed");
  // Unique quizzes — one entry per distinct quiz_id (best score wins)
  const uniqueQuizMap = {};
  completed.forEach((a) => {
    const qid = a.quiz || a.quiz_id || a.quiz_title;
    if (!uniqueQuizMap[qid] || a.score > uniqueQuizMap[qid].score) {
      uniqueQuizMap[qid] = a;
    }
  });
  const uniqueQuizzes = Object.values(uniqueQuizMap);
  const recentAttempts = [...completed]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 10);
  const last5Scores = recentAttempts.slice(0, 5).map((a) => a.score);

  // Subject aggregation — use actual subject_name if available, else first word of quiz_title
  const subjectMap = {};
  completed.forEach((a) => {
    const key = a.subject_name || a.quiz_title?.split(" ")[0] || "Other";
    if (!subjectMap[key]) subjectMap[key] = { total: 0, count: 0, scores: [] };
    subjectMap[key].total += a.score;
    subjectMap[key].count += 1;
    subjectMap[key].scores.push(a.score);
  });
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, d]) => ({
      subject,
      average: (d.total / d.count).toFixed(1),
      count: d.count,
      scores: d.scores,
      trend:
        d.scores.length > 1
          ? d.scores[d.scores.length - 1] >= d.scores[0]
            ? "up"
            : "down"
          : "stable",
    }))
    .sort((a, b) => b.average - a.average);

  const strengths = subjectStats.slice(0, 3);
  const weaknesses = [...subjectStats]
    .sort((a, b) => a.average - b.average)
    .slice(0, 3);

  const performanceTrend =
    last5Scores.length > 1
      ? last5Scores[0] > last5Scores[last5Scores.length - 1]
        ? "improving"
        : "declining"
      : "stable";

  const bestScore =
    completed.length > 0 ? Math.max(...completed.map((a) => a.score)) : 0;
  const levelData = getLevel(stats?.quizzes_completed || 0);
  const levelProgress = levelData.next
    ? ((stats?.quizzes_completed || 0) / levelData.next) * 100
    : 100;

  // History filter
  const filteredHistory = recentAttempts.filter((a) => {
    if (historyTab === "passed") return a.score >= 75;
    if (historyTab === "failed") return a.score < 75;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .glass-hover:hover { background: rgba(255,255,255,0.06); }
      `}</style>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b border-white/5"
        style={{ background: "rgba(9,9,15,0.9)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/60" />
              </button>
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                My Progress
              </h1>
            </div>
          </div>
          {/* Level badge */}
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: `${levelData.color}30` }}
            >
              <Trophy className="w-3 h-3" style={{ color: levelData.color }} />
            </div>
            <span
              className="text-xs font-bold"
              style={{ color: levelData.color }}
            >
              Lvl {levelData.level}
            </span>
            <span className="text-xs text-white/30">{levelData.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Quizzes Completed"
            value={stats?.quizzes_completed || 0}
            icon={BookOpen}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
            sub={
              stats?.total_sessions > stats?.quizzes_completed
                ? `${stats.total_sessions} total sessions`
                : performanceTrend === "improving"
                  ? "↑ Improving"
                  : "→ Steady"
            }
            delay={0}
          />
          <StatCard
            label="Average Score"
            value={stats?.average_score || 0}
            suffix="%"
            icon={Award}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
            delay={0.08}
          />
          <StatCard
            label="Best Score"
            value={bestScore}
            suffix="%"
            icon={Target}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            delay={0.16}
          />
          <StatCard
            label="Day Streak"
            value={stats?.current_streak || 0}
            icon={Flame}
            gradient="bg-gradient-to-br from-rose-500 to-pink-700"
            sub="Keep it going!"
            delay={0.24}
          />
        </div>

        {/* ── Level progress + Recent bar chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Level card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                Your Level
              </h3>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex items-center justify-around mb-6">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div key={lvl} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${lvl <= levelData.level ? "shadow-lg" : "opacity-20"}`}
                    style={
                      lvl <= levelData.level
                        ? {
                            background: `${levelData.color}30`,
                            border: `1px solid ${levelData.color}50`,
                          }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    <Trophy
                      className="w-4 h-4"
                      style={{
                        color:
                          lvl <= levelData.level
                            ? levelData.color
                            : "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30">{lvl}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: levelData.color }}>
                  {levelData.title}
                </span>
                {levelData.next && (
                  <span className="text-white/30">
                    {stats?.quizzes_completed || 0} unique / {levelData.next} to
                    next level
                  </span>
                )}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{
                    duration: 1,
                    delay: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${levelData.color}99, ${levelData.color})`,
                  }}
                />
              </div>
              {levelData.next && (
                <p className="text-xs text-white/30">
                  {levelData.next - (stats?.quizzes_completed || 0)} more unique
                  quizzes to reach {levelData.nextTitle || "next level"}
                </p>
              )}
            </div>
          </motion.div>

          {/* Recent scores bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-2xl p-6 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Recent Scores
                </h3>
                <p className="text-xs text-white/30 mt-0.5">
                  Last {Math.min(last5Scores.length, 5)} quizzes
                </p>
              </div>
              {last5Scores.length >= 2 && <Sparkline scores={last5Scores} />}
            </div>

            {last5Scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/30 text-sm">
                  Take quizzes to see your trend
                </p>
                <Link href="/quizzes">
                  <button className="text-xs font-bold text-emerald-400 underline underline-offset-2">
                    Browse Quizzes →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-28">
                {last5Scores.map((score, i) => {
                  const color =
                    score >= 75
                      ? "#10b981"
                      : score >= 50
                        ? "#f59e0b"
                        : "#f87171";
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1.5 group"
                    >
                      <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">
                        {score.toFixed(0)}%
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(score / 100) * 88}px` }}
                        transition={{
                          duration: 0.7,
                          delay: i * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="w-full rounded-t-lg rounded-b-sm cursor-default"
                        style={{
                          background: `${color}40`,
                          border: `1px solid ${color}60`,
                        }}
                      />
                      <span className="text-[10px] text-white/20">
                        #{i + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Subject performance + Strengths/Weaknesses ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                Subject Performance
              </h3>
              <span className="text-xs text-white/30">
                {subjectStats.length} subjects
              </span>
            </div>

            {subjectStats.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-white/30 text-sm">
                  No data yet — take some quizzes!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {subjectStats.map((s, i) => (
                  <SubjectRow key={s.subject} subject={s} index={i} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Strengths + Weaknesses */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="glass rounded-2xl p-5"
              style={{ borderColor: "rgba(16,185,129,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Top Subjects</h3>
              </div>
              <div className="space-y-2">
                {strengths.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">
                    No data yet
                  </p>
                ) : (
                  strengths.map((s, i) => (
                    <div
                      key={s.subject}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30 w-4">
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium text-white/80 truncate max-w-[100px]">
                          {s.subject}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">
                        {s.average}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-5"
              style={{ borderColor: "rgba(249,115,22,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Needs Practice</h3>
              </div>
              <div className="space-y-2">
                {weaknesses.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">
                    No data yet
                  </p>
                ) : (
                  weaknesses.map((s, i) => (
                    <div
                      key={s.subject}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-white/80 truncate max-w-[120px]">
                        {s.subject}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-400">
                          {s.average}%
                        </span>
                        <Link href="/quizzes">
                          <ArrowUpRight className="w-3.5 h-3.5 text-white/20 hover:text-orange-400 transition-colors cursor-pointer" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {weaknesses.length > 0 && (
                <Link href="/quizzes">
                  <button className="w-full mt-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold transition-colors border border-orange-500/20">
                    Practice These Subjects →
                  </button>
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Subject circles visual ── */}
        {subjectStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-6">
              Score Overview
            </h3>
            <div className="flex items-start gap-6 flex-wrap">
              {subjectStats.slice(0, 6).map((s, i) => (
                <CircleProgress
                  key={s.subject}
                  pct={parseFloat(s.average)}
                  size={72}
                  stroke={6}
                  color={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                  label={s.subject.slice(0, 8)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Quiz History ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                Quiz History
              </h3>
              <p className="text-xs text-white/30 mt-0.5">
                {recentAttempts.length} recent attempts
              </p>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              {[
                ["all", "All"],
                ["passed", "Passed ✓"],
                ["failed", "Needs Work"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${historyTab === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-white/30 text-sm mb-2">No quiz history yet</p>
              <Link href="/quizzes">
                <button className="text-xs font-bold text-emerald-400 underline underline-offset-2">
                  Start your first quiz →
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Quiz", "Date", "Score", "Marks", "Status", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-wide last:text-right"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredHistory.map((attempt, i) => (
                        <motion.tr
                          key={attempt.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors group glass-hover"
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white text-sm">
                              {attempt.quiz_title}
                            </p>
                            {attempt.subject_name && (
                              <p className="text-xs text-white/30 mt-0.5">
                                {attempt.subject_name}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-white/40">
                              {new Date(
                                attempt.completed_at,
                              ).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <ScorePill score={attempt.score} />
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-white/60">
                              {attempt.total_marks_awarded ?? 0} /{" "}
                              {attempt.total_max_marks ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {attempt.score >= 75 ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" /> Passed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                                <XCircle className="w-3.5 h-3.5" /> Try again
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/attempts/${attempt.id}`}>
                              <button className="flex items-center gap-1 text-xs font-semibold text-white/30 hover:text-white transition-colors ml-auto">
                                Review <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-white/5">
                {filteredHistory.map((attempt, i) => (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-white text-sm leading-snug">
                        {attempt.quiz_title}
                      </p>
                      <ScorePill score={attempt.score} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </span>
                      <Link href={`/attempts/${attempt.id}`}>
                        <button className="text-xs font-bold text-emerald-400">
                          Review →
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Motivational CTA ── */}
        {completed.length < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, #065f46, #047857, #059669)",
            }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                    Get Started
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg">
                  Take your first quizzes to unlock insights
                </h3>
                <p className="text-emerald-200 text-sm mt-0.5">
                  Your strengths, weaknesses & trends appear after 5 quizzes
                </p>
              </div>
              <Link href="/quizzes">
                <button className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-green-800 font-bold text-sm hover:bg-green-50 transition-all shadow-lg">
                  Browse Quizzes <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
