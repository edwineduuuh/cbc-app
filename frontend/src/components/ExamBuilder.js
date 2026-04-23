"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-8bc4.up.railway.app/api";

/**
 * EXAM BUILDER - Select questions from question bank to create exams
 *
 * FEATURES:
 * - Filter by subject, topic, grade, difficulty
 * - Search questions
 * - Preview questions
 * - Select/deselect questions
 * - Drag to reorder
 * - Set total marks
 * - Save as exam
 */

export default function ExamBuilder({ onSave, initialQuestions = [] }) {
  // State
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(initialQuestions);

  // Filters
  const [filters, setFilters] = useState({
    subject: "",
    topic: "",
    grade: "",
    difficulty: "",
    type: "",
    search: "",
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Exam Details
  const [examDetails, setExamDetails] = useState({
    title: "",
    description: "",
    duration_minutes: 120,
    passing_score: 50,
    grade: "",
    subject: "",
    term: null,
    set_number: null,
  });

  // Load initial data
  useEffect(() => {
    loadSubjects();
    loadQuestions();
  }, []);

  // Load topics when subject changes
  useEffect(() => {
    if (filters.subject) {
      loadTopics(filters.subject);
    }
  }, [filters.subject]);

  // Reload questions when filters change
  useEffect(() => {
    loadQuestions();
  }, [filters]);

  const getToken = () => localStorage.getItem("accessToken");

  const loadSubjects = async () => {
    try {
      const res = await fetch(`${API}/subjects/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setSubjects(data);
    } catch (error) {
      console.error("Failed to load subjects:", error);
    }
  };

  const loadTopics = async (subjectId) => {
    try {
      const res = await fetch(`${API}/topics/?subject=${subjectId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setTopics(data);
    } catch (error) {
      console.error("Failed to load topics:", error);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.topic) params.append("topic", filters.topic);
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.type) params.append("type", filters.type);
    if (filters.search) params.append("search", filters.search);

    try {
      const res = await fetch(`${API}/admin/questions/?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setQuestions(data.results || data);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (question) => {
    const isSelected = selectedQuestions.some((q) => q.id === question.id);

    if (isSelected) {
      setSelectedQuestions(
        selectedQuestions.filter((q) => q.id !== question.id),
      );
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };

  const calculateTotalMarks = () => {
    return selectedQuestions.reduce(
      (total, q) => total + (q.max_marks || 1),
      0,
    );
  };

  const handleSaveExam = async () => {
    if (!examDetails.title || selectedQuestions.length === 0) {
      alert("Please provide exam title and select at least one question");
      return;
    }

    const examData = {
      ...examDetails,
      quiz_type: "exam",
      questions: selectedQuestions.map((q) => q.id),
      is_active: true,
    };

    try {
      const res = await fetch(`${API}/admin/quizzes/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(examData),
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `Exam created successfully! Total marks: ${calculateTotalMarks()}`,
        );
        onSave?.(data);

        // Reset form
        setSelectedQuestions([]);
        setExamDetails({
          title: "",
          description: "",
          duration_minutes: 120,
          passing_score: 50,
          grade: "",
          subject: "",
          quiz_type: "exam", // ✅ ADD THIS
          term: null, // ✅ ADD THIS
          set_number: null,
        });
      } else {
        alert("Failed to create exam");
      }
    } catch (error) {
      console.error("Error creating exam:", error);
      alert("Error creating exam");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen">
      {/* LEFT PANEL - Question Bank */}
      <div className="lg:col-span-2 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Question Bank</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters({ ...filters, subject: e.target.value, topic: "" })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Learning Areas</option>
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
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Grades</option>
                {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) =>
                  setFilters({ ...filters, difficulty: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="structured">Structured</option>
                <option value="math">Math</option>
                <option value="essay">Essay</option>
              </select>

              {topics.length > 0 && (
                <select
                  value={filters.topic}
                  onChange={(e) =>
                    setFilters({ ...filters, topic: e.target.value })
                  }
                  className="px-3 py-2 border rounded-lg text-sm col-span-2"
                >
                  <option value="">All Strands</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No questions found. Adjust filters or add questions.
            </div>
          ) : (
            <div className="divide-y">
              {questions.map((question) => {
                const isSelected = selectedQuestions.some(
                  (q) => q.id === question.id,
                );

                return (
                  <div
                    key={question.id}
                    onClick={() => toggleQuestion(question)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected
                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              question.question_type === "mcq"
                                ? "bg-green-100 text-green-700"
                                : question.question_type === "structured"
                                  ? "bg-blue-100 text-blue-700"
                                  : question.question_type === "math"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {question.question_type.toUpperCase()}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              question.difficulty === "easy"
                                ? "bg-green-100 text-green-700"
                                : question.difficulty === "hard"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {question.difficulty}
                          </span>

                          <span className="text-xs text-gray-500">
                            {question.max_marks} mark
                            {question.max_marks > 1 ? "s" : ""}
                          </span>
                        </div>

                        <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                          {question.question_text}
                        </p>

                        <p className="text-xs text-gray-500">
                          {question.topic?.subject?.name} • Grade{" "}
                          {question.topic?.grade} • {question.topic?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Selected Questions & Exam Details */}
      <div className="lg:col-span-1 flex flex-col overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Exam Details</h3>

          <div className="space-y-3">
            <input
              type="text"
              value={examDetails.title}
              onChange={(e) =>
                setExamDetails({ ...examDetails, title: e.target.value })
              }
              placeholder="Exam Title *"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            <textarea
              value={examDetails.description}
              onChange={(e) =>
                setExamDetails({ ...examDetails, description: e.target.value })
              }
              placeholder="Description"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={examDetails.grade}
                onChange={(e) =>
                  setExamDetails({ ...examDetails, grade: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Grade *</option>
                {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>

              <select
                value={examDetails.subject}
                onChange={(e) =>
                  setExamDetails({ ...examDetails, subject: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Learning Area *</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={examDetails.term || ""}
                onChange={(e) =>
                  setExamDetails({
                    ...examDetails,
                    term: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Term</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>

              <input
                type="number"
                value={examDetails.set_number || ""}
                onChange={(e) =>
                  setExamDetails({
                    ...examDetails,
                    set_number: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                placeholder="Set #"
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={examDetails.duration_minutes}
                onChange={(e) =>
                  setExamDetails({
                    ...examDetails,
                    duration_minutes: parseInt(e.target.value),
                  })
                }
                placeholder="Duration (min)"
                className="px-3 py-2 border rounded-lg text-sm"
              />

              <input
                type="number"
                value={examDetails.passing_score}
                onChange={(e) =>
                  setExamDetails({
                    ...examDetails,
                    passing_score: parseInt(e.target.value),
                  })
                }
                placeholder="Pass %"
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Selected Questions */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Selected Questions ({selectedQuestions.length})
              </h3>
              <div className="text-sm font-semibold text-blue-600">
                Total: {calculateTotalMarks()} marks
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedQuestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No questions selected yet.
                <br />
                Click questions from the left to add them.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedQuestions.map((question, idx) => (
                  <div
                    key={question.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                          {question.question_text}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{question.question_type.toUpperCase()}</span>
                          <span>•</span>
                          <span>
                            {question.max_marks} mark
                            {question.max_marks > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <button
              onClick={handleSaveExam}
              disabled={!examDetails.title || selectedQuestions.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Exam ({selectedQuestions.length} questions,{" "}
              {calculateTotalMarks()} marks)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
