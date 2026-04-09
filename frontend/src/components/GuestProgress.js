"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  Target,
  Flame,
  Lock,
  Sparkles,
  TrendingUp,
  BarChart3,
  Users,
  Award,
  ChevronRight,
} from "lucide-react";

export default function GuestProgress() {
  const router = useRouter();
  const [guestQuizzes, setGuestQuizzes] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("guest_quiz_history");
    if (stored) {
      setGuestQuizzes(JSON.parse(stored));
    }
  }, []);

  if (guestQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Progress Yet</h2>
          <p className="text-white/40 mb-6">
            Take your first quiz to see your progress!
          </p>
          <Link href="/explore">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all">
              Browse Quizzes
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate stats
  const avgScore =
    guestQuizzes.reduce((sum, q) => sum + q.score, 0) / guestQuizzes.length;
  const trend =
    guestQuizzes.length > 1
      ? guestQuizzes[guestQuizzes.length - 1].score - guestQuizzes[0].score
      : 0;
  const bestScore = Math.max(...guestQuizzes.map((q) => q.score));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
      `}</style> */}

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/explore">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <ChevronRight className="w-4 h-4 text-white/60 rotate-180" />
              </button>
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                Your Progress Preview
              </h1>
              <p className="text-xs text-white/40">Guest Mode 🔓</p>
            </div>
          </div>
          <Link href="/register">
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold transition-all shadow-lg">
              Sign Up Free
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Your Stats (Active) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-green-400" />
              <h2 className="font-bold text-white text-lg">Your Stats</h2>
            </div>

            {/* Recent Quizzes */}
            <div className="space-y-3 mb-6">
              {guestQuizzes.map((quiz, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        quiz.score >= 75
                          ? "bg-green-500/20 text-green-400"
                          : quiz.score >= 50
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {quiz.score >= 75 ? "✓" : "⚠"}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {quiz.quiz_title}
                      </p>
                      <p className="text-xs text-white/30">{quiz.marks}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {Math.round(quiz.score)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-300 font-semibold">
                    Average
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {Math.round(avgScore)}%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-300 font-semibold">
                    Trend
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {trend > 0 ? "+" : ""}
                  {Math.round(trend)}%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-300 font-semibold">
                    Best Score
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {Math.round(bestScore)}%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-purple-300 font-semibold">
                    Quizzes
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {guestQuizzes.length}/2
                </p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Locked Features (Grayed Out) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl p-6 relative overflow-hidden"
          >
            {/* Lock Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="flex items-center gap-2 mb-6 relative">
              <Lock className="w-5 h-5 text-yellow-400" />
              <h2 className="font-bold text-white text-lg">
                Unlock with Signup
              </h2>
            </div>

            {/* Grayed Out Chart Preview */}
            <div className="mb-6 relative">
              <div className="opacity-30 pointer-events-none">
                <div className="flex items-end gap-2 h-32 bg-white/5 rounded-xl p-4">
                  {[65, 85, 72, 90, 78].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col gap-2">
                      <div
                        className="bg-gradient-to-t from-green-500 to-emerald-500 rounded-t-lg"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[10px] text-center text-white/50">
                        Q{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Lock className="w-4 h-4 text-yellow-400 inline mr-2" />
                  <span className="text-sm font-semibold text-white">
                    Full History
                  </span>
                </div>
              </div>
            </div>

            {/* Locked Features List */}
            <div className="space-y-3 mb-6">
              {[
                {
                  icon: BarChart3,
                  text: "Subject performance breakdown",
                  color: "text-blue-400",
                },
                {
                  icon: Target,
                  text: "Identify your weak topics",
                  color: "text-orange-400",
                },
                {
                  icon: TrendingUp,
                  text: "Track improvement over time",
                  color: "text-green-400",
                },
                {
                  icon: Flame,
                  text: "Daily streak counter",
                  color: "text-red-400",
                },
                {
                  icon: Award,
                  text: "Achievements & badges",
                  color: "text-purple-400",
                },
                {
                  icon: BookOpen,
                  text: "2 MORE free quizzes",
                  color: "text-yellow-400",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 opacity-60"
                >
                  <Lock className="w-4 h-4 text-white/40" />
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  <span className="text-sm text-white/70">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">
                Join <strong>12,000+</strong> students tracking their progress
              </span>
            </div>

            {/* CTA Button */}
            <Link href="/register">
              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg shadow-2xl shadow-yellow-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Sign Up Free - Get Full Access
              </button>
            </Link>

            <p className="text-center text-xs text-white/30 mt-3">
              No credit card required • Free forever
            </p>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Link href="/explore">
            <button className="text-white/40 hover:text-white/60 text-sm font-medium transition-colors">
              ← Back to Quizzes
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
