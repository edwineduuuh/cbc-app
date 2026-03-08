"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  X,
  Zap,
  Shield,
  Copy,
  Clock,
  AlertCircle,
  ChevronRight,
  BookOpen,
  BarChart2,
  TrendingUp,
  Award,
  Target,
  Sparkles,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const MPESA_CONFIG = {
  paybill: "247247",
  account: "CBCKENYA",
  businessName: "CBC Kenya",
};

const PLANS = [
  {
    id: 1,
    slug: "weekly",
    name: "Weekly",
    tagline: "Perfect for exam prep",
    price_kes: 349,
    billing_period: "weekly",
    duration_days: 7,
    dailyCost: 50,
    savings: null,
    savingsPercent: null,
    comparison: "vs KES 2,000+ for weekly tutoring",
    badge: null,
    popular: false,
    features: [
      "Unlimited quiz attempts",
      "AI-graded structured answers",
      "Instant feedback & explanations",
      "Performance analytics",
      "Download PDF reports",
    ],
  },
  {
    id: 2,
    slug: "monthly",
    name: "Monthly",
    tagline: "Most students choose this",
    price_kes: 999,
    billing_period: "monthly",
    duration_days: 30,
    dailyCost: 33,
    savings: 48,
    savingsPercent: 5,
    comparison: "Just KES 33/day",
    badge: "MOST POPULAR",
    popular: true,
    features: [
      "Everything in Weekly, plus:",
      "Save KES 48 vs weekly plans",
      "Parent progress dashboard",
      "Priority support",
      "Weekly progress reports",
    ],
  },
  {
    id: 3,
    slug: "termly",
    name: "Termly",
    tagline: "Best value — pay once per term",
    price_kes: 2199,
    billing_period: "termly",
    duration_days: 90,
    dailyCost: 24,
    savings: 798,
    savingsPercent: 27,
    comparison: "Save KES 798 vs monthly",
    badge: "BEST VALUE",
    popular: false,
    features: [
      "Everything in Monthly, plus:",
      "Save KES 798 vs 3 monthly plans",
      "Just KES 24/day for 3 months",
      "Covers entire school term",
      "Best ROI for serious students",
    ],
  },
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoadingStatus(false);
        return;
      }
      const res = await fetch(`${API}/payments/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {!loadingStatus && subscription?.is_active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 px-6 py-3 rounded-2xl mb-6"
            >
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="font-bold">
                {subscription.plan} Active — {subscription.days_remaining} days
                left
              </span>
            </motion.div>
          )}

          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            Unlock Your Full Potential
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 leading-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Plan
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-3">
            AI-powered CBC practice for Grades 4–9. Unlimited quizzes, instant
            feedback, detailed analytics.
          </p>

          <p className="text-sm text-gray-500">
            Trusted by parents. Loved by students. ✓ Secure M-Pesa payment
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative bg-white rounded-3xl border-2 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                plan.popular
                  ? "border-emerald-400 scale-105 md:scale-110 z-10"
                  : "border-gray-200 hover:border-emerald-300"
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-center py-2 text-xs font-black tracking-wider">
                  {plan.badge}
                </div>
              )}

              <div className={`${plan.badge ? "pt-10" : "pt-8"} px-8 pb-8`}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.tagline}</p>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-5xl font-black text-gray-900">
                        {plan.price_kes}
                      </span>
                      <span className="text-2xl text-gray-500 font-bold">
                        KES
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      per {plan.billing_period}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold">
                      <Target className="w-4 h-4" />
                      Just KES {plan.dailyCost}/day
                    </div>

                    {plan.savings && (
                      <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-bold">
                        <TrendingUp className="w-4 h-4" />
                        Save KES {plan.savings} ({plan.savingsPercent}%)
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      {plan.comparison}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gray-200 mb-6"></div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                    plan.popular
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Get {plan.name}
                  <ChevronRight className="w-5 h-5" />
                </button>

                {plan.popular && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    ⚡ Activated within 30 minutes
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-emerald-100"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              Why Parents Choose CBC Kenya
            </h3>
            <p className="text-gray-600">
              Better value than traditional tutoring, with measurable results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                label: "Private Tutor",
                cost: "KES 5,000+",
                period: "per month",
                color: "text-red-600",
              },
              {
                icon: Award,
                label: "Coaching Center",
                cost: "KES 8,000+",
                period: "per term",
                color: "text-orange-600",
              },
              {
                icon: Sparkles,
                label: "CBC Kenya",
                cost: "KES 2,199",
                period: "per term",
                color: "text-emerald-600",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 border-2 ${
                  i === 2 ? "border-emerald-300 shadow-lg" : "border-gray-200"
                }`}
              >
                <item.icon className={`w-8 h-8 ${item.color} mb-3`} />
                <p className="text-sm text-gray-600 mb-1">{item.label}</p>
                <p className={`text-3xl font-black ${item.color} mb-1`}>
                  {item.cost}
                </p>
                <p className="text-xs text-gray-500">{item.period}</p>
                {i === 2 && (
                  <div className="mt-3 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                    <TrendingUp className="w-3 h-3" />
                    73% cheaper
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { icon: Shield, text: "Secure M-Pesa", sub: "100% Safe" },
            { icon: Zap, text: "Instant Access", sub: "Within 30 mins" },
            { icon: BarChart2, text: "Track Progress", sub: "Parent portal" },
            { icon: Award, text: "CBC-Aligned", sub: "Official curriculum" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="bg-white rounded-2xl p-4 border border-gray-200"
            >
              <item.icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900">{item.text}</p>
              <p className="text-xs text-gray-500">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 border-2 border-emerald-200 shadow-lg">
            <Shield className="w-8 h-8 text-emerald-600" />
            <div className="text-left">
              <p className="font-bold text-gray-900">Satisfaction Guaranteed</p>
              <p className="text-sm text-gray-600">
                Not satisfied? Get a full refund within 7 days
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && selectedPlan && (
          <PaymentModal
            plan={selectedPlan}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchSubscriptionStatus();
              window.location.href = "/dashboard?subscribed=true";
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    mpesa_code: "",
    phone_number: "",
    amount_paid: plan.price_kes,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!form.mpesa_code.trim() || !form.phone_number.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (!/^[A-Z0-9]{8,12}$/.test(form.mpesa_code.trim().toUpperCase())) {
      setError("Invalid M-Pesa code format (e.g., QGH7X9K2PL)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/payments/submit/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          mpesa_code: form.mpesa_code.trim().toUpperCase(),
          phone_number: form.phone_number.trim(),
          amount_paid: form.amount_paid,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(3);
      } else {
        setError(
          data.error || data.mpesa_code?.[0] || "Submission failed. Try again.",
        );
      }
    } catch (e) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    step >= s ? "w-8 bg-white" : "w-8 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-black mb-1">{plan.name} Plan</h2>
          <p className="text-white/90 text-lg font-bold">
            KES {plan.price_kes} — {plan.billing_period}
          </p>
        </div>

        <div className="p-8">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  Pay with M-Pesa
                </h3>
                <p className="text-gray-600">
                  Follow these steps, then enter your confirmation code
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { step: "1", text: "Open M-Pesa on your phone" },
                  { step: "2", text: "Go to Lipa na M-Pesa → Buy Goods" },
                  {
                    step: "3",
                    text: "Enter Till Number",
                    sub: MPESA_CONFIG.paybill,
                    copyKey: "paybill",
                  },
                  { step: "4", text: `Enter KES ${plan.price_kes}` },
                  { step: "5", text: "Enter your M-Pesa PIN and confirm" },
                  {
                    step: "6",
                    text: "Save your confirmation code from SMS",
                    sub: "e.g., QGH7X9K2PL",
                    highlight: true,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-900 font-medium">{item.text}</p>
                      {item.sub && (
                        <div className="flex items-center gap-2 mt-2">
                          <code
                            className={`font-mono font-bold px-3 py-1.5 rounded-lg ${
                              item.highlight
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.sub}
                          </code>
                          {item.copyKey && (
                            <button
                              onClick={() => copy(item.sub, item.copyKey)}
                              className="text-gray-400 hover:text-emerald-600"
                            >
                              {copied === item.copyKey ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
              >
                I've Paid — Enter Code
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  Enter M-Pesa Code
                </h3>
                <p className="text-gray-600">
                  Find the code in your M-Pesa confirmation SMS
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    M-Pesa Confirmation Code *
                  </label>
                  <input
                    type="text"
                    value={form.mpesa_code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mpesa_code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="QGH7X9K2PL"
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl font-mono text-xl tracking-widest focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Phone Number Used *
                  </label>
                  <div className="flex gap-3">
                    <span className="px-4 py-4 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-bold">
                      +254
                    </span>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) =>
                        setForm({ ...form, phone_number: e.target.value })
                      }
                      placeholder="712345678"
                      className="flex-1 px-4 py-4 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-900 text-sm">
                    Amount must be exactly <strong>KES {plan.price_kes}</strong>
                    . Wrong amount will be rejected.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <X className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 font-bold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 rounded-2xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Submit Code
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-6"
            >
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Payment Submitted!
                </h3>
                <p className="text-gray-600">
                  We're verifying your payment. This usually takes under 30
                  minutes.
                </p>
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Clock className="w-5 h-5" /> What happens next?
                </div>
                <ul className="text-sm text-emerald-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    We verify your payment (usually under 30 minutes)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Your {plan.name} plan activates automatically
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Check your dashboard to see subscription status
                  </li>
                </ul>
              </div>

              <button
                onClick={onSuccess}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
