"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  CheckCircle,
  Clock,
  Target,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Lock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ExplorePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState("level");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [freeAttemptsLeft, setFreeAttemptsLeft] = useState(3);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const levels = [
    { id: "primary", name: "PRIMARY SCHOOL", grades: [4, 5, 6], active: true },
    { id: "junior", name: "JUNIOR SCHOOL", grades: [7, 8, 9], active: true },
    {
      id: "senior",
      name: "SENIOR SCHOOL",
      grades: [10, 11, 12],
      active: false,
    },
  ];

  

 useEffect(() => {
   if (step === "subject" && selectedGrade) {
     setLoading(true);
     const token = localStorage.getItem("accessToken");
     fetch(`${API}/subjects/?grade=${selectedGrade}`, {
       headers: { Authorization: `Bearer ${token}` },
     })
       .then((r) => r.json())
       .then((data) => {
         setSubjects(Array.isArray(data) ? data : []);
         setLoading(false);
       })
       .catch(() => setLoading(false));
   }
 }, [step, selectedGrade]);

  useEffect(() => {
    if (
      step === "topics" &&
      selectedGrade &&
      selectedSubject &&
      selectedType === "topical"
    ) {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      fetch(
        `${API}/topics/?subject=${selectedSubject.id}&grade=${selectedGrade}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
        .then((r) => r.json())
        .then((data) => {
          setTopics(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [step, selectedGrade, selectedSubject, selectedType]);

  useEffect(() => {
    if (step === "quizzes" && selectedGrade && selectedSubject) {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams({
        grade: selectedGrade,
        subject: selectedSubject.id,
      });

      if (selectedType === "topical") {
        params.append("quiz_type", "topical");
      } else if (selectedType === "assessment") {
        params.append("quiz_type", "exam");
      }

      // if (selectedTopic) {
      //   params.append("topic", selectedTopic.id);
      // }

      fetch(`${API}/quizzes/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setQuizzes(Array.isArray(data) ? data : data.results || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [step, selectedGrade, selectedSubject, selectedType, selectedTopic]);

  const handleLevelSelect = (level) => {
    if (!level.active) return;
    setSelectedLevel(level);
    setStep("grade");
  };

  const handleGradeSelect = (grade) => {
    setSelectedGrade(grade);
    setStep("subject");
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setStep("type");
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    if (type === "topical") {
      setStep("topics");
    } else {
      setStep("quizzes");
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setStep("quizzes");
  };

  const handleQuizClick = (quiz) => {
    if (!isSubscribed && freeAttemptsLeft <= 0) {
      alert("Subscribe to continue - KES 500/month");
      router.push("/subscribe");
      return;
    }
    router.push(`/quizzes/${quiz.id}`);
  };

  const handleBack = () => {
    if (step === "grade") {
      setStep("level");
      setSelectedLevel(null);
    } else if (step === "subject") {
      setStep("grade");
      setSelectedGrade(null);
    } else if (step === "type") {
      setStep("subject");
      setSelectedSubject(null);
    } else if (step === "topics") {
      setStep("type");
      setSelectedType(null);
    } else if (step === "quizzes") {
      if (selectedType === "topical") {
        setStep("topics");
        setSelectedTopic(null);
      } else {
        setStep("type");
        setSelectedType(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {step !== "level" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {isSubscribed ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold">
                <CheckCircle className="w-4 h-4" />
                Unlimited Access
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold">
                <Clock className="w-4 h-4" />
                {freeAttemptsLeft} Free Quiz
                {freeAttemptsLeft !== 1 ? "zes" : ""} Left
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step === "level" && (
            <motion.div
              key="level"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select School Level
              </h1>
              <p className="text-gray-500 mb-8">
                Choose your current education level
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleLevelSelect(level)}
                    disabled={!level.active}
                    className={`group p-8 bg-white rounded-2xl border-2 transition-all text-left relative ${
                      level.active
                        ? "border-gray-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer"
                        : "border-gray-100 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {!level.active && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        COMING SOON
                      </div>
                    )}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform ${
                        level.active
                          ? "bg-emerald-100 group-hover:scale-110"
                          : "bg-gray-100"
                      }`}
                    >
                      {level.active ? (
                        <GraduationCap className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {level.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Grades {level.grades[0]}-
                      {level.grades[level.grades.length - 1]}
                    </p>
                    {level.active && (
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all mt-4" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "grade" && (
            <motion.div
              key="grade"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select Your Grade
              </h1>
              <p className="text-gray-500 mb-8">{selectedLevel?.name}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedLevel?.grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeSelect(grade)}
                    className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {grade}
                      </span>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-gray-500">Grade {grade}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "subject" && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Grade {selectedGrade} Subjects
              </h1>
              <p className="text-gray-500 mb-8">Choose a subject to practice</p>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => handleSubjectSelect(subject)}
                      className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{subject.icon || "📚"}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">
                            {subject.name}
                          </h3>
                          {/* <p className="text-sm text-gray-500">
                           
                          </p> */}
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === "type" && (
            <motion.div
              key="type"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedSubject?.name}
              </h1>
              <p className="text-gray-500 mb-8">Choose your practice type</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => handleTypeSelect("topical")}
                  className="group p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Topical Quizzes
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Practice specific topics one at a time
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                    Start Practice
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect("assessment")}
                  className="group p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Full Assessments
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Exam-style questions across multiple topics
                  </p>
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
                    Start Assessment
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === "topics" && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select Topic
              </h1>
              <p className="text-gray-500 mb-8">
                {selectedSubject?.name} - Grade {selectedGrade}
              </p>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
                </div>
              ) : topics.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-200">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">
                      No topics available yet
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                      But you can still see all quizzes for this subject!
                    </p>
                    <button
                      onClick={() => {
                        setSelectedTopic(null);
                        setStep("quizzes");
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                    >
                      View All Quizzes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicSelect(topic)}
                      className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">
                            {topic.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {topic.quiz_count || 0} quiz
                            {topic.quiz_count !== 1 ? "zes" : ""} available
                          </p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === "quizzes" && (
            <motion.div
              key="quizzes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedType === "topical" && selectedTopic
                  ? selectedTopic.name
                  : selectedType === "topical"
                    ? "All Topical Quizzes"
                    : "Assessments"}
              </h1>
              <p className="text-gray-500 mb-8">
                {selectedSubject?.name} - Grade {selectedGrade}
              </p>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">
                    No quizzes yet
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Check back soon - we're adding more content!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => handleQuizClick(quiz)}
                      className="group w-full p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">
                            {quiz.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{quiz.total_questions || 0} questions</span>
                            <span>•</span>
                            <span>{quiz.duration_minutes || 30} mins</span>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
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
