"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Flame,
  ChevronRight,
  Target,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const [statsRes, creditsRes] = await Promise.all([
        fetch(`${API}/analytics/student/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/credits/status/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [statsData, creditsData] = await Promise.all([
        statsRes.json(),
        creditsRes.json(),
      ]);

      setStats(statsData);
      setIsPremium(
        creditsData.has_subscription === true ||
          creditsData.quiz_credits === "unlimited",
      );
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
      </div>
    );
  }

  const hasQuizzes = stats?.quizzes_completed > 0;
  const timeOfDay =
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 18
        ? "afternoon"
        : "evening";

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header with Quote */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-teal-200 text-sm mb-1">Good {timeOfDay} 👋</p>
              <h1 className="font-display text-4xl font-bold text-white mb-3">
                {user?.username}
              </h1>

              {/* Quote integrated in header */}
              <div className="flex items-start gap-3 mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl">🚀</div>
                <div className="flex-1">
                  <p className="text-white font-semibold italic text-sm leading-relaxed">
                    "Believe you can and you're halfway there."
                  </p>
                  <p className="text-xs text-teal-200 mt-1">
                    — Theodore Roosevelt
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Always show if user has taken quizzes */}
        {hasQuizzes ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Quizzes Attempted"
              value={stats.quizzes_completed || 0}
              icon={BookOpen}
              color="teal"
            />
            <StatCard
              label="Average Score"
              value={Math.round(stats.average_score || 0)}
              suffix="%"
              icon={Trophy}
              color="amber"
            />
            <StatCard
              label="Best Score"
              value={Math.round(stats.best_score || 0)}
              suffix="%"
              icon={Award}
              color="emerald"
            />
            <StatCard
              label="Current Streak"
              value={stats.current_streak || 0}
              suffix=" days"
              icon={Flame}
              color="rose"
            />
          </div>
        ) : (
          // Welcome card for first-time users
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Ready to start learning? 📚
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Take your first quiz to start tracking your progress and see
              detailed analytics.
            </p>
            <Link href="/explore">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-slate-700 to-teal-600 hover:from-slate-800 hover:to-teal-700 text-white font-semibold transition-all shadow-lg">
                <BookOpen className="w-5 h-5" />
                Browse Quizzes
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        )}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Browse Quizzes Card */}
          <Link href="/explore">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-700 to-teal-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold mb-2">Browse Quizzes</h3>
                <p className="text-teal-100 text-sm">
                  Access CBC quizzes organized by education level, grade, and
                  subject
                </p>
              </div>
            </motion.div>
          </Link>

          {/* View Progress Card */}
          <Link href="/progress">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold mb-2">View Analytics</h3>
                <p className="text-blue-100 text-sm">
                  Track your performance, identify strengths and areas for
                  improvement
                </p>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Performance Insights (if has quizzes) */}
        {hasQuizzes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Quick Insights</h3>
                <p className="text-xs text-gray-500">Your learning overview</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InsightCard
                label="Total Sessions"
                value={stats.total_sessions || 0}
                icon={Target}
              />
              <InsightCard
                label="Quizzes Passed"
                value={stats.quizzes_passed || 0}
                icon={Award}
                color="emerald"
              />
              <InsightCard
                label="Study Time"
                value={Math.round((stats.time_studied_hours || 0) * 60)}
                suffix=" min"
                icon={BookOpen}
                color="blue"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component (clean version)
function StatCard({ label, value, suffix = "", icon: Icon, color = "teal" }) {
  const colors = {
    teal: "from-teal-500 to-cyan-600",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-green-600",
    rose: "from-rose-500 to-pink-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-lg text-gray-500">{suffix}</span>
      </p>
    </motion.div>
  );
}

// Insight Card Component
function InsightCard({
  label,
  value,
  suffix = "",
  icon: Icon,
  color = "teal",
}) {
  const colors = {
    teal: "text-teal-600 bg-teal-50",
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
      <div
        className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900">
          {value}
          {suffix}
        </p>
      </div>
    </div>
  );
}
