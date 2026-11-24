"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Toast from "@/components/ui/Toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Filter,
  Hash,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Award,
  Users,
  FileText,
  ToggleLeft,
  ToggleRight,
  GraduationCap,
  Layers,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

// ── Quiz export: build a self-contained review document ──────────────────────
// Everything a reviewer needs for a pre-publish health check: each question,
// the correct answer, marking scheme and explanation, with math rendered by
// KaTeX (loaded from CDN when the file is opened) and a Print/Save-as-PDF button.
const _esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Question text/explanations may carry intended <u>/<b> and $math$ - keep those
// but still neutralise script/style so the review doc can't run injected code.
const _rich = (s) =>
  String(s ?? "").replace(/<\s*\/?\s*(script|style|iframe)[^>]*>/gi, "");

function _schemeToText(ms) {
  if (!ms) return "";
  if (typeof ms === "string") return ms.trim();
  try {
    if (Array.isArray(ms?.points)) {
      return ms.points
        .map((p) => `• ${p.description || ""}${p.marks ? ` (${p.marks} mk)` : ""}`)
        .join("\n");
    }
    return JSON.stringify(ms, null, 2);
  } catch {
    return "";
  }
}

function _questionBlockHtml(q, n) {
  const type = (q.question_type || "").replace(/_/g, " ");
  const marks = q.max_marks || 1;
  const letters = ["a", "b", "c", "d"];
  const isMcqLetter = ["A", "B", "C", "D"].includes(
    String(q.correct_answer || "").trim().toUpperCase(),
  );
  const correctLetter = String(q.correct_answer || "").trim().toUpperCase();

  let opts = "";
  if (letters.some((l) => q[`option_${l}`] || q[`option_${l}_image_url`])) {
    opts =
      '<ol class="opts">' +
      letters
        .map((l) => {
          const text = q[`option_${l}`];
          const img = q[`option_${l}_image_url`];
          if (!text && !img) return "";
          const isCorrect = correctLetter === l.toUpperCase();
          return `<li class="${isCorrect ? "correct" : ""}"><b>${l.toUpperCase()}.</b> <span>${_rich(text) || ""}</span>${
            img ? `<br/><img src="${_esc(img)}" alt=""/>` : ""
          }${isCorrect ? ' <span class="tag ok">✓ correct</span>' : ""}</li>`;
        })
        .join("") +
      "</ol>";
  }

  // correct answer line for non-letter answers
  let answerLine = "";
  if (!isMcqLetter && q.correct_answer) {
    answerLine = `<div class="ans"><span class="lbl">Correct answer</span><div class="val">${_rich(q.correct_answer)}</div></div>`;
  } else if (isMcqLetter) {
    const t = q[`option_${correctLetter.toLowerCase()}`];
    answerLine = `<div class="ans"><span class="lbl">Correct answer</span><div class="val">${correctLetter}${t ? ` — ${_rich(t)}` : ""}</div></div>`;
  }

  const scheme = _schemeToText(q.marking_scheme);
  const schemeHtml = scheme
    ? `<div class="ans scheme"><span class="lbl">Marking scheme</span><div class="val">${_esc(scheme)}</div></div>`
    : "";
  const explHtml = q.explanation
    ? `<div class="ans expl"><span class="lbl">Explanation</span><div class="val">${_rich(q.explanation)}</div></div>`
    : "";
  const explImg = q.explanation_image_url
    ? `<div class="ans"><span class="lbl">Explanation diagram</span><div class="val"><img src="${_esc(q.explanation_image_url)}" alt=""/></div></div>`
    : "";

  // multipart parts
  let partsHtml = "";
  if (Array.isArray(q.parts) && q.parts.length) {
    partsHtml =
      '<div class="parts">' +
      q.parts
        .map((p, i) => {
          const pScheme = _schemeToText(p.marking_scheme);
          return `<div class="part"><div class="ptext"><b>(${p.part_label || i + 1})</b> ${_rich(p.question_text)}</div>${
            p.correct_answer
              ? `<div class="ans"><span class="lbl">Answer</span><div class="val">${_rich(p.correct_answer)}</div></div>`
              : ""
          }${
            pScheme
              ? `<div class="ans scheme"><span class="lbl">Scheme</span><div class="val">${_esc(pScheme)}</div></div>`
              : ""
          }${
            p.explanation
              ? `<div class="ans expl"><span class="lbl">Explanation</span><div class="val">${_rich(p.explanation)}</div></div>`
              : ""
          }</div>`;
        })
        .join("") +
      "</div>";
  }

  const passageHtml = q.passage?.content
    ? `<div class="passage"><span class="lbl">Passage</span><div class="val">${_rich(q.passage.content)}</div></div>`
    : "";

  return `<section class="q">
    <div class="qhead">
      <span class="num">Q${n}</span>
      <span class="meta">${_esc(type)} · ${marks} mark${marks !== 1 ? "s" : ""} · ${_esc(q.difficulty || "")}</span>
    </div>
    ${passageHtml}
    <div class="qtext">${_rich(q.question_text)}</div>
    ${q.question_image_url ? `<img class="qimg" src="${_esc(q.question_image_url)}" alt=""/>` : ""}
    ${opts}
    ${partsHtml}
    ${answerLine}
    ${schemeHtml}
    ${explHtml}
    ${explImg}
  </section>`;
}

// Brand images embedded in the file, so the export is branded even offline.
async function _brandImages() {
  const toData = async (path) => {
    try {
      const r = await fetch(path);
      if (!r.ok) return "";
      const svg = await r.text();
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    } catch { return ""; }
  };
  const [logo, qr] = await Promise.all([toData("/brand/symbol.svg"), toData("/brand/qr-stadispace.svg")]);
  return { logo, qr };
}

function _brandHtml(brand) {
  const tile = `<div class="wm-cell">${brand.logo ? `<img src="${brand.logo}" alt=""/>` : ""}<span>StadiSpace</span></div>`;
  return {
    watermark: `<div class="wm" aria-hidden="true"><div class="wm-grid">${tile.repeat(40)}</div></div>`,
    footer: `<footer class="ss-foot">
    ${brand.logo ? `<img class="ss-logo" src="${brand.logo}" alt=""/>` : ""}
    <div class="ss-text">
      <b>StadiSpace · <span class="ss-dom">stadispace.co.ke</span></b><br/>
      For learners: CBE practice quizzes marked instantly · Interactive lessons · Trivia &amp; flash cards · Books &amp; videos<br/>
      Grades 4 - 11 · Call or WhatsApp 0704 699683 / 0717 946 924
    </div>
    ${brand.qr ? `<div class="ss-qr"><span>Scan to<br/>practise</span><img src="${brand.qr}" alt="QR code to stadispace.co.ke"/></div>` : ""}
  </footer>`,
  };
}

function buildQuizExportHtml(data, brand = {}) {
  const b = _brandHtml(brand);
  const questions = (data.questions || [])
    .map((q, i) => _questionBlockHtml(q, i + 1))
    .join("\n");
  const now = new Date().toLocaleString();
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${_esc(data.title)} — review</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: var(--font-sans); color: #1a2233; max-width: 820px; margin: 0 auto; padding: 28px 20px 80px; line-height: 1.6; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #667; font-size: 13px; margin-bottom: 20px; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 10px 0; border-bottom: 1px solid #e6e8ef; margin-bottom: 18px; display: flex; gap: 10px; align-items: center; }
  .toolbar button { background: #4f46e5; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .q { border: 1px solid #e6e8ef; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
  .qhead { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .num { background: #eef2ff; color: #4338ca; font-weight: 800; font-size: 13px; padding: 2px 10px; border-radius: 20px; }
  .meta { color: #7a8095; font-size: 12px; text-transform: capitalize; }
  .qtext { font-size: 15px; font-weight: 600; white-space: pre-wrap; }
  .qimg, .val img { max-width: 100%; border-radius: 8px; margin-top: 8px; display: block; }
  .opts { list-style: none; padding: 0; margin: 12px 0 4px; }
  .opts li { padding: 8px 12px; border: 1px solid #e6e8ef; border-radius: 8px; margin-bottom: 6px; font-size: 14px; }
  .opts li.correct { border-color: #16a34a; background: #f0fdf4; }
  .tag.ok { color: #16a34a; font-weight: 700; font-size: 12px; }
  .ans { margin-top: 10px; }
  .lbl { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; margin-bottom: 3px; }
  .val { white-space: pre-wrap; font-size: 14px; }
  .ans.scheme .val { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; font-family: ui-monospace, monospace; font-size: 13px; }
  .ans.expl .val { color: #374151; }
  .passage .val { background: #f8fafc; border: 1px solid #e6e8ef; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
  .parts { margin-top: 10px; border-left: 3px solid #eef2ff; padding-left: 14px; }
  .part { margin-bottom: 12px; }
  .ptext { font-size: 14px; }
  .wm { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
  .wm-grid { position: absolute; inset: -40%; display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 150px; align-content: space-around; justify-items: center; transform: rotate(-30deg); }
  .wm-cell { display: flex; align-items: center; gap: 10px; opacity: .06; }
  .wm-cell img { width: 48px; height: 48px; }
  .wm-cell span { font-size: 34px; font-weight: 800; color: #111827; letter-spacing: -.02em; }
  .page { position: relative; z-index: 1; }
  .ss-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; margin-top: 36px; padding-top: 10px; border-top: 1px solid #d1d5db; font-size: 10.5px; line-height: 1.5; color: #4b5563; background: #fff; }
  .ss-foot b { color: #111827; } .ss-dom { color: #047857; }
  .ss-logo { width: 32px; height: 32px; flex-shrink: 0; }
  .ss-text { flex: 1; min-width: 0; }
  .ss-qr { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 600; text-align: right; color: #374151; }
  .ss-qr img { width: 56px; height: 56px; }
  @media print {
    .toolbar { display: none; } .q { break-inside: avoid; } body { padding-top: 0; padding-bottom: 30mm; }
    .ss-foot { position: fixed; left: 0; right: 0; bottom: 0; margin: 0; padding: 6px 12mm 6mm; }
  }
</style>
</head><body>
  ${b.watermark}
  <div class="page">
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button><span class="sub" style="margin:0">Pre-publish review copy</span></div>
  <h1>${_esc(data.title)}</h1>
  <div class="sub">Grade ${_esc(data.grade)} · ${_esc(data.subject_name)} · ${_esc((data.quiz_type || "").toString())} · ${data.question_count} questions · ${data.passing_score}% pass<br/>Exported ${_esc(now)}</div>
  ${questions}
  </div>
  ${b.footer}
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
  window.addEventListener('load', function () {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\\\(', right: '\\\\)', display: false },
          { left: '\\\\[', right: '\\\\]', display: true }
        ],
        throwOnError: false
      });
    } catch (e) {}
  });
</script>
</body></html>`;
}

const GRADE_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-fuchsia-500 to-fuchsia-600",
  "from-lime-500 to-lime-600",
  "from-orange-500 to-orange-600",
];

export default function QuizzesManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState({});
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    search: "",
    quiz_type: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(null); // quiz object to delete

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  // Load subjects
  useEffect(() => {
    if (authLoading || !user) return;
    const loadSubjects = async () => {
      try {
        const res = await fetchWithAuth(`${API}/subjects/`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    };
    loadSubjects();
  }, [authLoading, user]);

  // Load quizzes
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.search) params.append("search", filters.search);
    try {
      const res = await fetchWithAuth(
        `${API}/admin/quizzes/?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setQuizzes([]);
      showToast("Failed to load quizzes", "error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchQuizzes();
  }, [authLoading, user, fetchQuizzes]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/quizzes/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
        showToast("Quiz deleted successfully");
      } else {
        showToast("Error deleting quiz", "error");
      }
    } catch (err) {
      showToast("Error deleting quiz", "error");
    }
  };

  const handlePublishToggle = async (id, currentStatus) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/quizzes/${id}/publish/`, {
        method: "POST",
      });
      if (res.ok) {
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, is_active: !q.is_active } : q,
          ),
        );
        showToast(
          `Quiz ${!currentStatus ? "published" : "unpublished"} successfully!`,
        );
      } else {
        showToast("Error updating quiz", "error");
      }
    } catch (err) {
      showToast("Error updating quiz", "error");
    }
  };

  // Group quizzes by grade then subject
  const groupedQuizzes = useMemo(() => {
    let filtered = quizzes;
    if (filters.quiz_type) {
      filtered = filtered.filter((q) => q.quiz_type === filters.quiz_type);
    }
    const grouped = {};
    filtered.forEach((q) => {
      const grade = q.grade || "Unknown";
      if (!grouped[grade]) grouped[grade] = {};
      const subName = q.subject_name || "Uncategorized";
      if (!grouped[grade][subName]) grouped[grade][subName] = [];
      grouped[grade][subName].push(q);
    });
    return grouped;
  }, [quizzes, filters.quiz_type]);

  // Stats
  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.is_active).length;
    const drafts = total - published;
    const totalQuestions = quizzes.reduce(
      (sum, q) => sum + (q.total_questions || 0),
      0,
    );
    return { total, published, drafts, totalQuestions };
  }, [quizzes]);

  // Auto-expand grades on first load
  useEffect(() => {
    if (quizzes.length > 0) {
      setExpandedGrades((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const grades = {};
        Object.keys(groupedQuizzes).forEach((g) => {
          grades[g] = true;
        });
        return grades;
      });
    }
  }, [quizzes, groupedQuizzes]);

  const toggleGrade = (grade) =>
    setExpandedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const sortedGrades = Object.keys(groupedQuizzes).sort((a, b) => a - b);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Quiz?</h3>
              <p className="text-sm text-gray-500 text-center mb-1 font-medium">{confirmDelete.title}</p>
              <p className="text-xs text-gray-400 text-center mb-6">This will permanently remove the quiz and cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleDelete(confirmDelete.id); setConfirmDelete(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition shadow"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quiz Management
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create and organize quizzes from your question bank
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <Link
                  href="/admin/quizzes/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Quiz
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox
              icon={<Layers className="w-5 h-5 text-emerald-600" />}
              bg="bg-emerald-100"
              value={stats.total}
              label="Total Quizzes"
            />
            <StatBox
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              bg="bg-green-100"
              value={stats.published}
              label="Published"
            />
            <StatBox
              icon={<FileText className="w-5 h-5 text-amber-600" />}
              bg="bg-amber-100"
              value={stats.drafts}
              label="Drafts"
            />
            <StatBox
              icon={<Hash className="w-5 h-5 text-blue-600" />}
              bg="bg-blue-100"
              value={stats.totalQuestions}
              label="Total Questions"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-white rounded-xl border p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filters.subject}
                      onChange={(e) =>
                        setFilters({ ...filters, subject: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Learning Areas</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.grade}
                      onChange={(e) =>
                        setFilters({ ...filters, grade: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Grades</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.quiz_type}
                      onChange={(e) =>
                        setFilters({ ...filters, quiz_type: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="topical">Topical</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                  {(filters.subject ||
                    filters.grade ||
                    filters.search ||
                    filters.quiz_type) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">Active:</span>
                      {filters.search && (
                        <FilterTag
                          label={`"${filters.search}"`}
                          color="bg-gray-100 text-gray-700"
                          onRemove={() =>
                            setFilters({ ...filters, search: "" })
                          }
                        />
                      )}
                      {filters.subject && (
                        <FilterTag
                          label={
                            subjects.find((s) => s.id == filters.subject)
                              ?.name || "Subject"
                          }
                          color="bg-blue-100 text-blue-700"
                          onRemove={() =>
                            setFilters({ ...filters, subject: "" })
                          }
                        />
                      )}
                      {filters.grade && (
                        <FilterTag
                          label={`Grade ${filters.grade}`}
                          color="bg-emerald-100 text-emerald-700"
                          onRemove={() => setFilters({ ...filters, grade: "" })}
                        />
                      )}
                      {filters.quiz_type && (
                        <FilterTag
                          label={
                            filters.quiz_type === "topical" ? "Topical" : "Exam"
                          }
                          color="bg-purple-100 text-purple-700"
                          onRemove={() =>
                            setFilters({ ...filters, quiz_type: "" })
                          }
                        />
                      )}
                      <button
                        onClick={() =>
                          setFilters({
                            subject: "",
                            grade: "",
                            search: "",
                            quiz_type: "",
                          })
                        }
                        className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-6 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-24 h-8 bg-gray-200 rounded-lg" />
                    <div className="w-16 h-6 bg-gray-100 rounded" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-48 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl border text-center py-16 px-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No quizzes yet
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {filters.subject || filters.grade || filters.search
                  ? "No quizzes match your current filters."
                  : "Create your first quiz to start testing students."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {(filters.subject || filters.grade || filters.search) && (
                  <button
                    onClick={() =>
                      setFilters({
                        subject: "",
                        grade: "",
                        search: "",
                        quiz_type: "",
                      })
                    }
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  href="/admin/quizzes/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Quiz
                </Link>
              </div>
            </div>
          ) : (
            /* Quizzes Grouped by Grade */
            <div className="space-y-4">
              {sortedGrades.map((grade, gi) => {
                const subjectsInGrade = groupedQuizzes[grade];
                const gradeTotal = Object.values(subjectsInGrade).reduce(
                  (sum, qs) => sum + qs.length,
                  0,
                );
                const isGradeExpanded = expandedGrades[grade] !== false;
                const colorClass = GRADE_COLORS[gi % GRADE_COLORS.length];

                return (
                  <div
                    key={grade}
                    className="bg-white rounded-xl border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGrade(grade)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`bg-linear-to-r ${colorClass} text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm`}
                        >
                          Grade {grade}
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          {gradeTotal} quiz{gradeTotal !== 1 ? "zes" : ""}
                        </span>
                        <span className="text-xs text-gray-400">&bull;</span>
                        <span className="text-sm text-gray-400">
                          {Object.keys(subjectsInGrade).length} learning area
                          {Object.keys(subjectsInGrade).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {isGradeExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isGradeExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t px-4 pb-4">
                            {Object.keys(subjectsInGrade)
                              .sort()
                              .map((subjectName) => (
                                <div key={subjectName} className="mt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    <h3 className="font-semibold text-gray-700 text-sm">
                                      {subjectName}
                                    </h3>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                      {subjectsInGrade[subjectName].length}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjectsInGrade[subjectName].map(
                                      (quiz) => (
                                        <QuizCard
                                          key={quiz.id}
                                          quiz={quiz}
                                          onDelete={(quiz) => setConfirmDelete(quiz)}
                                          onTogglePublish={handlePublishToggle}
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Sub-components ---

function QuizCard({ quiz, onDelete, onTogglePublish }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetchWithAuth(`${API}/admin/quizzes/${quiz.id}/export/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const html = buildQuizExportHtml(data, await _brandImages());
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const safe =
        (data.title || "quiz").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) ||
        "quiz";
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quiz - ${safe}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      alert("Could not export this quiz. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow group relative"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-gray-900 text-sm leading-tight truncate"
            title={quiz.title}
          >
            {quiz.title}
          </h4>
          {quiz.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {quiz.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${quiz.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
        >
          {quiz.is_active ? "Live" : "Draft"}
        </span>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quiz.topic_name && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
            {quiz.topic_name}
          </span>
        )}
        {quiz.quiz_type && (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${quiz.quiz_type === "exam" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
          >
            {quiz.quiz_type === "exam" ? "Exam" : "Topical"}
          </span>
        )}
        {quiz.quiz_type === "exam" && quiz.term && (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
            Term {quiz.term}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span>{quiz.total_questions || 0} Qs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Award className="w-3.5 h-3.5 text-gray-400" />
          <span>{quiz.passing_score}% pass</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/quizzes/${quiz.id}/preview`}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/quizzes/${quiz.id}/edit`}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
            title="Export for review (downloads a printable copy with answers)"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(quiz)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => onTogglePublish(quiz.id, quiz.is_active)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            quiz.is_active
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {quiz.is_active ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              Unpublish
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Publish
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, bg, value, label }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterTag({ label, color, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${color}`}
    >
      {label}
      <button onClick={onRemove}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
