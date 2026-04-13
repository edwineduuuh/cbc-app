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
  CheckCircle,
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
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

// CBE Kenya Grade Scale
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

// Level System
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

// Subject Emoji fallback (matches actual DB subject names)
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
  Languages: "📝",
};
function getSubjectEmoji(name) {
  if (!name) return "📚";
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJI)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "📚";
}

// Pathway Mapping (Grades 7-9 CBE indicator subjects)
// Uses .includes() matching so "Mathematics" matches "Mathematics Activities", "Core Mathematics" etc.
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

// Radar Chart (SVG)
function RadarChart({ dataPoints, size = 260 }) {
  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38;
  const n = dataPoints.length;
  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i, pct) => ({
    x: cx + r * (pct / 100) * Math.sin(i * angleStep),
    y: cy - r * (pct / 100) * Math.cos(i * angleStep),
  });

  const rings = [25, 50, 75, 100];
  const gridLines = rings.map((ring) => {
    const pts = Array.from({ length: n }, (_, i) => getPoint(i, ring));
    return pts.map((p) => `${p.x},${p.y}`).join(" ");
  });

  const axes = Array.from({ length: n }, (_, i) => getPoint(i, 100));

  const dataPts = dataPoints.map((d, i) => getPoint(i, d.value));
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  const labels = dataPoints.map((d, i) => {
    const p = getPoint(i, 118);
    return { ...d, x: p.x, y: p.y };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-70 mx-auto">
      {gridLines.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      ))}
      {axes.map((p, i) => (
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
        points={dataPath}
        fill="rgba(16,185,129,0.15)"
        stroke="#10b981"
        strokeWidth="2"
      />
      {dataPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#10b981"
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-600 text-[9px] font-medium"
          style={{ fontSize: 9 }}
        >
          {l.label.length > 14 ? l.label.slice(0, 12) + "…" : l.label}
        </text>
      ))}
      {rings.map((ring) => {
        const p = getPoint(0, ring);
        return (
          <text
            key={ring}
            x={p.x + 8}
            y={p.y - 2}
            className="fill-gray-300 text-[7px]"
            style={{ fontSize: 7 }}
          >
            {ring}%
          </text>
        );
      })}
    </svg>
  );
}

// Progress Bar
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

// Trend Arrow
function TrendBadge({ scores }) {
  if (!scores || scores.length < 2)
    return <Minus className="w-4 h-4 text-gray-300" />;
  const recent = scores.slice(-3);
  const older = scores.slice(-6, -3);
  if (older.length === 0) {
    const diff = recent[recent.length - 1] - recent[0];
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-gray-300" />;
  }
  const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgO = older.reduce((a, b) => a + b, 0) / older.length;
  if (avgR > avgO) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (avgR < avgO) return <TrendingDown className="w-4 h-4 text-rose-500" />;
  return <Minus className="w-4 h-4 text-gray-300" />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function FullProgress() {
  const { user } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchWithAuth(`${API}/attempts/?status=completed`)
      .then((r) => r.json())
      .then((data) => setAttempts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  const handlePrint = () => window.print();

  const handleShare = async () => {
    const text = `📊 My StadiSpace Progress\n${cbeGrade.grade} — ${cbeGrade.label}\n${subjects.length} learning areas • ${completed.length} quizzes completed\nAverage: ${Math.round(avgScore)}%\n\nTrack your CBE progress at stadispace.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My StadiSpace Progress", text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Progress summary copied to clipboard!");
    }
  };

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

  // Derived Data
  const completed = attempts.filter((a) => a.status === "completed");
  const avgScore = completed.length
    ? completed.reduce((s, a) => s + a.score, 0) / completed.length
    : 0;
  const cbeGrade = getCBEGrade(avgScore);
  const levelData = getLevel(completed.length);
  const userGrade = user?.grade || null;

  // Group by subject
  const subjectMap = {};
  completed.forEach((a) => {
    const key =
      a.subject_name ||
      a.quiz_title?.split("—")[0]?.split("-")[0]?.trim() ||
      "Other";
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
    .sort((a, b) => b.count - a.count);

  const sorted = [...subjects].sort((a, b) => b.avg - a.avg);
  const strengths = sorted.slice(0, 3).filter((s) => s.avg >= 40);
  const weaknesses = sorted
    .slice(-3)
    .reverse()
    .filter((s) => s.avg < sorted[0]?.avg);

  // Pathway scores (for grades 7-9)
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

  // Radar data
  const radarData = subjects.slice(0, 8).map((s) => ({
    label: s.name,
    value: Math.round(s.avg),
  }));

  // Empty State
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

  return (
    <>
      <style>{`
        @media print {
          nav, .no-print, button { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-inside: avoid; }
          * { box-shadow: none !important; }
        }
      `}</style>

      <div ref={printRef} className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
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
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </motion.div>

          {/* Level Progress Bar */}
          {levelData.next && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm"
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

          {/* LEARNING AREA PERFORMANCE */}
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

              {completed.length > 0 && completed.length < 5 && (
                <div className="bg-white/60 rounded-xl border border-dashed border-gray-200 p-4 text-center">
                  <p className="text-sm text-gray-400">
                    Try more learning areas to unlock deeper insights
                  </p>
                  <Link
                    href="/explore"
                    className="no-print inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2 hover:text-emerald-700"
                  >
                    Browse Quizzes <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* STRENGTHS & WEAKNESSES */}
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
                  {strengths.map((s) => (
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
                  ))}
                  {strengths.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Take more quizzes to see your strengths
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
                  {weaknesses.map((s) => (
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
                  ))}
                  {weaknesses.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Try different learning areas to see gaps
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* PATHWAY TRACKER / LEARNING PROFILE */}
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
                      Based on your performance in CBE indicator subjects for
                      Grade {userGrade}
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
                              You show strong aptitude for{" "}
                              {PATHWAYS[bestPathway[0]].name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              With an average of{" "}
                              {Math.round(bestPathway[1].avg)}% across{" "}
                              {bestPathway[1].count} quizzes in indicator
                              subjects, this pathway aligns with your current
                              strengths. Keep practicing to strengthen your
                              profile!
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
                    Performance across all your learning areas
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
                    <div className="mt-4 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
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

          {/* Print Footer */}
          <div className="hidden print:block text-center pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Generated by StadiSpace • stadispace.com •{" "}
              {new Date().toLocaleDateString("en-KE")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
