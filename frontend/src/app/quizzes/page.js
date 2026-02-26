"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Award,
  ArrowLeft,
  GraduationCap,
  School,
  Building2,
  FileText,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Filter as FilterIcon,
  ChevronRight,
  CheckCircle,
  Play,
  RotateCcw,
  Star,
  Flame,
  Zap,
  Lock,
  ArrowRight,
} from "lucide-react";

const API = "https://cbc-backend-76im.onrender.com/api";

// ─── Subject icons map (fallback if API doesn't provide) ─────────────────────
const SUBJECT_COLORS = [
  {
    bg: "from-emerald-500 to-teal-600",
    light: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  {
    bg: "from-blue-500 to-indigo-600",
    light: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  {
    bg: "from-amber-500 to-orange-500",
    light: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  {
    bg: "from-rose-500 to-pink-600",
    light: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  {
    bg: "from-violet-500 to-purple-600",
    light: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  {
    bg: "from-cyan-500 to-sky-600",
    light: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSubjectColor(index) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function ScoreBadge({ score }) {
  const color =
    score >= 80
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : score >= 60
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}
    >
      {Math.round(score)}%
    </span>
  );
}

// ─── School Level Button ──────────────────────────────────────────────────────
function LevelButton({ level, label, grades, icon: Icon, active, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center gap-4 px-6 py-4 rounded-2xl font-semibold transition-all duration-200 flex-1 sm:flex-none ${
        active
          ? "bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg shadow-green-900/20"
          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-white/20" : "bg-gray-100"}`}
      >
        <Icon
          className={`w-5 h-5 ${active ? "text-white" : "text-gray-500"}`}
        />
      </div>
      <div className="text-left">
        <div className="text-sm font-bold">{label}</div>
        <div
          className={`text-xs ${active ? "text-green-200" : "text-gray-400"}`}
        >
          {grades}
        </div>
      </div>
      {active && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" />
      )}
    </motion.button>
  );
}

// ─── Grade Card ───────────────────────────────────────────────────────────────
function GradeCard({ grade, topicalCount, examCount, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left w-full transition-all duration-200 hover:border-green-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-xl">{grade}</span>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-3">Grade {grade}</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <FileText className="w-3.5 h-3.5" />
            <span>Topical Quizzes</span>
          </div>
          <span className="font-bold text-gray-800">{topicalCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Exam Sets</span>
          </div>
          <span className="font-bold text-gray-800">{examCount}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700 group-hover:gap-3 transition-all">
          <span>Browse content</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, index, topicalCount, examCount, onClick }) {
  const color = getSubjectColor(index);
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left w-full transition-all duration-200 hover:border-gray-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-2xl shadow-sm`}
        >
          {subject.icon || "📚"}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-3">{subject.name}</h3>

      <div className="flex gap-3">
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.light} ${color.text}`}
        >
          <FileText className="w-3 h-3" />
          {topicalCount} quizzes
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">
          <ClipboardList className="w-3 h-3" />
          {examCount} exams
        </span>
      </div>
    </motion.button>
  );
}

// ─── Quiz Card ────────────────────────────────────────────────────────────────
function QuizCard({ quiz, isNew, colorIndex = 0, isLocked = false }) {
  const attempt = quiz.attempt_status;
  const isCompleted = attempt?.status === "completed";
  const isInProgress = attempt?.status === "in_progress";
  const progress = isInProgress
    ? (attempt.answered_count / attempt.total_questions) * 100
    : 0;
  const color = getSubjectColor(colorIndex);

  const statusConfig = isCompleted
    ? {
        label: "Try Again",
        icon: RotateCcw,
        cls: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      }
    : isInProgress
      ? {
          label: "Continue",
          icon: Play,
          cls: "bg-amber-500 text-white hover:bg-amber-600",
        }
      : {
          label: "Start Quiz",
          icon: Zap,
          cls: "bg-gradient-to-r from-green-700 to-emerald-600 text-white hover:from-green-800 hover:to-emerald-700",
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden flex flex-col"
    >
      {/* Top color bar */}
      <div className={`h-1 bg-gradient-to-r ${color.bg}`} />

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600 text-center px-4">
            Subscribe to unlock
          </p>
          <Link href="/subscribe">
            <button className="text-xs font-bold text-green-700 underline underline-offset-2">
              View Plans →
            </button>
          </Link>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Badges row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <Sparkles className="w-3 h-3" /> NEW
              </span>
            )}
            {quiz.set_number && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${color.light} ${color.text}`}
              >
                Set {quiz.set_number}
              </span>
            )}
            {isCompleted && <ScoreBadge score={attempt.score} />}
          </div>
          {quiz.attempt_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Flame className="w-3 h-3 text-orange-400" />
              {quiz.attempt_count}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-bold text-gray-900 text-base leading-snug mb-2 flex-1">
          {quiz.title}
        </h4>

        {quiz.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
            {quiz.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            {quiz.total_questions} questions
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {quiz.duration_minutes} min
          </span>
        </div>

        {/* Progress / score */}
        {isInProgress && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-amber-700">In Progress</span>
              <span className="text-amber-600">
                {attempt.answered_count}/{attempt.total_questions}
              </span>
            </div>
            <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 font-medium">Best score</p>
              <p className="text-xl font-bold text-emerald-700">
                {Math.round(attempt.score)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Marks</p>
              <p className="text-sm font-bold text-gray-600">
                {attempt.total_marks_awarded ?? 0}/
                {attempt.total_max_marks ?? 0}
              </p>
            </div>
          </div>
        )}

        {!attempt && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Pass mark</span>
              <span className="font-semibold">{quiz.passing_score}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${color.bg} rounded-full`}
                style={{ width: `${quiz.passing_score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Link href={`/quizzes/${quiz.id}`} className="block">
          <button
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${statusConfig.cls}`}
          >
            <statusConfig.icon className="w-4 h-4" />
            {statusConfig.label}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ type }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
        {type === "topical" ? (
          <FileText className="w-9 h-9 text-gray-300" />
        ) : (
          <ClipboardList className="w-9 h-9 text-gray-300" />
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">
        No {type === "topical" ? "quizzes" : "exams"} yet
      </h3>
      <p className="text-gray-400 text-sm">
        Our team is adding new content regularly. Check back soon!
      </p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizzesPage() {
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [schoolLevel, setSchoolLevel] = useState("junior");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [quizType, setQuizType] = useState("topical");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API}/subjects/`, { headers }).then((r) => r.json()),
      fetch(`${API}/quizzes/`, { headers }).then((r) => r.json()),
    ])
      .then(([sData, qData]) => {
        setSubjects(sData);
        setQuizzes(Array.isArray(qData) ? qData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getGradeRange = () =>
    ({
      primary: [4, 5, 6],
      junior: [7, 8, 9],
      senior: [10, 11, 12],
    })[schoolLevel] ?? [];

  const availableGrades = getGradeRange().filter((g) =>
    quizzes.some((q) => q.grade === g),
  );

  const availableSubjects = selectedGrade
    ? subjects.filter((s) =>
        quizzes.some((q) => q.subject === s.id && q.grade === selectedGrade),
      )
    : [];

  const filteredQuizzes = quizzes.filter(
    (q) =>
      selectedGrade &&
      selectedSubject &&
      q.grade === selectedGrade &&
      q.subject === selectedSubject.id &&
      q.quiz_type === quizType,
  );

  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    if (sortBy === "newest") return b.id - a.id;
    if (sortBy === "oldest") return a.id - b.id;
    if (sortBy === "popular")
      return (b.attempt_count || 0) - (a.attempt_count || 0);
    if (sortBy === "not_tried")
      return (a.attempt_status ? 1 : 0) - (b.attempt_status ? 1 : 0);
    return 0;
  });

  const groupedTopical = () => {
    const groups = {};
    sortedQuizzes.forEach((q) => {
      const key = q.topic_name || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  };

  const groupedExams = () => {
    const groups = { 1: [], 2: [], 3: [] };
    sortedQuizzes.forEach((q) => {
      const term = q.term || 1;
      if (!groups[term]) groups[term] = [];
      groups[term].push(q);
    });
    Object.keys(groups).forEach((term) => {
      groups[term].sort((a, b) =>
        sortBy === "oldest"
          ? (a.set_number || 0) - (b.set_number || 0)
          : (b.set_number || 0) - (a.set_number || 0),
      );
    });
    return groups;
  };

  const isNewQuiz = (quiz) => {
    const sorted = [...filteredQuizzes].sort((a, b) => b.id - a.id);
    return sorted.slice(0, 3).includes(quiz);
  };

  const resetToSchoolLevel = () => {
    setSelectedGrade(null);
    setSelectedSubject(null);
  };
  const resetToGrade = () => setSelectedSubject(null);

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm mx-auto p-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <BookOpen className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to start practising
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Access hundreds of CBC-aligned quizzes across all subjects and
            grades.
          </p>
          <Link href="/login">
            <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-700 to-emerald-600 text-white font-bold text-sm hover:from-green-800 hover:to-emerald-700 transition-all shadow-sm">
              Sign In to Continue
            </button>
          </Link>
          <Link href="/register">
            <button className="w-full py-3 mt-2 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all">
              Create Account — 7 Days Free
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700 mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-medium">Loading quizzes…</p>
        </div>
      </div>
    );
  }

  // ── Breadcrumb ──
  const Breadcrumb = () => (
    <nav className="flex items-center gap-1.5 text-sm mt-2 flex-wrap">
      <button
        onClick={resetToSchoolLevel}
        className="font-semibold text-green-700 hover:text-green-800 transition-colors"
      >
        {
          {
            primary: "Primary",
            junior: "Junior Secondary",
            senior: "Senior Secondary",
          }[schoolLevel]
        }
      </button>
      {selectedGrade && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <button
            onClick={resetToGrade}
            className="font-semibold text-green-700 hover:text-green-800 transition-colors"
          >
            Grade {selectedGrade}
          </button>
        </>
      )}
      {selectedSubject && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 font-semibold">
            {selectedSubject.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-400">
            {quizType === "topical" ? "Topical" : "Exams"}
          </span>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        body { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </Link>
              <div>
                <h1 className="font-display text-xl font-bold text-gray-900">
                  Quizzes
                </h1>
                <Breadcrumb />
              </div>
            </div>

            {/* Subscription status nudge */}
            {user && !user.is_subscribed && (
              <Link href="/subscribe">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  Upgrade — Unlock All
                </motion.div>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Step 1: School Level + Grade Selection ── */}
        <AnimatePresence mode="wait">
          {!selectedGrade && (
            <motion.div
              key="grade-select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              {/* Level tabs */}
              <div className="flex gap-3 mb-8 flex-wrap">
                <LevelButton
                  level="primary"
                  label="Primary"
                  grades="Grades 4–6"
                  icon={GraduationCap}
                  active={schoolLevel === "primary"}
                  onClick={() => setSchoolLevel("primary")}
                />
                <LevelButton
                  level="junior"
                  label="Junior Secondary"
                  grades="Grades 7–9"
                  icon={School}
                  active={schoolLevel === "junior"}
                  onClick={() => setSchoolLevel("junior")}
                />
                <LevelButton
                  level="senior"
                  label="Senior Secondary"
                  grades="Grades 10–12"
                  icon={Building2}
                  active={schoolLevel === "senior"}
                  onClick={() => setSchoolLevel("senior")}
                />
              </div>

              {availableGrades.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    No content available for this level yet
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    We're adding content regularly
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Select a Grade
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableGrades.map((grade, i) => {
                      const gradeQuizzes = quizzes.filter(
                        (q) => q.grade === grade,
                      );
                      return (
                        <motion.div
                          key={grade}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                        >
                          <GradeCard
                            grade={grade}
                            topicalCount={
                              gradeQuizzes.filter(
                                (q) => q.quiz_type === "topical",
                              ).length
                            }
                            examCount={
                              gradeQuizzes.filter((q) => q.quiz_type === "exam")
                                .length
                            }
                            onClick={() => setSelectedGrade(grade)}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Subject Selection ── */}
          {selectedGrade && !selectedSubject && (
            <motion.div
              key="subject-select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Grade {selectedGrade} — Choose Subject
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {availableSubjects.length} subject
                    {availableSubjects.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              {availableSubjects.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500">
                    No subjects available for Grade {selectedGrade} yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSubjects.map((subject, index) => {
                    const sq = quizzes.filter(
                      (q) =>
                        q.subject === subject.id && q.grade === selectedGrade,
                    );
                    return (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        index={index}
                        topicalCount={
                          sq.filter((q) => q.quiz_type === "topical").length
                        }
                        examCount={
                          sq.filter((q) => q.quiz_type === "exam").length
                        }
                        onClick={() => setSelectedSubject(subject)}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Quiz List ── */}
          {selectedSubject && (
            <motion.div
              key="quiz-list"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              {/* Tabs + Sort row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                  <button
                    onClick={() => setQuizType("topical")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${quizType === "topical" ? "bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <FileText className="w-4 h-4" />
                    Topical
                  </button>
                  <button
                    onClick={() => setQuizType("exam")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${quizType === "exam" ? "bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Exams
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white text-gray-700 font-medium"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="not_tried">Not Tried Yet</option>
                  </select>
                </div>
              </div>

              {/* ── Topical quizzes grouped by topic ── */}
              {quizType === "topical" && (
                <div className="space-y-10">
                  {filteredQuizzes.length === 0 ? (
                    <EmptyState type="topical" />
                  ) : (
                    Object.entries(groupedTopical()).map(
                      ([topic, quizList], groupIdx) => (
                        <div key={topic}>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-base">
                                {topic}
                              </h3>
                              <p className="text-xs text-gray-400">
                                {quizList.length}{" "}
                                {quizList.length === 1 ? "quiz" : "quizzes"}
                              </p>
                            </div>
                            <div className="flex-1 h-px bg-gray-100 ml-2" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quizList.map((quiz, i) => (
                              <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                isNew={isNewQuiz(quiz)}
                                colorIndex={groupIdx}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              )}

              {/* ── Exams grouped by term ── */}
              {quizType === "exam" && (
                <div className="space-y-10">
                  {filteredQuizzes.length === 0 ? (
                    <EmptyState type="exam" />
                  ) : (
                    [1, 2, 3].map((term) => {
                      const termQuizzes = groupedExams()[term];
                      if (!termQuizzes?.length) return null;
                      return (
                        <div key={term}>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                              <ClipboardList className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-base">
                                Term {term}
                              </h3>
                              <p className="text-xs text-gray-400">
                                {termQuizzes.length}{" "}
                                {termQuizzes.length === 1 ? "set" : "sets"}
                              </p>
                            </div>
                            <div className="flex-1 h-px bg-gray-100 ml-2" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {termQuizzes.map((quiz, i) => (
                              <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                isNew={isNewQuiz(quiz)}
                                colorIndex={term}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Subscription upsell banner (bottom, only for free users) ── */}
      {/* {user && !user.is_subscribed && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ delay: 1.5, type: "spring" }}
            className="max-w-2xl mx-auto bg-gradient-to-r from-green-800 to-emerald-700 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  Unlock unlimited quizzes
                </p>
                <p className="text-green-200 text-xs">
                  Subscribe for KES 500/month — less than one tuition lesson
                </p>
              </div>
            </div>
            <Link href="/subscribe">
              <button className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm whitespace-nowrap">
                Subscribe →
              </button>
            </Link>
          </motion.div>
        </div>
      )} */}
    </div>
  );
}
