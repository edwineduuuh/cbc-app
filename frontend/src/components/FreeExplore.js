"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock,
  ArrowRight,
  X,
  CheckCircle,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  Flame,
  Users,
} from "lucide-react";

export default function ExplorePage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userCredits, setUserCredits] = useState(null);
  const [guestSession, setGuestSession] = useState(null);
  const [guestQuota, setGuestQuota] = useState({ taken: 0, remaining: 2 });
  const [expandedGrades, setExpandedGrades] = useState(new Set(["Grade 7"])); // Default open Grade 7

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-76im.onrender.com/api";

  useEffect(() => {
    fetchQuizzes();
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      checkCreditsStatus();
    } else {
      let sessionId = localStorage.getItem("guest_session_id");

      if (!sessionId) {
        try {
          const res = await fetch(`${API_URL}/guest/session/`, {
            method: "POST",
          });
          const data = await res.json();
          sessionId = data.session_id;
          localStorage.setItem("guest_session_id", sessionId);
          setGuestSession(sessionId);
          setGuestQuota({ taken: 0, remaining: 2 });
        } catch (err) {
          console.error("Failed to create guest session:", err);
        }
      } else {
        setGuestSession(sessionId);
        checkGuestQuota(sessionId);
      }
    }
  };

  const checkGuestQuota = async (sessionId) => {
    try {
      const res = await fetch(
        `${API_URL}/guest/quota/?session_id=${sessionId}`,
      );
      const data = await res.json();
      setGuestQuota({
        taken: data.quizzes_taken,
        remaining: data.quizzes_remaining,
      });
    } catch (err) {
      console.error("Failed to check guest quota:", err);
    }
  };

  const checkCreditsStatus = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/credits/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserCredits(data);
      }
    } catch (err) {
      console.error("Credits check failed:", err);
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/quizzes/`);
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizClick = (quiz) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      if (guestQuota.remaining > 0) {
        router.push(`/student/quiz/${quiz.id}?guest_session=${guestSession}`);
      } else {
        setShowSignupModal(true);
      }
    } else {
      if (
        userCredits?.quiz_credits === "unlimited" ||
        userCredits?.quiz_credits > 0
      ) {
        router.push(`/student/quiz/${quiz.id}`);
      } else {
        setShowPaymentModal(true);
      }
    }
  };

  const toggleGrade = (grade) => {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      next.has(grade) ? next.delete(grade) : next.add(grade);
      return next;
    });
  };

  // Group quizzes by grade, then by subject
  const quizzesByGrade = quizzes.reduce((acc, quiz) => {
    const grade = quiz.grade || "Other";
    if (!acc[grade]) acc[grade] = {};

    const subject = quiz.subject_name || "General";
    if (!acc[grade][subject]) acc[grade][subject] = [];

    acc[grade][subject].push(quiz);
    return acc;
  }, {});

  const grades = Object.keys(quizzesByGrade).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || 999);
    const numB = parseInt(b.match(/\d+/)?.[0] || 999);
    return numA - numB;
  });

  // Get featured quiz (most popular)
  const featuredQuiz = quizzes[0]; // Could be based on analytics

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-600 flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="leading-none">
                <span className="font-bold text-lg text-sky-900">
                  StadiSpace
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {userCredits ? (
                <div className="px-4 py-2 rounded-xl bg-cyan-50 border border-cyan-200">
                  <p className="text-sm font-semibold text-cyan-800">
                    {userCredits.quiz_credits === "unlimited"
                      ? "✨ Unlimited"
                      : `🎓 ${userCredits.quiz_credits} left`}
                  </p>
                </div>
              ) : guestSession ? (
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
                  <p className="text-sm font-bold text-amber-900">
                    🆓 {guestQuota.remaining} FREE QUIZ
                    {guestQuota.remaining === 1 ? "" : "ZES"} LEFT!
                  </p>
                </div>
              ) : null}

              <Link href="/login">
                <button className="text-sm font-semibold text-cyan-800 hover:text-cyan-600 px-4 py-2">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section for Guests */}
        {guestSession && guestQuota.remaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span className="text-amber-200 text-sm font-semibold uppercase tracking-wide">
                  Welcome to CBE Kenya
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Try {guestQuota.remaining} Quizzes Free!
              </h1>
              <p className="text-cyan-100 text-lg mb-6 max-w-2xl">
                Experience AI-powered feedback on any quiz below. No signup
                required to start. Sign up after to get 4 MORE free quizzes!
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-300" />
                  <span>Instant AI marking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-300" />
                  <span>Detailed feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-300" />
                  <span>CBE-aligned questions</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Featured Quiz */}
        {featuredQuiz && guestSession && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">
                🔥 Most Popular - Try This First!
              </h2>
            </div>
            <div
              onClick={() => handleQuizClick(featuredQuiz)}
              className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 p-6 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
                      {featuredQuiz.subject_name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                      {featuredQuiz.grade}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-cyan-700 transition-colors mb-2">
                    {featuredQuiz.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {featuredQuiz.description}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>12,348 students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{featuredQuiz.total_questions || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{featuredQuiz.duration || 30} min</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex items-center gap-2 hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
                    Start Free Quiz
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Grade-based Organization */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Browse by Grade
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {grades.map((grade) => {
                const isExpanded = expandedGrades.has(grade);
                const subjects = quizzesByGrade[grade];
                const totalQuizzes = Object.values(subjects).reduce(
                  (sum, quizzes) => sum + quizzes.length,
                  0,
                );

                return (
                  <motion.div
                    key={grade}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Grade Header */}
                    <button
                      onClick={() => toggleGrade(grade)}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {grade.match(/\d+/)?.[0] || "?"}
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-gray-900">
                            {grade}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {Object.keys(subjects).length} learning areas ·{" "}
                            {totalQuizzes} quizzes
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Subjects & Quizzes */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-6 space-y-8">
                            {Object.entries(subjects).map(
                              ([subject, subjectQuizzes]) => (
                                <div key={subject}>
                                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-cyan-600" />
                                    {subject}
                                    <span className="text-sm font-normal text-gray-500">
                                      ({subjectQuizzes.length} quiz
                                      {subjectQuizzes.length === 1 ? "" : "zes"}
                                      )
                                    </span>
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {subjectQuizzes.map((quiz) => (
                                      <div
                                        key={quiz.id}
                                        onClick={() => handleQuizClick(quiz)}
                                        className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-cyan-50 hover:border-cyan-200 border-2 border-transparent transition-all group"
                                      >
                                        <h5 className="font-semibold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors line-clamp-2">
                                          {quiz.title}
                                        </h5>

                                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                          <div className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            <span>
                                              {quiz.total_questions || 0}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{quiz.duration || 30}m</span>
                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full font-semibold ${
                                              quiz.difficulty === "easy"
                                                ? "bg-green-100 text-green-700"
                                                : quiz.difficulty === "hard"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {quiz.difficulty || "Medium"}
                                          </span>
                                        </div>

                                        <button className="w-full py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold group-hover:bg-cyan-700 transition-all flex items-center justify-center gap-2">
                                          Start Quiz
                                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA for Guests */}
        {guestSession && guestQuota.remaining > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-8 text-center border-2 border-cyan-200"
          >
            <Star className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Love it? Sign up for 4 MORE free quizzes!
            </h3>
            <p className="text-gray-600 mb-6">
              Create an account to save your progress and get 4 additional free
              attempts
            </p>
            <Link href="/register">
              <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg">
                Sign Up Free
              </button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Signup Modal */}
      <AnimatePresence>
        {showSignupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSignupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => setShowSignupModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You've used your 2 free quizzes!
                </h2>
                <p className="text-gray-600">
                  Sign up now to get <strong>2 MORE free quizzes</strong> + save
                  your progress
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "2 more free quiz attempts",
                  "Save all your results",
                  "Track your improvement",
                  "No credit card required",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/register">
                <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:from-cyan-700 hover:to-blue-700 shadow-lg mb-3">
                  Sign Up for 4 More Free Quizzes
                </button>
              </Link>

              <Link href="/login">
                <button className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                  Already have an account? Sign In
                </button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You've completed 2 free quizzes!
                </h2>
                <p className="text-gray-600">
                  Subscribe for <strong>unlimited quizzes</strong>
                </p>
              </div>

              <div className="bg-cyan-50 rounded-2xl p-6 mb-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    KES 500
                  </span>
                  <span className="text-gray-600">/ month</span>
                </div>

                <div className="space-y-2">
                  {[
                    "Unlimited quizzes",
                    "All learning areas & grades",
                    "AI-powered marking",
                    "Progress tracking",
                    "M-Pesa payment",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-gray-700"
                    >
                      <CheckCircle className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/student/payments">
                <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:from-amber-600 hover:to-orange-700 shadow-lg mb-3">
                  Subscribe Now
                </button>
              </Link>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Maybe Later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
