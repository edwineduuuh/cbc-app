"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import MathEquationEditor from "@/components/WorkedSolution";
import Toast from "@/components/ui/Toast";
import {
  Save,
  X,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  BookOpen,
  GraduationCap,
  FileText,
  Hash,
  Award,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function AddQuestionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [form, setForm] = useState({
    subject: "",
    topic: "",
    grade: "",
    question_type: "mcq",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
    max_marks: 1,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API}/subjects/`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
    };
    load();
  }, [authLoading, user]);

  useEffect(() => {
    if (!form.subject || !form.grade) {
      setTopics([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetchWithAuth(
          `${API}/topics/?subject=${form.subject}&grade=${form.grade}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTopics(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error("Failed to load topics:", err);
      }
    };
    load();
  }, [form.subject, form.grade]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.topic || !form.question_text) {
      showToast("Please fill in strand and question text", "error");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("topic", form.topic);
      formData.append("question_type", form.question_type);
      formData.append("question_text", form.question_text);
      formData.append("difficulty", form.difficulty);
      formData.append("max_marks", form.max_marks);

      if (form.option_a) formData.append("option_a", form.option_a);
      if (form.option_b) formData.append("option_b", form.option_b);
      if (form.option_c) formData.append("option_c", form.option_c);
      if (form.option_d) formData.append("option_d", form.option_d);
      if (form.correct_answer)
        formData.append("correct_answer", form.correct_answer);
      if (form.explanation) formData.append("explanation", form.explanation);

      if (imageFile) {
        formData.append("question_image", imageFile);
      }

      const res = await fetchWithAuth(`${API}/admin/questions/create/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("Question created successfully!");
        setTimeout(() => router.push("/admin/questions"), 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg =
          Object.values(data).flat().join(", ") || "Failed to create question";
        showToast(errMsg, "error");
      }
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/questions")}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Add New Question
                </h1>
                <p className="text-sm text-gray-500">
                  Create a question for your question bank
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl border p-6 space-y-6">
            {/* Subject / Strand / Grade */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Classification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Learning Area *
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value, topic: "" })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strand *
                  </label>
                  <select
                    value={form.topic}
                    onChange={(e) =>
                      setForm({ ...form, topic: e.target.value })
                    }
                    disabled={!form.subject}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Select</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Grade {t.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <select
                    value={form.grade}
                    onChange={(e) =>
                      setForm({ ...form, grade: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">From strand</option>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Type / Difficulty / Max Marks */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                Question Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={form.question_type}
                    onChange={(e) =>
                      setForm({ ...form, question_type: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="structured">Structured</option>
                    <option value="math">Math</option>
                    <option value="essay">Essay</option>
                    <option value="fill_blank">Fill in Blank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Marks *
                  </label>
                  <input
                    type="number"
                    value={form.max_marks}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_marks: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    min="1"
                    placeholder="Set max marks for this question"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <textarea
                value={form.question_text}
                onChange={(e) =>
                  setForm({ ...form, question_text: e.target.value })
                }
                rows={4}
                placeholder="Enter the question..."
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Image Upload */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Question Image (Optional)
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Add a diagram, graph, chart, or illustration for this question
              </p>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-xl border shadow-sm"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    {imageFile?.name} ({(imageFile?.size / 1024).toFixed(0)} KB)
                  </p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 font-medium">
                    Click to upload image
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF up to 5MB
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* MCQ Options */}
            {form.question_type === "mcq" && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Answer Options
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["A", "B", "C", "D"].map((letter) => (
                    <div key={letter} className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {letter}
                      </span>
                      <input
                        type="text"
                        value={form[`option_${letter.toLowerCase()}`]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [`option_${letter.toLowerCase()}`]: e.target.value,
                          })
                        }
                        placeholder={`Option ${letter}`}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <select
                    value={form.correct_answer}
                    onChange={(e) =>
                      setForm({ ...form, correct_answer: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select correct option</option>
                    <option value="A">
                      A{form.option_a ? ` — ${form.option_a}` : ""}
                    </option>
                    <option value="B">
                      B{form.option_b ? ` — ${form.option_b}` : ""}
                    </option>
                    <option value="C">
                      C{form.option_c ? ` — ${form.option_c}` : ""}
                    </option>
                    <option value="D">
                      D{form.option_d ? ` — ${form.option_d}` : ""}
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* Math answer */}
            {form.question_type === "math" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer (Math) *
                </label>
                <MathEquationEditor
                  value={form.correct_answer}
                  onChange={(latex) =>
                    setForm({ ...form, correct_answer: latex })
                  }
                  placeholder="Enter the answer using math symbols..."
                />
              </div>
            )}

            {/* Structured / Essay / Fill blank */}
            {["structured", "essay", "fill_blank"].includes(
              form.question_type,
            ) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Answer *
                </label>
                <textarea
                  value={form.correct_answer}
                  onChange={(e) =>
                    setForm({ ...form, correct_answer: e.target.value })
                  }
                  rows={4}
                  placeholder="Enter the correct/model answer..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explanation (Optional)
              </label>
              <textarea
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
                rows={3}
                placeholder="Explain the answer..."
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Question
                  </>
                )}
              </button>
              <button
                onClick={() => router.push("/admin/questions")}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
