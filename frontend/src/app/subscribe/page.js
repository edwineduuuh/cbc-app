"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  X,
  Zap,
  Star,
  Crown,
  Shield,
  Phone,
  Copy,
  Clock,
  AlertCircle,
  ChevronRight,
  BookOpen,
  BarChart2,
  Download,
  Infinity,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-76im.onrender.com/api";

// ─── M-Pesa Business Details (Update these!) ─────────────────
const MPESA_CONFIG = {
  paybill: "247247", // ← Your Till/Paybill number
  account: "DARJA", // ← Account name / reference
  businessName: "Darja Learn",
};

// ─── Subscription Plans ───────────────────────────────────────
const PLANS = [
  {
    id: 1, // must match DB id
    slug: "weekly",
    name: "Weekly",
    tagline: "Try it this week",
    price_kes: 249,
    billing_period: "weekly",
    duration_days: 7,
    color: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-200",
    badge: null,
    features: [
      { text: "Full access to all CBC quizzes", included: true },
      { text: "Unlimited quiz attempts", included: true },
      { text: "AI-powered feedback", included: true },
      { text: "Performance analytics", included: true },
      { text: "Download results as PDF", included: true },
    ],
  },
  {
    id: 2,
    slug: "monthly",
    name: "Monthly",
    tagline: "For serious students",
    price_kes: 599,
    billing_period: "monthly",
    duration_days: 30,
    color: "from-purple-500 to-indigo-600",
    borderColor: "border-purple-300",
    badge: "Most Popular",
    features: [
      { text: "Full access to all CBC quizzes", included: true },
      { text: "Unlimited quiz attempts", included: true },
      { text: "AI-powered feedback", included: true },
      { text: "Performance analytics", included: true },
      { text: "Download results as PDF", included: true },
    ],
  },
  {
    id: 3,
    slug: "termly",
    name: "Termly",
    tagline: "Best value — pay once per term",
    price_kes: 999,
    billing_period: "termly",
    duration_days: 90,
    color: "from-amber-500 to-orange-500",
    borderColor: "border-amber-200",
    badge: "Save 33%",
    features: [
      { text: "Full access to all CBC quizzes", included: true },
      { text: "Unlimited quiz attempts", included: true },
      { text: "AI-powered feedback", included: true },
      { text: "Performance analytics", included: true },
      { text: "Download results as PDF", included: true },
    ],
  },
];

// ─── Payment Steps ────────────────────────────────────────────
const STEPS = ["Choose Plan", "Pay via M-Pesa", "Confirm Code"];

// ─── Main Pricing Page ────────────────────────────────────────
export default function PricingPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="text-center pt-16 pb-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" /> The Darja — Unlock Your Potential
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Darja
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            CBC-aligned practice for Grades 4–10. Pay with M-Pesa, start
            learning immediately.
          </p>
        </motion.div>

        {/* Active Subscription Banner */}
        {!loadingStatus && subscription?.is_active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 inline-flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-2xl"
          >
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-semibold">
              {subscription.plan} active — {subscription.days_remaining} days
              remaining
            </span>
            <span className="text-green-600 text-sm">
              expires{" "}
              {new Date(subscription.end_date).toLocaleDateString("en-KE")}
            </span>
          </motion.div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-white rounded-3xl border-2 ${plan.borderColor} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${plan.badge === "Most Popular" ? "ring-2 ring-purple-400 ring-offset-2" : ""}`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute top-4 right-4 bg-gradient-to-r ${plan.color} text-white text-xs font-bold px-3 py-1 rounded-full`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan Header */}
              <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
                <p className="text-white/80 text-sm mb-1">{plan.tagline}</p>
                <h2 className="text-2xl font-extrabold">{plan.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    KES {plan.price_kes}
                  </span>
                  <span className="text-white/70 text-sm">
                    /{plan.billing_period}
                  </span>
                </div>
                {plan.billing_period === "termly" && (
                  <p className="text-white/80 text-xs mt-1">
                    ≈ KES {Math.round(plan.price_kes / 3)}/month
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="p-6 space-y-3">
                {plan.features.map((feat, fi) => (
                  <div
                    key={fi}
                    className={`flex items-center gap-3 text-sm ${feat.included ? "text-gray-700" : "text-gray-300"}`}
                  >
                    {feat.included ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span>{feat.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-3.5 rounded-2xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2`}
                >
                  Get {plan.name} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm text-gray-500">
          {[
            { icon: "🔒", text: "Secure M-Pesa Payment" },
            { icon: "⚡", text: "Activated within 30 mins" },
            { icon: "📚", text: "CBC-aligned content" },
          ].map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showModal && selectedPlan && (
          <PaymentModal
            plan={selectedPlan}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchSubscriptionStatus();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────
function PaymentModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1=instructions, 2=submit code
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
      setError("Invalid M-Pesa code format. e.g. QGH7X9K2PL");
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
        setStep(3); // success
      } else {
        setError(
          data.error ||
            data.mpesa_code?.[0] ||
            "Submission failed. Please try again.",
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${plan.color} p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step >= s ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold">{plan.name}</h2>
          <p className="text-white/80">
            KES {plan.price_kes} — {plan.billing_period}
          </p>
        </div>

        <div className="p-6">
          {/* Step 1: Instructions */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Pay via M-Pesa
                </h3>
                <p className="text-gray-500 text-sm">
                  Follow these steps on your phone, then submit your code.
                </p>
              </div>

              {/* M-Pesa Steps */}
              <div className="space-y-3">
                {[
                  { step: "1", text: "Open M-Pesa on your phone", sub: null },
                  {
                    step: "2",
                    text: "Go to Lipa na M-Pesa → Buy Goods",
                    sub: null,
                  },
                  {
                    step: "3",
                    text: "Enter Till Number",
                    sub: MPESA_CONFIG.paybill,
                    copyKey: "paybill",
                  },
                  {
                    step: "4",
                    text: `Enter Amount: KES ${plan.price_kes}`,
                    sub: null,
                  },
                  { step: "5", text: "Enter PIN and confirm", sub: null },
                  {
                    step: "6",
                    text: "You'll get an SMS confirmation code",
                    sub: "e.g. QGH7X9K2PL",
                    highlight: true,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 text-sm font-medium">
                        {item.text}
                      </p>
                      {item.sub && (
                        <div className="flex items-center gap-2 mt-1">
                          <code
                            className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${item.highlight ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                          >
                            {item.sub}
                          </code>
                          {item.copyKey && (
                            <button
                              onClick={() => copy(item.sub, item.copyKey)}
                              className="text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              {copied === item.copyKey ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
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
                className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2`}
              >
                I've Paid — Enter My Code <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Submit Code */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Enter Your M-Pesa Code
                </h3>
                <p className="text-gray-500 text-sm">
                  Find the confirmation code in your M-Pesa SMS.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    M-Pesa Transaction Code *
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
                    placeholder="e.g. QGH7X9K2PL"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-lg tracking-widest focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Phone Number Used *
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 font-medium">
                      🇰🇪 +254
                    </span>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) =>
                        setForm({ ...form, phone_number: e.target.value })
                      }
                      placeholder="712 345 678"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-xs">
                    Amount should be exactly{" "}
                    <strong>KES {plan.price_kes}</strong>. Wrong amount will
                    cause rejection.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex-1 bg-gradient-to-r ${plan.color} text-white font-bold py-3 rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Submit Code <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-4"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Payment Submitted!
                </h3>
                <p className="text-gray-500 mt-2 text-sm">
                  We've received your M-Pesa code. Our team will verify your
                  payment and activate your subscription.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
                  <Clock className="w-4 h-4" /> What happens next?
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ We verify your payment (usually within 30 minutes)</li>
                  <li>✓ Your {plan.name} activates automatically</li>
                  <li>✓ Check your profile to see subscription status</li>
                </ul>
              </div>

              <button
                onClick={onSuccess}
                className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-all`}
              >
                Got it — Back to Dashboard
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
