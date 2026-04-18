"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { ArrowLeft, Plus, X, Save, Search, Pencil } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

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

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Filters
  const [subjects, setSubjects] = useState([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");

  // Edit modal state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role) && !user.is_staff && !user.is_superuser) {
      router.replace("/dashboard"); return;
    }
    if (!authLoading && user) fetchQuiz();
  }, [user, authLoading, params.id, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`${API}/subjects/`).then(r => r.json()).then(d => setSubjects(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (quiz) fetchAvailableQuestions();
  }, [quiz]);

  // Re-fetch when server-side filters or search change (debounced)
  useEffect(() => {
    if (!quiz) return;
    const timer = setTimeout(() => fetchAvailableQuestions(searchTerm, filterSubject, filterGrade), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterSubject, filterGrade, quiz]);

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
      } else {
        setToast({ show: true, message: "Quiz not found", type: "error" });
      }
    } catch {
      setToast({ show: true, message: "Error loading quiz", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async (search = "", subject = "", grade = "") => {
    const token = localStorage.getItem("accessToken");
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (subject) p.set("subject", subject);
      if (grade) p.set("grade", grade);
      const res = await fetch(`${API}/admin/questions/manage/?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableQuestions(Array.isArray(data) ? data : []);
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        // Reflect changes in both lists
        setSelectedQuestions((prev) =>
          prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q))
        );
        setAvailableQuestions((prev) =>
          prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q))
        );
        setEditingQuestion(null);
        setToast({ show: true, message: "Question updated!", type: "success" });
      } else {
        setToast({ show: true, message: "Failed to save question", type: "error" });
      }
    } catch {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...quiz, questions: undefined, question_ids: selectedQuestions.map((q) => q.id) }),
      });
      if (res.ok) {
        setToast({ show: true, message: "Quiz updated successfully!", type: "success" });
        setTimeout(() => router.push("/admin/quizzes"), 2000);
      } else {
        setToast({ show: true, message: "Failed to update quiz", type: "error" });
      }
    } catch {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const isMcq = editForm.question_type === "mcq" || editForm.question_type === "math";

  const displayedQuestions = availableQuestions.filter((q) => {
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterType && q.question_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Quiz not found</h2>
          <Button onClick={() => router.push("/admin/quizzes")}>Back to Quizzes</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Edit Question</h2>
              <button onClick={() => setEditingQuestion(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <p className="text-xs text-gray-400 mb-1">Use <code>&lt;u&gt;word&lt;/u&gt;</code> to underline, <code>&lt;b&gt;</code> to bold, <code>$math$</code> for inline math</p>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.question_text}
                  onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                />
              </div>

              {/* Type + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.question_type}
                    onChange={(e) => {
                      const t = e.target.value;
                      const clear = t !== "mcq" && t !== "math";
                      setEditForm({
                        ...editForm,
                        question_type: t,
                        ...(clear && { option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "" }),
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* MCQ Options */}
              {isMcq && (
                <div className="grid grid-cols-2 gap-3">
                  {["a", "b", "c", "d"].map((letter) => (
                    <div key={letter}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option {letter.toUpperCase()}
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm[`option_${letter}`]}
                        onChange={(e) => setEditForm({ ...editForm, [`option_${letter}`]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Correct Answer */}
              {isMcq ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.correct_answer}
                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.correct_answer}
                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Answer / Marking Scheme</label>
                  <textarea
                    rows={4}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.explanation}
                    onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  />
                </div>
              )}

              {/* Explanation (for MCQ) */}
              {isMcq && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.explanation}
                    onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
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

      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/quizzes")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold">Edit Quiz</h1>
              <p className="text-gray-600">{quiz.title}</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={selectedQuestions.length === 0}
            variant="primary"
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-2 gap-8">
          {/* Available Questions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Available Questions</h2>
              <span className="text-sm text-gray-600">{displayedQuestions.length} questions</span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">All Grades</option>
                {[4,5,6,7,8,9,10,11,12].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="math">Math</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="structured">Structured</option>
                <option value="essay">Essay</option>
              </select>
            </div>

            <div className="space-y-2 max-h-125 overflow-y-auto">
              {displayedQuestions.map((q) => {
                const isSelected = selectedQuestions.find((sq) => sq.id === q.id);
                return (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-lg ${
                      isSelected
                        ? "bg-gray-100 border-gray-300 opacity-50"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <QuestionText text={q.question_text} />
                        <p className="text-xs text-gray-600 mt-1">{q.topic_name} • {q.difficulty}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Edit question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => addQuestion(q)}
                          disabled={!!isSelected}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          }`}
                          title="Add to quiz"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selected Questions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Quiz Questions</h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {selectedQuestions.length} selected
              </span>
            </div>

            {selectedQuestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No questions selected</p>
                <p className="text-sm mt-2">Add questions from the left panel</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {selectedQuestions.map((q, index) => (
                  <div key={q.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <QuestionText text={q.question_text} />
                        <p className="text-xs text-gray-600 mt-1">{q.topic_name} • {q.difficulty}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1.5 text-gray-600 hover:bg-blue-200 rounded-lg transition-colors"
                          title="Edit question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove from quiz"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
