"use client";
import { fetchWithAuth } from "@/lib/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle,
  X,
  Zap,
  Shield,
  Clock,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  BarChart2,
  TrendingUp,
  Award,
  Target,
  Sparkles,
  Crown,
  Star,
  ArrowRight,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const PLANS = [
  {
    id: 2,
    slug: "weekly",
    name: "Weekly",
    tagline: "Try it out",
    price: 149,
    period: "week",
    duration: 7,
    dailyCost: 21,
    savings: null,
    badge: null,
    popular: false,
    color: "slate",
    features: [
      "Unlimited quiz attempts",
      "AI-graded answers with feedback",
      "All learning areas & grades",
      "Performance tracking",
    ],
  },
  {
    id: 3,
    slug: "monthly",
    name: "Monthly",
    tagline: "Most popular choice",
    price: 499,
    period: "month",
    duration: 30,
    dailyCost: 17,
    savings: { amount: 97, percent: 16, vs: "weekly" },
    badge: "MOST POPULAR",
    popular: true,
    color: "teal",
    features: [
      "Everything in Weekly",
      "Save 16% vs weekly plan",
      "Download PDF reports",
      "Priority support",
      "Progress analytics dashboard",
    ],
  },
  {
    id: 1,
    slug: "termly",
    name: "Termly",
    tagline: "Best value for serious students",
    price: 999,
    period: "term",
    duration: 90,
    dailyCost: 11,
    savings: { amount: 498, percent: 33, vs: "monthly" },
    badge: "BEST VALUE",
    popular: false,
    color: "navy",
    features: [
      "Everything in Monthly",
      "Save 33% vs monthly plan",
      "Covers entire school term",
      "Just KES 11/day",
      "Parent progress reports",
    ],
  },
];

export default function SubscribePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role === "teacher") {
      router.replace("/teacher");
      return;
    }
    fetchSubscriptionStatus();
  }, [authLoading, user]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoadingStatus(false);
        return;
      }
      const res = await fetchWithAuth(`${API}/payments/status/`);
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
    if (!user) {
      router.push("/login?next=/subscribe");
      return;
    }
    setSelectedPlan(plan);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Back navigation */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {user ? "Back to Dashboard" : "Back to Home"}
        </Link>
      </div>

      {/* Active subscription banner */}
      {!loadingStatus && subscription?.is_active && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl"
          >
            <Crown className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm">
              You have an active {subscription.plan} plan -{" "}
              {subscription.days_remaining} days remaining
            </span>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-xs font-bold mb-5 border border-teal-200">
            <Sparkles className="w-3.5 h-3.5" />
            SIMPLE, TRANSPARENT PRICING
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 leading-tight tracking-tight">
            Unlock unlimited{" "}
            <span className="bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              learning
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-lg mx-auto mb-2">
            AI-powered CBE practice for Grades 4-10. Pick a plan. Start now.
          </p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`relative flex flex-col bg-white rounded-2xl border-2 transition-all duration-300 ${
                plan.popular
                  ? "border-teal-500 shadow-xl shadow-teal-100 md:scale-[1.04] z-10"
                  : "border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${
                    plan.popular
                      ? "bg-linear-to-r from-teal-600 to-cyan-600"
                      : "bg-linear-to-r from-gray-800 to-gray-700"
                  } text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full`}
                >
                  {plan.badge}
                </div>
              )}

              <div
                className={`${plan.badge ? "pt-8" : "pt-7"} px-6 pb-7 flex flex-col flex-1`}
              >
                {/* Plan name & tagline */}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-0.5">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-400">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-500 font-medium">
                      KES
                    </span>
                    <span className="text-5xl font-black text-gray-900 tracking-tight">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    per {plan.period} &middot; {plan.duration} days
                  </p>
                </div>

                {/* Daily cost pill */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <div className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-100">
                    <Clock className="w-3 h-3" />
                    KES {plan.dailyCost}/day
                  </div>
                  {plan.savings && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                      <TrendingUp className="w-3 h-3" />
                      Save {plan.savings.percent}%
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mb-5" />

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2.5">
                      <CheckCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.popular ? "text-teal-500" : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-600 leading-snug">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    plan.popular
                      ? "bg-linear-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-200"
                      : plan.slug === "termly"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  {plan.popular ? "Get Started" : `Choose ${plan.name}`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Trust signals */}
      <div className="max-w-5xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Shield, text: "M-Pesa Secure", sub: "Safe payments" },
            { icon: Zap, text: "Instant Access", sub: "Start immediately" },
            { icon: BarChart2, text: "Track Progress", sub: "Real analytics" },
            { icon: Award, text: "CBE-Aligned", sub: "Official curriculum" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
            >
              <item.icon className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900">{item.text}</p>
                <p className="text-[11px] text-gray-400">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Comparison section */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl p-7 border border-gray-200"
        >
          <h3 className="text-lg font-black text-gray-900 mb-1 text-center">
            Better value than traditional tutoring
          </h3>
          <p className="text-sm text-gray-400 mb-6 text-center">
            Compare and see the difference
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Private Tutor",
                cost: "5,000+",
                period: "/month",
                color: "text-red-500",
                bg: "bg-red-50",
                border: "border-red-100",
              },
              {
                label: "Coaching Center",
                cost: "8,000+",
                period: "/term",
                color: "text-orange-500",
                bg: "bg-orange-50",
                border: "border-orange-100",
              },
              {
                label: "StadiSpace",
                cost: "999",
                period: "/term",
                color: "text-teal-600",
                bg: "bg-teal-50",
                border: "border-teal-200",
                highlight: true,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-xl p-5 border ${item.highlight ? `${item.bg} ${item.border} shadow-sm` : `bg-white ${item.border}`}`}
              >
                <p className="text-xs text-gray-400 font-semibold mb-2">
                  {item.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-black ${item.color}`}>
                    KES {item.cost}
                  </span>
                  <span className="text-xs text-gray-400">{item.period}</span>
                </div>
                {item.highlight && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-teal-100 text-teal-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                    <Star className="w-3 h-3" />
                    80% cheaper than tutoring
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  // Only allow digits, strip leading 0, max 9 digits (after 254)
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.startsWith("254")) val = val.slice(3); // strip 254 prefix if pasted
    if (val.startsWith("0")) val = val.slice(1); // strip leading 0
    setPhone(val.slice(0, 9));
  };

  const fullPhone = `254${phone}`; // 2547XXXXXXXX

  const handleSTKPush = async () => {
    if (phone.length !== 9) {
      setError("Enter 9 digits after +254 (e.g. 712345678)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchWithAuth(`${API}/payments/stk-push/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan.id,
          phone_number: fullPhone,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(2);
        pollPaymentStatus(data.payment_request_id);
      } else {
        setError(data.error || "Failed to initiate payment. Try again.");
      }
    } catch (e) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`${API}/payments/status/${id}/`);
        const data = await res.json();

        if (data.status === "verified") {
          clearInterval(interval);
          setStep(3);
        } else if (data.status === "rejected") {
          clearInterval(interval);
          setError("Payment failed. Please try again.");
          setStep(1);
        }
      } catch (e) {
        // keep polling
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      setPollingTimedOut(true);
    }, 120000);
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
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-teal-600 to-cyan-600 p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all ${
                    step >= s ? "w-7 bg-white" : "w-7 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-black">{plan.name} Plan</h2>
          <p className="text-white/80 text-sm font-semibold">
            KES {plan.price}/{plan.period} &middot; {plan.duration} days
          </p>
        </div>

        <div className="p-6">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Pay with M-Pesa
                </h3>
                <p className="text-sm text-gray-500">
                  Enter your number. We will send an STK push.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 font-bold text-sm">
                    +254
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="712345678"
                    maxLength={9}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-base tracking-wide"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                  <X className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              )}

              <button
                onClick={handleSTKPush}
                disabled={loading}
                className="w-full bg-linear-to-r from-teal-600 to-cyan-600 text-white font-bold py-3.5 rounded-xl hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Pay KES {plan.price}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400">
                <Shield className="w-3 h-3 inline mr-1" />
                Secure M-Pesa payment. No card needed.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-5 py-4"
            >
              {pollingTimedOut ? (
                <>
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-10 h-10 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Not Confirmed Yet
                    </h3>
                    <p className="text-sm text-gray-500">
                      We haven&apos;t received M-Pesa confirmation. Check your phone for an M-Pesa message. If you paid, your subscription will activate automatically.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPollingTimedOut(false);
                        setStep(1);
                        setError("");
                      }}
                      className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all text-sm"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all text-sm"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
                    <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Check Your Phone
                    </h3>
                    <p className="text-sm text-gray-500">
                      M-Pesa prompt sent to{" "}
                      <strong className="text-gray-900">+{fullPhone}</strong>. Enter
                      your PIN.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs font-medium">
                    Waiting for confirmation... Do not close this window.
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-4"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  You are In!
                </h3>
                <p className="text-sm text-gray-500">
                  Your {plan.name} plan is now active. Enjoy unlimited learning.
                </p>
              </div>
              <button
                onClick={onSuccess}
                className="w-full bg-linear-to-r from-teal-600 to-cyan-600 text-white font-bold py-3.5 rounded-xl transition-all text-sm"
              >
                Start Learning ?
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
