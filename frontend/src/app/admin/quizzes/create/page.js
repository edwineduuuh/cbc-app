"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Clock, Award, Check, X, Sparkles,
  Search, Filter, ChevronDown, Loader2, AlertCircle, CheckCircle2,
  FileQuestion, Hash, BarChart2, Tag,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const TYPE_LABELS = {
  mcq: "MCQ", fill_blank: "Fill Blank", math: "Math",
  structured: "Structured", essay: "Essay", table: "Table", multipart: "Multipart",
};
const TYPE_COLORS = {
  mcq: "bg-blue-100 text-blue-700",
  fill_blank: "bg-purple-100 text-purple-700",
  math: "bg-indigo-100 text-indigo-700",
  structured: "bg-teal-100 text-teal-700",
  essay: "bg-pink-100 text-pink-700",
  table: "bg-orange-100 text-orange-700",
  multipart: "bg-violet-100 text-violet-700",
};
const DIFF_COLORS = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

function Toast({ show, message, type, onClose }) {
  useEffect(() => {
    if (show) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [show, onClose]);
  if (!show) return null;
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm transition-all ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
      {type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
      {message}
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-indigo-100">
      <div className="flex items-center gap-4">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3 flex-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow ${
              step > s ? "bg-green-500 text-white" : step === s ? "bg-indigo-600 text-white ring-4 ring-indigo-200" : "bg-gray-200 text-gray-500"
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <div>
              <p className={`text-sm font-semibold ${step >= s ? "text-gray-900" : "text-gray-400"}`}>
                {s === 1 ? "Quiz Details" : "Pick Questions"}
              </p>
              <p className="text-xs text-gray-400">{s === 1 ? "Title, grade, settings" : "Select from your bank"}</p>
            </div>
            {s < 2 && (
              <div className="flex-1 h-1 rounded-full bg-gray-200 mx-2">
                <div className={`h-full rounded-full bg-indigo-500 transition-all duration-500 ${step > s ? "w-full" : "w-0"}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateQuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role) && !user.is_staff && !user.is_superuser) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // ── Toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => setToast({ show: true, message, type });

  // ── Step 1 state ───────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [quizType, setQuizType] = useState("topical");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [isB2C, setIsB2C] = useState(true);
  const [availableToTeachers, setAvailableToTeachers] = useState(true);
  const [description, setDescription] = useState("");

  // ── Step 2 state ───────────────────────────────────────────────
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`${API}/subjects/`)
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  // Load topics when subject+filterGrade changes (step 2)
  useEffect(() => {
    if (!subject || !filterGrade) { setTopics([]); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    fetch(`${API}/admin/topics/?subject=${subject}&grade=${filterGrade}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, [subject, filterGrade]);

  // Load questions when step 2 is reached (or filters change)
  useEffect(() => {
    if (step !== 2 || !subject || !filterGrade) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setLoadingQ(true);
    const params = new URLSearchParams({ subject, grade: filterGrade, page_size: 500 });
    if (filterTopic) params.set("topic", filterTopic);
    if (filterType)  params.set("type", filterType);
    if (filterDiff)  params.set("difficulty", filterDiff);
    fetch(`${API}/admin/questions/manage/?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setQuestions(Array.isArray(d) ? d : d.results || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQ(false));
  }, [step, subject, filterGrade, filterTopic, filterType, filterDiff]);

  const displayedQuestions = useMemo(() => {
    if (!search.trim()) return questions;
    const q = search.toLowerCase();
    return questions.filter((x) => x.question_text?.toLowerCase().includes(q) || x.topic_name?.toLowerCase().includes(q));
  }, [questions, search]);

  const toggleQ = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const selectAll = () => setSelectedIds(displayedQuestions.map((q) => q.id));
  const clearAll  = () => setSelectedIds([]);

  const selectedSubject = subjects.find((s) => s.id == subject);

  const goStep2 = () => {
    if (!title.trim()) { showToast("Please enter a quiz title", "error"); return; }
    if (!subject)      { showToast("Please select a learning area", "error"); return; }
    if (!grade)        { showToast("Please select a grade", "error"); return; }
    setFilterGrade(grade);
    setFilterTopic("");
    setStep(2);
  };

  const createQuiz = async () => {
    if (selectedIds.length === 0) { showToast("Select at least one question", "error"); return; }
    setCreating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API}/admin/quizzes/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          subject: parseInt(subject),
          grade: parseInt(grade),
          quiz_type: quizType,
          duration_minutes: parseInt(duration),
          passing_score: parseInt(passingScore),
          is_active: true,
          is_b2c: isB2C,
          available_to_teachers: availableToTeachers,
          question_ids: selectedIds,
        }),
      });
      if (res.ok) {
        showToast(`Quiz "${title}" created with ${selectedIds.length} questions!`);
        setTimeout(() => router.replace("/admin/quizzes"), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || data.error || Object.values(data).flat().join(" ") || "Failed to create quiz", "error");
      }
    } catch (e) {
      showToast(e?.message || "Network error", "error");
    } finally {
      setCreating(false);
    }
  };

  const step1Valid = title.trim() && subject && grade;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <Toast {...toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/admin/quizzes" className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-4 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Quiz</h1>
              <p className="text-indigo-200 mt-1">Bundle your questions into a quiz for students</p>
            </div>
            {step === 2 && selectedIds.length > 0 && (
              <div className="bg-white/20 backdrop-blur rounded-2xl px-5 py-3 text-center">
                <p className="text-3xl font-bold">{selectedIds.length}</p>
                <p className="text-xs text-indigo-200">questions selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 pb-12 space-y-6">
        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {/* ── STEP 1 ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {/* Section: Basic Info */}
                <div className="p-7">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                    Quiz Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quiz Title <span className="text-red-500">*</span></label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-900 font-medium"
                        placeholder="e.g. Grade 6 Mathematics — Numbers & Operations"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Learning Area <span className="text-red-500">*</span></label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      >
                        <option value="">— Select Learning Area —</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Grade Level <span className="text-red-500">*</span></label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      >
                        <option value="">— Select Grade —</option>
                        {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                        placeholder="Brief description of what this quiz covers…"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Quiz Type */}
                <div className="p-7">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                    Quiz Type
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "topical", label: "Topical Quiz", desc: "Focused on one topic/strand. Good for practice after a lesson." },
                      { value: "exam", label: "Exam / Test", desc: "Covers multiple topics. Good for end-of-term assessments." },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${quizType === opt.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                        <input type="radio" name="quizType" value={opt.value} checked={quizType === opt.value} onChange={() => setQuizType(opt.value)} className="mt-1 accent-indigo-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{opt.label}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Section: Settings */}
                <div className="p-7">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                    Time &amp; Scoring
                  </h2>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                        <Clock className="w-4 h-4 text-indigo-500" /> Time Limit (minutes)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={5} max={180} step={5} value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="w-14 text-center py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200">{duration}m</span>
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                        <Award className="w-4 h-4 text-indigo-500" /> Passing Score (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={0} max={100} step={5} value={passingScore}
                          onChange={(e) => setPassingScore(e.target.value)}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="w-14 text-center py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200">{passingScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Availability */}
                <div className="p-7">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                    Who Can See This Quiz?
                  </h2>
                  <div className="space-y-3">
                    {[
                      { key: "b2c", checked: isB2C, set: setIsB2C, label: "Students (public)", desc: "Any student on the platform can find and take this quiz." },
                      { key: "teacher", checked: availableToTeachers, set: setAvailableToTeachers, label: "Teachers (library)", desc: "Teachers can find and assign this quiz to their classes." },
                    ].map((opt) => (
                      <label key={opt.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${opt.checked ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${opt.checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`} onClick={() => opt.set(!opt.checked)}>
                          {opt.checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{opt.label}</p>
                          <p className="text-sm text-gray-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-7 bg-gray-50 rounded-b-2xl flex items-center justify-between">
                  <p className="text-sm text-gray-500">Fields marked <span className="text-red-500">*</span> are required</p>
                  <button
                    onClick={goStep2}
                    disabled={!step1Valid}
                    className={`px-8 py-3 rounded-xl font-semibold text-white shadow transition-all flex items-center gap-2 ${step1Valid ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    Next: Pick Questions <span className="text-indigo-200">→</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid grid-cols-3 gap-6">
              {/* ── LEFT: Question Bank ── */}
              <div className="col-span-2 space-y-4">
                {/* Quiz summary pill */}
                <div className="bg-indigo-600 text-white rounded-2xl px-5 py-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{title}</span>
                  <span className="bg-white/20 rounded-lg px-3 py-1">{selectedSubject?.name || "—"} · Grade {grade}</span>
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search questions…"
                        className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                    <select
                      value={filterGrade}
                      onChange={(e) => { setFilterGrade(e.target.value); setFilterTopic(""); }}
                      className={`px-3 py-2.5 text-sm border-2 rounded-xl focus:border-indigo-400 outline-none ${filterGrade != grade ? "border-amber-400 bg-amber-50 text-amber-800 font-semibold" : "border-gray-200"}`}
                    >
                      {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                    <select
                      value={filterTopic}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none min-w-[150px]"
                    >
                      <option value="">All Strands</option>
                      {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none"
                    >
                      <option value="">All Types</option>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <select
                      value={filterDiff}
                      onChange={(e) => setFilterDiff(e.target.value)}
                      className="px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none"
                    >
                      <option value="">All Levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      {loadingQ ? "Loading…" : `${displayedQuestions.length} question${displayedQuestions.length !== 1 ? "s" : ""} found`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={selectAll} disabled={loadingQ} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 disabled:opacity-50">
                        Select All ({displayedQuestions.length})
                      </button>
                      {selectedIds.length > 0 && (
                        <button onClick={clearAll} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Question list */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {loadingQ ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                      <p className="text-gray-500 text-sm">Loading questions…</p>
                    </div>
                  ) : displayedQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <FileQuestion className="w-14 h-14 text-gray-200" />
                      <p className="font-semibold text-gray-600">No questions found</p>
                      <p className="text-sm text-gray-400 text-center max-w-xs">
                        {questions.length === 0
                          ? `There are no questions for Grade ${filterGrade} ${selectedSubject?.name} yet. Go to Questions to create some first.`
                          : "Try clearing some filters to see more questions."}
                      </p>
                      {questions.length === 0 && (
                        <Link href="/admin/questions" className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                          Go to Questions →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                      {displayedQuestions.map((q) => {
                        const selected = selectedIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => toggleQ(q.id)}
                            className={`flex items-start gap-4 p-4 cursor-pointer transition-all group ${selected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                          >
                            {/* Checkbox */}
                            <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${selected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 group-hover:border-indigo-400"}`}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 font-medium leading-snug line-clamp-2">{q.question_text}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {q.topic_name && (
                                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                    <Tag className="w-3 h-3" />{q.topic_name}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}>
                                  {TYPE_LABELS[q.question_type] || q.question_type}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "bg-gray-100 text-gray-500"}`}>
                                  {q.difficulty}
                                </span>
                                {q.max_marks && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                                    {q.max_marks} mk{q.max_marks !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Summary & Create ── */}
              <div className="space-y-4">
                {/* Quiz info card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Quiz Summary</h3>
                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Title</dt>
                      <dd className="font-medium text-gray-900 text-right max-w-[170px] truncate">{title}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Subject</dt>
                      <dd className="font-medium text-gray-900">{selectedSubject?.name}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Grade</dt>
                      <dd className="font-medium text-gray-900">Grade {grade}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Type</dt>
                      <dd className="font-medium text-gray-900 capitalize">{quizType}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Duration</dt>
                      <dd className="font-medium text-gray-900">{duration} min</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Pass mark</dt>
                      <dd className="font-medium text-gray-900">{passingScore}%</dd>
                    </div>
                  </dl>
                  <button onClick={() => setStep(1)} className="mt-4 w-full py-2 text-sm text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg transition">
                    ← Edit details
                  </button>
                </div>

                {/* Selection summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Selected</h3>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${selectedIds.length > 0 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {selectedIds.length} / {questions.length}
                    </span>
                  </div>
                  {selectedIds.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Click questions on the left to select them</p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto mb-4">
                      {selectedIds.map((id, i) => {
                        const q = questions.find((x) => x.id === id);
                        return q ? (
                          <div key={id} className="flex items-center gap-2 group">
                            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                            <span className="flex-1 text-xs text-gray-700 truncate">{q.question_text}</span>
                            <button onClick={(e) => { e.stopPropagation(); toggleQ(id); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 transition">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <button
                    onClick={createQuiz}
                    disabled={selectedIds.length === 0 || creating}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow transition-all flex items-center justify-center gap-2 ${selectedIds.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 hover:shadow-lg"}`}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {creating ? "Creating…" : `Create Quiz (${selectedIds.length})`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
