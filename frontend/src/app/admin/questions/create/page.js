"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MathEquationEditor from "@/components/MathEquationEditor";
import { Save, X } from "lucide-react";

const API = "http://127.0.0.1:8000/api";

export default function AddQuestionPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [saving, setSaving] = useState(false);

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
    loadSubjects();
  }, []);

  useEffect(() => {
    if (form.subject) {
      loadTopics(form.subject);
    }
  }, [form.subject]);

  const loadSubjects = async () => {
    try {
      const res = await fetch(`${API}/subjects/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await res.json();
      setSubjects(data);
    } catch (error) {
      console.error("Failed to load subjects");
    }
  };

  const loadTopics = async (subjectId) => {
    try {
      const res = await fetch(`${API}/topics/?subject=${subjectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await res.json();
      setTopics(data);
    } catch (error) {
      console.error("Failed to load topics");
    }
  };

  const handleSave = async () => {
    if (!form.topic || !form.question_text) {
      alert("Please fill in topic and question");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API}/admin/questions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert("✅ Question created successfully!");
        router.push("/admin");
      } else {
        alert("❌ Failed to create question");
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            ➕ Add New Question
          </h1>
          <p className="text-emerald-700">
            Create questions for your question bank
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 p-8 space-y-6">
          {/* Subject, Topic, Grade */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Subject *
              </label>
              <select
                value={form.subject}
                onChange={(e) =>
                  setForm({ ...form, subject: e.target.value, topic: "" })
                }
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
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
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Topic *
              </label>
              <select
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                disabled={!form.subject}
              >
                <option value="">Select</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Grade *
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
              >
                <option value="">Select</option>
                {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Type, Difficulty, Marks */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Question Type *
              </label>
              <select
                value={form.question_type}
                onChange={(e) =>
                  setForm({ ...form, question_type: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="structured">Structured</option>
                <option value="math">Math</option>
                <option value="essay">Essay</option>
                <option value="fill_blank">Fill in Blank</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Max Marks
              </label>
              <input
                type="number"
                value={form.max_marks}
                onChange={(e) =>
                  setForm({ ...form, max_marks: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                min="1"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-bold text-emerald-900 mb-2">
              Question Text *
            </label>
            <textarea
              value={form.question_text}
              onChange={(e) =>
                setForm({ ...form, question_text: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
              rows={4}
              placeholder="Enter the question..."
            />
          </div>

          {/* MCQ Options */}
          {form.question_type === "mcq" && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-emerald-900">
                Options
              </label>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={form.option_a}
                  onChange={(e) =>
                    setForm({ ...form, option_a: e.target.value })
                  }
                  placeholder="Option A"
                  className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={form.option_b}
                  onChange={(e) =>
                    setForm({ ...form, option_b: e.target.value })
                  }
                  placeholder="Option B"
                  className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={form.option_c}
                  onChange={(e) =>
                    setForm({ ...form, option_c: e.target.value })
                  }
                  placeholder="Option C"
                  className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={form.option_d}
                  onChange={(e) =>
                    setForm({ ...form, option_d: e.target.value })
                  }
                  placeholder="Option D"
                  className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-2">
                  Correct Answer
                </label>
                <select
                  value={form.correct_answer}
                  onChange={(e) =>
                    setForm({ ...form, correct_answer: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                >
                  <option value="">Select</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          )}

          {/* Math Answer with Editor */}
          {form.question_type === "math" && (
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
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

          {/* Other question types */}
          {["structured", "essay", "fill_blank"].includes(
            form.question_type,
          ) && (
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-2">
                Model Answer / Expected Answer *
              </label>
              <textarea
                value={form.correct_answer}
                onChange={(e) =>
                  setForm({ ...form, correct_answer: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
                rows={4}
                placeholder="Enter the correct/model answer..."
              />
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="block text-sm font-bold text-emerald-900 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={form.explanation}
              onChange={(e) =>
                setForm({ ...form, explanation: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500"
              rows={3}
              placeholder="Explain the answer..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Question
                </>
              )}
            </button>

            <button
              onClick={() => router.push("/admin")}
              className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
