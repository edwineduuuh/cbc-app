"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  Crown,
  Sparkles,
  ArrowLeft,
  Clock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-8bc4.up.railway.app/api";

// Grade levels
const GRADE_LEVELS = [
  {
    id: "primary",
    name: "Primary",
    grades: [4, 5, 6],
    color: "from-blue-500 to-cyan-500",
    icon: "🎒",
  },
  {
    id: "junior",
    name: "Junior Secondary",
    grades: [7, 8, 9],
    color: "from-purple-500 to-pink-500",
    icon: "📚",
  },
  {
    id: "senior",
    name: "Senior Secondary",
    grades: [10, 11, 12],
    color: "from-orange-500 to-red-500",
    icon: "🎓",
  },
];

export default function PremiumExplore() {
  const router = useRouter();
  const [view, setView] = useState("levels"); // "levels" | "grades" | "subjects" | "quizzes"
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch subjects when grade is selected
  useEffect(() => {
    if (selectedGrade && view === "subjects") {
      fetchSubjects();
    }
  }, [selectedGrade, view]);

  // Fetch quizzes when subject is selected
  useEffect(() => {
    if (selectedSubject && view === "quizzes") {
      fetchQuizzes();
    }
  }, [selectedSubject, view]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/subjects/`);
      const allSubjects = await response.json();

      // Filter subjects that have topics for this grade
      const filteredSubjects = [];

      for (const subject of allSubjects) {
        // Check if subject has topics for selected grade
        const topicsResponse = await fetch(
          `${API}/topics/?subject=${subject.id}`,
        );
        const topics = await topicsResponse.json();

        const hasGradeTopics = topics.some(
          (topic) => topic.grade === selectedGrade,
        );

        if (hasGradeTopics) {
          // Count quizzes for this subject+grade
          const quizzesResponse = await fetch(
            `${API}/quizzes/?subject=${subject.id}&grade=${selectedGrade}`,
          );
          const quizzes = await quizzesResponse.json();

          filteredSubjects.push({
            ...subject,
            quiz_count: quizzes.length,
          });
        }
      }

      setSubjects(filteredSubjects);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API}/quizzes/?subject=${selectedSubject.id}&grade=${selectedGrade}`,
      );
      const data = await response.json();
      setQuizzes(data);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
    setView("grades");
  };

  const handleGradeClick = (grade) => {
    setSelectedGrade(grade);
    setView("subjects");
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setView("quizzes");
  };

  const handleBack = () => {
    if (view === "quizzes") {
      setView("subjects");
      setSelectedSubject(null);
      setQuizzes([]);
    } else if (view === "subjects") {
      setView("grades");
      setSelectedGrade(null);
      setSubjects([]);
    } else if (view === "grades") {
      setView("levels");
      setSelectedLevel(null);
    }
  };

  const startQuiz = (quizId) => {
    router.push(`/student/quiz/${quizId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== "levels" && (
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="font-display text-lg font-bold text-gray-900">
                {view === "levels" && "Choose Education Level"}
                {view === "grades" && `${selectedLevel?.name}`}
                {view === "subjects" && `Grade ${selectedGrade} Learning Areas`}
                {view === "quizzes" && selectedSubject?.name}
              </h1>
              {view === "quizzes" && (
                <p className="text-xs text-gray-500">Grade {selectedGrade}</p>
              )}
            </div>
          </div>

          {/* Premium Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-bold">Unlimited</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* LEVELS VIEW */}
          {view === "levels" && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {GRADE_LEVELS.map((level, index) => (
                <motion.button
                  key={level.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleLevelClick(level)}
                  className="group relative overflow-hidden rounded-3xl p-8 bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-2xl transition-all duration-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${level.color} opacity-0 group-hover:opacity-10 transition-opacity`}
                  />
                  <div className="relative text-center">
                    <div className="text-6xl mb-4">{level.icon}</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {level.name}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Grades {level.grades[0]}-
                      {level.grades[level.grades.length - 1]}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <span>Explore learning areas</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* GRADES VIEW */}
          {view === "grades" && (
            <motion.div
              key="grades"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
            >
              {selectedLevel?.grades.map((grade, index) => (
                <motion.button
                  key={grade}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleGradeClick(grade)}
                  className="group relative overflow-hidden rounded-2xl p-6 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${selectedLevel.color} opacity-0 group-hover:opacity-10 transition-opacity`}
                  />
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedLevel.color} flex items-center justify-center mx-auto mb-4`}
                    >
                      <span className="text-2xl font-bold text-white">
                        {grade}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      Grade {grade}
                    </p>
                  </div>
                  <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* SUBJECTS VIEW */}
          {view === "subjects" && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto" />
                  <p className="text-gray-500 mt-4">
                    Loading learning areas...
                  </p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No learning areas available for Grade {selectedGrade} yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <motion.button
                      key={subject.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSubjectClick(subject)}
                      className="group relative overflow-hidden rounded-2xl p-6 bg-white border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">
                            {subject.icon || "📚"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">
                              {subject.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {subject.quiz_count} quizzes
                            </p>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="absolute bottom-4 right-4 w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* QUIZZES VIEW */}
          {view === "quizzes" && (
            <motion.div
              key="quizzes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto" />
                  <p className="text-gray-500 mt-4">Loading quizzes...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No quizzes available yet for {selectedSubject?.name} Grade{" "}
                    {selectedGrade}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizzes.map((quiz, index) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                            {quiz.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {quiz.question_count || 0} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.time_limit || 30} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-4 h-4" />
                              {quiz.difficulty || "Medium"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => startQuiz(quiz.id)}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-sm transition-all shadow-lg shadow-green-500/30"
                        >
                          Start Quiz
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
