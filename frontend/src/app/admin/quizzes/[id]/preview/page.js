"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ArrowLeft, BookOpen, Clock, Award } from "lucide-react";
import Link from "next/link";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function QuizPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (
      !authLoading &&
      user &&
      !ALLOWED_ROLES.includes(user.role) &&
      !user.is_staff &&
      !user.is_superuser
    ) {
      router.replace("/dashboard");
      return;
    }
    if (!authLoading && user) fetchQuiz();
  }, [user, authLoading]);

  const fetchQuiz = async () => {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API}/admin/quizzes/${params.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setQuiz(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Quiz not found</h2>
          <Link href="/admin/quizzes">
            <Button>Back to Quizzes</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/admin/quizzes"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
          <p className="text-gray-600 mt-2">{quiz.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quiz Info */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Subject</p>
                <p className="font-semibold">{quiz.subject_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Questions</p>
                <p className="font-semibold">{quiz.questions?.length || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-semibold">{quiz.duration_minutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-gray-500">Passing Score</p>
                <p className="font-semibold">{quiz.passing_score}%</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {quiz.questions?.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {q.question_text}
                    </h3>
                    <div className="space-y-2">
                      {["A", "B", "C", "D"].map((option) => (
                        <div
                          key={option}
                          className={`p-3 rounded-lg border-2 ${
                            q.correct_answer === option
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                        >
                          <span className="font-semibold mr-2">{option}.</span>
                          {q[`option_${option.toLowerCase()}`]}
                          {q.correct_answer === option && (
                            <span className="ml-2 text-green-600 font-semibold">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong className="text-blue-900">
                            Explanation:
                          </strong>{" "}
                          {q.explanation}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                        {q.difficulty}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {q.topic_name}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Link href={`/admin/quizzes/${quiz.id}/edit`} className="flex-1">
            <Button variant="primary" className="w-full">
              Edit Quiz
            </Button>
          </Link>
          <Link href="/admin/quizzes" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to List
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
