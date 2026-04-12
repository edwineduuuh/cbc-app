"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/ui/Toast";
import {
  BarChart3, Users, GraduationCap, BookOpen, FileText, Award,
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Loader2,
  ChevronDown, ChevronRight, Hash, Clock, CheckCircle, XCircle,
  Layers, Target, Zap, PieChart, ArrowRight, RefreshCw,
  Star, Activity,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-76im.onrender.com/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [adminStats, setAdminStats] = useState(null);
  const [questionStats, setQuestionStats] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  // Load all stats in parallel
  useEffect(() => {
    if (authLoading || !user) return;
    const loadAll = async () => {
      setLoading(true);
      try {
        const [statsRes, qAnalyticsRes, groupRes] = await Promise.all([
          fetchWithAuth(`${API}/admin/stats/`),
          fetchWithAuth(`${API}/admin/analytics/questions/`),
          fetchWithAuth(`${API}/admin/questions/stats/`),
        ]);

        if (statsRes.ok) setAdminStats(await statsRes.json());
        if (qAnalyticsRes.ok) setQuestionStats(await qAnalyticsRes.json());
        if (groupRes.ok) setGroupStats(await groupRes.json());
      } catch (err) {
        console.error("Analytics load error:", err);
        showToast("Failed to load analytics", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [authLoading, user]);

  // Load AI suggestions
  const loadSuggestions = useCallback(async () => {
    if (!selectedSubject || !selectedGrade) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API}/admin/analytics/suggestions/?subject=${selectedSubject}&grade=${selectedGrade}`
      );
      if (res.ok) setSuggestions(await res.json());
    } catch (err) {
      console.error("Suggestions error:", err);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [selectedSubject, selectedGrade]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "questions", label: "Question Health", icon: Target },
    { id: "subjects", label: "By Learning Area", icon: BookOpen },
    { id: "insights", label: "AI Insights", icon: Lightbulb },
  ];

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.show} onClose={() => setToast((t) => ({ ...t, show: false }))} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">Platform performance and learning insights</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />Refresh
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />{tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? <LoadingSkeleton /> : (
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <OverviewTab stats={adminStats} questionStats={questionStats} groupStats={groupStats} />
                </motion.div>
              )}
              {activeTab === "questions" && (
                <motion.div key="questions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <QuestionHealthTab stats={questionStats} adminStats={adminStats} />
                </motion.div>
              )}
              {activeTab === "subjects" && (
                <motion.div key="subjects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <SubjectTab groupStats={groupStats} />
                </motion.div>
              )}
              {activeTab === "insights" && (
                <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <InsightsTab
                    subjects={groupStats?.by_subject || []}
                    suggestions={suggestions}
                    suggestionsLoading={suggestionsLoading}
                    selectedSubject={selectedSubject}
                    selectedGrade={selectedGrade}
                    onSubjectChange={setSelectedSubject}
                    onGradeChange={setSelectedGrade}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERVIEW TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OverviewTab({ stats, questionStats, groupStats }) {
  if (!stats) return <EmptyState message="No overview data available." />;

  const avgScore = stats.average_score ? Number(stats.average_score).toFixed(1) : "0";
  const scoreColor = stats.average_score >= 70 ? "text-green-600" : stats.average_score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={stats.total_students} label="Total Students" subtitle={`${stats.total_teachers} teachers`} />
        <KPICard icon={<FileText className="w-6 h-6" />} iconBg="bg-emerald-100 text-emerald-600" value={stats.total_questions} label="Questions in Bank" subtitle={`${stats.total_quizzes} active quizzes`} />
        <KPICard icon={<CheckCircle className="w-6 h-6" />} iconBg="bg-purple-100 text-purple-600" value={stats.total_attempts?.toLocaleString()} label="Quiz Attempts" subtitle="Completed" />
        <KPICard icon={<Award className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={`${avgScore}%`} valueColor={scoreColor} label="Avg Score" subtitle={Number(avgScore) >= 70 ? "Good performance" : "Needs improvement"} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions by Subject */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />Questions by Learning Area
          </h3>
          {stats.questions_by_subject?.length > 0 ? (
            <div className="space-y-3">
              {stats.questions_by_subject.slice(0, 8).map((item, i) => {
                const pct = stats.total_questions > 0 ? (item.count / stats.total_questions * 100).toFixed(0) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium truncate">{item.topic__subject__name || "Unknown"}</span>
                      <span className="text-gray-500 ml-2 shrink-0">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full bg-blue-500 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No subject data available.</p>}
        </div>

        {/* Questions by Grade */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-500" />Questions by Grade
          </h3>
          {stats.questions_by_grade?.length > 0 ? (
            <div className="space-y-3">
              {stats.questions_by_grade.map((item, i) => {
                const pct = stats.total_questions > 0 ? (item.count / stats.total_questions * 100).toFixed(0) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">Grade {item.topic__grade}</span>
                      <span className="text-gray-500">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No grade data available.</p>}
        </div>
      </div>

      {/* Difficulty Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" />Difficulty Distribution
          </h3>
          <DifficultyChart data={stats.questions_by_difficulty} total={stats.total_questions} />
        </div>

        {/* Recent Activity */}
        {groupStats?.recent && (
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />Recent Activity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <RecencyCard label="Today" value={groupStats.recent.today} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <RecencyCard label="Last 7 Days" value={groupStats.recent.last_7_days} color="bg-blue-50 text-blue-700 border-blue-200" />
              <RecencyCard label="Last 30 Days" value={groupStats.recent.last_30_days} color="bg-purple-50 text-purple-700 border-purple-200" />
              <RecencyCard label="All Time" value={groupStats.recent.total} color="bg-gray-50 text-gray-700 border-gray-200" />
            </div>
          </div>
        )}
      </div>

      {/* Question Health Summary */}
      {questionStats && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />Question Health at a Glance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <HealthCard label="Total Questions" value={questionStats.total} icon={<FileText className="w-5 h-5" />} color="bg-gray-50 text-gray-600" />
            <HealthCard label="Mastered" value={questionStats.mastered} icon={<Star className="w-5 h-5" />} color="bg-green-50 text-green-600" desc="Students score >80%" />
            <HealthCard label="High Miss Rate" value={questionStats.highMissRate} icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-50 text-red-600" desc="Students score <40%" />
            <HealthCard label="Unused" value={questionStats.unused} icon={<XCircle className="w-5 h-5" />} color="bg-amber-50 text-amber-600" desc="Not in any quiz" />
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUESTION HEALTH TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function QuestionHealthTab({ stats, adminStats }) {
  if (!stats) return <EmptyState message="No question analytics available." />;

  const total = stats.total || 1;
  const masteredPct = ((stats.mastered / total) * 100).toFixed(1);
  const highMissPct = ((stats.highMissRate / total) * 100).toFixed(1);
  const unusedPct = ((stats.unused / total) * 100).toFixed(1);
  const healthyCount = total - stats.highMissRate - stats.unused;
  const healthyPct = ((healthyCount / total) * 100).toFixed(1);

  const segments = [
    { label: "Mastered (>80%)", value: stats.mastered, pct: masteredPct, color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
    { label: "Healthy", value: healthyCount, pct: healthyPct, color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
    { label: "High Miss (<40%)", value: stats.highMissRate, pct: highMissPct, color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
    { label: "Unused", value: stats.unused, pct: unusedPct, color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Stacked bar */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Question Performance Breakdown</h3>
        <p className="text-sm text-gray-500 mb-6">How students perform on questions across your platform</p>

        <div className="h-8 rounded-full overflow-hidden flex mb-6">
          {segments.map((seg) => (
            <motion.div
              key={seg.label}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.8 }}
              className={`${seg.color} relative group`}
              title={`${seg.label}: ${seg.value}`}
            >
              {Number(seg.pct) > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{seg.pct}%</span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {segments.map((seg) => (
            <div key={seg.label} className={`rounded-xl p-4 ${seg.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${seg.color}`} />
                <span className={`text-sm font-medium ${seg.textColor}`}>{seg.label}</span>
              </div>
              <p className={`text-2xl font-bold ${seg.textColor}`}>{seg.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{seg.pct}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />Recommendations
        </h3>
        <div className="space-y-3">
          {stats.highMissRate > 0 && (
            <RecommendationCard
              type="warning"
              title={`${stats.highMissRate} questions have high miss rates`}
              desc="Consider revising question wording, adding hints, or creating review material for these topics."
            />
          )}
          {stats.unused > 0 && (
            <RecommendationCard
              type="info"
              title={`${stats.unused} questions are not used in any quiz`}
              desc="Add these to quizzes to maximize your question bank's value."
            />
          )}
          {Number(masteredPct) > 50 && (
            <RecommendationCard
              type="success"
              title={`${masteredPct}% of questioned questions are mastered`}
              desc="Great job! Consider adding more challenging questions to keep students growing."
            />
          )}
          {adminStats && adminStats.average_score < 50 && (
            <RecommendationCard
              type="warning"
              title={`Platform average score is ${Number(adminStats.average_score).toFixed(1)}%`}
              desc="This is below 50%. Consider reviewing question difficulty or adding more practice material."
            />
          )}
          {stats.highMissRate === 0 && stats.unused === 0 && (
            <RecommendationCard
              type="success"
              title="All questions are performing well!"
              desc="Your question bank is in great shape. Keep up the good work."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBJECTS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SubjectTab({ groupStats }) {
  const [expandedSubjects, setExpandedSubjects] = useState({});

  if (!groupStats?.by_subject?.length) return <EmptyState message="No learning area data available." />;

  const toggleSubject = (id) => setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));

  const subjectColors = [
    "from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600",
    "from-violet-500 to-violet-600", "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600", "from-cyan-500 to-cyan-600",
    "from-fuchsia-500 to-fuchsia-600", "from-lime-500 to-lime-600",
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{groupStats.by_subject.length}</span> learning areas with questions across multiple grades. Click to expand.
        </p>
      </div>

      {groupStats.by_subject.map((subject, si) => {
        const totalQs = subject.grades.reduce((sum, g) => sum + g.count, 0);
        const isExpanded = expandedSubjects[subject.id] !== false;
        const color = subjectColors[si % subjectColors.length];
        const maxCount = Math.max(...subject.grades.map((g) => g.count));

        return (
          <div key={subject.id} className="bg-white rounded-xl border overflow-hidden">
            <button onClick={() => toggleSubject(subject.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`bg-linear-to-r ${color} text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg`}>
                  {subject.icon || "📚"}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  <p className="text-xs text-gray-500">{totalQs} questions &bull; {subject.grades.length} grades</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{totalQs}</span>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="space-y-2">
                      {subject.grades.sort((a, b) => a.grade - b.grade).map((g) => {
                        const barPct = maxCount > 0 ? (g.count / maxCount * 100) : 0;
                        return (
                          <div key={g.grade} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-20 shrink-0 font-medium">Grade {g.grade}</span>
                            <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${barPct}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className={`h-full bg-linear-to-r ${color} rounded-lg`}
                              />
                              <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-gray-700">
                                {g.count} questions
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI INSIGHTS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InsightsTab({ subjects, suggestions, suggestionsLoading, selectedSubject, selectedGrade, onSubjectChange, onGradeChange }) {
  const grades = [4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">AI-Powered Insights</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select a learning area and grade to see which questions students struggle with most.
              Use these insights to improve your teaching materials.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Area</label>
            <select
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a learning area...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => onGradeChange(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a grade...</option>
              {grades.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {!selectedSubject || !selectedGrade ? (
        <div className="bg-white rounded-xl border text-center py-12 px-6">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-purple-300" />
          </div>
          <p className="text-gray-500">Select both a learning area and grade above to see AI insights.</p>
        </div>
      ) : suggestionsLoading ? (
        <div className="bg-white rounded-xl border text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Analyzing student performance...</p>
        </div>
      ) : suggestions ? (
        <div className="space-y-4">
          {/* Student count */}
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{suggestions.totalStudents}</span> students have attempted quizzes in this area
            </span>
          </div>

          {/* Suggestions */}
          {suggestions.questions?.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Questions Needing Attention</h3>
              {suggestions.questions.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      q.reason.includes("miss rate") ? "bg-red-100 text-red-600" : q.reason.includes("Never") ? "bg-amber-100 text-amber-600" : "bg-orange-100 text-orange-600"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{q.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.reason.includes("miss rate") ? "bg-red-100 text-red-700" : q.reason.includes("Never") ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {q.reason}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.difficulty}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{q.topic}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border text-center py-12 px-6">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Looking Good!</h3>
              <p className="text-sm text-gray-500">No struggling questions found for this combination.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function KPICard({ icon, iconBg, value, valueColor = "text-gray-900", label, subtitle }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value ?? "—"}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function HealthCard({ label, value, icon, color, desc }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="text-3xl font-bold">{value}</p>
      {desc && <p className="text-xs mt-1 opacity-70">{desc}</p>}
    </div>
  );
}

function RecencyCard({ label, value, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
    </div>
  );
}

function DifficultyChart({ data, total }) {
  if (!data?.length) return <p className="text-sm text-gray-400">No difficulty data.</p>;

  const colorMap = {
    easy: { bar: "bg-green-500", bg: "bg-green-50", text: "text-green-700", label: "Easy" },
    medium: { bar: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Medium" },
    hard: { bar: "bg-red-500", bg: "bg-red-50", text: "text-red-700", label: "Hard" },
  };

  return (
    <div className="space-y-4">
      {data.map((item, i) => {
        const cfg = colorMap[item.difficulty] || { bar: "bg-gray-500", bg: "bg-gray-50", text: "text-gray-700", label: item.difficulty };
        const pct = total > 0 ? (item.count / total * 100).toFixed(0) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
              </div>
              <span className="text-gray-500 font-medium">{item.count} ({pct}%)</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.15 }} className={`h-full ${cfg.bar} rounded-full`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationCard({ type, title, desc }) {
  const styles = {
    warning: { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-200" },
    info: { icon: <Lightbulb className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50 border-blue-200" },
    success: { icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: "bg-green-50 border-green-200" },
  };
  const s = styles[type] || styles.info;
  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{s.icon}</div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white rounded-xl border text-center py-16 px-6">
      <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <BarChart3 className="w-10 h-10 text-gray-300" />
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (<div key={i} className="bg-white rounded-xl border p-5 h-32" />))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 h-72" />
        <div className="bg-white rounded-xl border p-6 h-72" />
      </div>
    </div>
  );
}
