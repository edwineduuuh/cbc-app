"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext"; // ← THE FIX
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Shield,
  CheckCircle,
  Bell,
  CreditCard,
  Sparkles,
  ChevronRight,
  Star,
  Calendar,
  Phone,
  AlertCircle,
  Crown,
  Palette,
  Settings,
  Lock,
} from "lucide-react";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-300"
          }`}
          style={{
            backdropFilter: "blur(16px)",
            background:
              message.type === "success"
                ? "rgba(16,185,129,0.15)"
                : "rgba(239,68,68,0.15)",
          }}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-white/40 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, iconColor, label, value }) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/30 uppercase tracking-wide font-semibold">
          {label}
        </p>
        <p className="text-sm font-semibold text-white mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Theme option ─────────────────────────────────────────────────────────────
function ThemeOption({ label, desc, icon: Icon, gradient, active, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
        active
          ? "border-emerald-500/60"
          : "border-white/10 hover:border-white/20"
      }`}
      style={{
        background: active ? "rgba(16,185,129,0.10)" : "rgba(255,255,255,0.04)",
      }}
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          active ? "border-emerald-500 bg-emerald-500" : "border-white/20"
        }`}
      >
        {active && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
    </motion.button>
  );
}

// ─── Nav tab ──────────────────────────────────────────────────────────────────
function NavTab({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left w-full ${
        active ? "text-white" : "text-white/40 hover:text-white/70"
      }`}
      style={{ background: active ? "rgba(255,255,255,0.10)" : "transparent" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: active
            ? "rgba(16,185,129,0.20)"
            : "rgba(255,255,255,0.05)",
        }}
      >
        <tab.icon
          className={`w-4 h-4 ${active ? "text-emerald-400" : "text-white/30"}`}
        />
      </div>
      <span className="text-sm font-semibold">{tab.label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto text-white/30" />}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme(); // ← uses ThemeContext
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme); // ThemeContext handles DOM + localStorage
    setToast({
      type: "success",
      text: `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} theme applied`,
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "account", label: "Account", icon: Settings },
  ];

  if (!user) return null;

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user.username;
  const initials = (
    user.first_name?.[0] ||
    user.username?.[0] ||
    "U"
  ).toUpperCase();
  const isSubscribed = user.is_subscribed;
  const subExpiry = user.subscription_end_date;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: "#030712",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <Toast message={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b border-white/5"
        style={{
          background: "rgba(9,9,15,0.92)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/dashboard">
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
          </Link>
          <h1
            className="text-lg font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Settings
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-4 sticky top-24"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center text-center pb-5 mb-3 border-b border-white/5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
                  {initials}
                </div>
                <p className="font-bold text-white text-sm">{displayName}</p>
                <p className="text-xs text-white/30 mt-0.5 truncate max-w-full">
                  {user.email}
                </p>
                {isSubscribed ? (
                  <div
                    className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.30)",
                    }}
                  >
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      Subscribed
                    </span>
                  </div>
                ) : (
                  <div
                    className="mt-2 px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <span className="text-xs text-white/30">Free Trial</span>
                  </div>
                )}
              </div>

              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <NavTab
                    key={tab.id}
                    tab={tab}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
                <div className="pt-3 mt-3 border-t border-white/5">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.10)" }}
                    >
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">Sign Out</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* Profile */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  <Section
                    title="Profile Information"
                    description="Your personal details on this account"
                  >
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-5 mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {displayName}
                          </h3>
                          <p className="text-sm text-white/40 mt-0.5">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                              style={{
                                background: "rgba(255,255,255,0.10)",
                                color: "rgba(255,255,255,0.60)",
                              }}
                            >
                              <Shield className="w-3 h-3" />
                              {user.role || "Student"}
                            </span>
                            {user.grade && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400"
                                style={{ background: "rgba(16,185,129,0.15)" }}
                              >
                                <GraduationCap className="w-3 h-3" />
                                Grade {user.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoRow
                          icon={User}
                          iconColor="#10b981"
                          label="Username"
                          value={user.username || "—"}
                        />
                        <InfoRow
                          icon={Mail}
                          iconColor="#3b82f6"
                          label="Email"
                          value={user.email || "—"}
                        />
                        <InfoRow
                          icon={Shield}
                          iconColor="#8b5cf6"
                          label="Account Type"
                          value={
                            (user.role || "student").charAt(0).toUpperCase() +
                            (user.role || "student").slice(1)
                          }
                        />
                        {user.grade && (
                          <InfoRow
                            icon={GraduationCap}
                            iconColor="#f59e0b"
                            label="Grade"
                            value={`Grade ${user.grade}`}
                          />
                        )}
                        {user.phone && (
                          <InfoRow
                            icon={Phone}
                            iconColor="#06b6d4"
                            label="Phone"
                            value={user.phone}
                          />
                        )}
                        <InfoRow
                          icon={Calendar}
                          iconColor="#ec4899"
                          label="Member Since"
                          value={new Date().toLocaleDateString("en-KE", {
                            month: "long",
                            year: "numeric",
                          })}
                        />
                      </div>
                    </div>
                    <div
                      className="rounded-2xl p-4 flex items-start gap-3"
                      style={{
                        background: "rgba(59,130,246,0.08)",
                        border: "1px solid rgba(59,130,246,0.20)",
                      }}
                    >
                      <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/50 leading-relaxed">
                        To update your name, email or grade, contact our support
                        team. Profile editing is coming soon.
                      </p>
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* Appearance */}
              {activeTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  <Section
                    title="Appearance"
                    description="Choose how CBC Kenya looks on your device"
                  >
                    <div
                      className="rounded-2xl p-6 space-y-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <ThemeOption
                        label="Light Mode"
                        desc="Clean bright interface — great for daytime studying"
                        icon={Sun}
                        gradient="from-amber-400 to-orange-500"
                        active={theme === "light"}
                        onClick={() => handleThemeChange("light")}
                      />
                      <ThemeOption
                        label="Dark Mode"
                        desc="Easy on the eyes — perfect for night sessions"
                        icon={Moon}
                        gradient="from-indigo-600 to-violet-700"
                        active={theme === "dark"}
                        onClick={() => handleThemeChange("dark")}
                      />
                      <ThemeOption
                        label="System Default"
                        desc="Automatically matches your device settings"
                        icon={Monitor}
                        gradient="from-gray-500 to-gray-700"
                        active={theme === "system"}
                        onClick={() => handleThemeChange("system")}
                      />
                    </div>

                    {/* Live preview */}
                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-xs text-white/30 uppercase tracking-wide font-semibold mb-3">
                        Preview
                      </p>
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        {theme === "light" ? (
                          <div className="bg-white p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-md bg-emerald-600" />
                              <span className="text-gray-900 text-xs font-bold">
                                CBC Kenya
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full mb-2 w-3/4" />
                            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                          </div>
                        ) : (
                          <div
                            className="p-4"
                            style={{ background: "#030712" }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-md bg-emerald-600" />
                              <span className="text-white text-xs font-bold">
                                CBC Kenya
                              </span>
                            </div>
                            <div
                              className="h-2 rounded-full mb-2 w-3/4"
                              style={{ background: "rgba(255,255,255,0.10)" }}
                            />
                            <div
                              className="h-2 rounded-full w-1/2"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/25 mt-3">
                        Changes apply instantly and are saved for your next
                        visit.
                      </p>
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* Subscription */}
              {activeTab === "subscription" && (
                <motion.div
                  key="subscription"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  <Section
                    title="Subscription"
                    description="Manage your CBC Kenya plan"
                  >
                    {isSubscribed ? (
                      <>
                        <div
                          className="rounded-2xl p-6 relative overflow-hidden"
                          style={{
                            background:
                              "linear-gradient(135deg, #065f46, #047857)",
                          }}
                        >
                          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-5 h-5 text-amber-400" />
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                                  Active Plan
                                </span>
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-1">
                                {user.subscription_plan === "yearly"
                                  ? "Yearly Plan"
                                  : "Monthly Plan"}
                              </h3>
                              <p className="text-emerald-200 text-sm">
                                {user.subscription_plan === "yearly"
                                  ? "KES 5,000 / year"
                                  : "KES 500 / month"}
                              </p>
                            </div>
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                              style={{
                                background: "rgba(52,211,153,0.20)",
                                border: "1px solid rgba(52,211,153,0.30)",
                              }}
                            >
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs font-bold text-emerald-300">
                                Active
                              </span>
                            </div>
                          </div>
                          {subExpiry && (
                            <div className="relative mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-emerald-300" />
                              <span className="text-sm text-emerald-200">
                                Renews on{" "}
                                {new Date(subExpiry).toLocaleDateString(
                                  "en-KE",
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          className="rounded-2xl p-5"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <p className="text-xs text-white/30 uppercase tracking-wide font-semibold mb-4">
                            What's included
                          </p>
                          <div className="space-y-3">
                            {[
                              "Unlimited practice questions",
                              "AI-powered marking & feedback",
                              "Full progress analytics",
                              "All subjects — Grades 4–10",
                              "Exam simulation sets",
                              "Priority support",
                            ].map((f) => (
                              <div key={f} className="flex items-center gap-3">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: "rgba(16,185,129,0.20)",
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                </div>
                                <span className="text-sm text-white/70">
                                  {f}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="rounded-2xl p-6"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(245,158,11,0.20)",
                          }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: "rgba(245,158,11,0.20)" }}
                            >
                              <Star className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">
                                Free Trial
                              </h3>
                              <p className="text-xs text-white/40 mt-0.5">
                                Limited access to quizzes
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-white/50 mb-5 leading-relaxed">
                            Subscribe to unlock unlimited quizzes, AI marking,
                            and full analytics.
                          </p>
                          <Link href="/subscribe">
                            <button
                              className="w-full py-3.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all"
                              style={{
                                background:
                                  "linear-gradient(135deg, #f59e0b, #ea580c)",
                              }}
                            >
                              Subscribe — From KES 500/month
                            </button>
                          </Link>
                        </div>

                        <div
                          className="rounded-2xl p-5"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <p className="text-xs text-white/30 uppercase tracking-wide font-semibold mb-4">
                            Plans
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {
                                name: "Monthly",
                                price: "KES 500",
                                period: "/month",
                                highlight: false,
                              },
                              {
                                name: "Yearly",
                                price: "KES 5,000",
                                period: "/year",
                                note: "Save 17%",
                                highlight: true,
                              },
                            ].map((plan) => (
                              <div
                                key={plan.name}
                                className="rounded-xl p-4"
                                style={
                                  plan.highlight
                                    ? {
                                        background: "rgba(245,158,11,0.08)",
                                        border:
                                          "1px solid rgba(245,158,11,0.40)",
                                      }
                                    : {
                                        background: "rgba(255,255,255,0.03)",
                                        border:
                                          "1px solid rgba(255,255,255,0.10)",
                                      }
                                }
                              >
                                <p className="text-xs text-white/40 font-semibold mb-1">
                                  {plan.name}
                                </p>
                                <p className="text-xl font-bold text-white">
                                  {plan.price}
                                </p>
                                <p className="text-xs text-white/30">
                                  {plan.period}
                                </p>
                                {plan.note && (
                                  <p className="text-xs font-bold text-amber-400 mt-1">
                                    {plan.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-white/20 mt-4 text-center">
                            M-Pesa accepted • No credit card needed • Cancel
                            anytime
                          </p>
                        </div>
                      </>
                    )}
                  </Section>
                </motion.div>
              )}

              {/* Account */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  <Section
                    title="Account"
                    description="Manage your account security and data"
                  >
                    <div
                      className="rounded-2xl p-5 flex items-center gap-4"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.20)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)" }}
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">
                          Account Active
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          Your account is in good standing
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-bold">
                          Active
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-xs text-white/30 uppercase tracking-wide font-semibold mb-4">
                        Details
                      </p>
                      <div className="space-y-3">
                        {[
                          [
                            "Account Type",
                            (user.role || "student").charAt(0).toUpperCase() +
                              (user.role || "student").slice(1),
                          ],
                          ["Status", "Active"],
                          [
                            "Member Since",
                            new Date().toLocaleDateString("en-KE", {
                              month: "long",
                              year: "numeric",
                            }),
                          ],
                          [
                            "Subscription",
                            isSubscribed
                              ? user.subscription_plan === "yearly"
                                ? "Yearly"
                                : "Monthly"
                              : "Free Trial",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                          >
                            <span className="text-sm text-white/40">
                              {label}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(239,68,68,0.20)",
                      }}
                    >
                      <p
                        className="text-xs uppercase tracking-wide font-semibold mb-4"
                        style={{ color: "rgba(248,113,113,0.60)" }}
                      >
                        Account Actions
                      </p>
                      <div className="space-y-3">
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={handleLogout}
                          className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-rose-500/10 transition-all group"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(239,68,68,0.15)" }}
                          >
                            <LogOut className="w-4 h-4 text-rose-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-white text-sm">
                              Sign Out
                            </p>
                            <p className="text-xs text-white/30">
                              Log out of this device
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-rose-400 transition-colors" />
                        </motion.button>

                        <button
                          disabled
                          className="w-full flex items-center gap-4 p-4 rounded-xl opacity-40 cursor-not-allowed"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(239,68,68,0.10)" }}
                          >
                            <Lock className="w-4 h-4 text-rose-400/50" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-white/50 text-sm">
                              Delete Account
                            </p>
                            <p className="text-xs text-white/20">
                              Contact support to delete your account
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Support — WhatsApp */}
                    <div
                      className="rounded-2xl p-4 flex items-center justify-between"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Need help?
                          </p>
                          <p className="text-xs text-white/30">
                            Our support team is here for you
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/254717946924?text=${encodeURIComponent("Hi! I need help with my CBC Kenya account.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 hover:opacity-90 transition-all"
                          style={{
                            background:
                              "linear-gradient(135deg, #128C7E, #25D366)",
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp Us
                        </button>
                      </a>
                    </div>
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
