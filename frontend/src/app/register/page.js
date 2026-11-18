"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import Toast from "@/components/ui/Toast";
import { ArrowRight, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Suspense } from "react";

function RegisterPage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    role: "student",
    first_name: "",
    email: "",
    password: "",
    password2: "",
    grade: "",
    parent_phone: "",
    school_name: "",
  });
  const isFacilitator = formData.role === "teacher";
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { register } = useAuth();
  const reason = searchParams.get("reason");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 8) newErrors.password = "Minimum 8 characters";
    if (formData.password !== formData.password2) newErrors.password2 = "Passwords don't match";

    // A learner's grade decides which curriculum they see, so it is required.
    // A facilitator teaches across grades and picks one per lesson, and has
    // no parent to contact - so neither field applies to them.
    if (!isFacilitator) {
      if (!formData.grade) newErrors.grade = "Please select your grade";
      const rawPhone = formData.parent_phone.replace(/\D/g, "").replace(/^0/, "");
      if (!rawPhone) newErrors.parent_phone = "Parent phone is required";
      else if (rawPhone.length !== 9) newErrors.parent_phone = "Enter 9 digits (e.g. 712345678)";
    }
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
      first_name: formData.first_name.trim(),
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      role: formData.role,
      ...(isFacilitator
        ? { school_name: formData.school_name.trim() }
        : {
            grade: parseInt(formData.grade),
            parent_phone:
              "254" + formData.parent_phone.replace(/\D/g, "").replace(/^0/, ""),
          }),
    };

    const result = await register(userData);

    if (!result.success) {
      try {
        const parsedError = JSON.parse(result.error);
        const flatErrors = {};
        for (const [key, value] of Object.entries(parsedError)) {
          flatErrors[key] = Array.isArray(value) ? value.join(". ") : value;
        }
        setErrors(flatErrors);
      } catch {
        setToastMessage(result.error);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
      setLoading(false);
    } else {
      localStorage.removeItem("guest_session_id");
      localStorage.removeItem("guest_quizzes_taken");
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 border-2 rounded-xl text-sm text-gray-900 outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400 font-['DM_Sans',sans-serif] ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(14,116,144,0.1)]"
    }`;
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  const perks = [
    "3 free quizzes - no card needed",
    "All CBE learning areas, Grades 4-10",
    "Instant marking with detailed feedback",
    "Pay via M-Pesa when ready",
  ];

  return (
    <>
      <style>{`
        .font-display { font-family: var(--font-display); }
        * { font-family: var(--font-sans); }
        .hero-bg { background: linear-gradient(145deg, #0c4a6e 0%, #0e7490 50%, #06b6d4 100%); }
        .dot-pattern { background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 28px 28px; }
      `}</style>

      <Toast
        message={toastMessage}
        type="error"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />

      <div className="min-h-screen flex">
        {/* Left decorative panel */}
        <div className="hidden lg:flex lg:w-[40%] hero-bg relative overflow-hidden flex-col justify-between p-12">
          <div className="dot-pattern absolute inset-0" />

          <div className="relative flex items-center gap-3">
            <Logo size={24} tone="mono" />
          </div>

          <div className="relative">
            <h2 className="font-display text-5xl text-white leading-[1.1] mb-6">
              Start your
              <br />
              journey to
              <br />
              <span className="text-amber-400">the top.</span>
            </h2>
            <p className="text-cyan-100 text-base leading-relaxed mb-10 max-w-xs">
              Master the CBE curriculum with instant, detailed feedback on every quiz.
            </p>
            <div className="space-y-3">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-cyan-100 text-sm font-medium">{p}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right form panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full flex items-start justify-center px-6 py-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md"
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-8">
                <Logo size={22} />
              </div>

              {reason === "quota" && (
                <div className="mb-6 flex items-center gap-3 bg-teal-50 border-2 border-teal-200 rounded-xl px-5 py-4">
                  <span className="text-2xl"></span>
                  <div>
                    <p className="font-bold text-teal-800 text-sm">You&apos;re enjoying StadiSpace!</p>
                    <p className="text-teal-700 text-xs mt-0.5">
                      Create a free account to unlock 3 free quizzes - no payment needed.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h1 className="font-display text-4xl text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-500 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Who is signing up. Chosen first, because it decides
                      which of the fields below even apply. */}
                  <div>
                    <label className={labelCls}>I am signing up as *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "student", title: "Learner", blurb: "Quizzes, instant marking and progress" },
                        { value: "teacher", title: "Facilitator", blurb: "Schemes, lesson plans and assessments" },
                      ].map((opt) => {
                        const active = formData.role === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({ ...p, role: opt.value }))
                            }
                            aria-pressed={active}
                            className={`text-left rounded-xl border p-3 transition-colors ${
                              active
                                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span
                              className={`block text-sm font-semibold ${
                                active ? "text-emerald-800" : "text-gray-800"
                              }`}
                            >
                              {opt.title}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {opt.blurb}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* First Name */}
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="e.g. Grace"
                      className={inputCls("first_name")}
                    />
                    {errors.first_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      required
                      className={inputCls("email")}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* School - facilitators only. They teach across grades,
                      so a single grade at signup would mean nothing. */}
                  {isFacilitator && (
                    <div>
                      <label className={labelCls}>School (optional)</label>
                      <input
                        name="school_name"
                        value={formData.school_name}
                        onChange={handleChange}
                        placeholder="e.g. Kisumu Girls High School"
                        className={inputCls("school_name")}
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        Appears on your schemes of work and lesson plans
                      </p>
                    </div>
                  )}

                  {/* Grade */}
                  {!isFacilitator && (
                  <div>
                    <label className={labelCls}>Grade *</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className={inputCls("grade")}
                    >
                      <option value="">Select your grade</option>
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                    {errors.grade && (
                      <p className="mt-1 text-xs text-red-500">{errors.grade}</p>
                    )}
                  </div>
                  )}

                  {/* Parent Phone - learners only; a facilitator has no
                      parent to send progress updates or receipts to. */}
                  {!isFacilitator && (
                  <div>
                    <label className={labelCls}>Parent Phone *</label>
                    <div className="flex gap-2">
                      <span className="px-3 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm">
                        +254
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        name="parent_phone"
                        value={formData.parent_phone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.startsWith("254")) val = val.slice(3);
                          if (val.startsWith("0")) val = val.slice(1);
                          setFormData({ ...formData, parent_phone: val.slice(0, 9) });
                        }}
                        placeholder="712345678"
                        maxLength={9}
                        className={`flex-1 ${inputCls("parent_phone")}`}
                      />
                    </div>
                    {errors.parent_phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.parent_phone}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400">
                      For progress updates & M-Pesa payment
                    </p>
                  </div>
                  )}

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
                          placeholder="Min. 8 chars"
                          required
                          className={`${inputCls("password")} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Confirm *</label>
                      <div className="relative">
                        <input
                          name="password2"
                          type={showPassword2 ? "text" : "password"}
                          value={formData.password2}
                          onChange={handleChange}
                          placeholder="Re-enter"
                          required
                          className={`${inputCls("password2")} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword2(!showPassword2)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password2 && (
                        <p className="mt-1 text-xs text-red-500">{errors.password2}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] disabled:opacity-60 mt-2"
                    style={{ background: "linear-gradient(135deg, #0e7490, #0f1f3d)" }}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                <span className="text-amber-500">✦</span>
                <p className="text-xs font-medium text-amber-800">
                  3 free quizzes · Full feedback · No credit card · M-Pesa accepted
                </p>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                By signing up you agree to our{" "}
                <a href="#" className="text-teal-700 hover:underline">Terms</a>{" "}
                &{" "}
                <a href="#" className="text-teal-700 hover:underline">Privacy Policy</a>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
        </div>
      }
    >
      <RegisterPage />
    </Suspense>
  );
}
