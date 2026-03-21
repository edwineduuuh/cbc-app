"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Bell,
  Shield,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
  GraduationCap,
  Mail,
  Phone,
  Trash2,
  Save,
  Camera,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-gray-900 mb-1">Settings</h1>
          <p className="text-gray-500 text-sm">
            Manage your account preferences
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            {/* Avatar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 text-center">
              <div className="relative inline-block mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl mx-auto">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              <p className="font-bold text-gray-900 text-sm">{user.username}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-1 rounded-full text-xs font-semibold">
                <GraduationCap className="w-3 h-3" />
                Grade {user.grade || "—"}
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {SECTIONS.map((section, i) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isDanger = section.id === "danger";
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all ${
                      i < SECTIONS.length - 1 ? "border-b border-gray-50" : ""
                    } ${
                      isActive
                        ? isDanger
                          ? "bg-red-50 text-red-600"
                          : "bg-teal-50 text-teal-700"
                        : isDanger
                          ? "text-red-500 hover:bg-red-50"
                          : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {section.label}
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeSection === "profile" && (
                  <ProfileSection user={user} showToast={showToast} />
                )}
                {activeSection === "password" && (
                  <PasswordSection showToast={showToast} />
                )}
                {activeSection === "notifications" && (
                  <NotificationsSection showToast={showToast} />
                )}
                {activeSection === "security" && (
                  <SecuritySection user={user} />
                )}
                {activeSection === "danger" && (
                  <DangerSection
                    logout={logout}
                    router={router}
                    showToast={showToast}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────
function ProfileSection({ user, showToast }) {
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    grade: user.grade || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/auth/auth/me/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast("Profile updated successfully");
      } else {
        showToast("Failed to update profile", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-gray-900 text-lg mb-1">
        Profile Information
      </h2>
      <p className="text-gray-500 text-sm mb-6">Update your personal details</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              First Name
            </label>
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Grace"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Last Name
            </label>
            <input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Wanjiru"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Username
          </label>
          <input
            value={user.username}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">
            Username cannot be changed
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Grade Level
          </label>
          <select
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-gray-50 focus:bg-white transition-all"
          >
            <option value="">Select grade</option>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 transition-all"
          style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Password Section ──────────────────────────────────────────
function PasswordSection({ showToast }) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (form.new_password !== form.confirm_password) {
      showToast("Passwords don't match", "error");
      return;
    }
    if (form.new_password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/auth/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: form.current_password,
          new_password: form.new_password,
        }),
      });
      if (res.ok) {
        showToast("Password changed successfully");
        setForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to change password", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ field, label, placeholder }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show[field] ? "text" : "password"}
          value={form[field]}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-gray-50 focus:bg-white transition-all"
        />
        <button
          type="button"
          onClick={() => setShow({ ...show, [field]: !show[field] })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show[field] ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-gray-900 text-lg mb-1">Change Password</h2>
      <p className="text-gray-500 text-sm mb-6">
        Choose a strong password to keep your account secure
      </p>

      <div className="space-y-4">
        <PasswordInput
          field="current"
          label="Current Password"
          placeholder="Enter current password"
        />
        <PasswordInput
          field="new"
          label="New Password"
          placeholder="Min. 8 characters"
        />
        <PasswordInput
          field="confirm"
          label="Confirm New Password"
          placeholder="Re-enter new password"
        />
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-xl">
        <p className="text-xs text-blue-700 font-medium">Password tips:</p>
        <ul className="text-xs text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
          <li>At least 8 characters long</li>
          <li>Mix of letters, numbers, and symbols</li>
          <li>Avoid using your name or birthday</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Update Password
        </button>
      </div>
    </div>
  );
}

// ─── Notifications Section ────────────────────────────────────
function NotificationsSection({ showToast }) {
  const [prefs, setPrefs] = useState({
    email_results: true,
    email_tips: false,
    sms_payment: true,
    sms_reminders: false,
  });

  const toggle = (key) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
    showToast("Preference saved");
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-teal-500" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );

  const items = [
    {
      key: "email_results",
      icon: Mail,
      label: "Quiz Results",
      desc: "Get an email summary after completing quizzes",
    },
    {
      key: "email_tips",
      icon: Mail,
      label: "Study Tips",
      desc: "Weekly study tips and content updates",
    },
    {
      key: "sms_payment",
      icon: Phone,
      label: "Payment Confirmations",
      desc: "SMS when your subscription is activated",
    },
    {
      key: "sms_reminders",
      icon: Phone,
      label: "Study Reminders",
      desc: "Daily SMS reminders to practice",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-gray-900 text-lg mb-1">Notifications</h2>
      <p className="text-gray-500 text-sm mb-6">
        Choose how you want to be notified
      </p>

      <div className="space-y-1">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center justify-between py-4 ${i < items.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
              <Toggle
                checked={prefs[item.key]}
                onChange={() => toggle(item.key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Security Section ─────────────────────────────────────────
function SecuritySection({ user }) {
  const sessions = [
    {
      device: "Chrome on Windows",
      location: "Nairobi, Kenya",
      current: true,
      time: "Now",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-1">
          Account Security
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Monitor your account activity
        </p>

        <div className="space-y-3">
          {[
            { label: "Account Created", value: "Active" },
            { label: "Last Login", value: "Today" },
            { label: "Account Type", value: user.role || "Student" },
            { label: "2FA", value: "Not enabled" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-4">
          Active Sessions
        </h3>
        {sessions.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {s.device}
                </p>
                <p className="text-xs text-gray-400">
                  {s.location} · {s.time}
                </p>
              </div>
            </div>
            {s.current && (
              <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                Current
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────
function DangerSection({ logout, router, showToast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Danger Zone</h2>
        <p className="text-gray-500 text-sm mb-6">
          Irreversible actions — proceed with caution
        </p>

        {/* Sign out all devices */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Sign Out</p>
              <p className="text-xs text-gray-400">Sign out of your account</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-bold text-orange-600 border-2 border-orange-200 hover:bg-orange-50 transition-all"
          >
            Sign Out
          </button>
        </div>

        {/* Delete Account */}
        <div className="p-4 bg-red-50 border-2 border-red-100 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-900">
                Delete Account
              </p>
              <p className="text-xs text-red-500">
                Permanently delete your account and all data
              </p>
            </div>
          </div>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-red-600 border-2 border-red-200 hover:bg-red-100 transition-all"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-700 font-medium">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-2.5 border-2 border-red-200 rounded-xl text-sm focus:border-red-500 focus:outline-none bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteText("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 border-2 border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteText !== "DELETE"}
                  onClick={() =>
                    showToast(
                      "Account deletion requires contacting support",
                      "error",
                    )
                  }
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 disabled:opacity-40 hover:bg-red-700 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
