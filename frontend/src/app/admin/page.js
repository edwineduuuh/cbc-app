"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import {
  BarChart2,
  BookOpen,
  Users,
  TrendingUp,
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  ChevronRight,
  FileText,
  Layers,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Settings,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import AdminPaymentsPanel from "@/components/AdminPaymentsPanel";
import AdminNavigation from "@/components/AdminNavigation";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, delay = 0 }) {
  const gradients = {
    emerald: "from-emerald-500 to-teal-600",
    blue: "from-blue-500 to-indigo-600",
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-pink-600",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[gradient]} p-6 text-white shadow-lg`}
      >
        <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-4xl font-bold tracking-tight">{value ?? "—"}</p>
          <p className="text-sm mt-1 text-white/80 font-medium">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    mcq: { label: "MCQ", cls: "bg-blue-100 text-blue-700" },
    structured: { label: "Structured", cls: "bg-violet-100 text-violet-700" },
    fill_blank: { label: "Fill Blank", cls: "bg-cyan-100 text-cyan-700" },
    math: { label: "Math", cls: "bg-amber-100 text-amber-700" },
    essay: { label: "Essay", cls: "bg-rose-100 text-rose-700" },
  };
  const { label, cls } = map[type] || {
    label: type,
    cls: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const map = {
    easy: { label: "Easy", cls: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
    hard: { label: "Hard", cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[difficulty] || {
    label: difficulty,
    cls: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Question Modal ───────────────────────────────────────────────────────────
function QuestionModal({ open, onClose, onSave, subjects, topics, editData }) {
  const blank = {
    subject: "",
    topic: "",
    grade: "",
    difficulty: "medium",
    question_type: "mcq",
    max_marks: 1,
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    explanation: "",
    marking_scheme: "",
    image_preview: null,
    image_file: null,
    delete_image: false,
  };

  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const filteredTopics = topics.filter(
    (t) => String(t.subject) === String(form.subject),
  );

  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        subject: String(editData.topic?.subject?.id ?? editData.subject ?? ""),
        topic: String(editData.topic?.id ?? ""),
        grade: String(editData.grade ?? ""),
        question_type: editData.question_type || "mcq",
        max_marks: editData.max_marks || 1,
        marking_scheme: editData.marking_scheme
          ? JSON.stringify(editData.marking_scheme, null, 2)
          : "",
        image_preview: null, // Clear preview when opening
        image_file: null,
        delete_image: false,
      });
    } else {
      setForm(blank);
    }
  }, [editData]);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const required = ["subject", "topic", "grade", "question_text"];
    if (form.question_type === "mcq") {
      required.push(
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_answer",
      );
    }

    for (const key of required) {
      if (!form[key]) {
        setToast({
          visible: true,
          message: `${key.replace("_", " ")} is required`,
          type: "error",
        });
        return;
      }
    }

    setSaving(true);
    const url = editData
      ? `${API}/admin/questions/${editData.id}/`
      : `${API}/admin/questions/create/`;
    const method = editData ? "PUT" : "POST";

    let marking_scheme_obj = null;
    if (form.marking_scheme) {
      try {
        marking_scheme_obj = JSON.parse(form.marking_scheme);
      } catch (e) {
        setToast({
          visible: true,
          message: "Invalid JSON in marking scheme",
          type: "error",
        });
        setSaving(false);
        return;
      }
    }

    try {
      // Use FormData if image is being uploaded or deleted
      const hasImage = form.image_file || form.delete_image;

      let payload;
      if (hasImage) {
        payload = new FormData();
        payload.append("topic", parseInt(form.topic));
        payload.append("grade", parseInt(form.grade));
        payload.append("question_type", form.question_type);
        payload.append("max_marks", parseInt(form.max_marks));
        payload.append("question_text", form.question_text.trim());
        payload.append("difficulty", form.difficulty);
        payload.append("explanation", form.explanation.trim());

        if (form.question_type === "mcq") {
          payload.append("option_a", form.option_a.trim());
          payload.append("option_b", form.option_b.trim());
          payload.append("option_c", form.option_c.trim());
          payload.append("option_d", form.option_d.trim());
          payload.append("correct_answer", form.correct_answer);
        } else {
          payload.append("correct_answer", form.correct_answer || "");
          if (marking_scheme_obj) {
            payload.append(
              "marking_scheme",
              JSON.stringify(marking_scheme_obj),
            );
          }
        }

        // Handle image
        if (form.image_file) {
          payload.append("question_image", form.image_file);
        } else if (form.delete_image) {
          payload.append("delete_image", "true");
        }
      } else {
        payload = {
          topic: parseInt(form.topic),
          grade: parseInt(form.grade),
          question_type: form.question_type,
          max_marks: parseInt(form.max_marks),
          question_text: form.question_text.trim(),
          difficulty: form.difficulty,
          explanation: form.explanation.trim(),
        };

        if (form.question_type === "mcq") {
          payload.option_a = form.option_a.trim();
          payload.option_b = form.option_b.trim();
          payload.option_c = form.option_c.trim();
          payload.option_d = form.option_d.trim();
          payload.correct_answer = form.correct_answer;
        } else {
          payload.correct_answer = form.correct_answer || "";
          payload.marking_scheme = marking_scheme_obj;
        }
      }

      const fetchOptions = {
        method,
        body: hasImage ? payload : JSON.stringify(payload),
        headers: hasImage ? {} : undefined,
      };
      const res = await fetchWithAuth(url, fetchOptions);

      if (res.ok) {
        setToast({
          visible: true,
          message: editData ? "Question updated!" : "Question created!",
          type: "success",
        });
        setTimeout(() => {
          setToast((t) => ({ ...t, visible: false }));
          onSave();
          onClose();
        }, 1500);
      } else {
        const err = await res.json();
        setToast({
          visible: true,
          message: Object.values(err).flat().join(", ") || "Failed",
          type: "error",
        });
      }
    } catch {
      setToast({ visible: true, message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls =
    "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-800 bg-white text-sm";
  const labelCls =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <Toast
          {...toast}
          onClose={() => setToast((t) => ({ ...t, visible: false }))}
        />

        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 16, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-7 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editData ? "Edit Question" : "New Question"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                CBE curriculum library
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-7 py-6 space-y-6">
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Learning Area *</label>
                <select
                  value={form.subject}
                  onChange={(e) => {
                    update("subject", e.target.value);
                    update("topic", "");
                  }}
                  className={inputCls}
                >
                  <option value="">Select learning area</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Strand *</label>
                <select
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                  disabled={!form.subject}
                  className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50`}
                >
                  <option value="">Select strand</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      Grade {t.grade} – {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Grade *</label>
                <select
                  value={form.grade}
                  onChange={(e) => update("grade", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Grade</option>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => update("difficulty", e.target.value)}
                  className={inputCls}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Type *</label>
                <select
                  value={form.question_type}
                  onChange={(e) => update("question_type", e.target.value)}
                  className={inputCls}
                >
                  <option value="mcq">MCQ</option>
                  <option value="structured">Structured</option>
                  <option value="fill_blank">Fill Blank</option>
                  <option value="math">Math</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Max Marks</label>
                <input
                  type="number"
                  value={form.max_marks}
                  onChange={(e) => update("max_marks", e.target.value)}
                  min="1"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Question Text *</label>
              <textarea
                value={form.question_text}
                onChange={(e) => update("question_text", e.target.value)}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Write the full question here..."
              />
            </div>

            {form.question_type === "mcq" && (
              <div>
                <label className={labelCls}>Options *</label>
                <div className="space-y-3">
                  {["a", "b", "c", "d"].map((opt) => {
                    const isCorrect = form.correct_answer === opt.toUpperCase();
                    return (
                      <div
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isCorrect ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            update("correct_answer", opt.toUpperCase())
                          }
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${isCorrect ? "bg-emerald-500 text-white shadow-sm" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                        >
                          {opt.toUpperCase()}
                        </button>
                        <input
                          type="text"
                          value={form[`option_${opt}`]}
                          onChange={(e) =>
                            update(`option_${opt}`, e.target.value)
                          }
                          placeholder={`Option ${opt.toUpperCase()}`}
                          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                        />
                        {isCorrect && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-400">
                    Click the letter button to mark the correct answer
                  </p>
                </div>
              </div>
            )}

            {form.question_type !== "mcq" && (
              <div>
                <label className={labelCls}>Model Answer *</label>
                <textarea
                  value={form.correct_answer}
                  onChange={(e) => update("correct_answer", e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="e.g., Absorption of water and nutrients, Anchoring the plant"
                />
              </div>
            )}

            {(form.question_type === "structured" ||
              form.question_type === "essay") && (
              <div>
                <label className={labelCls}>
                  Marking Scheme (JSON){" "}
                  <span className="normal-case font-normal text-gray-400">
                    — optional
                  </span>
                </label>
                <textarea
                  value={form.marking_scheme}
                  onChange={(e) => update("marking_scheme", e.target.value)}
                  rows={6}
                  className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={`{\n  "points": [\n    {"description": "Absorption of water/nutrients", "marks": 1},\n    {"description": "Anchoring/support", "marks": 1}\n  ]\n}`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: {`{"points": [{"description": "...", "marks": 1}]}`}
                </p>
              </div>
            )}

            <div>
              <label className={labelCls}>
                Explanation{" "}
                <span className="normal-case font-normal text-gray-400">
                  — optional
                </span>
              </label>
              <textarea
                value={form.explanation}
                onChange={(e) => update("explanation", e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Explain the correct answer in detail..."
              />
            </div>
            {/* ADD THIS AFTER EXPLANATION FIELD */}
            {/* Image Upload with Delete Control */}
            <div>
              <label className={labelCls}>
                Question Image{" "}
                <span className="normal-case font-normal text-gray-400">
                  — optional
                </span>
              </label>

              {form.image_preview ||
              (editData?.question_image_url && !form.delete_image) ? (
                <div className="relative group w-40">
                  <img
                    src={form.image_preview || editData.question_image_url}
                    alt="Question"
                    className="w-full h-32 object-cover rounded-lg border-2 border-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        image_file: null,
                        image_preview: null,
                        delete_image: true,
                      }));
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 w-40 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setForm((prev) => ({
                            ...prev,
                            image_file: file,
                            image_preview: evt.target.result,
                            delete_image: false,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/50">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving
                ? "Saving…"
                : editData
                  ? "Update Question"
                  : "Create Question"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/bulk-import/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setResult(data);
      if (res.ok && data.created > 0) onDone();
    } catch {
      setResult({ error: "Network error. Try again." });
    }
    setLoading(false);
  };

  const downloadTemplate = () => {
    const headers =
      "subject_name,topic_name,grade,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation";
    const example =
      'Mathematics,Algebra,8,medium,"Solve for x: 2x + 5 = 13","x = 2","x = 4","x = 6","x = 8",B,"Subtract 5 from both sides: 2x = 8, then divide by 2"';
    const blob = new Blob([headers + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Import</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload questions via CSV
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-7 py-6 space-y-5">
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-sm">
                  Download CSV Template
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Use this exact format for bulk upload
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Upload CSV File
              </label>
              <div
                className={`relative border-2 rounded-xl transition-all ${file ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setFile(e.target.files[0]);
                    setResult(null);
                  }}
                  className="w-full p-4 text-sm cursor-pointer opacity-0 absolute inset-0"
                />
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${file ? "bg-emerald-100" : "bg-gray-200"}`}
                  >
                    <FileText
                      className={`w-4 h-4 ${file ? "text-emerald-600" : "text-gray-400"}`}
                    />
                  </div>
                  <span
                    className={`text-sm ${file ? "text-emerald-700 font-medium" : "text-gray-400"}`}
                  >
                    {file ? file.name : "Choose a .csv file…"}
                  </span>
                </div>
              </div>
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${result.error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
              >
                {result.error ? (
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{result.error}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-emerald-700">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-semibold">
                        {result.created} questions imported successfully
                      </p>
                    </div>
                    {result.errors?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-orange-700 mb-1">
                          {result.errors.length} rows had issues:
                        </p>
                        <ul className="text-xs text-orange-600 space-y-0.5 max-h-32 overflow-y-auto">
                          {result.errors.map((e, i) => (
                            <li key={i}>
                              Row {e.row}: {e.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="flex gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/50">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={loading}
              disabled={!file || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Importing…" : "Import CSV"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Grouped Stats Panel ──────────────────────────────────────────────────────
function GroupedStatsPanel({ onFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("subjects");

  useEffect(() => {
    fetchWithAuth(`${API}/admin/questions/stats/`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!data) return null;

  const recent = data.recent ?? {};
  const recentItems = [
    {
      label: "Today",
      value: recent.today ?? 0,
      cls: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Last 7 days",
      value: recent.last_7_days ?? 0,
      cls: "bg-blue-50 text-blue-700",
    },
    {
      label: "Last 30 days",
      value: recent.last_30_days ?? 0,
      cls: "bg-violet-50 text-violet-700",
    },
    {
      label: "All time",
      value: recent.total ?? 0,
      cls: "bg-gray-50 text-gray-700",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-gray-900">
            Question Library
          </h2>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            ["subjects", "By Learning Area"],
            ["recent", "Recent Activity"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "subjects" && (
        <div className="space-y-5">
          {(data.by_subject ?? []).length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">
              No questions yet
            </p>
          )}
          {(data.by_subject ?? []).map((subject) => (
            <div key={subject.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{subject.icon || "📚"}</span>
                <span className="text-sm font-bold text-gray-800">
                  {subject.name}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {subject.grades.reduce((s, g) => s + g.count, 0)}
                </span>
              </div>
              <div className="space-y-1.5 pl-7">
                {subject.grades.map((g) => {
                  const max = Math.max(...subject.grades.map((x) => x.count));
                  const pct = Math.round((g.count / max) * 100);
                  return (
                    <button
                      key={g.grade}
                      onClick={() => onFilter(subject.id, g.grade)}
                      className="w-full flex items-center gap-3 group"
                    >
                      <span className="text-xs text-gray-400 w-14 text-right flex-shrink-0">
                        Grade {g.grade}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-600 rounded-full transition-colors"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right flex-shrink-0">
                        {g.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "recent" && (
        <div className="grid grid-cols-2 gap-3">
          {recentItems.map((item) => (
            <div key={item.label} className={`${item.cls} rounded-xl p-4`}>
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="text-xs mt-1 opacity-70 font-medium">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  useTheme(); // Force re-render when theme changes
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const adminRoles = ["admin", "superadmin", "school_admin"];
    const isAdmin =
      adminRoles.includes(user.role) || user.is_staff || user.is_superuser;
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async () => {
    if (authLoading || !user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filterSubject && { subject: filterSubject }),
        ...(filterGrade && { grade: filterGrade }),
        ...(search && { search }),
      }).toString();

      const [qRes, sRes, tRes, stRes] = await Promise.all([
        fetchWithAuth(`${API}/admin/questions/?${params}`),
        fetchWithAuth(`${API}/subjects/`),
        fetchWithAuth(`${API}/topics/`),
        fetchWithAuth(`${API}/admin/stats/`),
      ]);

      const [qData, sData, tData, stData] = await Promise.all([
        qRes.json(),
        sRes.json(),
        tRes.json(),
        stRes.json(),
      ]);

      setQuestions(Array.isArray(qData) ? qData : (qData.results ?? []));
      setSubjects(Array.isArray(sData) ? sData : []);
      setTopics(Array.isArray(tData) ? tData : []);
      setStats(stData);
    } catch (err) {
      console.error("Fetch error:", err);
      setToast({
        visible: true,
        message: "Failed to load data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, filterSubject, filterGrade, search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (user?.role?.includes("admin")) {
      // Make sure history entry is clean
      window.history.replaceState(null, "", "/admin");
    } else {
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this question permanently?")) return;
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast({
          visible: true,
          message: "Question deleted",
          type: "success",
        });
        fetchAll();
      } else {
        setToast({ visible: true, message: "Delete failed", type: "error" });
      }
    } catch {
      setToast({ visible: true, message: "Network error", type: "error" });
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const selectCls =
    "px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-gray-700 text-sm";

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        {...toast}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
      <QuestionModal
        open={showCreate || !!editQuestion}
        onClose={() => {
          setShowCreate(false);
          setEditQuestion(null);
        }}
        onSave={() => {
          fetchAll();
          showToast(editQuestion ? "Question updated!" : "Question created!");
        }}
        subjects={subjects}
        topics={topics}
        editData={editQuestion}
      />
      <BulkImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={() => {
          fetchAll();
          showToast("Bulk import completed!");
        }}
      />
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-emerald-800 to-teal-700 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">
                CBE Kenya
              </span>
              <span className="text-emerald-300 text-xs ml-2 font-medium hidden sm:inline">
                Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Question
            </button>
          </div>
        </div>
      </header>
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Questions"
            value={stats?.total_questions}
            icon={BookOpen}
            gradient="emerald"
            delay={0}
          />
          <StatCard
            label="Total Students"
            value={stats?.total_students}
            icon={Users}
            gradient="blue"
            delay={0.08}
          />
          {(user?.role === "superadmin" || user?.is_superuser) && (
            <StatCard
              label="Subscribers"
              value={stats?.subscribed_students}
              icon={TrendingUp}
              gradient="amber"
              delay={0.16}
            />
          )}
          <StatCard
            label="Average Score"
            value={
              stats?.average_score ? `${Math.round(stats.average_score)}%` : "—"
            }
            icon={BarChart2}
            gradient="rose"
            delay={0.24}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/questions">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
                <FileQuestion className="w-7 h-7 text-emerald-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">
                  Manage Questions
                </h3>
                <p className="text-sm text-gray-500">
                  View, edit, and create questions
                </p>
              </div>
            </Link>

            <Link href="/admin/bulk-upload">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group">
                <Upload className="w-7 h-7 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Bulk Upload</h3>
                <p className="text-sm text-gray-500">
                  Upload PDFs with questions
                </p>
              </div>
            </Link>

            <Link href="/admin/quizzes">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer group">
                <ClipboardList className="w-7 h-7 text-purple-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Manage Quizzes</h3>
                <p className="text-sm text-gray-500">
                  Create and organize quiz sets
                </p>
              </div>
            </Link>

            <Link href="/admin/analytics">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group">
                <BarChart3 className="w-7 h-7 text-orange-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Analytics</h3>
                <p className="text-sm text-gray-500">
                  View performance reports
                </p>
              </div>
            </Link>

            <Link href="/teacher/classrooms">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-pink-200 transition-all cursor-pointer group">
                <Users className="w-7 h-7 text-pink-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Classrooms</h3>
                <p className="text-sm text-gray-500">
                  Manage classes and students
                </p>
              </div>
            </Link>

            <Link href="/admin/settings">
              <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group">
                <Settings className="w-7 h-7 text-gray-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Settings</h3>
                <p className="text-sm text-gray-500">
                  Configure platform settings
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Payments (superadmin only) ── */}
        {(user?.role === "superadmin" || user?.is_superuser) && (
          <AdminPaymentsPanel />
        )}

        {/* ── Library Stats ── */}
        <GroupedStatsPanel
          onFilter={(subjectId, grade) => {
            setFilterSubject(String(subjectId));
            setFilterGrade(String(grade));
            document
              .querySelector("table")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* ── Questions Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Questions</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-700 text-sm"
                />
              </div>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className={`${selectCls} min-w-[140px]`}
              >
                <option value="">All Learning Areas</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className={`${selectCls} min-w-[120px]`}
              >
                <option value="">All Grades</option>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-28">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-28 px-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                No questions yet
              </h3>
              <p className="text-gray-400 text-sm mb-7 max-w-xs mx-auto">
                Start building your question library — create questions or
                import from CSV
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Question
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  <Upload className="w-4 h-4" /> Import CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">
                      Image
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Question
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Learning Area / Strand
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Grade
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Difficulty
                    </th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {questions.map((q, i) => (
                    <motion.tr
                      key={q.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        {q.question_image_url ? (
                          <img
                            src={q.question_image_url}
                            alt="Q"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                          {q.question_text}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-semibold text-gray-800">
                            {q.subject_name}
                          </span>
                          {q.topic_name && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {q.topic_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          Grade {q.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={q.question_type || "mcq"} />
                      </td>
                      <td className="px-6 py-4">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditQuestion(q)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing{" "}
                  <span className="font-semibold text-gray-600">
                    {questions.length}
                  </span>{" "}
                  question{questions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
