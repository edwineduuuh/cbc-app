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
  Star, Activity, CreditCard, DollarSign, UserCheck, Flame,
  Calendar, BarChart2, ShieldCheck,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-8bc4.up.railway.app/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Existing data
  const [adminStats, setAdminStats] = useState(null);
  const [questionStats, setQuestionStats] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  // New data
  const [usersStats, setUsersStats] = useState(null);
  const [usersList, setUsersList] = useState({ count: 0, results: [] });
  const [revenueStats, setRevenueStats] = useState(null);
  const [quizPerf, setQuizPerf] = useState(null);
  const [engagement, setEngagement] = useState(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Users list filters
  const [userFilter, setUserFilter] = useState({ role: "", grade: "", search: "" });
  const [usersListLoading, setUsersListLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) router.push("/dashboard");
  }, [user, authLoading, router]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const loadAll = async () => {
      setLoading(true);
      try {
        const [statsRes, qAnalyticsRes, groupRes, usersRes, revenueRes, quizPerfRes, engagementRes] =
          await Promise.all([
            fetchWithAuth(`${API}/admin/stats/`),
            fetchWithAuth(`${API}/admin/analytics/questions/`),
            fetchWithAuth(`${API}/admin/questions/stats/`),
            fetchWithAuth(`${API}/admin/users/stats/`),
            fetchWithAuth(`${API}/admin/revenue/stats/`),
            fetchWithAuth(`${API}/admin/analytics/quizzes/`),
            fetchWithAuth(`${API}/admin/analytics/engagement/`),
          ]);

        if (statsRes.ok) setAdminStats(await statsRes.json());
        if (qAnalyticsRes.ok) setQuestionStats(await qAnalyticsRes.json());
        if (groupRes.ok) setGroupStats(await groupRes.json());
        if (usersRes.ok) setUsersStats(await usersRes.json());
        if (revenueRes.ok) setRevenueStats(await revenueRes.json());
        if (quizPerfRes.ok) setQuizPerf(await quizPerfRes.json());
        if (engagementRes.ok) setEngagement(await engagementRes.json());
      } catch (err) {
        console.error("Analytics load error:", err);
        showToast("Failed to load analytics", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [authLoading, user]);

  // Load users list with filters
  const loadUsersList = useCallback(async () => {
    setUsersListLoading(true);
    try {
      const params = new URLSearchParams();
      if (userFilter.role) params.append("role", userFilter.role);
      if (userFilter.grade) params.append("grade", userFilter.grade);
      if (userFilter.search) params.append("search", userFilter.search);
      const res = await fetchWithAuth(`${API}/admin/users/?${params}`);
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error("Users list error:", err);
    } finally {
      setUsersListLoading(false);
    }
  }, [userFilter]);

  useEffect(() => {
    if (!authLoading && user && activeTab === "users") loadUsersList();
  }, [authLoading, user, activeTab, loadUsersList]);

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

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const tabs = [
    { id: "overview",     label: "Overview",          icon: BarChart3 },
    { id: "users",        label: "Users",             icon: Users },
    { id: "revenue",      label: "Revenue",           icon: CreditCard },
    { id: "quizperf",     label: "Quiz Performance",  icon: Target },
    { id: "engagement",   label: "Engagement",        icon: Activity },
    { id: "questions",    label: "Question Health",   icon: ShieldCheck },
    { id: "subjects",     label: "By Learning Area",  icon: BookOpen },
    { id: "insights",     label: "AI Insights",       icon: Lightbulb },
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
            <div className="flex gap-1 mt-4 -mb-px overflow-x-auto scrollbar-hide">
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
                <TabPane key="overview">
                  <OverviewTab stats={adminStats} questionStats={questionStats} groupStats={groupStats} />
                </TabPane>
              )}
              {activeTab === "users" && (
                <TabPane key="users">
                  <UsersTab
                    stats={usersStats}
                    list={usersList}
                    listLoading={usersListLoading}
                    filter={userFilter}
                    onFilterChange={setUserFilter}
                  />
                </TabPane>
              )}
              {activeTab === "revenue" && (
                <TabPane key="revenue">
                  <RevenueTab stats={revenueStats} />
                </TabPane>
              )}
              {activeTab === "quizperf" && (
                <TabPane key="quizperf">
                  <QuizPerfTab data={quizPerf} />
                </TabPane>
              )}
              {activeTab === "engagement" && (
                <TabPane key="engagement">
                  <EngagementTab data={engagement} />
                </TabPane>
              )}
              {activeTab === "questions" && (
                <TabPane key="questions">
                  <QuestionHealthTab stats={questionStats} adminStats={adminStats} />
                </TabPane>
              )}
              {activeTab === "subjects" && (
                <TabPane key="subjects">
                  <SubjectTab groupStats={groupStats} />
                </TabPane>
              )}
              {activeTab === "insights" && (
                <TabPane key="insights">
                  <InsightsTab
                    subjects={groupStats?.by_subject || []}
                    suggestions={suggestions}
                    suggestionsLoading={suggestionsLoading}
                    selectedSubject={selectedSubject}
                    selectedGrade={selectedGrade}
                    onSubjectChange={setSelectedSubject}
                    onGradeChange={setSelectedGrade}
                  />
                </TabPane>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}

function TabPane({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      {children}
    </motion.div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={stats.total_students} label="Total Students" subtitle={`${stats.total_teachers} teachers`} />
        <KPICard icon={<FileText className="w-6 h-6" />} iconBg="bg-emerald-100 text-emerald-600" value={stats.total_questions} label="Questions in Bank" subtitle={`${stats.total_quizzes} active quizzes`} />
        <KPICard icon={<CheckCircle className="w-6 h-6" />} iconBg="bg-purple-100 text-purple-600" value={stats.total_attempts?.toLocaleString()} label="Quiz Attempts" subtitle="Completed" />
        <KPICard icon={<Award className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={`${avgScore}%`} valueColor={scoreColor} label="Avg Score" subtitle={Number(avgScore) >= 70 ? "Good performance" : "Needs improvement"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          ) : <p className="text-sm text-gray-400">No subject data.</p>}
        </div>

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
          ) : <p className="text-sm text-gray-400">No grade data.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" />Difficulty Distribution
          </h3>
          <DifficultyChart data={stats.questions_by_difficulty} total={stats.total_questions} />
        </div>

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
// USERS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UsersTab({ stats, list, listLoading, filter, onFilterChange }) {
  const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const ROLES = ["student", "teacher", "admin", "superadmin", "school_admin"];

  const roleColors = {
    student: "bg-blue-100 text-blue-700",
    teacher: "bg-emerald-100 text-emerald-700",
    admin: "bg-purple-100 text-purple-700",
    superadmin: "bg-red-100 text-red-700",
    school_admin: "bg-amber-100 text-amber-700",
  };

  const total = stats?.total || 0;
  const byRole = stats?.by_role || {};

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={total} label="Total Users" subtitle={`${byRole.teacher || 0} teachers`} />
        <KPICard icon={<GraduationCap className="w-6 h-6" />} iconBg="bg-emerald-100 text-emerald-600" value={byRole.student || 0} label="Students" subtitle={`${stats?.active_this_week || 0} active this week`} />
        <KPICard icon={<UserCheck className="w-6 h-6" />} iconBg="bg-purple-100 text-purple-600" value={stats?.subscribed || 0} label="Subscribed" subtitle={`${stats?.free_trial_active || 0} on free trial`} />
        <KPICard icon={<TrendingUp className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={stats?.new_this_month || 0} label="New This Month" subtitle={`${stats?.new_this_week || 0} this week`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Role */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />Users by Role
          </h3>
          <div className="space-y-3">
            {Object.entries(byRole).map(([role, count], i) => {
              const pct = total > 0 ? (count / total * 100).toFixed(0) : 0;
              const barColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-red-500"];
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[role] || "bg-gray-100 text-gray-600"}`}>
                      {role}
                    </span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className={`h-full ${barColors[i % barColors.length]} rounded-full`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Grade */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-500" />Students by Grade
          </h3>
          {stats?.by_grade?.length > 0 ? (
            <div className="space-y-2">
              {stats.by_grade.map((item, i) => {
                const max = Math.max(...stats.by_grade.map((g) => g.count));
                const pct = max > 0 ? (item.count / max * 100).toFixed(0) : 0;
                return (
                  <div key={item.grade} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-16 shrink-0 font-medium">Grade {item.grade}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg"
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-gray-700">{item.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No grade data.</p>}
        </div>
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{stats?.active_today || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active Today</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats?.active_this_week || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active This Week</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{stats?.new_this_week || 0}</p>
          <p className="text-sm text-gray-500 mt-1">New This Week</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats?.free_trial_active || 0}</p>
          <p className="text-sm text-gray-500 mt-1">On Free Trial</p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />All Users
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">{list.count}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Search username or email..."
              value={filter.search}
              onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <select value={filter.role} onChange={(e) => onFilterChange({ ...filter, role: e.target.value })} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filter.grade} onChange={(e) => onFilterChange({ ...filter, grade: e.target.value })} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option value="">All Grades</option>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : list.results?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Username", "Email", "Role", "Grade", "Joined", "Last Login", "Status", "Quizzes"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.results.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{u.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.grade ? `G${u.grade}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      {u.has_subscription
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Premium</span>
                        : u.quiz_credits > 0
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Trial ({u.quiz_credits})</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Free</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.total_quizzes_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">No users found.</div>
        )}
      </div>

      {/* Recent Signups */}
      {stats?.recent_signups?.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />Recent Signups
          </h3>
          <div className="space-y-2">
            {stats.recent_signups.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.username}</p>
                    <p className="text-xs text-gray-400">{u.role}{u.grade ? ` · Grade ${u.grade}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.has_subscription && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Premium</span>}
                  <span className="text-xs text-gray-400">{new Date(u.date_joined).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVENUE TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RevenueTab({ stats }) {
  if (!stats) return <EmptyState message="No revenue data available." />;

  const maxRevenue = stats.monthly_trend?.length
    ? Math.max(...stats.monthly_trend.map((m) => m.revenue), 1)
    : 1;

  const statusColors = {
    verified: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-600",
  };

  const monthChange = stats.last_month > 0
    ? (((stats.this_month - stats.last_month) / stats.last_month) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<DollarSign className="w-6 h-6" />} iconBg="bg-green-100 text-green-600" value={`KES ${stats.total_revenue?.toLocaleString()}`} label="Total Revenue" subtitle="All time (verified)" />
        <KPICard
          icon={<TrendingUp className="w-6 h-6" />}
          iconBg="bg-emerald-100 text-emerald-600"
          value={`KES ${stats.this_month?.toLocaleString()}`}
          label="This Month"
          subtitle={monthChange !== null ? `${monthChange > 0 ? "+" : ""}${monthChange}% vs last month` : "—"}
          valueColor={monthChange > 0 ? "text-green-600" : monthChange < 0 ? "text-red-600" : "text-gray-900"}
        />
        <KPICard icon={<UserCheck className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={stats.active_subscriptions} label="Active Subscriptions" subtitle="Currently valid" />
        <KPICard icon={<Clock className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={stats.pending_payments} label="Pending Payments" subtitle="Awaiting verification" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-500" />Monthly Revenue (Last 6 Months)
          </h3>
          <div className="flex items-end gap-2 h-40">
            {stats.monthly_trend?.map((m, i) => {
              const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue * 100) : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {m.revenue > 0 ? `${(m.revenue / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: "120px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg absolute bottom-0"
                    />
                  </div>
                  <span className="text-xs text-gray-500">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Plan */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />Revenue by Plan
          </h3>
          {stats.by_plan?.length > 0 ? (
            <div className="space-y-3">
              {stats.by_plan.map((p, i) => {
                const pct = stats.total_revenue > 0 ? (p.revenue / stats.total_revenue * 100).toFixed(0) : 0;
                const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{p.plan__name || "Unknown"}</span>
                      <span className="text-gray-500">KES {p.revenue?.toLocaleString()} · {p.count} subs</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className={`h-full ${colors[i % colors.length]} rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No plan data yet.</p>}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />Recent Payments
          </h3>
        </div>
        {stats.recent_payments?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["User", "Plan", "Amount (KES)", "M-Pesa Code", "Phone", "Date", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent_payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.user__username}</td>
                    <td className="px-4 py-3 text-gray-600">{p.plan__name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.amount_paid?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.mpesa_code || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{p.phone_number || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">No payments yet.</div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUIZ PERFORMANCE TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function QuizPerfTab({ data }) {
  if (!data) return <EmptyState message="No quiz performance data available." />;

  const scoreColor = (s) => s >= 70 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s) => s >= 70 ? "bg-green-100 text-green-700" : s >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  const maxAttempts = data.most_attempted?.length
    ? Math.max(...data.most_attempted.map((q) => q.total), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<BarChart3 className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={data.total_attempts?.toLocaleString()} label="Total Attempts" subtitle="All time" />
        <KPICard icon={<CheckCircle className="w-6 h-6" />} iconBg="bg-green-100 text-green-600" value={data.completed_attempts?.toLocaleString()} label="Completed" subtitle={`${data.completion_rate}% completion rate`} />
        <KPICard icon={<Award className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={`${data.avg_score}%`} valueColor={scoreColor(data.avg_score)} label="Avg Score" subtitle={data.avg_score >= 70 ? "Good" : "Needs improvement"} />
        <KPICard icon={<Target className="w-6 h-6" />} iconBg="bg-purple-100 text-purple-600" value={`${data.completion_rate}%`} label="Completion Rate" subtitle="Started → finished" />
      </div>

      {/* Most Attempted */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />Most Attempted Quizzes
        </h3>
        {data.most_attempted?.length > 0 ? (
          <div className="space-y-3">
            {data.most_attempted.map((q, i) => {
              const barPct = (q.total / maxAttempts * 100).toFixed(0);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{q.quiz__title}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs text-gray-500">{q.total} attempts</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBg(q.avg_score)}`}>{q.avg_score}%</span>
                        <span className="text-xs text-gray-400">{q.completion_rate}% done</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-gray-400">No quiz attempt data yet.</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Subject */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />Performance by Learning Area
          </h3>
          {data.by_subject?.length > 0 ? (
            <div className="space-y-3">
              {data.by_subject.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{s.quiz__subject__name || "Unknown"}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{s.attempts} attempts</span>
                    <span className={`text-sm font-bold ${scoreColor(s.avg_score)}`}>{s.avg_score}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data.</p>}
        </div>

        {/* By Grade */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-500" />Performance by Grade
          </h3>
          {data.by_grade?.length > 0 ? (
            <div className="space-y-3">
              {data.by_grade.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-700">Grade {g.quiz__grade}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{g.attempts} attempts</span>
                    <span className={`text-sm font-bold ${scoreColor(g.avg_score)}`}>{g.avg_score}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data.</p>}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGAGEMENT TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EngagementTab({ data }) {
  if (!data) return <EmptyState message="No engagement data available." />;

  const maxDau = data.dau?.length ? Math.max(...data.dau.map((d) => d.count), 1) : 1;
  const maxSignups = data.signups_trend?.length ? Math.max(...data.signups_trend.map((d) => d.count), 1) : 1;
  const maxHour = data.peak_hours?.length ? Math.max(...data.peak_hours.map((h) => h.count), 1) : 1;

  const formatDate = (d) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatHour = (h) => {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Activity className="w-6 h-6" />} iconBg="bg-blue-100 text-blue-600" value={data.wau} label="Weekly Active" subtitle="Unique students this week" />
        <KPICard icon={<Calendar className="w-6 h-6" />} iconBg="bg-emerald-100 text-emerald-600" value={data.mau} label="Monthly Active" subtitle="Unique students this month" />
        <KPICard icon={<TrendingUp className="w-6 h-6" />} iconBg="bg-purple-100 text-purple-600" value={`${data.trial_to_paid_rate}%`} label="Trial → Paid" subtitle={`${data.paid_subscribers} paying students`} />
        <KPICard icon={<Users className="w-6 h-6" />} iconBg="bg-amber-100 text-amber-600" value={data.total_students} label="Total Students" subtitle={`${data.mau} active this month`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />Daily Active Students (14 days)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {data.dau?.map((d, i) => {
              const heightPct = (d.count / maxDau * 100);
              const showLabel = i % 3 === 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "100px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t absolute bottom-0"
                      title={`${formatDate(d.date)}: ${d.count}`}
                    />
                  </div>
                  <span className="text-xs text-gray-400" style={{ fontSize: "9px" }}>{showLabel ? formatDate(d.date) : ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signups Trend */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />New Signups (14 days)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {data.signups_trend?.map((d, i) => {
              const heightPct = (d.count / maxSignups * 100);
              const showLabel = i % 3 === 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "100px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t absolute bottom-0"
                      title={`${formatDate(d.date)}: ${d.count}`}
                    />
                  </div>
                  <span className="text-xs text-gray-400" style={{ fontSize: "9px" }}>{showLabel ? formatDate(d.date) : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />Peak Usage Hours
        </h3>
        <div className="flex items-end gap-0.5 h-24">
          {data.peak_hours?.map((h, i) => {
            const heightPct = (h.count / maxHour * 100);
            const isAfternoon = h.hour >= 12 && h.hour < 18;
            const isEvening = h.hour >= 18;
            const barColor = isEvening ? "from-purple-500 to-purple-400"
              : isAfternoon ? "from-amber-500 to-orange-400"
              : "from-blue-400 to-sky-300";
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "80px" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.4, delay: i * 0.02 }}
                    className={`w-full bg-gradient-to-t ${barColor} rounded-t absolute bottom-0`}
                    title={`${formatHour(h.hour)}: ${h.count} attempts`}
                  />
                </div>
                {h.hour % 6 === 0 && (
                  <span className="text-xs text-gray-400 mt-1" style={{ fontSize: "9px" }}>{formatHour(h.hour)}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400" /><span className="text-xs text-gray-500">Morning</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-gray-500">Afternoon</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs text-gray-500">Evening</span></div>
        </div>
      </div>
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
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Question Performance Breakdown</h3>
        <p className="text-sm text-gray-500 mb-6">How students perform on questions across your platform</p>
        <div className="h-8 rounded-full overflow-hidden flex mb-6">
          {segments.map((seg) => (
            <motion.div key={seg.label} initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }} transition={{ duration: 0.8 }} className={`${seg.color} relative group`} title={`${seg.label}: ${seg.value}`}>
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

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />Recommendations
        </h3>
        <div className="space-y-3">
          {stats.highMissRate > 0 && <RecommendationCard type="warning" title={`${stats.highMissRate} questions have high miss rates`} desc="Consider revising question wording, adding hints, or creating review material for these topics." />}
          {stats.unused > 0 && <RecommendationCard type="info" title={`${stats.unused} questions are not used in any quiz`} desc="Add these to quizzes to maximize your question bank's value." />}
          {Number(masteredPct) > 50 && <RecommendationCard type="success" title={`${masteredPct}% of questions are mastered`} desc="Great job! Consider adding more challenging questions to keep students growing." />}
          {adminStats && adminStats.average_score < 50 && <RecommendationCard type="warning" title={`Platform average score is ${Number(adminStats.average_score).toFixed(1)}%`} desc="This is below 50%. Consider reviewing question difficulty or adding more practice material." />}
          {stats.highMissRate === 0 && stats.unused === 0 && <RecommendationCard type="success" title="All questions are performing well!" desc="Your question bank is in great shape. Keep up the good work." />}
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
  const subjectColors = ["from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600", "from-violet-500 to-violet-600", "from-amber-500 to-amber-600", "from-rose-500 to-rose-600", "from-cyan-500 to-cyan-600", "from-fuchsia-500 to-fuchsia-600", "from-lime-500 to-lime-600"];

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
                <div className={`bg-linear-to-r ${color} text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg`}>{subject.icon || "📚"}</div>
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
                  <div className="border-t px-4 pb-4 pt-3 space-y-2">
                    {subject.grades.sort((a, b) => a.grade - b.grade).map((g) => {
                      const barPct = maxCount > 0 ? (g.count / maxCount * 100) : 0;
                      return (
                        <div key={g.grade} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-20 shrink-0 font-medium">Grade {g.grade}</span>
                          <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.6, delay: 0.1 }} className={`h-full bg-linear-to-r ${color} rounded-lg`} />
                            <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-gray-700">{g.count} questions</span>
                          </div>
                        </div>
                      );
                    })}
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
      <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">AI-Powered Insights</h3>
            <p className="text-sm text-gray-600 mt-1">Select a learning area and grade to see which questions students struggle with most.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Area</label>
            <select value={selectedSubject} onChange={(e) => onSubjectChange(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Select a learning area...</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select value={selectedGrade} onChange={(e) => onGradeChange(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Select a grade...</option>
              {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
        </div>
      </div>
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
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-700"><span className="font-semibold">{suggestions.totalStudents}</span> students have attempted quizzes in this area</span>
          </div>
          {suggestions.questions?.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Questions Needing Attention</h3>
              {suggestions.questions.map((q, i) => (
                <motion.div key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${q.reason.includes("miss rate") ? "bg-red-100 text-red-600" : q.reason.includes("Never") ? "bg-amber-100 text-amber-600" : "bg-orange-100 text-orange-600"}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{q.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.reason.includes("miss rate") ? "bg-red-100 text-red-700" : q.reason.includes("Never") ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"}`}>{q.reason}</span>
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
        {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl border p-5 h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 h-72" />
        <div className="bg-white rounded-xl border p-6 h-72" />
      </div>
    </div>
  );
}
