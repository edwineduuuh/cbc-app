"use client";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  TrendingUp,
  LogOut,
  FileText,
  Users,
  PlusCircle,
  Flame,
  Target,
  Zap,
  ChevronRight,
  BarChart2,
  Sparkles,
  Star,
  Settings,
  GraduationCap,
} from "lucide-react";

const MOTIVATIONAL_QUOTES = [
  {
    quote: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    emoji: "🎯",
  },
  {
    quote: "The expert in anything was once a beginner.",
    author: "Helen Hayes",
    emoji: "🌱",
  },
  {
    quote: "Education is the passport to the future.",
    author: "Malcolm X",
    emoji: "🎓",
  },
  {
    quote:
      "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    emoji: "✨",
  },
  {
    quote:
      "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    emoji: "🚀",
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    emoji: "⭐",
  },
  {
    quote: "Dream big. Start small. Act now.",
    author: "Robin Sharma",
    emoji: "💡",
  },
  {
    quote: "Your limitation—it's only your imagination.",
    author: "Unknown",
    emoji: "🏆",
  },
  {
    quote:
      "Strength does not come from physical capacity. It comes from an indomitable will.",
    author: "Mahatma Gandhi",
    emoji: "🏆",
  },
  {
    quote: "An ant on the move does more than a dozing ox.",
    author: "Lao Tzu",
  },
  {
    quote: "The past cannot be changed. The future is yet in your power",
    author: "Confucios",
  },
  {
    quote:
      "You cannot swim for new horizons until you have courage to lose sight of the shore.",
    author: "William Faulkner",
  },
  {
    quote: "The cure for pain is in the pain.",
    author: "Rumi",
  },
  {
    quote: "Never memorize something that you can look up",
    author: "Albert Einstein",
  },
  {
    quote: "Follow your inner moonlight. Don't hide the madness.",
    author: "Allen Geinsberg",
  },
  {
    quote: "Perseverance is failing 19 times and succeeding the 20th.",
    author: "Julie Andrews",
  },
  {
    quote: "You only live once, but if you do it right, once is enough.",
    author: "Mae West",
  },
];

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
  .font-display { font-family: 'Playfair Display', serif; }
  * { font-family: 'DM Sans', sans-serif; }
  .hero-bg { background: linear-gradient(145deg, #0a3d1f 0%, #0f5c2e 50%, #1a7a42 100%); }
  .gold-gradient { background: linear-gradient(135deg, #f5a623, #e8870a); }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .card-hover:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(0,0,0,0.08); }
  .sidebar { background: linear-gradient(180deg, #0a3d1f 0%, #0f5c2e 100%); }
  .dot-pattern { background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 24px 24px; }
`;

// ─── Shared Navbar ─────────────────────────────────────────────────────────────
function Navbar({ user, logout }) {
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-base font-bold text-green-900 block">
                CBC Kenya
              </span>
              <span className="text-[10px] font-semibold text-green-500 tracking-widest uppercase block">
                Learning Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-xl border border-gray-200 mr-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                {(user.first_name || user.username)[0].toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {user.first_name || user.username}
              </span>
              {user.grade && (
                <span className="text-xs text-gray-400">
                  · Grade {user.grade}
                </span>
              )}
            </div>
            <Link href="/profile">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  suffix = "",
  icon: Icon,
  gradient,
  delay = 0,
  highlight = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg ${highlight ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-5 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {value}
            {suffix}
          </p>
          <p className="text-sm mt-1 text-white/80 font-medium">{label}</p>
        </div>
        {highlight && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-400/20 border border-amber-400/30 rounded-full px-2 py-0.5">
            <Zap className="w-3 h-3 text-amber-300" />
            <span className="text-amber-200 text-xs font-bold">On Fire!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ href, gradient, icon: Icon, title, desc, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link href={href}>
        <div
          className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full`}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-1.5">{title}</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-5">{desc}</p>
            <div className="flex items-center gap-1 text-white font-semibold text-sm group-hover:gap-2 transition-all">
              Go <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
      </div>
    );

  if (!user) return null;

  return user.role === "teacher" ? (
    <TeacherDashboard user={user} logout={logout} />
  ) : (
    <StudentDashboard user={user} logout={logout} />
  );
}

// ─── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({ user, logout }) {
  const [stats, setStats] = useState({
    quizzes_completed: 0,
    average_score: 0,
    current_streak: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [dailyQuote] = useState(
    () =>
      MOTIVATIONAL_QUOTES[
        Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
      ],
  );

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("http://127.0.0.1:8000/api/analytics/student/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, []);

  const firstName = user.first_name || user.username;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{sharedStyles}</style>
      <Navbar user={user} logout={logout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Welcome header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative overflow-hidden rounded-2xl hero-bg p-7 shadow-lg">
            <div className="dot-pattern absolute inset-0" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium mb-1">
                  {greeting} 👋
                </p>
                <h2 className="font-display text-3xl text-white mb-2">
                  {firstName}
                </h2>
                <p className="text-green-200 text-sm">
                  {stats.current_streak > 0 ? (
                    <>
                      <span className="text-amber-400 font-bold">
                        🔥 {stats.current_streak}-day streak!
                      </span>{" "}
                      Keep it going.
                    </>
                  ) : (
                    "Ready to continue your learning journey?"
                  )}
                </p>
              </div>
              {user.grade && (
                <div className="flex-shrink-0 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center hidden sm:block">
                  <div className="font-display text-2xl font-bold text-white">
                    G{user.grade}
                  </div>
                  <div className="text-green-300 text-xs font-medium mt-0.5">
                    Grade {user.grade}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label="Quizzes Completed"
            value={stats.quizzes_completed}
            icon={BookOpen}
            gradient="from-emerald-500 to-teal-600"
            delay={0}
          />
          <StatCard
            label="Average Score"
            value={Math.round(stats.average_score)}
            suffix="%"
            icon={Trophy}
            gradient="from-amber-500 to-orange-500"
            delay={0.08}
          />
          <StatCard
            label="Day Streak"
            value={stats.current_streak}
            suffix=" days"
            icon={Flame}
            gradient="from-rose-500 to-red-600"
            delay={0.16}
            highlight={stats.current_streak > 2}
          />
        </div>

        {/* ── Daily quote ── */}
        {dailyQuote && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-800 to-emerald-700 p-6 shadow-md">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="relative flex items-start gap-5">
                <div className="text-3xl flex-shrink-0 mt-1">
                  {dailyQuote.emoji}
                </div>
                <div>
                  <p className="text-green-100 text-base font-medium italic leading-relaxed mb-2">
                    "{dailyQuote.quote}"
                  </p>
                  <p className="text-green-400 text-xs font-semibold">
                    — {dailyQuote.author}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Action cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ActionCard
            href="/quizzes"
            gradient="from-green-700 to-emerald-600"
            icon={BookOpen}
            title="Start Practising"
            desc="Browse CBC quizzes by grade and subject. Real exam-style questions with instant AI feedback."
            delay={0.3}
          />
          <ActionCard
            href="/progress"
            gradient="from-blue-600 to-indigo-600"
            icon={BarChart2}
            title="View Progress"
            desc="Detailed analytics showing your strengths, weak topics, and score trends over time."
            delay={0.38}
          />
        </div>

        {/* ── Streak / momentum card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center flex-shrink-0 shadow-sm">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                Keep Up The Momentum!
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {stats.current_streak > 0 ? (
                  <>
                    You've practised for{" "}
                    <span className="font-bold text-orange-600">
                      {stats.current_streak}{" "}
                      {stats.current_streak === 1 ? "day" : "days"}
                    </span>{" "}
                    in a row. Complete today's quiz to keep your streak alive.
                    🔥
                  </>
                ) : (
                  "Start your learning streak today! Complete a quiz to begin tracking your consistency."
                )}
              </p>
              <Link href="/quizzes">
                <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors">
                  Start a quiz <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// ─── Teacher Dashboard ─────────────────────────────────────────────────────────
function TeacherDashboard({ user, logout }) {
  const [stats, setStats] = useState({
    questions_created: 0,
    quizzes_created: 0,
    classes_created: 0,
    students_managed: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("http://127.0.0.1:8000/api/analytics/teacher/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch((e) => console.error(e));
  }, []);

  const firstName = user.first_name || user.username;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{sharedStyles}</style>
      <Navbar user={user} logout={logout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Welcome header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative overflow-hidden rounded-2xl hero-bg p-7 shadow-lg">
            <div className="dot-pattern absolute inset-0" />
            <div className="relative">
              <p className="text-green-300 text-sm font-medium mb-1">
                Teacher Panel 👨‍🏫
              </p>
              <h2 className="font-display text-3xl text-white mb-2">
                {firstName}
              </h2>
              <p className="text-green-200 text-sm">
                Manage your question bank, quizzes, and track student progress.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Questions Created"
            value={stats.questions_created}
            icon={FileText}
            gradient="from-emerald-500 to-teal-600"
            delay={0}
          />
          <StatCard
            label="Quizzes Created"
            value={stats.quizzes_created}
            icon={BookOpen}
            gradient="from-blue-500 to-indigo-600"
            delay={0.08}
          />
          <StatCard
            label="Classes"
            value={stats.classes_created}
            icon={Users}
            gradient="from-violet-500 to-purple-600"
            delay={0.16}
          />
          <StatCard
            label="Students"
            value={stats.students_managed}
            icon={GraduationCap}
            gradient="from-amber-500 to-orange-500"
            delay={0.24}
          />
        </div>

        {/* ── Action cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ActionCard
            href="/admin/questions"
            gradient="from-green-700 to-emerald-600"
            icon={PlusCircle}
            title="Manage Questions"
            desc="Create, edit and organise your question bank by subject and grade."
            delay={0.3}
          />
          <ActionCard
            href="/admin/quizzes"
            gradient="from-blue-600 to-indigo-600"
            icon={BookOpen}
            title="Manage Quizzes"
            desc="Build and schedule quizzes for your students."
            delay={0.38}
          />
          <ActionCard
            href="/teacher/classrooms"
            gradient="from-violet-600 to-purple-600"
            icon={Users}
            title="Manage Classes"
            desc="Create classrooms, add students, and track class performance."
            delay={0.46}
          />
        </div>

        {/* ── Recent activity placeholder ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Recent Activity</h3>
              <span className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                Coming soon
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-600 mb-1">
                No activity yet
              </p>
              <p className="text-gray-400 text-sm">
                Create your first question to get started
              </p>
              <Link href="/admin/questions">
                <button className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all shadow-sm">
                  <PlusCircle className="w-4 h-4" /> Create Question
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
