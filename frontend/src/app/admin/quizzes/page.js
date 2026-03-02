"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Toast from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export default function QuizzesManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    search: "",
  });

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user?.role === "student") router.push("/dashboard");
  }, [user, authLoading, router]);

  // Fetch data
  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchQuizzes();
    }
  }, [user, filters]);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API}/subjects/`);
      const data = await res.json();
      setSubjects(data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const params = new URLSearchParams(filters);

    try {
      const res = await fetch(`${API}/admin/quizzes/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
      setToast({
        show: true,
        message: "Failed to load quizzes",
        type: "error",
      });
      setTimeout(() => setToast({ ...toast, show: false }), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quiz permanently?")) return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/quizzes/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
        setToast({
          show: true,
          message: "Quiz deleted successfully",
          type: "success",
        });
        setTimeout(() => setToast({ ...toast, show: false }), 2000);
      }
    } catch (error) {
      setToast({ show: true, message: "Error deleting quiz", type: "error" });
      setTimeout(() => setToast({ ...toast, show: false }), 2000);
    }
  };

  const handlePublishToggle = async (id, currentStatus) => {
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch(`${API}/admin/quizzes/${id}/publish/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setQuizzes((prevQuizzes) =>
          prevQuizzes.map((quiz) =>
            quiz.id === id ? { ...quiz, is_active: !quiz.is_active } : quiz,
          ),
        );

        setToast({
          show: true,
          message: `Quiz ${!currentStatus ? "published" : "unpublished"} successfully!`,
          type: "success",
        });
        setTimeout(() => setToast({ ...toast, show: false }), 2000);
      }
    } catch (error) {
      setToast({ show: true, message: "Error updating quiz", type: "error" });
      setTimeout(() => setToast({ ...toast, show: false }), 2000);
    }
  };

  // Group quizzes by grade
  const quizzesByGrade = quizzes.reduce((acc, quiz) => {
    if (!acc[quiz.grade]) acc[quiz.grade] = [];
    acc[quiz.grade].push(quiz);
    return acc;
  }, {});

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Quiz Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Create and organize quizzes from your question bank
                </p>
              </div>
              <Link href="/admin/quizzes/create">
                <Button
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters({ ...filters, subject: e.target.value })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Grades</option>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>

              <Button onClick={fetchQuizzes} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </Card>

          {/* Quizzes by Grade */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : Object.keys(quizzesByGrade).length === 0 ? (
            <Card className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No quizzes yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first quiz to get started
              </p>
              <Link href="/admin/quizzes/create">
                <Button variant="primary">Create Quiz</Button>
              </Link>
            </Card>
          ) : (
            Object.keys(quizzesByGrade)
              .sort((a, b) => a - b)
              .map((grade) => (
                <div key={grade} className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg">
                      Grade {grade}
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                      {quizzesByGrade[grade].length} quiz
                      {quizzesByGrade[grade].length !== 1 ? "zes" : ""}
                    </span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzesByGrade[grade].map((quiz) => (
                      <motion.div
                        key={quiz.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card hover className="h-full flex flex-col">
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-gray-900 text-lg">
                                {quiz.title}
                              </h3>
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  quiz.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {quiz.is_active ? "Published" : "Draft"}
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {quiz.description || "No description"}
                            </p>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{quiz.subject_name}</span>
                                {quiz.topic_name && (
                                  <span>• {quiz.topic_name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Questions:</span>
                                <span>{quiz.total_questions || 0}</span>
                                <span className="mx-2">•</span>
                                <span className="font-medium">Time:</span>
                                <span>{quiz.duration_minutes} min</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Passing:</span>
                                <span>{quiz.passing_score}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
                            <div className="flex gap-1">
                              <Link href={`/admin/quizzes/${quiz.id}/preview`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(quiz.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>

                            <Button
                              variant={quiz.is_active ? "outline" : "primary"}
                              size="sm"
                              onClick={() =>
                                handlePublishToggle(quiz.id, quiz.is_active)
                              }
                            >
                              {quiz.is_active ? "Unpublish" : "Publish"}
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </>
  );
}
