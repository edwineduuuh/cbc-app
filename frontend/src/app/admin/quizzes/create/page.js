"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  Check,
  X,
  Sparkles,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function CreateQuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
    }
  }, [user, authLoading, router]);

  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [isB2C, setIsB2C] = useState(true);
  const [availableToTeachers, setAvailableToTeachers] = useState(true);

  useEffect(() => {
    fetch(`${API}/subjects/`)
      .then((res) => res.json())
      .then(setSubjects);
  }, []);

  useEffect(() => {
    if (subject && grade) {
      const token = localStorage.getItem("accessToken");
      setLoading(true);
      fetch(
        `${API}/admin/questions/manage/?subject=${subject}&grade=${grade}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
        .then((res) => res.json())
        .then((data) => setQuestions(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [subject, grade]);

  const toggleQuestion = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelectedIds(questions.map((q) => q.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const createQuiz = async () => {
    if (!title || !subject || !grade || selectedIds.length === 0) {
      alert("Please fill all fields and select at least one question");
      return;
    }

    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API}/admin/quizzes/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        subject: parseInt(subject),
        grade: parseInt(grade),
        duration_minutes: parseInt(duration),
        passing_score: parseInt(passingScore),
        is_active: true,
        is_b2c: isB2C,
        available_to_teachers: availableToTeachers,
        question_ids: selectedIds,
      }),
    });

    if (res.ok) {
      alert("✅ Quiz created successfully!");
      router.replace("/admin/quizzes");
    } else {
      const data = await res.json();
      alert(`❌ Failed: ${data.error || "Unknown error"}`);
    }
  };

  const selectedSubject = subjects.find((s) => s.id == subject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link
            href="/admin/quizzes"
            className="inline-flex items-center gap-2 text-indigo-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </Link>
          <h1 className="text-4xl font-bold">Create New Quiz</h1>
          <p className="text-indigo-100 text-lg mt-2">
            Bundle questions into quizzes for your students
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className="relative flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md ${
                      step > s
                        ? "bg-green-500 text-white"
                        : step === s
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-200"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {s === 1 ? "Quiz Details" : "Select Questions"}
                    </p>
                  </div>
                </div>
                {s < 2 && (
                  <div className="flex-1 mx-4 h-1 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: step > s ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {step === 1 ? (
          /* STEP 1: Quiz Details */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-100"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              Quiz Information
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                    placeholder="e.g., Grade 6 CRE - Life of Jesus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Learning Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  >
                    <option value="">Select Learning Area</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Grade Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> Duration (min)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                    min="1"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Award className="w-4 h-4 inline mr-1" /> Passing Score %
                  </label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Availability Settings */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Quiz Availability
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isB2C}
                      onChange={(e) => setIsB2C(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-900">
                        Available to all students (B2C)
                      </span>
                      <p className="text-sm text-gray-500">
                        All students can see and take this quiz immediately
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableToTeachers}
                      onChange={(e) => setAvailableToTeachers(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-900">
                        Available to teachers
                      </span>
                      <p className="text-sm text-gray-500">
                        Teachers can assign this quiz to their classes
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={() => setStep(2)}
                  disabled={!title || !subject || !grade}
                  className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${
                    !title || !subject || !grade
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  Continue to Question Selection →
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* STEP 2: Select Questions */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-3 gap-8"
          >
            {/* Question Bank */}
            <div className="col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Question Bank
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Grade {grade} • {selectedSubject?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAll}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No questions found
                    </h3>
                    <p className="text-gray-500">
                      Try adjusting your filters or create new questions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedIds.includes(q.id)
                            ? "border-indigo-500 bg-indigo-50 shadow-lg"
                            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-2">
                              {q.question_text}
                            </p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                {q.topic_name}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full ${
                                  q.difficulty === "easy"
                                    ? "bg-green-100 text-green-700"
                                    : q.difficulty === "medium"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                          </div>
                          {selectedIds.includes(q.id) && (
                            <Check className="w-6 h-6 text-indigo-600 ml-4" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Questions Panel */}
            <div>
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Selected</h2>
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedIds.length} / {questions.length}
                  </span>
                </div>

                {selectedIds.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No questions selected</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto mb-6">
                    {selectedIds.map((id, i) => {
                      const q = questions.find((q) => q.id === id);
                      return q ? (
                        <div
                          key={id}
                          className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                              {q.question_text}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleQuestion(id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={createQuiz}
                    disabled={selectedIds.length === 0}
                    className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${
                      selectedIds.length === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl"
                    }`}
                  >
                    ✨ Create Quiz
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    ← Back to Details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
