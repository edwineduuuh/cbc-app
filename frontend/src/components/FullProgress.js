"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Flame,
  Trophy,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Star,
  Minus,
  Brain,
  Lightbulb,
  Focus,
  AlertCircle,
  Download,
  Share2,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

// ─── Color Palette ─────────────────────────────────────────────
const PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#d946ef",
];

// ─── CBC Kenya Grade Function ─────────────────────────────────
function getCBCGrade(percentage) {
  // CBC Kenya Grading Parameter
  if (percentage >= 90)
    return {
      grade: "EE1",
      level: "Exceeding Expectations",
      color: "#22c55e",
      points: 8,
    };
  if (percentage >= 75)
    return {
      grade: "EE2",
      level: "Exceeding Expectations",
      color: "#10b981",
      points: 7,
    };
  if (percentage >= 58)
    return {
      grade: "ME1",
      level: "Meeting Expectations",
      color: "#3b82f6",
      points: 6,
    };
  if (percentage >= 41)
    return {
      grade: "ME2",
      level: "Meeting Expectations",
      color: "#06b6d4",
      points: 5,
    };
  if (percentage >= 31)
    return {
      grade: "AE1",
      level: "Approaching Expectations",
      color: "#f59e0b",
      points: 4,
    };
  if (percentage >= 21)
    return {
      grade: "AE2",
      level: "Approaching Expectations",
      color: "#f97316",
      points: 3,
    };
  if (percentage >= 11)
    return {
      grade: "BE1",
      level: "Below Expectations",
      color: "#ef4444",
      points: 2,
    };
  return {
    grade: "BE2",
    level: "Below Expectations",
    color: "#dc2626",
    points: 1,
  };
}

// ─── Animated Counter ─────────────────────────────────────────
function Counter({ to, suffix = "", decimals = 0, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    const end = parseFloat(to) || 0;
    const steps = 50;
    let current = 0;
    const inc = end / steps;
    const timer = setInterval(() => {
      current = Math.min(current + inc, end);
      setVal(current);
      if (current >= end) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val)}
      {suffix}
    </span>
  );
}

// ─── Level System ─────────────────────────────────────────────
function getLevel(n) {
  if (n >= 100)
    return {
      level: 5,
      title: "Scholar",
      emoji: "🎓",
      color: "#f59e0b",
      next: null,
      pct: 100,
    };
  if (n >= 50)
    return {
      level: 4,
      title: "Expert",
      emoji: "⚡",
      color: "#8b5cf6",
      next: 100,
      pct: (n / 100) * 100,
    };
  if (n >= 20)
    return {
      level: 3,
      title: "Achiever",
      emoji: "🏆",
      color: "#3b82f6",
      next: 50,
      pct: (n / 50) * 100,
    };
  if (n >= 5)
    return {
      level: 2,
      title: "Learner",
      emoji: "📚",
      color: "#10b981",
      next: 20,
      pct: (n / 20) * 100,
    };
  return {
    level: 1,
    title: "Beginner",
    emoji: "🌱",
    color: "#6ee7b7",
    next: 5,
    pct: (n / 5) * 100,
  };
}

// ─── Radial Score Component ───────────────────────────────────
function RadialScore({
  pct,
  size = 100,
  stroke = 6,
  color = "#3b82f6",
  children,
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Sparkline Component ──────────────────────────────────────
function Sparkline({ data = [] }) {
  if (data.length < 2) return null;
  const width = 80;
  const height = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || max;

  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const up = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop
            offset="0%"
            stopColor={up ? "#10b981" : "#f87171"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={up ? "#10b981" : "#f87171"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={up ? "#10b981" : "#f87171"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function FullProgress() {
  const { user } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [activeSubject, setActiveSubject] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    Promise.all([
      fetchWithAuth(`${API}/attempts/?status=completed`).then((r) => r.json()),
      fetchWithAuth(`${API}/analytics/student/`).then((r) => r.json()),
    ])
      .then(([a, s]) => {
        setAttempts(Array.isArray(a) ? a : []);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#ffffff" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-2 border-green-200 border-b-green-500 animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "0.8s",
              }}
            />
          </div>
          <p
            style={{
              fontFamily: "Outfit",
              color: "#999",
              fontSize: 13,
            }}
          >
            Loading your progress…
          </p>
        </div>
      </div>
    );

  // Derived data
  const completed = attempts.filter((a) => a.status === "completed");
  const recent = [...completed]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 10);
  const scores = recent.map((a) => a.score);
  const avgScore = stats?.average_score || 0;
  const bestScore = completed.length
    ? Math.max(...completed.map((a) => a.score))
    : 0;
  const levelData = getLevel(stats?.quizzes_completed || 0);

  // Subject map
  const subMap = {};
  completed.forEach((a) => {
    const key = a.subject_name || a.quiz_title?.split(" ")[0] || "Other";
    if (!subMap[key]) subMap[key] = { scores: [], count: 0 };
    subMap[key].scores.push(a.score);
    subMap[key].count++;
  });
  const subjects = Object.entries(subMap)
    .map(([name, d]) => ({
      name,
      count: d.count,
      avg: d.scores.reduce((s, v) => s + v, 0) / d.scores.length,
      scores: d.scores,
      trend:
        d.scores.length > 1
          ? d.scores[d.scores.length - 1] >= d.scores[0]
            ? "up"
            : "down"
          : "flat",
    }))
    .sort((a, b) => b.avg - a.avg);

  const filtered = recent.filter((a) =>
    tab === "passed" ? a.score >= 75 : tab === "failed" ? a.score < 75 : true,
  );

  return (
    <div
      style={{
        background: "#ffffff",
        minHeight: "100vh",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .card { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 20px; }
        .card-hover:hover { background: #f0f1f3; border-color: #d0d0d0; transition: all 0.2s; }
        .glow-green { box-shadow: 0 0 40px rgba(34,197,94,0.08); }
        .glow-blue { box-shadow: 0 0 40px rgba(59,130,246,0.08); }
        @media (max-width: 1024px) {
          .grid-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
          .header { flex-direction: column; gap: 12px !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .table-responsive { overflow-x: auto; }
          .pad-responsive { padding: 8px 12px !important; }
          body { font-size: 14px; }
        }
        @media (max-width: 480px) {
          h1, h2, h3 { font-size: 16px !important; }
          .grid-2, .grid-3 { gap: 8px !important; }
        }
      `}</style>

      {/* Ambient background orbs - Light version */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "40%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "16px 12px 80px",
          }}
        >
          {/* Page title + Level pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <h1
              style={{
                fontFamily: "Instrument Serif",
                fontSize: 24,
                color: "#1a1a1a",
                fontWeight: 400,
              }}
            >
              My Progress
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 40,
                background: `${levelData.color}15`,
                border: `1px solid ${levelData.color}30`,
              }}
            >
              <span style={{ fontSize: 16 }}>{levelData.emoji}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: levelData.color,
                }}
              >
                {levelData.title}
              </span>
              <span style={{ fontSize: 11, color: "#999" }}>
                Lv.{levelData.level}
              </span>
            </div>
          </div>
          {/* ── Hero section — big score + summary ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid-3"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Big average score */}
            <div
              className="card glow-green"
              style={{
                gridColumn: "span 1",
                padding: 32,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <RadialScore
                pct={avgScore}
                size={120}
                stroke={8}
                color={
                  avgScore >= 75
                    ? "#10b981"
                    : avgScore >= 50
                      ? "#f59e0b"
                      : "#f87171"
                }
              >
                <span
                  style={{
                    fontFamily: "Instrument Serif",
                    fontSize: 28,
                    color: "#1a1a1a",
                    lineHeight: 1,
                  }}
                >
                  {Math.round(avgScore)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#999",
                    fontWeight: 500,
                  }}
                >
                  avg %
                </span>
              </RadialScore>
              <p
                style={{
                  fontSize: 12,
                  color: "#666",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Average Score
              </p>
            </div>

            {/* Stats column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  label: "Quizzes Done",
                  value: stats?.quizzes_completed || 0,
                  icon: BookOpen,
                  color: "#3b82f6",
                },
                {
                  label: "Best Score",
                  value: bestScore,
                  suffix: "%",
                  icon: Trophy,
                  color: "#f59e0b",
                },
                {
                  label: "Passed",
                  value: stats?.quizzes_passed || 0,
                  icon: CheckCircle,
                  color: "#10b981",
                },
              ].map(({ label, value, suffix = "", icon: Icon, color }) => (
                <div
                  key={label}
                  className="card"
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={color} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1a1a1a",
                        lineHeight: 1,
                      }}
                    >
                      <Counter to={value} suffix={suffix} />
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#999",
                        marginTop: 2,
                      }}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Score trend */}
            <div
              className="card"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Score Trend
                </p>
                <Sparkline data={scores.slice(0, 8).reverse()} />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                }}
              >
                {scores
                  .slice(0, 7)
                  .reverse()
                  .map((s, i) => {
                    const color =
                      s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#f87171";
                    const h = Math.max(8, (s / 100) * 80);
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: h }}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          flex: 1,
                          borderRadius: "4px 4px 2px 2px",
                          background: `${color}30`,
                          border: `1px solid ${color}50`,
                        }}
                        title={`${s.toFixed(0)}%`}
                      />
                    );
                  })}
              </div>
              <p style={{ fontSize: 11, color: "#999" }}>
                Last {Math.min(scores.length, 7)} quizzes
              </p>
            </div>
          </motion.div>

          {/* ── Level progress ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
            style={{
              padding: "20px 24px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ fontSize: 28 }}>{levelData.emoji}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: levelData.color,
                  }}
                >
                  {levelData.title}
                </span>
                {levelData.next && (
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {stats?.quizzes_completed || 0} / {levelData.next} quizzes
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 6,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelData.pct}%` }}
                  transition={{
                    duration: 1.2,
                    delay: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${levelData.color}80, ${levelData.color})`,
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((l) => (
                <div
                  key={l}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      l <= levelData.level
                        ? `${levelData.color}20`
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${l <= levelData.level ? levelData.color + "40" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        l <= levelData.level
                          ? levelData.color
                          : "rgba(255,255,255,0.15)",
                    }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Study Insights & Recommendations ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
            className="grid-2"
          >
            {/* Performance Badge */}
            <div className="card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(139,92,246,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={16} color="#8b5cf6" />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Performance Status
                  </h3>
                  <p style={{ fontSize: 11, color: "#888" }}>
                    Based on your last 10 attempts
                  </p>
                </div>
              </div>

              {(() => {
                const grade = getCBCGrade(avgScore);
                const consistency =
                  scores.length >= 3
                    ? Math.abs(
                        Math.max(...scores.slice(0, 3)) -
                          Math.min(...scores.slice(0, 3)),
                      ) <= 15
                      ? "Consistent"
                      : "Variable"
                    : "New";
                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: `${grade.color}15`,
                        border: `1px solid ${grade.color}40`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          color: "#666",
                          marginBottom: 6,
                        }}
                      >
                        Grade
                      </p>
                      <p
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: grade.color,
                        }}
                      >
                        {grade.grade}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "rgba(59,130,246,0.08)",
                        border: "1px solid rgba(59,130,246,0.15)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          color: "#666",
                          marginBottom: 6,
                        }}
                      >
                        Consistency
                      </p>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#3b82f6",
                        }}
                      >
                        {consistency}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* AI Recommendations */}
            <div className="card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(34,197,94,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lightbulb size={16} color="#22c55e" />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Next Steps
                  </h3>
                  <p style={{ fontSize: 11, color: "#999" }}>
                    Personalized suggestions
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {avgScore >= 80 ? (
                  <>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "rgba(16,185,129,0.1)",
                        borderLeft: "3px solid #10b981",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: "#1a1a1a",
                          fontWeight: 500,
                        }}
                      >
                        🎯 Try harder quizzes
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#666",
                          marginTop: 4,
                        }}
                      >
                        You're doing well! Challenge yourself with advanced
                        strands.
                      </p>
                    </div>
                  </>
                ) : avgScore >= 60 ? (
                  <>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "rgba(251,191,36,0.1)",
                        borderLeft: "3px solid #f59e0b",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: "#1a1a1a",
                          fontWeight: 500,
                        }}
                      >
                        📚 Focus on weak areas
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#666",
                          marginTop: 4,
                        }}
                      >
                        Review learning areas where you scored below 65%.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "rgba(248,113,113,0.1)",
                        borderLeft: "3px solid #f87171",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: "#1a1a1a",
                          fontWeight: 500,
                        }}
                      >
                        💪 Practice fundamentals
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#666",
                          marginTop: 4,
                        }}
                      >
                        Go back to basics and practice more quizzes.
                      </p>
                    </div>
                  </>
                )}

                <div
                  style={{
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(139,92,246,0.1)",
                    borderLeft: "3px solid #8b5cf6",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "#1a1a1a",
                      fontWeight: 500,
                    }}
                  >
                    ⏱️ Consistency matters
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#666",
                      marginTop: 4,
                    }}
                  >
                    {completed.length < 5
                      ? "Take more quizzes to build momentum."
                      : "Keep your streak going!"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Subject performance ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
            style={{ padding: 24, marginBottom: 24 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontFamily: "Instrument Serif",
                  fontSize: 20,
                  color: "#1a1a1a",
                  fontWeight: 400,
                }}
              >
                Learning Area Performance
              </h2>
              <span style={{ fontSize: 12, color: "#999" }}>
                {subjects.length} learning areas
              </span>
            </div>

            {subjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <BarChart3
                  size={32}
                  color="rgba(200,200,200,0.4)"
                  style={{ margin: "0 auto 12px" }}
                />
                <p style={{ fontSize: 13, color: "#999" }}>
                  Take quizzes to see learning area breakdown
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {subjects.map((s, i) => {
                  const color = PALETTE[i % PALETTE.length];
                  const TIcon =
                    s.trend === "up"
                      ? TrendingUp
                      : s.trend === "down"
                        ? TrendingDown
                        : Minus;
                  const tColor =
                    s.trend === "up"
                      ? "#10b981"
                      : s.trend === "down"
                        ? "#f87171"
                        : "#999";
                  return (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() =>
                        setActiveSubject(
                          activeSubject === s.name ? null : s.name,
                        )
                      }
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background:
                          activeSubject === s.name
                            ? `${color}10`
                            : "rgba(255,255,255,0.02)",
                        border: `1px solid ${activeSubject === s.name ? color + "30" : "rgba(255,255,255,0.06)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `${color}20`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{ fontSize: 13, fontWeight: 800, color }}
                            >
                              {s.name[0]}
                            </span>
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {s.name}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#999",
                              }}
                            >
                              {s.count} quiz{s.count !== 1 ? "zes" : ""}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{ fontSize: 18, fontWeight: 800, color }}
                          >
                            {s.avg.toFixed(0)}%
                          </span>
                          <TIcon size={13} color={tColor} />
                        </div>
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(s.avg, 100)}%` }}
                          transition={{
                            duration: 0.8,
                            delay: i * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            height: "100%",
                            borderRadius: 99,
                            background: color,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── Strengths & Weaknesses ── */}
          {subjects.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Strengths */}
              <div className="card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(16,185,129,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Star size={14} color="#10b981" />
                  </div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Strongest Learning Areas
                  </h3>
                </div>
                {subjects.slice(0, 3).map((s, i) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: i < 2 ? "1px solid #e0e0e0" : "none",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "#999",
                          width: 16,
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span style={{ fontSize: 13, color: "#1a1a1a" }}>
                        {s.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#10b981",
                      }}
                    >
                      {s.avg.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Weaknesses */}
              <div className="card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(249,115,22,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Target size={14} color="#f97316" />
                  </div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Needs Practice
                  </h3>
                </div>
                {[...subjects]
                  .sort((a, b) => a.avg - b.avg)
                  .slice(0, 3)
                  .map((s, i, arr) => (
                    <div
                      key={s.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: i < 2 ? "1px solid #e0e0e0" : "none",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#1a1a1a" }}>
                        {s.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#f59e0b",
                          }}
                        >
                          {s.avg.toFixed(0)}%
                        </span>
                        <Link href="/explore">
                          <ArrowUpRight
                            size={13}
                            color="rgba(255,255,255,0.2)"
                            style={{ cursor: "pointer" }}
                          />
                        </Link>
                      </div>
                    </div>
                  ))}
                <Link href="/explore">
                  <button
                    style={{
                      width: "100%",
                      marginTop: 16,
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(249,115,22,0.08)",
                      border: "1px solid rgba(249,115,22,0.2)",
                      color: "#f97316",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Practice these →
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Consistency & Motivation ── */}
          {completed.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="card"
              style={{
                padding: 24,
                marginBottom: 24,
                background:
                  "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.04))",
                border: "1px solid rgba(249,115,22,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(249,115,22,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Flame size={18} color="#f97316" />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Your Commitment
                  </h3>
                  <p style={{ fontSize: 11, color: "#999" }}>
                    Stay consistent, improve systematically
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#666",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Total Attempts
                  </p>
                  <p
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#f97316",
                    }}
                  >
                    <Counter to={completed.length} />
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#666",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Success Rate
                  </p>
                  <p
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#10b981",
                    }}
                  >
                    <Counter
                      to={
                        completed.length > 0
                          ? Math.round(
                              ((stats?.quizzes_passed || 0) /
                                completed.length) *
                                100,
                            )
                          : 0
                      }
                      suffix="%"
                    />
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={13} color="#f59e0b" />
                <p style={{ fontSize: 12, color: "#666" }}>
                  {scores.length >= 5
                    ? "You're on a roll! Keep the momentum going 🚀"
                    : "Take more quizzes to build confidence and skills"}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Quiz History ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
            style={{ overflow: "hidden" }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "Instrument Serif",
                    fontSize: 20,
                    color: "#1a1a1a",
                    fontWeight: 400,
                  }}
                >
                  Quiz History
                </h2>
                <p
                  style={{
                    fontSize: 12,
                    color: "#999",
                    marginTop: 2,
                  }}
                >
                  {recent.length} recent attempts
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: 4,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                }}
              >
                {[
                  ["all", "All"],
                  ["passed", "Passed"],
                  ["failed", "Needs Work"],
                ].map(([t, l]) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: tab === t ? "#f0f1f3" : "transparent",
                      color: tab === t ? "#1a1a1a" : "#999",
                      border: "none",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <Calendar
                  size={32}
                  color="rgba(200,200,200,0.4)"
                  style={{ margin: "0 auto 12px" }}
                />
                <p style={{ fontSize: 13, color: "#999" }}>No attempts found</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div style={{ overflowX: "auto" }} className="table-responsive">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Quiz", "Date", "Score", "Marks", "Status", ""].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: "12px 20px",
                                textAlign: h === "" ? "right" : "left",
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#999",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                borderBottom: "1px solid #e0e0e0",
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filtered.map((a, i) => {
                          const passed = a.score >= 75;
                          const color =
                            a.score >= 75
                              ? "#10b981"
                              : a.score >= 50
                                ? "#f59e0b"
                                : "#f87171";
                          return (
                            <motion.tr
                              key={a.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: i * 0.03 }}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(255,255,255,0.02)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <td style={{ padding: "14px 20px" }}>
                                <p
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#1a1a1a",
                                  }}
                                >
                                  {a.quiz_title}
                                </p>
                                {a.subject_name && (
                                  <p
                                    style={{
                                      fontSize: 11,
                                      color: "#999",
                                      marginTop: 2,
                                    }}
                                  >
                                    {a.subject_name}
                                  </p>
                                )}
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "#999",
                                  }}
                                >
                                  {new Date(a.completed_at).toLocaleDateString(
                                    "en-KE",
                                    { day: "numeric", month: "short" },
                                  )}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color,
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    background: `${color}15`,
                                  }}
                                >
                                  {a.score.toFixed(0)}%
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#666",
                                  }}
                                >
                                  {a.total_marks_awarded ?? 0} /{" "}
                                  {a.total_max_marks ?? 0}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: passed ? "#10b981" : "#f87171",
                                  }}
                                >
                                  {passed ? (
                                    <CheckCircle size={12} />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  {passed ? "Passed" : "Try again"}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "14px 20px",
                                  textAlign: "right",
                                }}
                              >
                                <Link href={`/attempts/${a.id}`}>
                                  <button
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: "#999",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      transition: "color 0.15s",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.color = "#1a1a1a")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.color = "#999")
                                    }
                                  >
                                    Review <ChevronRight size={13} />
                                  </button>
                                </Link>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>

          {/* ── CTA if new user ── */}
          {completed.length < 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                marginTop: 24,
                padding: "28px 32px",
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.08))",
                border: "1px solid rgba(16,185,129,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <Zap size={14} color="#f59e0b" />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#10b981",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Get started
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "Instrument Serif",
                    fontSize: 20,
                    color: "#1a1a1a",
                    fontWeight: 400,
                    marginBottom: 4,
                  }}
                >
                  Take more quizzes to unlock insights
                </h3>
                <p style={{ fontSize: 13, color: "#666" }}>
                  Trends, strengths and AI analysis appear after a few attempts
                </p>
              </div>
              <Link href="/explore">
                <button
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    background: "#10b981",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Explore Quizzes <ChevronRight size={14} />
                </button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
