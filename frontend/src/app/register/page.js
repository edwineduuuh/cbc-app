"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Toast from "@/components/ui/Toast";
import {
  BookOpen,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  GraduationCap,
  UserCheck,
} from "lucide-react";

import { Suspense } from "react";

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    role: "student",
    grade: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { register } = useAuth();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 8)
      newErrors.password = "Minimum 8 characters";
    if (formData.password !== formData.password2)
      newErrors.password2 = "Passwords don't match";
    if (formData.role === "student" && !formData.grade)
      newErrors.grade = "Please select your grade";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
    };
    if (formData.role === "student") userData.grade = parseInt(formData.grade);

    const result = await register(userData);

    if (!result.success) {
      try {
        const parsedError = JSON.parse(result.error);
        setErrors(parsedError);
      } catch {
        setToastMessage(result.error);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
      setLoading(false);
    }
    // ========== ADD THIS BLOCK - Registration Success Logic ==========
    else {
      // Check if user was previously a guest
      const wasGuest = localStorage.getItem("guest_session_id");
      const guestQuizzesTaken = parseInt(
        localStorage.getItem("guest_quizzes_taken") || "0",
      );

      // Clear guest session data
      if (wasGuest) {
        localStorage.removeItem("guest_session_id");
        localStorage.removeItem("guest_quizzes_taken");
      }
      window.location.href = "/explore?welcome=true";
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 border-2 rounded-xl text-sm text-gray-900 outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400 font-['DM_Sans',sans-serif] ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]"
    }`;
  const labelCls =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  const perks = [
    "7-day free trial, no card needed",
    "All CBE learning areas, Grades 4–10",
    "AI-powered instant marking",
    "Pay via M-Pesa after trial",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
        .hero-bg { background: linear-gradient(145deg, #0a3d1f 0%, #0f5c2e 50%, #1a7a42 100%); }
        .gold-gradient { background: linear-gradient(135deg, #f5a623, #e8870a); }
        .dot-pattern { background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 28px 28px; }
        .role-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; }
        .role-card:hover { border-color: #16a34a; background: #f0fdf4; }
        .role-card.active { border-color: #16a34a; background: #f0fdf4; }
      `}</style>

      <Toast
        message={toastMessage}
        type="error"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />

      <div className="min-h-screen flex">
        {/* ── Left decorative panel ── */}
        <div className="hidden lg:flex lg:w-[40%] hero-bg relative overflow-hidden flex-col justify-between p-12">
          <div className="dot-pattern absolute inset-0" />

          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-lg font-bold text-white block">
                CBE Kenya
              </span>
              <span className="text-[10px] font-semibold text-green-400 tracking-widest uppercase block">
                Learning Platform
              </span>
            </div>
          </div>

          <div className="relative">
            <h2 className="font-display text-5xl text-white leading-[1.1] mb-6">
              Start your
              <br />
              journey to
              <br />
              <span className="text-amber-400">the top.</span>
            </h2>
            <p className="text-green-200 text-base leading-relaxed mb-10 max-w-xs">
              Join 12,000+ Kenyan students already mastering the CBE curriculum.
            </p>
            <div className="space-y-3">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-green-100 text-sm font-medium">
                    {p}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-5">
              <p className="text-white/90 text-sm italic leading-relaxed mb-3">
                "The AI marking is incredible — it marks open-ended questions
                and tells you exactly what you missed."
              </p>
              <p className="text-green-300 text-xs font-semibold">
                — Brian O., Grade 9 · Mombasa
              </p>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full flex items-start justify-center px-6 py-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl"
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-lg font-bold text-green-900">
                  CBE Kenya
                </span>
              </div>
              {reason === "quota" && (
                <div className="mb-6 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl px-5 py-4">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">
                      You are enjoying NurtureUp!
                    </p>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      Create a free account to unlock 3 more quizzes — no
                      payment needed.
                    </p>
                  </div>
                </div>
              )}
              <div className="mb-8">
                <h1 className="font-display text-4xl text-gray-900 mb-2">
                  Create Account
                </h1>
                <p className="text-gray-500 text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>First Name</label>
                      <input
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="Grace"
                        className={inputCls("first_name")}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Last Name</label>
                      <input
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Wanjiru"
                        className={inputCls("last_name")}
                      />
                    </div>
                  </div>

                  {/* Username + Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Username *</label>
                      <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="gracew"
                        required
                        className={inputCls("username")}
                      />
                      {errors.username && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.username}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Email *</label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="grace@email.com"
                        required
                        className={inputCls("email")}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grade (students only) */}
                  <AnimatePresence>
                    {formData.role === "student" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className={labelCls}>Grade *</label>
                        <select
                          name="grade"
                          value={formData.grade}
                          onChange={handleChange}
                          className={inputCls("grade")}
                        >
                          <option value="">Select your grade</option>
                          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ))}
                        </select>
                        {errors.grade && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.grade}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Passwords */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Password *</label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Min. 8 characters"
                          required
                          className={`${inputCls("password")} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Confirm Password *</label>
                      <div className="relative">
                        <input
                          name="password2"
                          type={showPassword2 ? "text" : "password"}
                          value={formData.password2}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          required
                          className={`${inputCls("password2")} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword2(!showPassword2)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword2 ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.password2 && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.password2}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] disabled:opacity-60 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #15803d, #059669)",
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create Free Account{" "}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Trial reminder */}
              <div className="mt-5 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                <span className="text-amber-500">✦</span>
                <p className="text-xs font-medium text-amber-800">
                  5 quizzes on free trial · No credit card · M-Pesa accepted
                </p>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                By signing up you agree to our{" "}
                <a href="#" className="text-green-700 hover:underline">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="text-green-700 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
export default function RegisterPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      }
    >
      <RegisterPage />
    </Suspense>
  );
}
