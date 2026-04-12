"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { ArrowLeft, Plus, X, Save, Search } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";
export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchQuiz();
  }, [user, params.id]);

  useEffect(() => {
    if (quiz) {
      fetchAvailableQuestions();
    }
  }, [quiz]);

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
    } catch (error) {
      setToast({ show: true, message: "Error loading quiz", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(
        `${API}/admin/questions/manage/?subject=${quiz.subject}&grade=${quiz.grade}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableQuestions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
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

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...quiz,
          question_ids: selectedQuestions.map((q) => q.id),
        }),
      });

      if (res.ok) {
        setToast({
          show: true,
          message: "Quiz updated successfully!",
          type: "success",
        });
        setTimeout(() => router.push("/admin/quizzes"), 2000);
      } else {
        setToast({
          show: true,
          message: "Failed to update quiz",
          type: "error",
        });
      }
    } catch (error) {
      setToast({ show: true, message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const filteredQuestions = availableQuestions.filter(
    (q) =>
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
          <Button onClick={() => router.push("/admin/quizzes")}>
            Back to Quizzes
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />

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
              <span className="text-sm text-gray-600">
                {filteredQuestions.length} questions
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Questions List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredQuestions.map((q) => {
                const isSelected = selectedQuestions.find(
                  (sq) => sq.id === q.id,
                );
                return (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-lg ${
                      isSelected
                        ? "bg-gray-100 border-gray-300 opacity-50"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">
                          {q.question_text}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {q.topic_name} • {q.difficulty}
                        </p>
                      </div>
                      <button
                        onClick={() => addQuestion(q)}
                        disabled={isSelected}
                        className={`ml-2 p-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
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
                <p className="text-sm mt-2">
                  Add questions from the left panel
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {selectedQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">
                          {q.question_text}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {q.topic_name} • {q.difficulty}
                        </p>
                      </div>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
