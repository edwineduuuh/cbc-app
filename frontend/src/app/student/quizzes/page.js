"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { BookOpen, Clock, Calendar, Award } from "lucide-react";

const API = "https://cbc-backend-76im.onrender.com/api";

export default function StudentQuizzesPage() {
  useTheme(); // Force re-render when theme changes
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user?.role !== "student") router.push("/dashboard");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/student/quizzes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Split into B2C and classroom quizzes
      const b2cQuizzes = data.filter((q) => q.type === "b2c" || !q.assigned_to);
      const classroomQuizzes = data.filter(
        (q) => q.type === "classroom" || q.assigned_to,
      );

      setQuizzes(data);

      // You can add tabs to separate them:
      // - "My Quizzes" (classroom assigned)
      // - "Library" (B2C - all admin quizzes)
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold">My Quizzes</h1>
          <p className="text-blue-100 text-lg mt-2">
            Quizzes assigned to your classes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No quizzes assigned yet
            </h3>
            <p className="text-gray-500">
              Your teacher hasn't assigned any quizzes to your class
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
                    <p className="text-sm text-gray-600 mb-4">
                      {quiz.description || "No description"}
                    </p>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{quiz.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{quiz.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span>Pass: {quiz.passing_score}%</span>
                      </div>
                      {quiz.deadline && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Due: {new Date(quiz.deadline).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Assigned to: {quiz.assigned_to}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Link href={`/quizzes/${quiz.id}`}>
                      <Button variant="primary" className="w-full">
                        Start Quiz
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
