"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  TrendingUp,
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  ChevronDown,
  Award,
  Target,
  Sparkles,
  Phone,
  Menu,
  X,
  Flame,
  Brain,
  BarChart3,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";

function FadeIn({ children, delay = 0, direction = "up", className = "" }) {
  const dirs = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 50, y: 0 },
    right: { x: -50, y: 0 },
  };
  return (
    <motion.div
      initial={{ opacity: 0, ...dirs[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid #e2e8f0" }}
      className="last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 17,
            fontWeight: 600,
            color: "#0f1f3d",
          }}
          className="group-hover:text-teal-600 transition-colors"
        >
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "#0e7490" }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p
              className="pb-5 leading-relaxed text-sm"
              style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) router.replace("/dashboard");
  }, []);

  const features = [
    {
      icon: ShieldCheck,
      title: "Expert-Crafted Questions",
      desc: "Every question is designed by qualified educators who understand Kenya's CBE framework. Not imported. Not generic. Built here, for here, by people who know what Kenyan students need.",
      accent: "#0e7490",
      bg: "#f0fafb",
    },
    {
      icon: Brain,
      title: "Feedback That Teaches",
      desc: "Not just right or wrong. Every answer comes with a clear explanation of why - so the next attempt is always smarter than the last.",
      accent: "#1e3a6e",
      bg: "#f0f4ff",
    },
    {
      icon: BarChart3,
      title: "Track What Matters",
      desc: "See exactly where your child is strong and where they need more work - by learning area, by strand. Real data. Real insight.",
      accent: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      icon: Clock,
      title: "Practice on Their Time",
      desc: "Morning, evening, weekends. StadiSpace is always there whenever your child is ready to put in the work. No scheduling. No waiting.",
      accent: "#0f1f3d",
      bg: "#f8fafc",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Explore. No commitment.",
      desc: "Browse quizzes across all learning areas. Try 2 completely free - no signup, no card, no pressure.",
    },
    {
      n: "02",
      title: "Answer. Understand. Grow.",
      desc: "Submit an answer and get detailed feedback instantly. See what you got right, what you missed, and exactly why.",
    },
    {
      n: "03",
      title: "Subscribe when ready.",
      desc: "After your free quizzes, unlock unlimited practice for less than the cost of a single tutor session.",
    },
  ];

  const faqs = [
    {
      q: "Can I try before subscribing?",
      a: "Yes. Browse all quizzes and try 2 completely free - no account needed, no card required. When you're ready for more, subscribe.",
    },
    {
      q: "Who creates the questions?",
      a: "Every question on StadiSpace is crafted by qualified Kenyan educators with deep knowledge of the CBE curriculum. These are not AI-generated or imported questions - they are purpose-built for Kenyan learners.",
    },
    {
      q: "Which grades are covered?",
      a: "StadiSpace currently covers Grade 4 through Grade 10 across core CBE learning areas. Grades 11 and 12 are coming.",
    },
    {
      q: "How does payment work?",
      a: "M-Pesa. Simple as that. No international cards, no hidden fees. Subscribe monthly or termly and cancel anytime.",
    },
    {
      q: "Is this aligned to the current curriculum?",
      a: "Yes. Every question on StadiSpace is built around the Competency Based Education framework as designed by KICD.",
    },
    {
      q: "Does one subscription cover one student?",
      a: "Yes. Each subscription is for one student profile so progress tracking stays accurate and personal.",
    },
  ];

  const testimonials = [
    {
      name: "Grace W.",
      role: "Parent · Nairobi",
      quote:
        "She used to dread revision. Now she asks to practice before dinner. I don't know what changed but I'm not complaining.",
      grade: "Grade 7",
    },
    {
      name: "Brian O.",
      role: "Student · Mombasa",
      quote:
        "The explanations actually make sense. Not just the answer - why the answer is what it is. That's the difference.",
      grade: "Grade 9",
    },
    {
      name: "Mrs. Kamau",
      role: "Parent · Kisumu",
      quote:
        "Worth every shilling. The progress tracking alone tells me more than a whole term report used to.",
      grade: "Grade 8",
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        .teal-text { background: linear-gradient(135deg, #0e7490, #0f1f3d); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .card-lift { transition: all 0.3s ease; }
        .card-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
        .float { animation: float 5s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          background: "rgba(255,255,255,0.95)",
          borderBottom: "1px solid #e2e8f0",
        }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="font-bold text-white text-xl px-3 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-teal-700">
                StadiSpace
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                ["#features", "Why StadiSpace"],
                ["#how-it-works", "How It Works"],
                ["#pricing", "Pricing"],
                ["#faq", "FAQ"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  style={{ color: "#475569", fontSize: 14, fontWeight: 500 }}
                  className="hover:text-teal-600 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <button
                  style={{ color: "#475569", fontSize: 14, fontWeight: 600 }}
                  className="hover:text-teal-600 transition-colors px-4 py-2"
                >
                  Sign In
                </button>
              </Link>
              <Link href="/explore">
                <button
                  style={{
                    background: "linear-gradient(135deg, #0e7490, #0f1f3d)",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "10px 22px",
                    borderRadius: 12,
                    boxShadow: "0 4px 18px rgba(14,116,144,0.3)",
                    border: "none",
                  }}
                  className="hover:opacity-90 transition-all hover:scale-[1.02]"
                >
                  Try Free →
                </button>
              </Link>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ color: "#475569" }}
              className="md:hidden p-2"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: "1px solid #e2e8f0", background: "white" }}
              className="md:hidden overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {[
                  ["#features", "Why StadiSpace"],
                  ["#how-it-works", "How It Works"],
                  ["#pricing", "Pricing"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{ color: "#475569", fontSize: 14 }}
                    className="block py-3 px-3 rounded-lg hover:text-teal-600 transition-colors font-medium"
                  >
                    {label}
                  </a>
                ))}
                <div
                  className="pt-3 flex flex-col gap-2"
                  style={{ borderTop: "1px solid #e2e8f0" }}
                >
                  <Link href="/login">
                    <button
                      style={{
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "11px 0",
                        fontSize: 14,
                        fontWeight: 600,
                        width: "100%",
                        background: "transparent",
                      }}
                    >
                      Sign In
                    </button>
                  </Link>
                  <Link href="/explore">
                    <button
                      style={{
                        background: "linear-gradient(135deg, #0e7490, #0f1f3d)",
                        color: "white",
                        borderRadius: 12,
                        padding: "11px 0",
                        fontSize: 14,
                        fontWeight: 700,
                        width: "100%",
                        border: "none",
                      }}
                    >
                      Try Free →
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section
        className="pt-32 pb-0 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #ffffff 0%, #f0f4f8 60%, #e8f4f8 100%)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #0e7490, transparent)",
            filter: "blur(130px)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #0f1f3d, transparent)",
            filter: "blur(100px)",
            transform: "translate(-30%, 30%)",
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pb-24">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  border: "1px solid rgba(14,116,144,0.3)",
                  background: "rgba(14,116,144,0.06)",
                  borderRadius: 100,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 16px",
                  marginBottom: 28,
                }}
              >
                <ShieldCheck
                  className="w-3.5 h-3.5"
                  style={{ color: "#0e7490" }}
                />
                <span
                  style={{
                    color: "#0e7490",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Grade 4 - Grade 10 · Expert-Made Questions
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(46px, 6vw, 72px)",
                  lineHeight: 1.05,
                  color: "#0f1f3d",
                  marginBottom: 24,
                  fontWeight: 700,
                }}
              >
                A space where
                <br />
                <span className="teal-text"> learning and </span>
                {/* <br />
                and 
                <br /> */}
                <em style={{ color: "#0e7490" }}>fun </em>
                thrive together.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                style={{
                  color: "#475569",
                  fontSize: 17,
                  lineHeight: 1.8,
                  marginBottom: 36,
                  maxWidth: 460,
                }}
              >
                Where every question becomes a quest, every answer sparks
                momentum, and every mistake becomes a step toward mastery.{" "}
                <strong style={{ color: "#0f1f3d" }}>
                  Don't take our word for it. Try us.
                </strong>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                <Link href="/explore">
                  <button
                    style={{
                      background: "linear-gradient(135deg, #0e7490, #0f1f3d)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "15px 30px",
                      borderRadius: 14,
                      border: "none",
                      boxShadow: "0 8px 28px rgba(14,116,144,0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    className="hover:scale-[1.02] transition-all duration-200 group"
                  >
                    Try 2 Free Quizzes - No Signup
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button
                    style={{
                      color: "#475569",
                      fontWeight: 600,
                      fontSize: 15,
                      padding: "15px 28px",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      background: "white",
                    }}
                    className="hover:border-teal-300 hover:text-teal-700 transition-all"
                  >
                    See how it works
                  </button>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-4"
              >
                <div style={{ display: "flex" }}>
                  {["#0e7490", "#1e3a6e", "#16a34a", "#0f1f3d"].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: c,
                        border: "2px solid white",
                        marginLeft: i > 0 ? -8 : 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {["A", "B", "W", "M"][i]}
                    </div>
                  ))}
                </div>
                <p style={{ color: "#94a3b8", fontSize: 13 }}>
                  <span style={{ color: "#0f1f3d", fontWeight: 600 }}>
                    2 free quizzes
                  </span>{" "}
                  to start. No card. No pressure.
                </p>
              </motion.div>
            </div>

            {/* Right — Structured Question Demo */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="float hidden lg:block relative"
            >
              <div
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 24,
                  overflow: "hidden",
                  boxShadow: "0 40px 80px rgba(15,31,61,0.12)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle size={14} color="#16a34a" />
                    </div>
                    <div>
                      <p
                        style={{
                          color: "#94a3b8",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          margin: 0,
                        }}
                      >
                        Science · Grade 6
                      </p>
                      <p
                        style={{
                          color: "#0f1f3d",
                          fontSize: 13,
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        Question 3
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#16a34a",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    2 / 2 marks
                  </span>
                </div>

                <div style={{ padding: "16px 20px" }}>
                  {/* Question */}
                  <p
                    style={{
                      color: "#334155",
                      fontSize: 13,
                      lineHeight: 1.65,
                      marginBottom: 12,
                    }}
                  >
                    Explain{" "}
                    <strong style={{ color: "#0f1f3d" }}>two ways</strong> in
                    which the human circulatory system benefits the body.
                  </p>

                  {/* Student answer */}
                  <div
                    style={{
                      background: "#eff6ff",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 12,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#1d4ed8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 5,
                      }}
                    >
                      Your answer
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#334155",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      It carries oxygen to all body cells. It also removes waste
                      like carbon dioxide from the body.
                    </p>
                  </div>

                  {/* AI Feedback */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#16a34a",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      ✓ Correct — full marks
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#475569",
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      Both points are exactly right. Delivering oxygen to cells
                      and removing waste (CO₂) — that is precisely what the
                      marking scheme required. Well done.
                    </p>
                  </div>

                  {/* Study tip */}
                  <div
                    style={{
                      background: "#faf5ff",
                      border: "1px solid #e9d5ff",
                      borderRadius: 12,
                      padding: "10px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#7c3aed",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 5,
                      }}
                    >
                      Study tip
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#581c87",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      Remember three jobs — deliver oxygen, deliver nutrients,
                      remove waste. Pick any two when a question asks for two.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: "10px 20px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#16a34a",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      Works for essays, structured, MCQ
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
                style={{
                  position: "absolute",
                  right: -20,
                  top: 20,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "12px 16px",
                  boxShadow: "0 16px 40px rgba(15,31,61,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      background: "#f0fafb",
                      borderRadius: 10,
                      padding: 8,
                    }}
                  >
                    <Trophy className="w-4 h-4" style={{ color: "#0e7490" }} />
                  </div>
                  <div>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: 10,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      Points earned
                    </p>
                    <p
                      style={{
                        color: "#0f1f3d",
                        fontSize: 13,
                        fontWeight: 800,
                        margin: 0,
                      }}
                    >
                      Both{" "}
                      <span style={{ color: "#16a34a", fontSize: 11 }}>
                        correct
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Bottom badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 }}
                style={{
                  position: "absolute",
                  left: -20,
                  bottom: 40,
                  background: "linear-gradient(135deg, #0f1f3d, #1e3a6e)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  boxShadow: "0 8px 24px rgba(15,31,61,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Flame className="w-4 h-4" style={{ color: "#06b6d4" }} />
                  <p
                    style={{
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  ></p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section
        style={{ background: "#0f1f3d", borderTop: "1px solid #1e3a6e" }}
        className="py-12"
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "Grade 4–10", label: "Fully Covered" },
            { value: "500+", label: "Expert Questions" },
            { value: "Instant", label: "Feedback, Every Time" },
            { value: "24/7", label: "Always Available" },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#06b6d4",
                  marginBottom: 4,
                }}
              >
                {s.value}
              </div>
              <p style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>
                {s.label}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section
        style={{
          background: "#f0f4f8",
          borderBottom: "1px solid #e2e8f0",
          padding: "80px 0",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 32,
              }}
            >
              Our belief
            </p>
            <blockquote
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(24px, 3.5vw, 42px)",
                color: "#0f1f3d",
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              "Every parent wants one thing -
              <br />
              to see their child thrive.
              <br />
              <span style={{ color: "#0e7490" }}>We exist to make that</span>
              <br />
              <em style={{ color: "#0f1f3d" }}>a little more reachable."</em>
            </blockquote>
            <div
              style={{
                width: 48,
                height: 2,
                background: "linear-gradient(90deg, #0e7490, transparent)",
                margin: "32px auto",
              }}
            />
            <p
              style={{
                color: "#475569",
                fontSize: 16,
                lineHeight: 1.9,
                maxWidth: 620,
                margin: "0 auto",
              }}
            >
              Learning should never feel like punishment. Every question here is
              crafted with intention - not to trick, but to build. Every answer
              - right or wrong - moves a student forward. This isn't just
              marking.{" "}
              <strong style={{ color: "#0f1f3d" }}>
                It understands. It grows. It elevates.
              </strong>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── TRUST BANNER ── */}
      <section style={{ background: "#0e7490", padding: "48px 0" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 16,
              }}
            >
              Don't take our word for it
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(28px, 4vw, 48px)",
                color: "white",
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              Two free quizzes. No account. No card.
              <br />
              <em style={{ color: "rgba(255,255,255,0.75)" }}>
                Just your child and a question.
              </em>
            </h2>
            <Link href="/explore">
              <button
                style={{
                  background: "white",
                  color: "#0e7490",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 32px",
                  borderRadius: 14,
                  border: "none",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
                className="hover:scale-[1.02] transition-all"
              >
                Try It Now - It's Free <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              Why StadiSpace
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(34px, 4vw, 56px)",
                color: "#0f1f3d",
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Built for Kenyan students.
              <br />
              <em style={{ color: "#0e7490" }}>Trusted by Kenyan parents.</em>
            </h2>
            <p style={{ color: "#64748b", fontSize: 16, lineHeight: 1.7 }}>
              Every question is expert-crafted around CBE. Not imported. Not
              generic. Made here, for here.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.1}>
                <div
                  className="card-lift h-full"
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: f.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 18,
                    }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <h3
                    style={{
                      color: "#0f1f3d",
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 10,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7 }}
                  >
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="py-24"
        style={{ background: "#f0f4f8" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              Simple by design
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(34px, 4vw, 56px)",
                color: "#0f1f3d",
                lineHeight: 1.1,
              }}
            >
              Try before
              <br />
              <em style={{ color: "#0e7490" }}>you commit to anything.</em>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.15}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #0e7490, #0f1f3d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                      boxShadow: "0 8px 24px rgba(14,116,144,0.25)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3
                    style={{
                      color: "#0f1f3d",
                      fontWeight: 700,
                      fontSize: 17,
                      marginBottom: 10,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}
                  >
                    {s.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.4} className="text-center mt-14">
            <Link href="/explore">
              <button
                style={{
                  background: "linear-gradient(135deg, #0e7490, #0f1f3d)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 32px",
                  borderRadius: 14,
                  border: "none",
                  boxShadow: "0 8px 24px rgba(14,116,144,0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
                className="hover:opacity-90 hover:scale-[1.02] transition-all"
              >
                Explore Quizzes <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>
              No account needed · M-Pesa accepted · Cancel anytime
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              Real feedback
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(34px, 4vw, 56px)",
                color: "#0f1f3d",
                lineHeight: 1.1,
              }}
            >
              Parents and students
              <br />
              <em style={{ color: "#0e7490" }}>speak plainly.</em>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div
                  className="card-lift h-full flex flex-col"
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: 24,
                  }}
                >
                  <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        style={{ fill: "#0e7490", color: "#0e7490" }}
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      color: "#475569",
                      fontSize: 15,
                      lineHeight: 1.8,
                      flex: 1,
                      marginBottom: 20,
                      fontStyle: "italic",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    "{t.quote}"
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #0f1f3d, #1e3a6e)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {t.name[0]}
                      </div>
                      <div>
                        <p
                          style={{
                            color: "#0f1f3d",
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          {t.name}
                        </p>
                        <p style={{ color: "#94a3b8", fontSize: 11 }}>
                          {t.role}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        background: "#f0fafb",
                        color: "#0e7490",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "1px solid #bae6fd",
                      }}
                    >
                      {t.grade}
                    </span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24" style={{ background: "#f0f4f8" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(34px, 4vw, 56px)",
                color: "#0f1f3d",
                lineHeight: 1.1,
                marginBottom: 14,
              }}
            >
              Less than a single
              <br />
              <em style={{ color: "#0e7490" }}>tutor session.</em>
            </h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>
              All learning areas. Grades 4 to 10. Unlimited practice.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <FadeIn delay={0.1}>
              <div
                className="card-lift h-full flex flex-col"
                style={{
                  background: "white",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 20,
                  padding: 32,
                }}
              >
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginBottom: 12,
                    }}
                  >
                    Monthly
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 56,
                        fontWeight: 700,
                        color: "#0f1f3d",
                        lineHeight: 1,
                      }}
                    >
                      499
                    </span>
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: 14,
                        fontWeight: 500,
                        marginBottom: 8,
                      }}
                    >
                      KES / mo
                    </span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 12 }}>
                    Billed monthly via M-Pesa
                  </p>
                </div>
                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flex: 1,
                    marginBottom: 28,
                  }}
                >
                  {[
                    "All learning areas",
                    "Grades 4 to 10",
                    "Unlimited practice",
                    "Detailed feedback",
                    "Cancel anytime",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "#475569",
                        fontSize: 14,
                      }}
                    >
                      <CheckCircle
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "#0e7490" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/explore">
                  <button
                    style={{
                      width: "100%",
                      padding: "13px 0",
                      borderRadius: 12,
                      border: "1.5px solid #0e7490",
                      color: "#0e7490",
                      background: "transparent",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                    className="hover:bg-teal-50 transition-all"
                  >
                    Try 2 Free First
                  </button>
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div
                className="card-lift relative h-full flex flex-col"
                style={{
                  background: "#0f1f3d",
                  border: "1.5px solid #1e3a6e",
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: "0 24px 60px rgba(15,31,61,0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -16,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(135deg, #0e7490, #06b6d4)",
                      color: "white",
                      padding: "6px 18px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 16px rgba(14,116,144,0.4)",
                    }}
                  >
                    ✦ BEST VALUE · SAVE 17%
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      color: "#06b6d4",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginBottom: 12,
                    }}
                  >
                    Termly
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 56,
                        fontWeight: 700,
                        color: "white",
                        lineHeight: 1,
                      }}
                    >
                      999
                    </span>
                    <span
                      style={{
                        color: "#06b6d4",
                        fontSize: 14,
                        fontWeight: 500,
                        marginBottom: 8,
                      }}
                    >
                      KES / term
                    </span>
                  </div>
                  <p style={{ color: "#64748b", fontSize: 12 }}>
                    That's KES 24/day for 3 months
                  </p>
                </div>
                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flex: 1,
                    marginBottom: 28,
                  }}
                >
                  {[
                    "All learning areas",
                    "Grades 4 to 10",
                    "Unlimited practice",
                    "Detailed feedback",
                    "Priority support",
                    "Covers entire school term",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "#94a3b8",
                        fontSize: 14,
                      }}
                    >
                      <CheckCircle
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "#06b6d4" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/explore">
                  <button
                    style={{
                      width: "100%",
                      padding: "13px 0",
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #0e7490, #06b6d4)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 14,
                      border: "none",
                      boxShadow: "0 8px 24px rgba(14,116,144,0.3)",
                    }}
                    className="hover:opacity-90 transition-all"
                  >
                    Try 2 Free First
                  </button>
                </Link>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3} className="text-center mt-8">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 100,
                padding: "11px 20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <Phone className="w-4 h-4" style={{ color: "#0e7490" }} />
              <span style={{ color: "#475569", fontSize: 13, fontWeight: 500 }}>
                Pay with <strong style={{ color: "#0f1f3d" }}>M-Pesa</strong> -
                no card ever needed
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ background: "white" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-14">
            <p
              style={{
                color: "#0e7490",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              FAQ
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(34px, 4vw, 56px)",
                color: "#0f1f3d",
                lineHeight: 1.1,
              }}
            >
              Honest answers.
            </h2>
          </FadeIn>
          <FadeIn>
            <div
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                padding: "8px 28px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
              {faqs.map((f) => (
                <FAQItem key={f.q} {...f} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: "#0f1f3d" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(14,116,144,0.2) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <FadeIn>
            <p
              style={{
                color: "#06b6d4",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 24,
              }}
            >
              Begin today
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(38px, 5vw, 68px)",
                color: "white",
                lineHeight: 1.08,
                marginBottom: 20,
              }}
            >
              Your child's potential
              <br />
              <em style={{ color: "#64748b" }}>is not the question.</em>
              <br />
              <span className="teal-text">The practice is.</span>
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: 16,
                lineHeight: 1.85,
                marginBottom: 40,
                maxWidth: 520,
                margin: "0 auto 40px",
              }}
            >
              Two free quizzes. No account. No commitment. Just a student, a
              question, and everything that follows when they finally understand{" "}
              <em>why.</em>
            </p>
            <Link href="/explore">
              <button
                style={{
                  background: "linear-gradient(135deg, #0e7490, #06b6d4)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "16px 40px",
                  borderRadius: 16,
                  border: "none",
                  boxShadow: "0 12px 40px rgba(14,116,144,0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
                className="hover:scale-[1.03] transition-all duration-200 group"
              >
                Explore Quizzes - Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 16 }}>
              2 free quizzes · M-Pesa accepted · Cancel anytime
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{ background: "#080f1e", borderTop: "1px solid #1e3a6e" }}
        className="py-16"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div
            className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12"
            style={{ borderBottom: "1px solid #1e3a6e" }}
          >
            <div className="col-span-2">
              <div style={{ marginBottom: 16 }}>
                <div className="font-bold text-white text-xl px-3 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-teal-700 inline-block">
                  StadiSpace
                </div>
              </div>
              <p
                style={{
                  color: "#475569",
                  fontSize: 13,
                  lineHeight: 1.7,
                  maxWidth: 260,
                }}
              >
                Empowering Kenyan students to own their learning - one question
                at a time.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  ["#features", "Why StadiSpace"],
                  ["#pricing", "Pricing"],
                  ["#faq", "FAQ"],
                  ["/explore", "Try Free"],
                ],
              },
              {
                title: "Company",
                links: [
                  ["#", "About Us"],
                  ["#", "Blog"],
                  ["#", "Contact"],
                ],
              },
              {
                title: "Legal",
                links: [
                  ["#", "Privacy Policy"],
                  ["#", "Terms of Service"],
                  ["#", "Refund Policy"],
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h3
                  style={{
                    color: "#475569",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 16,
                  }}
                >
                  {col.title}
                </h3>
                <ul
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {col.links.map(([href, label]) => (
                    <li key={label}>
                      <a
                        href={href}
                        style={{ color: "#334155", fontSize: 13 }}
                        className="hover:text-teal-400 transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p style={{ color: "#334155", fontSize: 12 }}>
              © 2025 StadiSpace. All rights reserved.
            </p>
            <p style={{ color: "#334155", fontSize: 12 }}>
              Made with purpose for Kenyan students 🇰🇪
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
