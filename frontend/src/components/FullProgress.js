"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Target,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
  Printer,
  Share2,
  Minus,
  Compass,
  Beaker,
  Users,
  Palette,
  ArrowRight,
  Calendar,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

/* ── CBE Kenya Grade Scale ────────────────────────────── */
function getCBEGrade(pct) {
  if (pct >= 90)
    return {
      grade: "EE1",
      label: "Exceeding Expectations",
      color: "#059669",
      bg: "#ecfdf5",
    };
  if (pct >= 75)
    return {
      grade: "EE2",
      label: "Exceeding Expectations",
      color: "#10b981",
      bg: "#ecfdf5",
    };
  if (pct >= 58)
    return {
      grade: "ME1",
      label: "Meeting Expectations",
      color: "#2563eb",
      bg: "#eff6ff",
    };
  if (pct >= 41)
    return {
      grade: "ME2",
      label: "Meeting Expectations",
      color: "#3b82f6",
      bg: "#eff6ff",
    };
  if (pct >= 31)
    return {
      grade: "AE1",
      label: "Approaching Expectations",
      color: "#d97706",
      bg: "#fffbeb",
    };
  if (pct >= 21)
    return {
      grade: "AE2",
      label: "Approaching Expectations",
      color: "#f59e0b",
      bg: "#fffbeb",
    };
  if (pct >= 11)
    return {
      grade: "BE1",
      label: "Below Expectations",
      color: "#dc2626",
      bg: "#fef2f2",
    };
  return {
    grade: "BE2",
    label: "Below Expectations",
    color: "#dc2626",
    bg: "#fef2f2",
  };
}

/* ── Level System ─────────────────────────────────────── */
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
      pct: ((n - 50) / 50) * 100,
    };
  if (n >= 20)
    return {
      level: 3,
      title: "Achiever",
      emoji: "🏆",
      color: "#3b82f6",
      next: 50,
      pct: ((n - 20) / 30) * 100,
    };
  if (n >= 5)
    return {
      level: 2,
      title: "Learner",
      emoji: "📚",
      color: "#10b981",
      next: 20,
      pct: ((n - 5) / 15) * 100,
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

/* ── Subject → Emoji (matches actual DB subjects) ─────── */
const SUBJECT_EMOJI = {
  "Mathematics Activities": "📐",
  "Core Mathematics": "📐",
  Mathematics: "📐",
  "Integrated Science": "🔬",
  "Science and Technology": "🧪",
  English: "📖",
  Kiswahili: "🗣️",
  "Social Studies": "🌍",
  "Christian Religious Education": "🕊️",
  "Islamic Religious Education": "🕌",
  "Religious Education": "🕊️",
  "Business Studies": "💼",
  "Creative Arts and Sports": "🎨",
  "Creative Arts": "🎨",
  "Agriculture & Nutrition": "🌾",
  Agriculture: "🌾",
  "Pre-Technical Studies": "⚙️",
  "Home Science": "🏠",
  "Computer Science": "💻",
  "Health Education": "❤️",
  "Physical Education": "⚽",
  Music: "🎵",
  Art: "🖌️",
  "Life Skills": "🧠",
  French: "🇫🇷",
  German: "🇩🇪",
  Arabic: "🇸🇦",
};
function getSubjectEmoji(name) {
  if (!name) return "📚";
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJI)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "📚";
}

/* ── Pathway Mapping (CBE indicator subjects) ─────────── */
const PATHWAYS = {
  STEM: {
    name: "STEM",
    icon: Beaker,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    subjects: [
      "Mathematics",
      "Integrated Science",
      "Science and Technology",
      "Pre-Technical Studies",
    ],
    tracks: "Pure Sciences, Applied Sciences, Technical & Engineering",
  },
  "Social Sciences": {
    name: "Social Sciences",
    icon: Users,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    subjects: [
      "Social Studies",
      "Religious Education",
      "Business Studies",
      "Kiswahili",
      "English",
    ],
    tracks: "Humanities, Business Studies, Languages & Literature",
  },
  "Arts & Sports": {
    name: "Arts & Sports Science",
    icon: Palette,
    color: "#db2777",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    subjects: [
      "Creative Arts",
      "Health Education",
      "Physical Education",
      "Agriculture",
      "Music",
      "Art",
    ],
    tracks: "Visual Arts, Performing Arts, Sports Science",
  },
};

/* ── Radar Chart (SVG) ────────────────────────────────── */
function RadarChart({ dataPoints, size = 260 }) {
  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38;
  const n = dataPoints.length;
  if (n < 3) return null;
  const step = (2 * Math.PI) / n;
  const pt = (i, pct) => ({
    x: cx + r * (pct / 100) * Math.sin(i * step),
    y: cy - r * (pct / 100) * Math.cos(i * step),
  });
  const rings = [25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-70 mx-auto">
      {rings.map((ring, ri) => (
        <polygon
          key={ri}
          points={Array.from({ length: n }, (_, i) => pt(i, ring))
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: n }, (_, i) => pt(i, 100)).map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      ))}
      <polygon
        points={dataPoints
          .map((d, i) => pt(i, d.value))
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="rgba(16,185,129,0.15)"
        stroke="#10b981"
        strokeWidth="2"
      />
      {dataPoints.map((d, i) => {
        const p = pt(i, d.value);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#10b981"
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}
      {dataPoints.map((d, i) => {
        const p = pt(i, 118);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-600"
            style={{ fontSize: 9, fontWeight: 500 }}
          >
            {d.label.length > 14 ? d.label.slice(0, 12) + "…" : d.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Progress Bar ─────────────────────────────────────── */
function ProgressBar({ pct, color, height = 8 }) {
  const fill =
    color || (pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444");
  const bg = pct >= 70 ? "#dcfce7" : pct >= 50 ? "#fef9c3" : "#fee2e2";
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: bg }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: fill }}
      />
    </div>
  );
}

/* ── CBE Grade Bands (for timeline chart) ─────────────── */
const GRADE_BANDS = [
  { grade: "BE2", min: 0, max: 11, color: "#fecaca", border: "#fca5a5" },
  { grade: "BE1", min: 11, max: 21, color: "#fed7aa", border: "#fdba74" },
  { grade: "AE2", min: 21, max: 31, color: "#fef08a", border: "#fde047" },
  { grade: "AE1", min: 31, max: 41, color: "#fef9c3", border: "#fde68a" },
  { grade: "ME2", min: 41, max: 58, color: "#bfdbfe", border: "#93c5fd" },
  { grade: "ME1", min: 58, max: 75, color: "#dbeafe", border: "#93c5fd" },
  { grade: "EE2", min: 75, max: 90, color: "#bbf7d0", border: "#86efac" },
  { grade: "EE1", min: 90, max: 100, color: "#dcfce7", border: "#86efac" },
];

/* ── Build Timeline Data from Attempts ────────────────── */
function buildTimelineData(completed) {
  if (!completed.length)
    return { points: [], transitions: [], currentStreak: null };

  const sorted = [...completed].sort(
    (a, b) => new Date(a.completed_at) - new Date(b.completed_at),
  );

  let runningSum = 0;
  const points = [];
  const transitions = [];
  let prevGrade = null;

  sorted.forEach((a, i) => {
    runningSum += a.score;
    const avg = runningSum / (i + 1);
    const grade = getCBEGrade(avg);
    const date = new Date(a.completed_at);
    points.push({
      date,
      avg,
      grade: grade.grade,
      label: grade.label,
      color: grade.color,
      index: i,
    });

    if (prevGrade && prevGrade !== grade.grade) {
      transitions.push({
        from: prevGrade,
        to: grade.grade,
        date,
        index: i,
        improved: avg > (runningSum - a.score) / i,
      });
    }
    prevGrade = grade.grade;
  });

  // Current streak: how long at current grade
  let currentStreak = null;
  if (points.length > 0) {
    const currentGrade = points[points.length - 1].grade;
    let streakStart = points[points.length - 1].date;
    for (let i = points.length - 2; i >= 0; i--) {
      if (points[i].grade === currentGrade) {
        streakStart = points[i].date;
      } else break;
    }
    const days = Math.floor((new Date() - streakStart) / (1000 * 60 * 60 * 24));
    const prevTrans =
      transitions.length > 0 ? transitions[transitions.length - 1] : null;
    currentStreak = {
      grade: currentGrade,
      since: streakStart,
      days,
      fromGrade: prevTrans ? prevTrans.from : null,
      improved: prevTrans ? prevTrans.improved : null,
    };
  }

  return { points, transitions, currentStreak };
}

/* ── Grade Progression Timeline (SVG) ─────────────────── */
function GradeTimeline({ points }) {
  if (points.length < 2) return null;

  const W = 600,
    H = 220;
  const pad = { top: 20, right: 24, bottom: 40, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const yScale = (pct) => pad.top + chartH * (1 - pct / 100);
  const xScale = (i) => pad.left + (i / (points.length - 1)) * chartW;

  // Build path
  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.avg).toFixed(1)}`,
    )
    .join(" ");

  // Area path (fill under line)
  const areaPath = `${linePath} L${xScale(points.length - 1).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} Z`;

  // Date labels (show ~5-6 labels max)
  const labelStep = Math.max(1, Math.floor(points.length / 5));
  const dateLabels = points.filter(
    (_, i) => i === 0 || i === points.length - 1 || i % labelStep === 0,
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={pad.left} y={pad.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Grade bands */}
      {GRADE_BANDS.map((band) => {
        const y1 = yScale(band.max);
        const y2 = yScale(band.min);
        return (
          <g key={band.grade} clipPath="url(#chartClip)">
            <rect
              x={pad.left}
              y={y1}
              width={chartW}
              height={y2 - y1}
              fill={band.color}
              opacity={0.35}
            />
            <text
              x={pad.left + 4}
              y={y1 + (y2 - y1) / 2 + 3}
              className="fill-gray-400"
              style={{ fontSize: 8, fontWeight: 500 }}
            >
              {band.grade}
            </text>
          </g>
        );
      })}

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            y1={yScale(v)}
            x2={W - pad.right}
            y2={yScale(v)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
            strokeDasharray={v === 0 || v === 100 ? "none" : "3,3"}
          />
          <text
            x={pad.left - 6}
            y={yScale(v) + 3}
            textAnchor="end"
            className="fill-gray-400"
            style={{ fontSize: 9 }}
          >
            {v}%
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#timelineGrad)" clipPath="url(#chartClip)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#chartClip)"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={xScale(i)}
            cy={yScale(p.avg)}
            r={points.length > 20 ? 2.5 : 4}
            fill={p.color}
            stroke="#fff"
            strokeWidth="2"
          />
          {/* Tooltip-style label for last point */}
          {i === points.length - 1 && (
            <g>
              <rect
                x={xScale(i) - 28}
                y={yScale(p.avg) - 22}
                width={56}
                height={18}
                rx={4}
                fill={p.color}
              />
              <text
                x={xScale(i)}
                y={yScale(p.avg) - 10}
                textAnchor="middle"
                fill="#fff"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                {p.grade} · {Math.round(p.avg)}%
              </text>
            </g>
          )}
        </g>
      ))}

      {/* Date labels along x-axis */}
      {dateLabels.map((p) => (
        <text
          key={p.index}
          x={xScale(p.index)}
          y={H - 8}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: 9 }}
        >
          {p.date.toLocaleDateString("en-KE", {
            day: "numeric",
            month: "short",
          })}
        </text>
      ))}
    </svg>
  );
}

/* ── Trend Badge ──────────────────────────────────────── */
function TrendBadge({ scores }) {
  if (!scores || scores.length < 2)
    return <Minus className="w-4 h-4 text-gray-300" />;
  const recent = scores.slice(-3);
  const older = scores.slice(-6, -3);
  if (older.length === 0) {
    const d = recent[recent.length - 1] - recent[0];
    if (d > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (d < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-gray-300" />;
  }
  const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgO = older.reduce((a, b) => a + b, 0) / older.length;
  if (avgR > avgO) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (avgR < avgO) return <TrendingDown className="w-4 h-4 text-rose-500" />;
  return <Minus className="w-4 h-4 text-gray-300" />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  MAIN COMPONENT                                         */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function FullProgress() {
  const { user } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [quizSubjectMap, setQuizSubjectMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch BOTH attempts AND quizzes so we always have quiz→subject mapping
    Promise.all([
      fetchWithAuth(`${API}/attempts/?status=completed`).then((r) => r.json()),
      fetchWithAuth(`${API}/quizzes/`).then((r) => r.json()),
    ])
      .then(([attemptsData, quizzesData]) => {
        setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
        // Build quiz_id → subject_name map from quizzes endpoint
        const qMap = {};
        const quizArr = Array.isArray(quizzesData)
          ? quizzesData
          : quizzesData.results || [];
        quizArr.forEach((q) => {
          if (q.id && q.subject_name) qMap[q.id] = q.subject_name;
        });
        setQuizSubjectMap(qMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  /* ── Helpers ────────────────────────────────────────── */
  const handlePrint = () => window.print();

  const studentName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Student";
  const gradeLabel = user?.grade ? `Grade ${user.grade}` : "";

  /* ── Get subject for an attempt (triple fallback) ──── */
  const getSubjectForAttempt = (a) => {
    // 1. From AttemptSerializer (if backend deployed)
    if (a.subject_name) return a.subject_name;
    // 2. From quizzes endpoint map
    if (quizSubjectMap[a.quiz]) return quizSubjectMap[a.quiz];
    // 3. Last resort
    return "Other";
  };

  /* ── Loading ────────────────────────────────────────── */
  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">
            Loading your progress…
          </p>
        </div>
      </div>
    );

  /* ── Derived Data ───────────────────────────────────── */
  const completed = attempts.filter((a) => a.status === "completed");
  const avgScore = completed.length
    ? completed.reduce((s, a) => s + a.score, 0) / completed.length
    : 0;
  const cbeGrade = getCBEGrade(avgScore);
  const levelData = getLevel(completed.length);
  const userGrade = user?.grade || null;

  // Grade timeline
  const {
    points: timelinePoints,
    transitions: gradeTransitions,
    currentStreak,
  } = buildTimelineData(completed);

  // Group by SUBJECT (not quiz title!)
  const subjectMap = {};
  completed.forEach((a) => {
    const key = getSubjectForAttempt(a);
    if (!subjectMap[key]) subjectMap[key] = { quizzes: [], scores: [] };
    subjectMap[key].quizzes.push(a);
    subjectMap[key].scores.push(a.score);
  });

  const subjects = Object.entries(subjectMap)
    .map(([name, d]) => ({
      name,
      count: d.quizzes.length,
      avg: d.scores.reduce((a, b) => a + b, 0) / d.scores.length,
      scores: d.scores,
      quizzes: d.quizzes.sort(
        (a, b) => new Date(b.completed_at) - new Date(a.completed_at),
      ),
    }))
    .sort((a, b) => b.avg - a.avg);

  const strengths = subjects.slice(0, 3).filter((s) => s.avg >= 40);
  const weaknesses = [...subjects]
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .filter((s) => s.avg < subjects[0]?.avg);

  // Pathway scores
  const pathwayScores = {};
  for (const [key, pw] of Object.entries(PATHWAYS)) {
    const matching = subjects.filter((s) =>
      pw.subjects.some((ps) => s.name.toLowerCase().includes(ps.toLowerCase())),
    );
    if (matching.length > 0) {
      const totalScore = matching.reduce((sum, s) => sum + s.avg * s.count, 0);
      const totalCount = matching.reduce((sum, s) => sum + s.count, 0);
      pathwayScores[key] = {
        avg: totalScore / totalCount,
        count: totalCount,
        subjects: matching,
      };
    }
  }
  const bestPathway = Object.entries(pathwayScores).sort(
    (a, b) => b[1].avg - a[1].avg,
  )[0];

  const radarData = subjects
    .slice(0, 8)
    .map((s) => ({ label: s.name, value: Math.round(s.avg) }));

  const handleShare = async () => {
    const text = `📊 ${studentName}'s StadiSpace Progress Report\n${gradeLabel ? gradeLabel + " • " : ""}${cbeGrade.grade} — ${cbeGrade.label}\n${subjects.length} learning areas • ${completed.length} quizzes\nOverall Average: ${Math.round(avgScore)}%\n\nTrack CBE progress at stadispace.com`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${studentName}'s Progress Report`,
          text,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Progress report copied to clipboard!");
    }
  };

  /* ── Empty ──────────────────────────────────────────── */
  if (completed.length === 0)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No Progress Yet
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Complete your first quiz to unlock your progress dashboard with CBE
            grade tracking, pathway analysis, and more.
          </p>
          <Link href="/explore">
            <button className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-sm">
              Take Your First Quiz
            </button>
          </Link>
        </motion.div>
      </div>
    );

  /* ── Main Render ────────────────────────────────────── */
  return (
    <>
      <style>{`
        @media print {
          nav, .no-print, .no-print *, button:not(.print-keep) { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-inside: avoid; }
          .print-only { display: block !important; }
          * { box-shadow: none !important; }
          .print-page { padding: 0 !important; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      <div ref={printRef} className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6 print-page">
          {/* ══════ PRINT HEADER (only visible when printing) ══════ */}
          <div className="print-only print-break">
            <div
              style={{
                borderBottom: "3px solid #059669",
                paddingBottom: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#059669",
                      margin: 0,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    StadiSpace
                  </h1>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Competency-Based Education Progress Platform
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                    Report Generated:{" "}
                    {new Date().toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    stadispace.com
                  </p>
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#9ca3af",
                      margin: "0 0 4px 0",
                      fontWeight: 600,
                    }}
                  >
                    Student Name
                  </p>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {studentName}
                  </p>
                </div>
                {gradeLabel && (
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: "#9ca3af",
                        margin: "0 0 4px 0",
                        fontWeight: 600,
                      }}
                    >
                      Grade
                    </p>
                    <p
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      {gradeLabel}
                    </p>
                  </div>
                )}
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#9ca3af",
                      margin: "0 0 4px 0",
                      fontWeight: 600,
                    }}
                  >
                    Overall Grade
                  </p>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: cbeGrade.color,
                      margin: 0,
                    }}
                  >
                    {cbeGrade.grade}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#9ca3af",
                      margin: "0 0 4px 0",
                      fontWeight: 600,
                    }}
                  >
                    Average Score
                  </p>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {Math.round(avgScore)}%
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#9ca3af",
                      margin: "0 0 4px 0",
                      fontWeight: 600,
                    }}
                  >
                    Quizzes Done
                  </p>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {completed.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ SCREEN HEADER ══════ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print"
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {studentName}
                {gradeLabel ? ` • ${gradeLabel}` : ""}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: cbeGrade.bg,
                    color: cbeGrade.color,
                    border: `1px solid ${cbeGrade.color}20`,
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  {cbeGrade.grade} — {cbeGrade.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  {levelData.emoji} {levelData.title} Lv.{levelData.level}
                </span>
                {currentStreak && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {currentStreak.grade} for{" "}
                    {currentStreak.days < 1
                      ? "today"
                      : currentStreak.days === 1
                        ? "1 day"
                        : `${currentStreak.days} days`}
                    {currentStreak.fromGrade && (
                      <span
                        className={
                          currentStreak.improved
                            ? "text-emerald-600"
                            : "text-rose-500"
                        }
                      >
                        {" "}
                        · {currentStreak.improved ? "↑" : "↓"} from{" "}
                        {currentStreak.fromGrade}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </motion.div>

          {/* ══════ LEVEL BAR (screen only) ══════ */}
          {levelData.next && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm no-print"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500">
                  {levelData.emoji} Level {levelData.level} → Level{" "}
                  {levelData.level + 1}
                </span>
                <span className="text-xs text-gray-400">
                  {completed.length} / {levelData.next} quizzes
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelData.pct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: levelData.color }}
                />
              </div>
            </motion.div>
          )}

          {/* ══════ GRADE PROGRESSION TIMELINE ══════ */}
          {timelinePoints.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print-break"
            >
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Grade Journey
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Your CBE grade progression over {timelinePoints.length}{" "}
                      quizzes
                    </p>
                  </div>
                  {currentStreak && (
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                        style={{
                          background: cbeGrade.bg,
                          color: cbeGrade.color,
                          border: `1.5px solid ${cbeGrade.color}30`,
                        }}
                      >
                        {cbeGrade.grade}
                        <span className="font-normal text-gray-500 ml-0.5">
                          for{" "}
                          {currentStreak.days < 1
                            ? "today"
                            : currentStreak.days < 7
                              ? `${currentStreak.days}d`
                              : currentStreak.days < 30
                                ? `${Math.floor(currentStreak.days / 7)}w`
                                : `${Math.floor(currentStreak.days / 30)}mo`}
                        </span>
                        {currentStreak.fromGrade && (
                          <span
                            className={
                              currentStreak.improved
                                ? "text-emerald-600"
                                : "text-rose-500"
                            }
                          >
                            {currentStreak.improved ? "↑" : "↓"}{" "}
                            {currentStreak.fromGrade}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {/* Milestone badges */}
                {gradeTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {gradeTransitions.slice(-4).map((t, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.improved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        {t.improved ? "↑" : "↓"} {t.from} → {t.to}
                        <span className="text-gray-400 font-normal ml-0.5">
                          {t.date.toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-2 pb-3">
                <GradeTimeline points={timelinePoints} />
              </div>
            </motion.div>
          )}

          {/* ══════ LEARNING AREA PERFORMANCE ══════ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Learning Area Performance
            </h2>
            <div className="space-y-3">
              {subjects.map((subject, idx) => {
                const isExpanded = expandedSubject === subject.name;
                const subGrade = getCBEGrade(subject.avg);
                return (
                  <motion.div
                    key={subject.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    className="print-break"
                  >
                    <button
                      onClick={() =>
                        setExpandedSubject(isExpanded ? null : subject.name)
                      }
                      className="w-full bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">
                            {getSubjectEmoji(subject.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {subject.name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {subject.count} quiz
                              {subject.count !== 1 ? "zes" : ""} completed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <TrendBadge scores={subject.scores} />
                          <span
                            className="text-sm font-bold"
                            style={{ color: subGrade.color }}
                          >
                            {Math.round(subject.avg)}%
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: subGrade.bg,
                              color: subGrade.color,
                            }}
                          >
                            {subGrade.grade}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="no-print"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </motion.div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar pct={subject.avg} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gray-50 border border-t-0 border-gray-100 rounded-b-xl px-4 py-3 space-y-2">
                            {subject.quizzes.map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-50"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {q.quiz_title}
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    {new Date(
                                      q.completed_at,
                                    ).toLocaleDateString("en-KE", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                    {q.total_marks_awarded != null &&
                                      ` • ${q.total_marks_awarded}/${q.total_max_marks} marks`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={`text-sm font-bold ${q.score >= 70 ? "text-emerald-600" : q.score >= 50 ? "text-amber-600" : "text-rose-600"}`}
                                  >
                                    {Math.round(q.score)}%
                                  </span>
                                  <Link
                                    href={`/attempts/${q.id}`}
                                    className="no-print text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                                  >
                                    Review <ChevronRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {completed.length > 0 && subjects.length < 3 && (
                <div className="bg-white/60 rounded-xl border border-dashed border-gray-200 p-4 text-center no-print">
                  <p className="text-sm text-gray-400">
                    Try more learning areas to unlock deeper insights
                  </p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2 hover:text-emerald-700"
                  >
                    Browse Quizzes <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* ══════ STRENGTHS & WEAKNESSES ══════ */}
          {subjects.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-break"
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Strongest Areas
                </h3>
                <div className="space-y-2.5">
                  {strengths.length > 0 ? (
                    strengths.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {getSubjectEmoji(s.name)}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {s.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">
                          {Math.round(s.avg)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">
                      Take more quizzes to reveal your strengths
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  Areas to Improve
                </h3>
                <div className="space-y-2.5">
                  {weaknesses.length > 0 ? (
                    weaknesses.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {getSubjectEmoji(s.name)}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-amber-600">
                            {Math.round(s.avg)}%
                          </span>
                          <Link
                            href="/explore"
                            className="no-print text-[10px] font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            Practice →
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">
                      Try different learning areas to find gaps
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════ PATHWAY TRACKER / LEARNING PROFILE ══════ */}
          {subjects.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="print-break"
            >
              {userGrade >= 7 && userGrade <= 9 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-indigo-600" />
                      Pathway Predictor
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on performance in CBE indicator subjects for Grade{" "}
                      {userGrade}
                    </p>
                  </div>
                  <div className="px-5 pb-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(PATHWAYS).map(([key, pw]) => {
                        const data = pathwayScores[key];
                        const isBest = bestPathway && bestPathway[0] === key;
                        const Icon = pw.icon;
                        return (
                          <div
                            key={key}
                            className={`relative rounded-xl p-4 border-2 transition-all ${isBest ? "shadow-md" : ""}`}
                            style={{
                              background: pw.bg,
                              borderColor: isBest ? pw.color : pw.border,
                            }}
                          >
                            {isBest && (
                              <span
                                className="absolute -top-2.5 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ background: pw.color }}
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Best Fit
                              </span>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: `${pw.color}20` }}
                              >
                                <Icon
                                  className="w-4 h-4"
                                  style={{ color: pw.color }}
                                />
                              </div>
                              <span
                                className="text-sm font-bold"
                                style={{ color: pw.color }}
                              >
                                {pw.name}
                              </span>
                            </div>
                            {data ? (
                              <>
                                <div
                                  className="text-3xl font-bold mb-1"
                                  style={{ color: pw.color }}
                                >
                                  {Math.round(data.avg)}%
                                </div>
                                <ProgressBar pct={data.avg} color={pw.color} />
                                <div className="mt-2.5 space-y-1">
                                  {data.subjects.map((s) => (
                                    <div
                                      key={s.name}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-[11px] text-gray-600">
                                        {s.name}
                                      </span>
                                      <span
                                        className="text-[11px] font-semibold"
                                        style={{ color: pw.color }}
                                      >
                                        {Math.round(s.avg)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="py-3 text-center">
                                <p className="text-xs text-gray-400 mb-2">
                                  No data yet
                                </p>
                                <Link
                                  href="/explore"
                                  className="no-print text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                                >
                                  Try a quiz →
                                </Link>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                              Tracks: {pw.tracks}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {bestPathway && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Strong aptitude for{" "}
                              {PATHWAYS[bestPathway[0]].name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              With an average of{" "}
                              {Math.round(bestPathway[1].avg)}% across{" "}
                              {bestPathway[1].count} quizzes in indicator
                              subjects, this pathway aligns with current
                              strengths.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-600" />
                    Your Learning Profile
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Performance across all learning areas
                  </p>
                  {radarData.length >= 3 ? (
                    <div className="flex flex-col items-center">
                      <RadarChart dataPoints={radarData} />
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {radarData.map((d) => (
                          <span
                            key={d.label}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-[11px] text-gray-600"
                          >
                            {getSubjectEmoji(d.label)} {d.label}:{" "}
                            <span className="font-bold">{d.value}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400 mb-3">
                        Complete quizzes in at least 3 learning areas to see
                        your profile chart
                      </p>
                      <Link
                        href="/explore"
                        className="no-print inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Explore Learning Areas{" "}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                  {!userGrade && subjects.length >= 3 && (
                    <div className="mt-4 bg-indigo-50 rounded-xl p-3 border border-indigo-100 no-print">
                      <p className="text-xs text-indigo-700 font-medium">
                        💡 Set your grade in Settings to unlock the CBE Pathway
                        Predictor
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ PRINT FOOTER ══════ */}
          <div
            className="print-only"
            style={{
              borderTop: "2px solid #059669",
              paddingTop: 16,
              marginTop: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#059669",
                    margin: 0,
                  }}
                >
                  StadiSpace
                </p>
                <p
                  style={{ fontSize: 9, color: "#9ca3af", margin: "2px 0 0 0" }}
                >
                  Competency-Based Education Progress Platform • stadispace.com
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>
                  This report is auto-generated and reflects cumulative quiz
                  performance.
                </p>
                <p
                  style={{ fontSize: 9, color: "#9ca3af", margin: "2px 0 0 0" }}
                >
                  {new Date().toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
