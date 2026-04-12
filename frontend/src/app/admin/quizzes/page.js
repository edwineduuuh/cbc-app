"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Toast from "@/components/ui/Toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Filter,
  Hash,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Clock,
  Award,
  Users,
  FileText,
  ToggleLeft,
  ToggleRight,
  GraduationCap,
  Layers,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const GRADE_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-fuchsia-500 to-fuchsia-600",
  "from-lime-500 to-lime-600",
  "from-orange-500 to-orange-600",
];

export default function QuizzesManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState({});
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    search: "",
    quiz_type: "",
  });

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  // Load subjects
  useEffect(() => {
    if (authLoading || !user) return;
    const loadSubjects = async () => {
      try {
        const res = await fetchWithAuth(`${API}/subjects/`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    };
    loadSubjects();
  }, [authLoading, user]);

  // Load quizzes
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.search) params.append("search", filters.search);
    try {
      const res = await fetchWithAuth(
        `${API}/admin/quizzes/?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setQuizzes([]);
      showToast("Failed to load quizzes", "error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchQuizzes();
  }, [authLoading, user, fetchQuizzes]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quiz permanently? This cannot be undone."))
      return;
    try {
      const res = await fetchWithAuth(`${API}/admin/quizzes/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
        showToast("Quiz deleted successfully");
      } else {
        showToast("Error deleting quiz", "error");
      }
    } catch (err) {
      showToast("Error deleting quiz", "error");
    }
  };

  const handlePublishToggle = async (id, currentStatus) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/quizzes/${id}/publish/`, {
        method: "POST",
      });
      if (res.ok) {
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, is_active: !q.is_active } : q,
          ),
        );
        showToast(
          `Quiz ${!currentStatus ? "published" : "unpublished"} successfully!`,
        );
      } else {
        showToast("Error updating quiz", "error");
      }
    } catch (err) {
      showToast("Error updating quiz", "error");
    }
  };

  // Group quizzes by grade then subject
  const groupedQuizzes = useMemo(() => {
    let filtered = quizzes;
    if (filters.quiz_type) {
      filtered = filtered.filter((q) => q.quiz_type === filters.quiz_type);
    }
    const grouped = {};
    filtered.forEach((q) => {
      const grade = q.grade || "Unknown";
      if (!grouped[grade]) grouped[grade] = {};
      const subName = q.subject_name || "Uncategorized";
      if (!grouped[grade][subName]) grouped[grade][subName] = [];
      grouped[grade][subName].push(q);
    });
    return grouped;
  }, [quizzes, filters.quiz_type]);

  // Stats
  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => q.is_active).length;
    const drafts = total - published;
    const totalQuestions = quizzes.reduce(
      (sum, q) => sum + (q.total_questions || 0),
      0,
    );
    return { total, published, drafts, totalQuestions };
  }, [quizzes]);

  // Auto-expand grades on first load
  useEffect(() => {
    if (quizzes.length > 0) {
      setExpandedGrades((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const grades = {};
        Object.keys(groupedQuizzes).forEach((g) => {
          grades[g] = true;
        });
        return grades;
      });
    }
  }, [quizzes, groupedQuizzes]);

  const toggleGrade = (grade) =>
    setExpandedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const sortedGrades = Object.keys(groupedQuizzes).sort((a, b) => a - b);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quiz Management
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create and organize quizzes from your question bank
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <Link
                  href="/admin/quizzes/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Quiz
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox
              icon={<Layers className="w-5 h-5 text-emerald-600" />}
              bg="bg-emerald-100"
              value={stats.total}
              label="Total Quizzes"
            />
            <StatBox
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              bg="bg-green-100"
              value={stats.published}
              label="Published"
            />
            <StatBox
              icon={<FileText className="w-5 h-5 text-amber-600" />}
              bg="bg-amber-100"
              value={stats.drafts}
              label="Drafts"
            />
            <StatBox
              icon={<Hash className="w-5 h-5 text-blue-600" />}
              bg="bg-blue-100"
              value={stats.totalQuestions}
              label="Total Questions"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-white rounded-xl border p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filters.subject}
                      onChange={(e) =>
                        setFilters({ ...filters, subject: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Grades</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.quiz_type}
                      onChange={(e) =>
                        setFilters({ ...filters, quiz_type: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="topical">Topical</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                  {(filters.subject ||
                    filters.grade ||
                    filters.search ||
                    filters.quiz_type) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">Active:</span>
                      {filters.search && (
                        <FilterTag
                          label={`"${filters.search}"`}
                          color="bg-gray-100 text-gray-700"
                          onRemove={() =>
                            setFilters({ ...filters, search: "" })
                          }
                        />
                      )}
                      {filters.subject && (
                        <FilterTag
                          label={
                            subjects.find((s) => s.id == filters.subject)
                              ?.name || "Subject"
                          }
                          color="bg-blue-100 text-blue-700"
                          onRemove={() =>
                            setFilters({ ...filters, subject: "" })
                          }
                        />
                      )}
                      {filters.grade && (
                        <FilterTag
                          label={`Grade ${filters.grade}`}
                          color="bg-emerald-100 text-emerald-700"
                          onRemove={() => setFilters({ ...filters, grade: "" })}
                        />
                      )}
                      {filters.quiz_type && (
                        <FilterTag
                          label={
                            filters.quiz_type === "topical" ? "Topical" : "Exam"
                          }
                          color="bg-purple-100 text-purple-700"
                          onRemove={() =>
                            setFilters({ ...filters, quiz_type: "" })
                          }
                        />
                      )}
                      <button
                        onClick={() =>
                          setFilters({
                            subject: "",
                            grade: "",
                            search: "",
                            quiz_type: "",
                          })
                        }
                        className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-6 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-24 h-8 bg-gray-200 rounded-lg" />
                    <div className="w-16 h-6 bg-gray-100 rounded" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-48 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl border text-center py-16 px-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No quizzes yet
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {filters.subject || filters.grade || filters.search
                  ? "No quizzes match your current filters."
                  : "Create your first quiz to start testing students."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {(filters.subject || filters.grade || filters.search) && (
                  <button
                    onClick={() =>
                      setFilters({
                        subject: "",
                        grade: "",
                        search: "",
                        quiz_type: "",
                      })
                    }
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  href="/admin/quizzes/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Quiz
                </Link>
              </div>
            </div>
          ) : (
            /* Quizzes Grouped by Grade */
            <div className="space-y-4">
              {sortedGrades.map((grade, gi) => {
                const subjectsInGrade = groupedQuizzes[grade];
                const gradeTotal = Object.values(subjectsInGrade).reduce(
                  (sum, qs) => sum + qs.length,
                  0,
                );
                const isGradeExpanded = expandedGrades[grade] !== false;
                const colorClass = GRADE_COLORS[gi % GRADE_COLORS.length];

                return (
                  <div
                    key={grade}
                    className="bg-white rounded-xl border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGrade(grade)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`bg-linear-to-r ${colorClass} text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm`}
                        >
                          Grade {grade}
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          {gradeTotal} quiz{gradeTotal !== 1 ? "zes" : ""}
                        </span>
                        <span className="text-xs text-gray-400">&bull;</span>
                        <span className="text-sm text-gray-400">
                          {Object.keys(subjectsInGrade).length} learning area
                          {Object.keys(subjectsInGrade).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {isGradeExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isGradeExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t px-4 pb-4">
                            {Object.keys(subjectsInGrade)
                              .sort()
                              .map((subjectName) => (
                                <div key={subjectName} className="mt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    <h3 className="font-semibold text-gray-700 text-sm">
                                      {subjectName}
                                    </h3>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                      {subjectsInGrade[subjectName].length}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjectsInGrade[subjectName].map(
                                      (quiz) => (
                                        <QuizCard
                                          key={quiz.id}
                                          quiz={quiz}
                                          onDelete={handleDelete}
                                          onTogglePublish={handlePublishToggle}
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Sub-components ---

function QuizCard({ quiz, onDelete, onTogglePublish }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow group relative"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-gray-900 text-sm leading-tight truncate"
            title={quiz.title}
          >
            {quiz.title}
          </h4>
          {quiz.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {quiz.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${quiz.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
        >
          {quiz.is_active ? "Live" : "Draft"}
        </span>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quiz.topic_name && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
            {quiz.topic_name}
          </span>
        )}
        {quiz.quiz_type && (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${quiz.quiz_type === "exam" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
          >
            {quiz.quiz_type === "exam" ? "Exam" : "Topical"}
          </span>
        )}
        {quiz.quiz_type === "exam" && quiz.term && (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
            Term {quiz.term}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span>{quiz.total_questions || 0} Qs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{quiz.duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Award className="w-3.5 h-3.5 text-gray-400" />
          <span>{quiz.passing_score}% pass</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/quizzes/${quiz.id}/preview`}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/quizzes/${quiz.id}/edit`}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(quiz.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => onTogglePublish(quiz.id, quiz.is_active)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            quiz.is_active
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {quiz.is_active ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              Unpublish
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Publish
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, bg, value, label }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterTag({ label, color, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${color}`}
    >
      {label}
      <button onClick={onRemove}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
