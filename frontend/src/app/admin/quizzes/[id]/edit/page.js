"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Search,
  Pencil,
  Tag,
  Hash,
  BarChart2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

const BLANK_EDIT = {
  question_text: "",
  question_type: "mcq",
  difficulty: "easy",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "",
  explanation: "",
};

function QuestionText({ text }) {
  return (
    <span
      className="font-medium text-sm line-clamp-2"
      dangerouslySetInnerHTML={{ __html: text || "" }}
    />
  );
}

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const TYPE_LABELS = {
  mcq: "MCQ",
  fill_blank: "Fill Blank",
  math: "Math",
  structured: "Structured",
  essay: "Essay",
  table: "Table",
  multipart: "Multipart",
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

function AppToast({ show, message, type, onClose }) {
  if (!show) return null;
  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Quiz settings state
  const [form, setForm] = useState({
    title: "",
    description: "",
    grade: "",
    subject: "",
    topic: "",
    quiz_type: "topical",
    term: "",
    set_number: "",
    duration_minutes: 30,
    passing_score: 50,
    is_active: true,
    owner_type: "admin",
    available_to_teachers: false,
  });

  const [quiz, setQuiz] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  // Question filters
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");

  // Edit question modal
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (
      !authLoading &&
      user &&
      !ALLOWED_ROLES.includes(user.role) &&
      !user.is_staff &&
      !user.is_superuser
    ) {
      router.replace("/dashboard");
      return;
    }
    if (!authLoading && user) fetchQuiz();
  }, [user, authLoading, params.id, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`${API}/subjects/`)
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  // Load topics when subject or grade changes
  useEffect(() => {
    if (form.subject && form.grade) {
      fetch(`${API}/topics/?subject=${form.subject}&grade=${form.grade}`)
        .then((r) => r.json())
        .then((d) => setTopics(Array.isArray(d) ? d : d.results || []))
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [form.subject, form.grade]);

  useEffect(() => {
    if (quiz) fetchAvailableQuestions();
  }, [quiz]); // eslint-disable-line

  useEffect(() => {
    if (!quiz) return;
    const timer = setTimeout(
      () => fetchAvailableQuestions(searchTerm, filterSubject, filterGrade),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchTerm, filterSubject, filterGrade, quiz]); // eslint-disable-line

  const fetchQuiz = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        setSelectedQuestions(data.questions || []);
        setForm({
          title: data.title || "",
          description: data.description || "",
          grade: data.grade || "",
          subject: data.subject || "",
          topic: data.topic || "",
          quiz_type: data.quiz_type || "topical",
          term: data.term ?? "",
          set_number: data.set_number ?? "",
          duration_minutes: data.duration_minutes ?? 30,
          passing_score: data.passing_score ?? 50,
          is_active: data.is_active ?? true,
          owner_type: data.owner_type || "admin",
          available_to_teachers: data.available_to_teachers ?? false,
        });
      } else {
        setToast({ visible: true, message: "Quiz not found", type: "error" });
      }
    } catch {
      setToast({ visible: true, message: "Error loading quiz", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async (
    search = "",
    subject = "",
    grade = "",
  ) => {
    const token = localStorage.getItem("accessToken");
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (subject) p.set("subject", subject);
      if (grade) p.set("grade", grade);
      const res = await fetch(
        `${API}/admin/questions/manage/?${p.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableQuestions(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error("Error loading questions:", e);
    }
  };

  const addQuestion = (question) => {
    if (!selectedQuestions.find((q) => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };

  const openEdit = async (question) => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/questions/${question.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : question;
      setEditForm({
        topic: data.topic || "",
        question_text: data.question_text || "",
        question_type: data.question_type || "mcq",
        difficulty: data.difficulty || "easy",
        option_a: data.option_a || "",
        option_b: data.option_b || "",
        option_c: data.option_c || "",
        option_d: data.option_d || "",
        correct_answer: data.correct_answer || "",
        explanation: data.explanation || "",
      });
      setEditingQuestion(data);
    } catch {
      setEditForm({ ...BLANK_EDIT, ...question });
      setEditingQuestion(question);
    }
  };

  const saveEdit = async () => {
    setEditSaving(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/questions/${editingQuestion.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedQuestions((prev) =>
          prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)),
        );
        setEditingQuestion(null);
        setToast({
          visible: true,
          message: "Question updated!",
          type: "success",
        });
        fetchAvailableQuestions(searchTerm, filterSubject, filterGrade);
      } else {
        setToast({
          visible: true,
          message: "Failed to save question",
          type: "error",
        });
      }
    } catch {
      setToast({ visible: true, message: "Network error", type: "error" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.grade) {
      setToast({
        visible: true,
        message: "Title, subject, and grade are required",
        type: "error",
      });
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("accessToken");

    const payload = {
      title: form.title,
      description: form.description,
      grade: Number(form.grade),
      subject: Number(form.subject),
      topic: form.topic ? Number(form.topic) : null,
      quiz_type: form.quiz_type,
      term: form.term !== "" ? Number(form.term) : null,
      set_number: form.set_number !== "" ? Number(form.set_number) : null,
      duration_minutes: Number(form.duration_minutes),
      passing_score: Number(form.passing_score),
      is_active: form.is_active,
      owner_type: form.owner_type,
      available_to_teachers: form.available_to_teachers,
      question_ids: selectedQuestions.map((q) => q.id),
    };

    try {
      const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setToast({
          visible: true,
          message: `Quiz saved — ${selectedQuestions.length} question${selectedQuestions.length !== 1 ? "s" : ""}`,
          type: "success",
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({
          visible: true,
          message: err.detail || JSON.stringify(err) || "Failed to save quiz",
          type: "error",
        });
      }
    } catch {
      setToast({ visible: true, message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const isMcq =
    editForm.question_type === "mcq" || editForm.question_type === "math";

  const displayedQuestions = availableQuestions.filter((q) => {
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterType && q.question_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Quiz not found</h2>
          <p className="text-gray-500 text-sm mb-6">
            This quiz may have been deleted or doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.replace("/admin/quizzes")}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const totalMarks = selectedQuestions.reduce(
    (sum, q) => sum + (q.max_marks || 1),
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <AppToast
        show={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Edit Question</h2>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <p className="text-xs text-gray-400 mb-1">
                  Use <code>&lt;u&gt;word&lt;/u&gt;</code> to underline,{" "}
                  <code>&lt;b&gt;</code> to bold, <code>$math$</code> for inline
                  math
                </p>
                <textarea
                  rows={3}
                  className={inputCls}
                  value={editForm.question_text}
                  onChange={(e) =>
                    setEditForm({ ...editForm, question_text: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    className={inputCls}
                    value={editForm.question_type}
                    onChange={(e) => {
                      const t = e.target.value;
                      const clear = t !== "mcq" && t !== "math";
                      setEditForm({
                        ...editForm,
                        question_type: t,
                        ...(clear && {
                          option_a: "",
                          option_b: "",
                          option_c: "",
                          option_d: "",
                          correct_answer: "",
                        }),
                      });
                    }}
                  >
                    <option value="mcq">MCQ</option>
                    <option value="math">Math</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="structured">Structured</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    className={inputCls}
                    value={editForm.difficulty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, difficulty: e.target.value })
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              {isMcq && (
                <div className="grid grid-cols-2 gap-3">
                  {["a", "b", "c", "d"].map((letter) => (
                    <div key={letter}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option {letter.toUpperCase()}
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={editForm[`option_${letter}`]}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            [`option_${letter}`]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
              {isMcq ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <select
                    className={inputCls}
                    value={editForm.correct_answer}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        correct_answer: e.target.value,
                      })
                    }
                  >
                    <option value="">Select…</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              ) : editForm.question_type === "fill_blank" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={editForm.correct_answer}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        correct_answer: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Answer / Marking Scheme
                  </label>
                  <textarea
                    rows={4}
                    className={inputCls}
                    value={editForm.explanation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, explanation: e.target.value })
                    }
                  />
                </div>
              )}
              {isMcq && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation
                  </label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={editForm.explanation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, explanation: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gradient Header ── */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.replace("/admin/quizzes")}
            className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Edit Quiz</h1>
              <p className="text-indigo-200 mt-1 text-sm">
                {quiz.title} · Grade {quiz.grade}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── Quiz Settings Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-bold">
              ⚙
            </span>
            Quiz Settings
          </h2>

          <div className="grid grid-cols-1 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Grade 7 Math – Term 1 Exam"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              {
                label: "Subject *",
                field: "subject",
                options: subjects.map((s) => ({ value: s.id, label: s.name })),
                placeholder: "Select subject",
              },
              {
                label: "Grade *",
                field: "grade",
                options: [4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => ({
                  value: g,
                  label: `Grade ${g}`,
                })),
                placeholder: "Select grade",
              },
              {
                label: "Topic",
                field: "topic",
                options: topics.map((t) => ({ value: t.id, label: t.name })),
                placeholder: "— None —",
                nullable: true,
              },
            ].map(({ label, field, options, placeholder, nullable }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {label}
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  value={form[field]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field]: e.target.value,
                      ...(field !== "topic" && { topic: "" }),
                    })
                  }
                >
                  <option value="">{placeholder}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Quiz Type
              </label>
              <select
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                value={form.quiz_type}
                onChange={(e) =>
                  setForm({ ...form, quiz_type: e.target.value })
                }
              >
                <option value="topical">Topical Quiz</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Term
              </label>
              <select
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                disabled={form.quiz_type !== "exam"}
              >
                <option value="">— None —</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Set Number
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                value={form.set_number}
                onChange={(e) =>
                  setForm({ ...form, set_number: e.target.value })
                }
                placeholder="e.g. 1"
                min="1"
                disabled={form.quiz_type !== "exam"}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Owner Type
              </label>
              <select
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                value={form.owner_type}
                onChange={(e) =>
                  setForm({ ...form, owner_type: e.target.value })
                }
              >
                <option value="admin">Admin Created</option>
                <option value="teacher">Teacher Created</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Duration (mins)
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: e.target.value })
                }
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Passing Score (%)
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                value={form.passing_score}
                onChange={(e) =>
                  setForm({ ...form, passing_score: e.target.value })
                }
                min="0"
                max="100"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 accent-indigo-600"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">Active</p>
                <p className="text-xs text-gray-400">Visible to students</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 accent-indigo-600"
                checked={form.available_to_teachers}
                onChange={(e) =>
                  setForm({ ...form, available_to_teachers: e.target.checked })
                }
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">Teachers</p>
                <p className="text-xs text-gray-400">Available to teachers</p>
              </div>
            </label>
          </div>
        </div>

        {/* ── Question Management ── */}
        <div className="grid grid-cols-2 gap-6">
          {/* Available Questions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Available Questions
                </h2>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {displayedQuestions.length} questions
                </span>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    val: filterSubject,
                    setter: setFilterSubject,
                    placeholder: "All Subjects",
                    options: subjects.map((s) => ({ v: s.id, l: s.name })),
                  },
                  {
                    val: filterGrade,
                    setter: setFilterGrade,
                    placeholder: "All Grades",
                    options: [4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => ({
                      v: g,
                      l: `Grade ${g}`,
                    })),
                  },
                  {
                    val: filterDifficulty,
                    setter: setFilterDifficulty,
                    placeholder: "All Difficulties",
                    options: [
                      { v: "easy", l: "Easy" },
                      { v: "medium", l: "Medium" },
                      { v: "hard", l: "Hard" },
                    ],
                  },
                  {
                    val: filterType,
                    setter: setFilterType,
                    placeholder: "All Types",
                    options: Object.entries(TYPE_LABELS).map(([v, l]) => ({
                      v,
                      l,
                    })),
                  },
                ].map(({ val, setter, placeholder, options }, i) => (
                  <select
                    key={i}
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-gray-700"
                  >
                    <option value="">{placeholder}</option>
                    {options.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.l}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-gray-50 px-3 py-2">
              {displayedQuestions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No questions match your filters</p>
                </div>
              ) : (
                displayedQuestions.map((q) => {
                  const isSelected = !!selectedQuestions.find(
                    (sq) => sq.id === q.id,
                  );
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl my-1 transition-all ${isSelected ? "bg-gray-50 opacity-50" : "hover:bg-indigo-50/50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <QuestionText text={q.question_text} />
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {q.topic_name && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                <Tag className="w-2.5 h-2.5" />
                                {q.topic_name}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}
                            >
                              {TYPE_LABELS[q.question_type] || q.question_type}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "bg-gray-100 text-gray-500"}`}
                            >
                              {q.difficulty}
                            </span>
                            {q.max_marks && (
                              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                                {q.max_marks} mk{q.max_marks !== 1 ? "s" : ""}
                              </span>
                            )}
                            {q.in_quizzes &&
                              q.in_quizzes.length > 0 &&
                              q.in_quizzes.map((qz) => (
                                <span
                                  key={qz.id}
                                  className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-medium flex items-center gap-1 max-w-[130px]"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      x="3"
                                      y="3"
                                      width="18"
                                      height="18"
                                      rx="2"
                                    />
                                    <path d="M9 9h6M9 12h6M9 15h4" />
                                  </svg>
                                  <span className="truncate">
                                    {qz.title} · Gr {qz.grade}
                                  </span>
                                </span>
                              ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(q)}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Edit question"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => addQuestion(q)}
                            disabled={isSelected}
                            className={`p-1.5 rounded-lg transition-colors ${isSelected ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"}`}
                            title="Add to quiz"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Questions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Quiz Questions
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {totalMarks} marks
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" />
                  {selectedQuestions.length} selected
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] px-3 py-2">
              {selectedQuestions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No questions yet</p>
                  <p className="text-xs mt-1">
                    Add questions from the left panel
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  {selectedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl hover:border-indigo-300 transition-colors group"
                    >
                      <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <QuestionText text={q.question_text} />
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {q.topic_name && (
                            <span className="text-xs text-gray-500">
                              {q.topic_name}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}
                          >
                            {TYPE_LABELS[q.question_type] || q.question_type}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "bg-gray-100 text-gray-500"}`}
                          >
                            {q.difficulty}
                          </span>
                          {q.max_marks && (
                            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                              {q.max_marks} mk{q.max_marks !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-blue-600 transition-colors"
                          title="Edit question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-white hover:text-red-600 transition-colors"
                          title="Remove from quiz"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedQuestions.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 text-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Quiz
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
