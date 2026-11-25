"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Plus, X, Save, Search, Pencil, Hash, BarChart2, CheckCircle2,
  AlertCircle, Loader2, ChevronUp, ChevronDown, FileQuestion,
} from "lucide-react";
import QuizTabs from "@/components/admin/QuizTabs";
import QuestionEditModal from "@/components/admin/QuestionEditModal";
import { CurriculumChips, GRADES, StrandPicker, strandLabel, useKicdStrands } from "@/components/admin/kicd";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

const TYPE_LABELS = {
  mcq: "MCQ", fill_blank: "Fill Blank", math: "Math", structured: "Structured",
  essay: "Essay", table: "Table", multipart: "Multipart", financial_statement: "Financial Stmt",
};
const TYPE_COLORS = {
  mcq: "bg-blue-100 text-blue-700", fill_blank: "bg-purple-100 text-purple-700",
  math: "bg-indigo-100 text-indigo-700", structured: "bg-teal-100 text-teal-700",
  essay: "bg-pink-100 text-pink-700", table: "bg-orange-100 text-orange-700",
  multipart: "bg-violet-100 text-violet-700", financial_statement: "bg-emerald-100 text-emerald-700",
};
const DIFF_COLORS = {
  easy: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", hard: "bg-red-100 text-red-700",
};

const field = "w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400";
const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
const filterCls = "border-2 border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-gray-700 min-w-0";

function QuestionText({ text }) {
  return <span className="font-medium text-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: text || "" }} />;
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast.visible, onClose]);
  if (!toast.visible) return null;
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
      {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100" aria-label="Close"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const showToast = (message, type = "success") => setToast({ visible: true, message, type });
  const closeToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // Question bank, filtered like the Create flow: this quiz's learning area,
  // a grade, then KICD strand -> sub-strand.
  const [bank, setBank] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [fGrade, setFGrade] = useState("");
  const [fStrand, setFStrand] = useState({ topic: "", substrand: "" });
  const [fType, setFType] = useState("");
  const [fDiff, setFDiff] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const strands = useKicdStrands(form?.subject, form?.grade);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (!ALLOWED_ROLES.includes(user.role) && !user.is_staff && !user.is_superuser) { router.replace("/dashboard"); return; }
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/admin/quizzes/${params.id}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setQuiz(data);
        setSelected(data.questions || []);
        setForm({
          title: data.title || "",
          description: data.description || "",
          grade: data.grade ? String(data.grade) : "",
          subject: data.subject ? String(data.subject) : "",
          topic: data.topic ? String(data.topic) : "",
          quiz_type: data.quiz_type || "topical",
          term: data.term ?? "",
          set_number: data.set_number ?? "",
          duration_minutes: data.duration_minutes ?? 30,
          passing_score: data.passing_score ?? 50,
          is_active: data.is_active ?? true,
          owner_type: data.owner_type || "admin",
          available_to_teachers: data.available_to_teachers ?? false,
        });
        setFGrade(data.grade ? String(data.grade) : "");
        setFStrand({ topic: data.topic ? String(data.topic) : "", substrand: "" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, params.id, router]);

  useEffect(() => {
    fetch(`${API}/subjects/`)
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  // Load the bank whenever a filter changes (search is debounced).
  useEffect(() => {
    if (!form?.subject || !fGrade) return;
    const t = setTimeout(() => {
      const token = localStorage.getItem("accessToken");
      const p = new URLSearchParams({ subject: form.subject, grade: fGrade, page_size: 500 });
      if (fStrand.topic) p.set("topic", fStrand.topic);
      if (fStrand.substrand) p.set("substrand", fStrand.substrand);
      if (fType) p.set("type", fType);
      if (fDiff) p.set("difficulty", fDiff);
      if (search.trim()) p.set("search", search.trim());
      setBankLoading(true);
      fetch(`${API}/admin/questions/manage/?${p}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setBank(Array.isArray(d) ? d : d.results || []))
        .catch(() => setBank([]))
        .finally(() => setBankLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [form?.subject, fGrade, fStrand, fType, fDiff, search]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const setF = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const selectedIds = useMemo(() => new Set(selected.map((q) => q.id)), [selected]);
  const add = (q) => { if (!selectedIds.has(q.id)) { setSelected((s) => [...s, q]); setDirty(true); } };
  const addAll = () => { setSelected((s) => [...s, ...bank.filter((q) => !selectedIds.has(q.id))]); setDirty(true); };
  const remove = (id) => { setSelected((s) => s.filter((q) => q.id !== id)); setDirty(true); };
  const move = (i, d) => {
    setSelected((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setDirty(true);
  };

  const onQuestionSaved = (updated) => {
    setSelected((s) => s.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setBank((b) => b.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setEditing(null);
    showToast("Question updated");
  };

  const save = async () => {
    if (!form.title.trim() || !form.subject || !form.grade) {
      showToast("Title, learning area and grade are required", "error");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("accessToken");
    const exam = form.quiz_type === "exam";
    const payload = {
      title: form.title.trim(),
      description: form.description,
      grade: Number(form.grade),
      subject: Number(form.subject),
      topic: form.topic ? Number(form.topic) : null,
      quiz_type: form.quiz_type,
      term: exam && form.term !== "" ? Number(form.term) : null,
      set_number: exam && form.set_number !== "" ? Number(form.set_number) : null,
      duration_minutes: Number(form.duration_minutes) || 0,
      passing_score: Number(form.passing_score),
      is_active: form.is_active,
      owner_type: form.owner_type,
      available_to_teachers: form.available_to_teachers,
      question_ids: selected.map((q) => q.id),
    };
    try {
      const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDirty(false);
        setQuiz((q) => ({ ...q, title: payload.title, grade: payload.grade }));
        showToast(`Saved - ${selected.length} question${selected.length !== 1 ? "s" : ""}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || Object.values(err).flat().join(" ") || "Couldn't save the quiz", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!quiz || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Quiz not found</h2>
          <p className="text-gray-500 text-sm mb-6">It may have been deleted.</p>
          <Link href="/admin/quizzes" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm">Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  const subjectName = subjects.find((s) => String(s.id) === form.subject)?.name || quiz.subject_name;
  const quizStrand = strands.find((t) => String(t.id) === form.topic);
  const legacyStrand = form.topic && strands.length > 0 && !quizStrand;
  const totalMarks = selected.reduce((sum, q) => sum + (q.max_marks || 1), 0);
  const noSub = selected.filter((q) => !q.substrand).length;
  const exam = form.quiz_type === "exam";

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} onClose={closeToast} />
      {editing && <QuestionEditModal question={editing} onClose={() => setEditing(null)} onSaved={onQuestionSaved} />}

      {/* ── Header ── */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link href="/admin/quizzes" className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{form.title || "Untitled quiz"}</h1>
              <p className="text-indigo-200 mt-1 text-sm">
                {subjectName} · Grade {form.grade}
                {quizStrand ? ` · ${strandLabel(quizStrand)}` : exam ? " · Exam (several strands)" : ""}
              </p>
              <div className="mt-4"><QuizTabs id={params.id} active="edit" /></div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {dirty && <span className="text-xs font-semibold text-amber-200">Unsaved changes</span>}
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:bg-indigo-50 disabled:opacity-60 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── 1. Quiz details ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
            Quiz details
          </h2>

          <div className="grid grid-cols-1 gap-4 mb-5">
            <div>
              <label className={label}>Title <span className="text-red-500">*</span></label>
              <input type="text" className={`${field} font-medium`} value={form.title} onChange={(e) => setF({ title: e.target.value })} placeholder="e.g. Grade 7 Mathematics - Numbers" />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea rows={2} className={`${field} resize-none`} value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="What this quiz covers (optional)" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className={label}>Learning area <span className="text-red-500">*</span></label>
              <select className={field} value={form.subject} onChange={(e) => { setF({ subject: e.target.value, topic: "" }); setFStrand({ topic: "", substrand: "" }); }}>
                <option value="">- Select learning area -</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Grade <span className="text-red-500">*</span></label>
              <select className={field} value={form.grade} onChange={(e) => { setF({ grade: e.target.value, topic: "" }); setFGrade(e.target.value); setFStrand({ topic: "", substrand: "" }); }}>
                <option value="">- Select grade -</option>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>KICD strand {exam ? "(optional for exams)" : ""}</label>
              <select className={field} value={form.topic}
                onChange={(e) => { setF({ topic: e.target.value }); setFStrand({ topic: e.target.value, substrand: "" }); }}
                disabled={!form.subject || !form.grade}>
                <option value="">{exam ? "- Several strands -" : "- Select strand -"}</option>
                {legacyStrand && <option value={form.topic}>⚠ {quiz.topic_name} (not a KICD strand)</option>}
                {strands.map((t) => <option key={t.id} value={t.id}>{strandLabel(t)}</option>)}
              </select>
              {legacyStrand && <p className="text-xs text-amber-600 mt-1">This quiz is on an old strand. Pick the matching KICD strand.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div className="col-span-2">
              <label className={label}>Quiz type</label>
              <div className="grid grid-cols-2 gap-2">
                {[["topical", "Topical quiz"], ["exam", "Exam / test"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setF({ quiz_type: v })}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold ${form.quiz_type === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`}>{l}</button>
                ))}
              </div>
            </div>
            {exam && (
              <>
                <div>
                  <label className={label}>Term</label>
                  <select className={field} value={form.term} onChange={(e) => setF({ term: e.target.value })}>
                    <option value="">- None -</option>
                    {[1, 2, 3].map((t) => <option key={t} value={t}>Term {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Set number</label>
                  <input type="number" min="1" className={field} value={form.set_number} onChange={(e) => setF({ set_number: e.target.value })} placeholder="e.g. 1" />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className={label}>Time limit (minutes)</label>
              <input type="number" min="0" className={field} value={form.duration_minutes} onChange={(e) => setF({ duration_minutes: e.target.value })} />
              <p className="text-[11px] text-gray-400 mt-1">0 = no limit</p>
            </div>
            <div>
              <label className={label}>Pass mark (%)</label>
              <input type="number" min="0" max="100" className={field} value={form.passing_score} onChange={(e) => setF({ passing_score: e.target.value })} />
              <p className="text-[11px] text-gray-400 mt-1">&nbsp;</p>
            </div>
            {[
              ["is_active", "Students", "Visible to students"],
              ["available_to_teachers", "Teachers", "In the teachers' library"],
            ].map(([k, l, d]) => (
              <label key={k} className={`flex items-center gap-3 cursor-pointer px-4 py-3 border-2 rounded-xl mb-5 ${form[k] ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}>
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={!!form[k]} onChange={(e) => setF({ [k]: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold text-gray-700">{l}</span>
                  <span className="block text-xs text-gray-400">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── 2. Questions ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question bank */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-w-0">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                  Question bank
                </h2>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {bankLoading ? "Loading…" : `${bank.length} found`}
                </span>
              </div>
              <p className="text-xs text-gray-500">{subjectName}. Narrow it down by grade, KICD strand and sub-strand.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={fGrade} onChange={(e) => { setFGrade(e.target.value); setFStrand({ topic: "", substrand: "" }); }}
                  className={`${filterCls} ${fGrade !== form.grade ? "!border-amber-400 bg-amber-50 text-amber-800 font-semibold" : ""}`} aria-label="Grade">
                  {GRADES.map((g) => <option key={g} value={g}>Grade {g}{String(g) === form.grade ? " (this quiz)" : ""}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select value={fType} onChange={(e) => setFType(e.target.value)} className={filterCls} aria-label="Question type">
                    <option value="">All types</option>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select value={fDiff} onChange={(e) => setFDiff(e.target.value)} className={filterCls} aria-label="Difficulty">
                    <option value="">All levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <StrandPicker subject={form.subject} grade={fGrade} value={fStrand} onChange={setFStrand}
                  legacyName={quiz.topic_name} className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2" selectCls={filterCls} />
              </div>
              {bank.some((q) => !selectedIds.has(q.id)) && (
                <button onClick={addAll} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100">
                  Add all {bank.filter((q) => !selectedIds.has(q.id)).length} shown
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[560px] px-3 py-2">
              {bankLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              ) : bank.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileQuestion className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No questions match these filters.</p>
                  <Link href="/admin/questions" className="text-xs text-indigo-600 font-semibold mt-2 inline-block">Write questions →</Link>
                </div>
              ) : (
                bank.map((q) => {
                  const inQuiz = selectedIds.has(q.id);
                  return (
                    <div key={q.id} className={`p-3 rounded-xl my-1 ${inQuiz ? "bg-gray-50 opacity-60" : "hover:bg-indigo-50/50"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <QuestionText text={q.question_text} />
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <CurriculumChips q={q} />
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}>{TYPE_LABELS[q.question_type] || q.question_type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "bg-gray-100 text-gray-500"}`}>{q.difficulty}</span>
                            {q.max_marks && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">{q.max_marks} mk{q.max_marks !== 1 ? "s" : ""}</span>}
                            {(q.in_quizzes || []).filter((qz) => String(qz.id) !== String(params.id)).slice(0, 2).map((qz) => (
                              <span key={qz.id} className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-medium max-w-[140px] truncate" title={`Also in: ${qz.title}`}>
                                Also in: {qz.title}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditing(q)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit question" aria-label="Edit question">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => add(q)} disabled={inQuiz}
                            className={`p-1.5 rounded-lg ${inQuiz ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"}`}
                            title={inQuiz ? "Already in this quiz" : "Add to quiz"} aria-label="Add to quiz">
                            {inQuiz ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* In this quiz */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-w-0">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">In this quiz</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1"><Hash className="w-3 h-3" />{totalMarks} marks</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full flex items-center gap-1"><BarChart2 className="w-3 h-3" />{selected.length}</span>
                </div>
              </div>
              {noSub > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                  {noSub} question{noSub !== 1 ? "s have" : " has"} no KICD sub-strand yet. Use <Pencil className="w-3 h-3 inline" /> to file {noSub !== 1 ? "them" : "it"}.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[560px] px-3 py-2">
              {selected.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No questions yet</p>
                  <p className="text-xs mt-1">Add them from the question bank.</p>
                </div>
              ) : (
                <ol className="space-y-2 py-1">
                  {selected.map((q, i) => (
                    <li key={q.id} className="flex items-start gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl hover:border-indigo-400">
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                        <span className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">{i + 1}</span>
                        <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <QuestionText text={q.question_text} />
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          <CurriculumChips q={q} />
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}>{TYPE_LABELS[q.question_type] || q.question_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "bg-gray-100 text-gray-500"}`}>{q.difficulty}</span>
                          {q.max_marks && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">{q.max_marks} mk{q.max_marks !== 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditing(q)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-blue-600" title="Edit question" aria-label="Edit question"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(q.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-white hover:text-red-600" title="Remove from quiz" aria-label="Remove from quiz"><X className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={save} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
