"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { BookOpen, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login({ username, password });

    if (!result.success) {
      setError(result.error);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3001);
      setLoading(false);
    }

    // No else
    // No redirect
    // AuthContext handles routing
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        body { font-family: 'DM Sans', sans-serif; }
        .hero-bg { background: linear-gradient(145deg, #0c4a6e 0%, #0e7490 50%, #06b6d4 100%); }
        .gold-gradient { background: linear-gradient(135deg, #f97316, #ea580c); }
        .dot-pattern { background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 28px 28px; }
        .input-field {
          width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb;
          border-radius: 12px; font-size: 14px; color: #111827;
          outline: none; transition: all 0.2s; background: #fafafa;
          font-family: 'DM Sans', sans-serif;
        }
        .input-field:focus { border-color: #0e7490; background: white; box-shadow: 0 0 0 3px rgba(14,116,144,0.1); }
        .input-field::placeholder { color: #9ca3af; }
      `}</style>

      <Toast
        message={error}
        type="error"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />

      <div className="min-h-screen flex">
        {/* ── Left Panel — Decorative ── */}
        <div className="hidden lg:flex lg:w-[45%] hero-bg relative overflow-hidden flex-col justify-between p-12">
          <div className="dot-pattern absolute inset-0" />

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-lg font-bold text-white block">
                CBC Kenya
              </span>
              <span className="text-[10px] font-semibold text-cyan-300 tracking-widest uppercase block">
                Learning Platform
              </span>
            </div>
          </div>

          {/* Center content */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                Grades 4–10 • AI Marking
              </span>
            </div>
            <h2 className="font-display text-5xl text-white leading-[1.1] mb-6">
              Welcome
              <br />
              back to
              <br />
              <span className="text-amber-400">greatness.</span>
            </h2>
            <p className="text-cyan-200 text-base leading-relaxed max-w-xs">
              Your progress is waiting. Every session brings you closer to the
              top of your class.
            </p>

            {/* Mini stats */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                ["12K+", "Students"],
                ["94%", "Improve"],
                ["50K+", "Daily Qs"],
              ].map(([val, label]) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10"
                >
                  <p className="font-display text-2xl font-bold text-white">
                    {val}
                  </p>
                  <p className="text-cyan-300 text-xs font-medium mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom testimonial */}
          <div className="relative bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-5">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400 text-sm">
                  ★
                </span>
              ))}
            </div>
            <p className="text-white/90 text-sm italic leading-relaxed mb-3">
              "My son improved from 61% to 89% in one term. Absolutely worth
              it."
            </p>
            <p className="text-cyan-300 text-xs font-semibold">
              — Wanjiru M., Parent · Nairobi
            </p>
          </div>
        </div>

        {/* ── Right Panel — Form ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-700 to-teal-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-cyan-900">
                CBC Kenya
              </span>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-4xl text-gray-900 mb-2">
                Sign In
              </h1>
              <p className="text-gray-500 text-sm">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  Create one free
                </Link>
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {/* Social login */}
              <SocialLoginButtons />

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="input-field pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? "#0e7490"
                      : "linear-gradient(135deg, #0e7490, #06b6d4)",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In{" "}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              By signing in you agree to our{" "}
              <a href="#" className="text-cyan-700 hover:underline">
                Terms
              </a>{" "}
              &{" "}
              <a href="#" className="text-cyan-700 hover:underline">
                Privacy Policy
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
