"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

const API = "https://cbc-backend-76im.onrender.com/api";

export default function CreateQuizPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    grade: "",
    duration_minutes: 30,
    passing_score: 50,
    is_b2c: true,
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (formData.subject && formData.grade) {
      fetchQuestions();
    }
  }, [formData.subject, formData.grade]);

  const fetchSubjects = async () => {
    const res = await fetch(`${API}/subjects/`);
    const data = await res.json();
    setSubjects(data);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(
        `${API}/admin/questions/manage/?subject=${formData.subject}&grade=${formData.grade}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    );
  };

  const handleCreateQuiz = async () => {
    if (
      !formData.title ||
      !formData.subject ||
      !formData.grade ||
      selectedQuestions.length === 0
    ) {
      setToast({
        show: true,
        message: "Please fill all fields and select questions",
        type: "error",
      });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(`${API}/admin/quizzes/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: "", // Add this
          subject: parseInt(formData.subject),
          topic: null, // Add this
          grade: parseInt(formData.grade),
          duration_minutes: parseInt(formData.duration_minutes),
          passing_score: parseInt(formData.passing_score),
          is_active: true,
          owner_type: "admin", // Add this
          available_to_teachers: formData.is_b2c, // Change is_b2c to available_to_teachers
          questions: selectedQuestions, // ← CHANGE question_ids to questions
        }),
      });

      if (res.ok) {
        setToast({ show: true, message: "Quiz created!", type: "success" });
        setTimeout(() => router.push("/admin/quizzes"), 2000);
      } else {
        setToast({
          show: true,
          message: "Failed to create quiz",
          type: "error",
        });
      }
    } catch (error) {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />

      <h1 className="text-3xl font-bold mb-8">Create Quiz</h1>

      <div className="grid grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Quiz Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block mb-1">Learning Area</label>
              <select
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full p-2 border rounded"
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
              <label className="block mb-1">Grade</label>
              <select
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select</option>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-1">Passing Score %</label>
                <input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) =>
                    setFormData({ ...formData, passing_score: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="b2c"
                checked={formData.is_b2c}
                onChange={(e) =>
                  setFormData({ ...formData, is_b2c: e.target.checked })
                }
                className="w-5 h-5"
              />
              <label htmlFor="b2c">Available to all students (B2C)</label>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Select Questions</h2>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {formData.subject && formData.grade
                ? "No questions found"
                : "Select learning area and grade first"}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q.id)}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedQuestions.includes(q.id)
                      ? "bg-blue-50 border-blue-500"
                      : ""
                  }`}
                >
                  <p className="font-medium">{q.question_text}</p>
                  <p className="text-sm text-gray-600">
                    {q.topic_name} • {q.difficulty}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2">
              Selected: {selectedQuestions.length} questions
            </p>
            <Button
              variant="primary"
              onClick={handleCreateQuiz}
              loading={loading}
              disabled={selectedQuestions.length === 0}
              className="w-full"
            >
              Create Quiz
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
