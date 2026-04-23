"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import AdminNavigation from "@/components/AdminNavigation";
import Toast from "@/components/ui/Toast";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  Sparkles,
  BookOpen,
  Lightbulb,
  Quote,
  Filter,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Eye,
  EyeOff,
  Heart,
  Star,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

const CONTENT_TYPES = [
  {
    value: "quote",
    label: "Quote",
    icon: Quote,
    color: "amber",
    emoji: "\u2728",
  },
  {
    value: "story",
    label: "Story",
    icon: BookOpen,
    color: "indigo",
    emoji: "\ud83d\udcd6",
  },
  {
    value: "tip",
    label: "Tip",
    icon: Lightbulb,
    color: "emerald",
    emoji: "\ud83d\udca1",
  },
];

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "exam", label: "Exam Motivation" },
  { value: "study", label: "Study Tips" },
  { value: "life", label: "Life Skills" },
  { value: "success", label: "Success Stories" },
];

const TYPE_STYLES = {
  quote: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-500",
    ring: "ring-amber-200",
  },
  story: {
    bg: "bg-gradient-to-br from-indigo-50 to-purple-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
    icon: "text-indigo-500",
    ring: "ring-indigo-200",
  },
  tip: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-500",
    ring: "ring-emerald-200",
  },
};

const CATEGORY_BADGES = {
  general: "bg-gray-100 text-gray-600",
  exam: "bg-rose-100 text-rose-600",
  study: "bg-blue-100 text-blue-600",
  life: "bg-purple-100 text-purple-600",
  success: "bg-emerald-100 text-emerald-600",
};

// ─── Empty form ──────────────────────────────────────
const BLANK = {
  content_type: "quote",
  category: "general",
  title: "",
  preview: "",
  text: "",
  author: "",
  is_active: true,
  grade_min: 4,
  grade_max: 12,
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function MotivationalAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  /* ── Data ── */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── UI state ── */
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  /* ── Editor ── */
  const [editing, setEditing] = useState(null); // null = closed, "new" = create, {item} = edit
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  /* ── Delete confirm ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (
      !authLoading &&
      (!user || (!user.is_staff && !ALLOWED_ROLES.includes(user.role)))
    ) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  /* ── Fetch all items ── */
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API}/admin/motivational/`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.results || []);
      } else {
        console.error(
          "Motivational fetch failed:",
          res.status,
          await res.text().catch(() => ""),
        );
      }
    } catch (err) {
      console.error("Motivational fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchItems();
  }, [user, fetchItems]);

  /* ── Toast helper ── */
  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  /* ── Save (create / update) ── */
  const handleSave = async () => {
    if (!form.text.trim()) {
      showToast("Content text is required", "error");
      return;
    }
    setSaving(true);
    try {
      const isNew = editing === "new";
      const url = isNew
        ? `${API}/admin/motivational/`
        : `${API}/admin/motivational/${editing.id}/`;
      const res = await fetchWithAuth(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(isNew ? "Content added!" : "Content updated!");
        setEditing(null);
        setForm({ ...BLANK });
        fetchItems();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Something went wrong", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(
        `${API}/admin/motivational/${deleteTarget.id}/`,
        {
          method: "DELETE",
        },
      );
      if (res.ok || res.status === 204) {
        showToast("Deleted!");
        setDeleteTarget(null);
        fetchItems();
      } else {
        showToast("Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Toggle active ── */
  const toggleActive = async (item) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/motivational/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (res.ok) {
        showToast(
          item.is_active ? "Hidden from students" : "Now visible to students!",
        );
        fetchItems();
      }
    } catch {
      showToast("Failed to toggle", "error");
    }
  };

  /* ── Open editor ── */
  const openCreate = () => {
    setForm({ ...BLANK });
    setEditing("new");
  };

  const openEdit = (item) => {
    setForm({
      content_type: item.content_type,
      category: item.category,
      title: item.title || "",
      preview: item.preview || "",
      text: item.text,
      author: item.author || "",
      is_active: item.is_active,
      grade_min: item.grade_min,
      grade_max: item.grade_max,
    });
    setEditing(item);
  };

  /* ── Filtered items ── */
  const filtered = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const hit =
        item.text.toLowerCase().includes(q) ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.author || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (filterType && item.content_type !== filterType) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    if (!showInactive && !item.is_active) return false;
    return true;
  });

  /* ── Stats ── */
  const stats = {
    total: items.length,
    active: items.filter((i) => i.is_active).length,
    quotes: items.filter((i) => i.content_type === "quote").length,
    stories: items.filter((i) => i.content_type === "story").length,
    tips: items.filter((i) => i.content_type === "tip").length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <Toast
        {...toast}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Motivational Content
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Add quotes, stories &amp; tips that inspire your students
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            Add New
          </motion.button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, emoji: "\ud83d\udcca" },
            { label: "Active", value: stats.active, emoji: "\u2705" },
            { label: "Quotes", value: stats.quotes, emoji: "\u2728" },
            { label: "Stories", value: stats.stories, emoji: "\ud83d\udcd6" },
            { label: "Tips", value: stats.tips, emoji: "\ud83d\udca1" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center shadow-sm"
            >
              <div className="text-lg">{s.emoji}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[11px] text-gray-400 font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All Types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              showInactive
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {showInactive ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {showInactive ? "Showing All" : "Active Only"}
          </button>
        </div>

        {/* ── Content cards ── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">
              {items.length === 0 ? "\ud83c\udf1f" : "\ud83d\udd0d"}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {items.length === 0 ? "No content yet" : "No matches"}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {items.length === 0
                ? "Add your first motivational quote, story or tip!"
                : "Try adjusting your filters"}
            </p>
            {items.length === 0 && (
              <button
                onClick={openCreate}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors"
              >
                Add Your First
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => {
                const style =
                  TYPE_STYLES[item.content_type] || TYPE_STYLES.quote;
                const typeInfo = CONTENT_TYPES.find(
                  (t) => t.value === item.content_type,
                );
                const catInfo = CATEGORIES.find(
                  (c) => c.value === item.category,
                );

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`${style.bg} border ${style.border} rounded-2xl p-5 group transition-shadow hover:shadow-md ${
                      !item.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Type emoji */}
                      <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                        {typeInfo?.emoji || "\u2728"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}
                          >
                            {typeInfo?.label || item.content_type}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_BADGES[item.category] || CATEGORY_BADGES.general}`}
                          >
                            {catInfo?.label || item.category}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Grades {item.grade_min}\u2013{item.grade_max}
                          </span>
                          {!item.is_active && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              Hidden
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-sm text-gray-800 leading-relaxed ${
                            item.content_type === "quote" ? "italic" : ""
                          }`}
                        >
                          {item.content_type === "quote" && "\u201C"}
                          {item.text}
                          {item.content_type === "quote" && "\u201D"}
                        </p>

                        {item.author && (
                          <p className="text-xs text-gray-500 mt-2 font-medium">
                            \u2014 {item.author}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleActive(item)}
                          title={
                            item.is_active
                              ? "Hide from students"
                              : "Show to students"
                          }
                          className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                        >
                          {item.is_active ? (
                            <Eye className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ────────────────────────────────── EDITOR MODAL ── */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => {
              setEditing(null);
              setForm({ ...BLANK });
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {editing === "new" ? "Add New Content" : "Edit Content"}
                </h2>
                <button
                  onClick={() => {
                    setEditing(null);
                    setForm({ ...BLANK });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-5">
                {/* Type selector — big buttons */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTENT_TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = form.content_type === t.value;
                      const s = TYPE_STYLES[t.value];
                      return (
                        <button
                          key={t.value}
                          onClick={() =>
                            setForm({ ...form, content_type: t.value })
                          }
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            active
                              ? `${s.bg} ${s.border} ${s.ring} ring-2`
                              : "border-gray-100 hover:border-gray-200 bg-white"
                          }`}
                        >
                          <span className="text-xl">{t.emoji}</span>
                          <span
                            className={`text-xs font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}
                          >
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const active = form.category === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() =>
                            setForm({ ...form, category: c.value })
                          }
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                            active
                              ? `${CATEGORY_BADGES[c.value]} border-transparent font-semibold`
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Title{" "}
                    <span className="text-gray-300 normal-case">(shown on the card)</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Anger Management, Saving Money..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>

                {/* Preview */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Preview{" "}
                    <span className="text-gray-300 normal-case">(short teaser on the card)</span>
                  </label>
                  <textarea
                    value={form.preview}
                    onChange={(e) => setForm({ ...form, preview: e.target.value })}
                    rows={2}
                    placeholder="A short sentence or two that draws the reader in..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
                  />
                </div>

                {/* Text */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Full Content{" "}
                    {form.content_type === "quote"
                      ? "(the quote)"
                      : form.content_type === "story"
                        ? "(the story)"
                        : "(the tip)"}
                  </label>
                  <textarea
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    rows={form.content_type === "story" ? 6 : 3}
                    placeholder={
                      form.content_type === "quote"
                        ? "Education is the most powerful weapon..."
                        : form.content_type === "story"
                          ? "Once upon a time in a small village in Kenya..."
                          : "Start with the hardest subject first..."
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Author / Source{" "}
                    <span className="text-gray-300 normal-case">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) =>
                      setForm({ ...form, author: e.target.value })
                    }
                    placeholder="Nelson Mandela, Kenyan Proverb, Teacher Edwin..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>

                {/* Grade range */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Who sees this?{" "}
                    <span className="text-gray-300 normal-case">
                      Grade {form.grade_min} to {form.grade_max}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={form.grade_min}
                      onChange={(e) =>
                        setForm({ ...form, grade_min: Number(e.target.value) })
                      }
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-200"
                    >
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400 text-sm font-medium">
                      to
                    </span>
                    <select
                      value={form.grade_max}
                      onChange={(e) =>
                        setForm({ ...form, grade_max: Number(e.target.value) })
                      }
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-200"
                    >
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Visible to students
                    </p>
                    <p className="text-xs text-gray-400">
                      Toggle off to save as draft
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setForm({ ...form, is_active: !form.is_active })
                    }
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      form.is_active ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <motion.div
                      layout
                      className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                      style={{
                        left: form.is_active ? "calc(100% - 26px)" : "2px",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  onClick={() => {
                    setEditing(null);
                    setForm({ ...BLANK });
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.text.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editing === "new" ? "Add Content" : "Save Changes"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="text-4xl mb-3">{"\ud83d\uddd1\ufe0f"}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete this?
              </h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                &ldquo;{deleteTarget.text.slice(0, 80)}
                {deleteTarget.text.length > 80 ? "..." : ""}&rdquo;
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
