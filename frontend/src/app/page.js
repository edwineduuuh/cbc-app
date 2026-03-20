"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";

function FadeIn({ children, delay = 0, direction = "up", className = "" }) {
  const dirs = {
    up: { y: 32, x: 0 },
    down: { y: -32, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };
  return (
    <motion.div
      initial={{ opacity: 0, ...dirs[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ end, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  return (
    <motion.span
      onViewportEnter={() => {
        if (started) return;
        setStarted(true);
        let start = 0;
        const step = end / 40;
        const timer = setInterval(() => {
          start += step;
          if (start >= end) {
            setCount(end);
            clearInterval(timer);
          } else setCount(Math.floor(start));
        }, 30);
      }}
    >
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </motion.span>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-cyan-900/20 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="font-semibold text-gray-900 group-hover:text-cyan-800 transition-colors text-base">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-cyan-700 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
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
            <p className="pb-5 text-gray-600 leading-relaxed text-sm">{a}</p>
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
  if (token) {
    router.replace("/dashboard");
  }
}, []);
  
  const stats = [
    { value: 12000, suffix: "+", label: "Students Learning" },
    { value: 50000, suffix: "+", label: "Questions Answered Daily" },
    { value: 94, suffix: "%", label: "See Grade Improvement" },
    { value: 2, suffix: " free", label: "Quizzes to Try" },
  ];

  const features = [
    {
      icon: Target,
      title: "CBC-Aligned Questions",
      desc: "Every question is mapped to the exact CBC competency framework for Grades 4–10.",
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      icon: Zap,
      title: "AI-Powered Marking",
      desc: "Structured and open-ended answers are marked instantly by AI with detailed feedback.",
      color: "bg-amber-50 text-amber-700",
    },
    {
      icon: TrendingUp,
      title: "Smart Progress Tracking",
      desc: "See exactly where your child is strong and where they need more practice — by subject and topic.",
      color: "bg-blue-50 text-blue-700",
    },
    {
      icon: Trophy,
      title: "Exam Simulation",
      desc: "Timed quizzes that mirror the actual KCPE and KCSE format so students know what to expect.",
      color: "bg-rose-50 text-rose-700",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Browse Quizzes Free",
      desc: "Explore all quizzes — no signup needed. Try 2 quizzes completely free.",
    },
    {
      n: "02",
      title: "See the Difference",
      desc: "Get instant AI feedback on your answers. Understand your mistakes immediately.",
    },
    {
      n: "03",
      title: "Subscribe to Continue",
      desc: "After 2 free quizzes, subscribe for unlimited access. Cancel anytime.",
    },
  ];

  const testimonials = [
    {
      name: "Grace W.",
      role: "Parent, Nairobi",
      quote:
        "My daughter went from 58% to 81% in Mathematics in one term. The instant feedback makes all the difference.",
      grade: "Grade 7",
      improvement: "+23%",
    },
    {
      name: "Brian O.",
      role: "Grade 9 Student, Mombasa",
      quote:
        "I use it every evening for 20 minutes. The science questions are so similar to what we get in class.",
      grade: "Grade 9",
      improvement: "+31%",
    },
    {
      name: "Mrs. Kamau",
      role: "Parent, Kisumu",
      quote:
        "Worth every shilling of KES 500. My two kids use the same account and both have improved.",
      grade: "Grades 5 & 8",
      improvement: "2 kids",
    },
  ];

  const faqs = [
    {
      q: "Can I try before subscribing?",
      a: "Yes! Browse all quizzes and try 2 completely free — no credit card, no signup required. After your 2 free quizzes, subscribe for unlimited access.",
    },
    {
      q: "What grades and subjects are covered?",
      a: "Grades 4 through 10 across all core CBC subjects including Mathematics, English, Kiswahili, Science & Technology, Social Studies, and more.",
    },
    {
      q: "How does the subscription work?",
      a: "After your 2 free quizzes, subscribe for just KES 500/month via M-Pesa. Cancel anytime — no long-term commitment.",
    },
    {
      q: "Can I pay via M-Pesa?",
      a: "Yes! M-Pesa is our primary payment method. You'll receive a prompt to pay via M-Pesa Paybill after your free quizzes.",
    },
    {
      q: "Can multiple children use one account?",
      a: "Currently each account is for one student profile so progress tracking stays accurate. We're building family plans.",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        .hero-bg { background: linear-gradient(145deg, #0c4a6e 0%, #0e7490 50%, #06b6d4 100%); }
        .gold-gradient { background: linear-gradient(135deg, #f97316, #ea580c); }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .float { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-600 flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="leading-none">
                <span className="font-display text-lg font-bold text-sky-900 block">
                  CBC
                </span>
                <span className="text-[10px] font-semibold text-cyan-600 tracking-widest uppercase -mt-0.5 block">
                  Kenya
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                ["#features", "Features"],
                ["#how-it-works", "How It Works"],
                ["#pricing", "Pricing"],
                ["#faq", "FAQ"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium text-gray-600 hover:text-cyan-800 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <button className="text-sm font-semibold text-cyan-800 hover:text-cyan-600 transition-colors px-4 py-2">
                  Sign In
                </button>
              </Link>
              <Link href="/explore">
                <button className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-700 to-cyan-600 text-white hover:from-cyan-800 hover:to-cyan-700 transition-all shadow-sm hover:shadow-md">
                  Explore Quizzes
                </button>
              </Link>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
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
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {[
                  ["#features", "Features"],
                  ["#how-it-works", "How It Works"],
                  ["#pricing", "Pricing"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 px-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                  >
                    {label}
                  </a>
                ))}
                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <Link href="/login">
                    <button className="w-full py-2.5 text-sm font-semibold text-cyan-800 border border-cyan-200 rounded-xl">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/explore">
                    <button className="w-full py-2.5 text-sm font-semibold bg-cyan-700 text-white rounded-xl">
                      Explore Quizzes →
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="hero-bg pt-28 pb-0 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div className="pb-16 lg:pb-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 mb-6"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">
                  Try 2 Quizzes Free • No Card Required
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-6"
              >
                Top of the
                <br />
                class.
                <br />
                <span className="text-amber-400">Starting today.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-cyan-100 text-lg leading-relaxed mb-8 max-w-md"
              >
                The only CBC practice platform with AI-powered marking, instant
                feedback, and progress tracking built for Kenyan students.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-5"
              >
                <Link href="/explore">
                  <button className="group flex items-center justify-center gap-2 px-7 py-4 rounded-2xl gold-gradient text-white font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                    Explore Free Quizzes
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-base transition-all">
                    See How It Works
                  </button>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="flex -space-x-2">
                  {[
                    "bg-amber-400",
                    "bg-cyan-400",
                    "bg-blue-400",
                    "bg-rose-400",
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${c} border-2 border-sky-800 flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {["G", "B", "A", "M"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-cyan-200 text-sm">
                  <span className="text-white font-semibold">
                    12,000+ students
                  </span>{" "}
                  already improving
                </p>
              </motion.div>
            </div>

            {/* Mock UI Card - Right Side */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative float pb-0 hidden lg:block"
            >
              <div className="bg-white rounded-t-3xl shadow-2xl p-7 mx-auto max-w-sm relative">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      Mathematics • Grade 8
                    </p>
                    <h3 className="font-display text-base font-bold text-gray-900 mt-0.5">
                      Linear Equations
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    Solve for <em>x</em>: <strong>3x + 7 = 22</strong>
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  {[
                    ["A", "x = 4", false],
                    ["B", "x = 5", true],
                    ["C", "x = 6", false],
                    ["D", "x = 7", false],
                  ].map(([letter, ans, correct]) => (
                    <div
                      key={letter}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${correct ? "border-cyan-400 bg-cyan-50" : "border-gray-200"}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${correct ? "bg-cyan-500 text-white" : "bg-gray-200 text-gray-500"}`}
                      >
                        {letter}
                      </span>
                      <span
                        className={`text-sm font-medium ${correct ? "text-cyan-800" : "text-gray-600"}`}
                      >
                        {ans}
                      </span>
                      {correct && (
                        <CheckCircle className="w-4 h-4 text-cyan-500 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-gray-500">Session Score</span>
                    <span className="text-cyan-700">85%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 1.2, delay: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                    />
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute -right-6 top-8 bg-white rounded-2xl shadow-xl p-4 border border-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">
                      Score jump
                    </p>
                    <p className="text-base font-bold text-gray-900">
                      +28%{" "}
                      <span className="text-cyan-600 text-xs">this week</span>
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute -left-6 top-40 bg-gradient-to-r from-cyan-700 to-cyan-600 text-white rounded-2xl shadow-xl p-3"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <p className="text-xs font-semibold">AI marked in 0.3s</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <div className="text-4xl font-display font-bold text-white mb-1">
                <Counter end={s.value} suffix={s.suffix} />
              </div>
              <p className="text-gray-400 text-sm font-medium">{s.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-3">
              Built for CBC
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900 mb-4">
              Everything your child
              <br />
              needs to excel
            </h2>
            <p className="text-gray-500 text-lg">
              Designed around the Kenyan CBC framework. Not a generic quiz app.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.1}>
                <div className="card-hover bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${f.color}`}
                  >
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-3">
              Simple by design
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900">
              Try before
              <br />
              you subscribe
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />

            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.15}>
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-600 flex items-center justify-center mb-5 shadow-lg">
                    <span className="font-display text-xl font-bold text-white">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {s.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.4} className="text-center mt-14">
            <Link href="/explore">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                Explore Quizzes <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <p className="text-gray-400 text-sm mt-3">
              No credit card • 2 free quizzes • M-Pesa accepted
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-3">
              Real Results
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900">
              Parents and students
              <br />
              speak for themselves
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="card-hover bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5 italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {t.name}
                        </p>
                        <p className="text-xs text-gray-400">{t.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-cyan-600">
                        {t.improvement}
                      </div>
                      <p className="text-xs text-gray-400">{t.grade}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-3">
              Pricing
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900 mb-4">
              Less than a<br />
              private lesson
            </h2>
            <p className="text-gray-500">
              One subscription. All subjects. All grades. Unlimited practice.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <FadeIn delay={0.1}>
              <div className="card-hover bg-white rounded-2xl p-8 border-2 border-gray-200 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest mb-3">
                    Monthly
                  </h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="font-display text-5xl font-bold text-gray-900">
                      500
                    </span>
                    <span className="text-gray-500 mb-2 text-sm font-medium">
                      KES / mo
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Billed monthly via M-Pesa
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "All subjects & grades",
                    "Unlimited practice",
                    "AI-powered marking",
                    "Progress analytics",
                    "Cancel anytime",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-gray-700"
                    >
                      <CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/explore">
                  <button className="w-full py-3.5 rounded-xl border-2 border-cyan-700 text-cyan-700 font-bold text-sm hover:bg-cyan-50 transition-all">
                    Try 2 Free Quizzes
                  </button>
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="card-hover relative bg-gradient-to-b from-cyan-800 to-cyan-900 rounded-2xl p-8 border-2 border-cyan-700 h-full flex flex-col shadow-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="gold-gradient text-white px-5 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                    ✦ BEST VALUE — SAVE 17%
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-cyan-300 text-sm uppercase tracking-widest mb-3">
                    Yearly
                  </h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="font-display text-5xl font-bold text-white">
                      5,000
                    </span>
                    <span className="text-cyan-300 mb-2 text-sm font-medium">
                      KES / yr
                    </span>
                  </div>
                  <p className="text-xs text-cyan-400">That's KES 417/month</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "All subjects & grades",
                    "Unlimited practice",
                    "AI-powered marking",
                    "Progress analytics",
                    "Priority support",
                    "2 months free",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-cyan-100"
                    >
                      <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/explore">
                  <button className="w-full py-3.5 rounded-xl gold-gradient text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg">
                    Try 2 Free Quizzes
                  </button>
                </Link>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3} className="text-center mt-8">
            <div className="inline-flex items-center gap-2 bg-white px-5 py-3 rounded-full border border-gray-200 shadow-sm">
              <Phone className="w-4 h-4 text-cyan-700" />
              <span className="text-sm font-medium text-gray-700">
                Pay easily with{" "}
                <strong className="text-cyan-800">M-Pesa</strong> — no card
                needed
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-3">
              FAQ
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900">
              Questions answered
            </h2>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-2">
              {faqs.map((f) => (
                <FAQItem key={f.q} {...f} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 hero-bg relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">
                No credit card required
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl text-white mb-5 leading-tight">
              Your child's best
              <br />
              results start now.
            </h2>
            <p className="text-cyan-200 text-lg mb-10 max-w-lg mx-auto">
              Join over 12,000 Kenyan students already mastering the CBC
              curriculum. Try 2 free quizzes, no commitment.
            </p>
            <Link href="/explore">
              <button className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl gold-gradient text-white font-bold text-lg shadow-2xl hover:scale-[1.03] hover:shadow-3xl transition-all duration-200">
                Explore Quizzes Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <p className="text-cyan-400 text-sm mt-4">
              2 free quizzes • M-Pesa accepted • Cancel anytime
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-gray-800">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="leading-none">
                  <span className="font-display text-base font-bold text-white block">
                    CBC Kenya
                  </span>
                  <span className="text-[10px] font-semibold text-cyan-500 tracking-widest uppercase block">
                    Learning Platform
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Empowering Kenyan students to master the CBC curriculum through
                intelligent practice and instant feedback.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  ["#features", "Features"],
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
                  ["#", "Careers"],
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
                <h3 className="font-bold text-sm text-gray-300 mb-4 uppercase tracking-wide">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map(([href, label]) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-gray-500 hover:text-white text-sm transition-colors"
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
            <p className="text-gray-600 text-sm">
              © 2026 CBC Kenya. All rights reserved.
            </p>
            <p className="text-gray-600 text-sm">
              Made with ❤️ for Kenyan students
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
