"use client";
import AdminNav from "@/components/AdminNav";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  FileDown,
  X,
  Check,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";
export default function QuestionManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [editFilteredTopics, setEditFilteredTopics] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
    grade: "",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
  });

  const [filters, setFilters] = useState({
    subject: "",
    topic: "",
    grade: "",
    search: "",
  });

  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
   if (
     !user ||
     !["teacher", "admin", "superadmin", "school_admin"].includes(user.role)
   ) {
     router.push("/dashboard");
     return;
   }

    fetch("http://127.0.0.1:8000/api/subjects/")
      .then((res) => res.json())
      .then((data) => setSubjects(data));

    fetch("http://127.0.0.1:8000/api/topics/")
      .then((res) => res.json())
      .then((data) => setTopics(data));

    loadQuestions();
  }, [user, router]);

  useEffect(() => {
    if (formData.subject) {
      setFilteredTopics(topics.filter((t) => t.subject == formData.subject));
    }
  }, [formData.subject, topics]);

  useEffect(() => {
    if (editingQuestion && editingQuestion.subject) {
      setEditFilteredTopics(
        topics.filter((t) => t.subject == editingQuestion.subject),
      );
    }
  }, [editingQuestion?.subject, topics]);

  const loadQuestions = async () => {
    setLoading(true);

    const params = new URLSearchParams();

    // ← ADD THIS CHECK to skip invalid/empty filters
    if (
      filters.subject &&
      filters.subject !== "undefined" &&
      !isNaN(parseInt(filters.subject))
    ) {
      params.append("subject", filters.subject);
    }
    if (filters.topic && !isNaN(parseInt(filters.topic))) {
      params.append("topic", filters.topic);
    }
    if (filters.grade && !isNaN(parseInt(filters.grade))) {
      params.append("grade", filters.grade);
    }
    if (filters.difficulty) {
      params.append("difficulty", filters.difficulty);
    }
    if (filters.type) {
      params.append("type", filters.type);
    }
    if (filters.search) {
      params.append("search", filters.search);
    }

    const url = `${API}/admin/questions/manage/?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!res.ok) {
        console.error("Server error:", res.status, await res.text()); // ← better debug
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Load questions failed:", error);
      setQuestions([]);
      // Toast already handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadQuestions();
  }, [filters]);

  const resetForm = () => {
    setFormData({
      subject: "",
      topic: "",
      grade: "",
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "",
      explanation: "",
      difficulty: "medium",
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditingQuestion({ ...editingQuestion, [e.target.name]: e.target.value });
  };

const handleCreateQuestion = async (e) => {
  e.preventDefault();
  setLoading(true);

  const token = localStorage.getItem("accessToken");

  // Clean payload – send ONLY what backend accepts
  const payload = {
    topic: formData.topic ? parseInt(formData.topic) : null, // MUST be integer ID
    question_text: formData.question_text.trim(),
    option_a: formData.option_a.trim(),
    option_b: formData.option_b.trim(),
    option_c: formData.option_c.trim(),
    option_d: formData.option_d.trim(),
    correct_answer: formData.correct_answer.toUpperCase(),
    explanation: formData.explanation?.trim() || "",
    difficulty: formData.difficulty || "medium",
  };

  // Debug: log what we're sending
  console.log("Sending payload:", payload);

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/admin/questions/create/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (response.ok) {
      setToast({
        show: true,
        message: "Question created successfully!",
        type: "success",
      });
      setShowCreateModal(false);
      resetForm();
      loadQuestions();
    } else {
      console.error("Backend error response:", data);
      setToast({
        show: true,
        message:
          data.topic?.[0] ||
          data.detail ||
          JSON.stringify(data) ||
          "Failed to create question",
        type: "error",
      });
    }
  } catch (error) {
    console.error("Fetch error:", error);
    setToast({
      show: true,
      message: "Network error: " + error.message,
      type: "error",
    });
  }

  setLoading(false);
  setTimeout(() => setToast({ ...toast, show: false }), 3000);
};

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/admin/questions/${editingQuestion.id}/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: editingQuestion.subject,
            topic: editingQuestion.topic,
            grade: parseInt(editingQuestion.grade),
            question_text: editingQuestion.question_text,
            option_a: editingQuestion.option_a,
            option_b: editingQuestion.option_b,
            option_c: editingQuestion.option_c,
            option_d: editingQuestion.option_d,
            correct_answer: editingQuestion.correct_answer,
            explanation: editingQuestion.explanation || "",
            difficulty: editingQuestion.difficulty,
          }),
        },
      );

      if (response.ok) {
        setToast({
          show: true,
          message: "Question updated successfully!",
          type: "success",
        });
        setShowEditModal(false);
        setEditingQuestion(null);
        loadQuestions();
      } else {
        const data = await response.json();
        setToast({ show: true, message: JSON.stringify(data), type: "error" });
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Error updating question",
        type: "error",
      });
    }

    setLoading(false);
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (
      !confirm(
        "Are you sure you want to delete this question? This cannot be undone.",
      )
    ) {
      return;
    }

    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/admin/questions/${questionId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        setToast({
          show: true,
          message: "Question deleted successfully!",
          type: "success",
        });
        loadQuestions();
      } else {
        setToast({
          show: true,
          message: "Error deleting question",
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Error deleting question",
        type: "error",
      });
    }

    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

 const openEditModal = async (questionSummary) => {
   try {
     const token = localStorage.getItem("accessToken");
     const res = await fetch(
       `http://127.0.0.1:8000/api/admin/questions/${questionSummary.id}/`,
       {
         headers: { Authorization: `Bearer ${token}` },
       },
     );

     if (!res.ok) {
       throw new Error(`HTTP ${res.status}`);
     }

     const fullQuestion = await res.json();
     console.log("Full question loaded:", fullQuestion); // for debug

     setEditingQuestion(fullQuestion);
     setShowEditModal(true);
   } catch (error) {
     console.error("Failed to load full question:", error);
     alert("Could not load question details");
   }
 };

  const handleBulkImport = async (e) => {
    e.preventDefault();

    if (!csvFile) {
      setToast({
        show: true,
        message: "Please select a CSV file",
        type: "error",
      });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const formDataObj = new FormData();
    formDataObj.append("file", csvFile);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/admin/questions/bulk-import/",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj,
        },
      );

      const data = await response.json();

      if (response.ok) {
        setToast({ show: true, message: data.message, type: "success" });
        setShowBulkImport(false);
        setCsvFile(null);
        loadQuestions();
      } else {
        setToast({ show: true, message: data.error, type: "error" });
      }
    } catch (error) {
      setToast({
        show: true,
        message: "Error importing questions",
        type: "error",
      });
    }

    setLoading(false);
    setTimeout(() => setToast({ ...toast, show: false }), 5000);
  };

  const downloadTemplate = () => {
    const csv = `subject_id,topic_id,grade,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty
1,1,8,What is 2+2?,2,3,4,5,C,Addition is combining numbers,easy`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_template.csv";
    a.click();
  };

  // Group questions by grade - with safety check
  const questionsByGrade = Array.isArray(questions)
    ? questions.reduce((acc, q) => {
        if (!acc[q.grade]) acc[q.grade] = [];
        acc[q.grade].push(q);
        return acc;
      }, {})
    : {};

  if (!user || user.role !== "teacher") return null;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Question Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Create and manage your quiz questions
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBulkImport(true)}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters({ ...filters, subject: e.target.value })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Subjects</option>
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Grades</option>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>

              <Button onClick={loadQuestions} variant="outline">
                Refresh
              </Button>
            </div>
          </Card>

          {/* Questions by Grade */}
          {Object.keys(questionsByGrade).length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Questions Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first question to get started
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            </Card>
          ) : (
            Object.keys(questionsByGrade)
              .sort((a, b) => a - b)
              .map((grade) => (
                <div key={grade} className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg">
                      Grade {grade}
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                      {questionsByGrade[grade].length} question
                      {questionsByGrade[grade].length !== 1 ? "s" : ""}
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {questionsByGrade[grade].map((q, index) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                  {q.subject_name}
                                </span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">
                                  {q.topic_name}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                                  {q.difficulty}
                                </span>
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                                {q.question_text}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div
                                  className={`p-2 rounded ${q.correct_answer === "A" ? "bg-green-50 border border-green-200 font-semibold text-green-800" : "bg-gray-50 text-gray-700"}`}
                                >
                                  <span className="font-bold">A.</span>{" "}
                                  {q.option_a}
                                  {q.correct_answer === "A" && (
                                    <Check className="w-4 h-4 inline ml-2 text-green-600" />
                                  )}
                                </div>
                                <div
                                  className={`p-2 rounded ${q.correct_answer === "B" ? "bg-green-50 border border-green-200 font-semibold text-green-800" : "bg-gray-50 text-gray-700"}`}
                                >
                                  <span className="font-bold">B.</span>{" "}
                                  {q.option_b}
                                  {q.correct_answer === "B" && (
                                    <Check className="w-4 h-4 inline ml-2 text-green-600" />
                                  )}
                                </div>
                                <div
                                  className={`p-2 rounded ${q.correct_answer === "C" ? "bg-green-50 border border-green-200 font-semibold text-green-800" : "bg-gray-50 text-gray-700"}`}
                                >
                                  <span className="font-bold">C.</span>{" "}
                                  {q.option_c}
                                  {q.correct_answer === "C" && (
                                    <Check className="w-4 h-4 inline ml-2 text-green-600" />
                                  )}
                                </div>
                                <div
                                  className={`p-2 rounded ${q.correct_answer === "D" ? "bg-green-50 border border-green-200 font-semibold text-green-800" : "bg-gray-50 text-gray-700"}`}
                                >
                                  <span className="font-bold">D.</span>{" "}
                                  {q.option_d}
                                  {q.correct_answer === "D" && (
                                    <Check className="w-4 h-4 inline ml-2 text-green-600" />
                                  )}
                                </div>
                              </div>
                              {q.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                                  <strong className="text-blue-900">
                                    Explanation:
                                  </strong>{" "}
                                  <span className="text-gray-700">
                                    {q.explanation}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(q)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Create Question Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Create New Question</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateQuestion} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Topic *
                      </label>
                      <select
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        required
                        disabled={!formData.subject}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select Topic</option>
                        {filteredTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade *
                      </label>
                      <select
                        name="grade"
                        value={formData.grade}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select Grade</option>
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difficulty *
                      </label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question *
                    </label>
                    <textarea
                      name="question_text"
                      value={formData.question_text}
                      onChange={handleChange}
                      required
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter the question..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Option A *"
                      name="option_a"
                      value={formData.option_a}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Option B *"
                      name="option_b"
                      value={formData.option_b}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Option C *"
                      name="option_c"
                      value={formData.option_c}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Option D *"
                      name="option_d"
                      value={formData.option_d}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correct Answer *
                    </label>
                    <select
                      name="correct_answer"
                      value={formData.correct_answer}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select Correct Answer</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Explanation (Optional)
                    </label>
                    <textarea
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Explain why this is the correct answer..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      loading={loading}
                      variant="primary"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Create Question
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Question Modal */}
        <AnimatePresence>
          {showEditModal && editingQuestion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Edit Question</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingQuestion(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleEditQuestion} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={editingQuestion.subject}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Topic *
                      </label>
                      <select
                        name="topic"
                        value={editingQuestion.topic}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select Topic</option>
                        {editFilteredTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade *
                      </label>
                      <select
                        name="grade"
                        value={editingQuestion.grade}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difficulty *
                      </label>
                      <select
                        name="difficulty"
                        value={editingQuestion.difficulty}
                        onChange={handleEditChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question *
                    </label>
                    <textarea
                      name="question_text"
                      value={editingQuestion.question_text}
                      onChange={handleEditChange}
                      required
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option A *
                      </label>
                      <input
                        name="option_a"
                        value={editingQuestion.option_a}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option B *
                      </label>
                      <input
                        name="option_b"
                        value={editingQuestion.option_b}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option C *
                      </label>
                      <input
                        name="option_c"
                        value={editingQuestion.option_c}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option D *
                      </label>
                      <input
                        name="option_d"
                        value={editingQuestion.option_d}
                        onChange={handleEditChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correct Answer *
                    </label>
                    <select
                      name="correct_answer"
                      value={editingQuestion.correct_answer}
                      onChange={handleEditChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Explanation
                    </label>
                    <textarea
                      name="explanation"
                      value={editingQuestion.explanation || ""}
                      onChange={handleEditChange}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      loading={loading}
                      variant="primary"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Update Question
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingQuestion(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bulk Import Modal */}
        <AnimatePresence>
          {showBulkImport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-8 max-w-lg w-full"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Bulk Import Questions</h2>
                  <button
                    onClick={() => setShowBulkImport(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Upload a CSV file with your questions. Download the template
                    to see the required format.
                  </p>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    size="sm"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <form onSubmit={handleBulkImport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CSV File
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      loading={loading}
                      variant="primary"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Import
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowBulkImport(false);
                        setCsvFile(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
