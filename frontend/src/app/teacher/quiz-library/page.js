"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import {
  BookOpen,
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function TeacherQuizLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [deadline, setDeadline] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user?.role !== "teacher") router.push("/dashboard");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
      fetchClassrooms();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/teacher/quiz-library/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/classrooms/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch classrooms:", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedQuiz || selectedClassrooms.length === 0) return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/teacher/assign-quiz/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_id: selectedQuiz.id,
          classroom_ids: selectedClassrooms,
          deadline: deadline || null,
        }),
      });

      if (res.ok) {
        setToast({
          show: true,
          message: "Quiz assigned successfully!",
          type: "success",
        });
        setShowAssignModal(false);
        setSelectedQuiz(null);
        setSelectedClassrooms([]);
        setDeadline("");
      }
    } catch (error) {
      setToast({ show: true, message: "Failed to assign quiz", type: "error" });
    }
  };

  return (
    <>
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-4xl font-bold">Quiz Library</h1>
            <p className="text-emerald-100 text-lg mt-2">
              Browse admin-made quizzes and assign to your classes
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            </div>
          ) : quizzes.length === 0 ? (
            <Card className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No quizzes in library yet
              </h3>
              <p className="text-gray-500">
                Admin hasn't added any quizzes to the library
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full flex flex-col">
                    <div className="flex-1 p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {quiz.description || "No description"}
                      </p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>{quiz.subject_name}</span>
                          {quiz.topic_name && <span>• {quiz.topic_name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {quiz.total_questions} questions •{" "}
                            {quiz.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <Button
                        variant="primary"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setShowAssignModal(true);
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Assign to Class
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Assign Quiz</h2>
            <p className="text-gray-600 mb-4">{selectedQuiz?.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Classes
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {classrooms.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="checkbox"
                      value={c.id}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClassrooms([...selectedClassrooms, c.id]);
                        } else {
                          setSelectedClassrooms(
                            selectedClassrooms.filter((id) => id !== c.id),
                          );
                        }
                      }}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span>
                      {c.subject_name} - Grade {c.grade}
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleAssign}
                disabled={selectedClassrooms.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Assign
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedQuiz(null);
                  setSelectedClassrooms([]);
                  setDeadline("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
