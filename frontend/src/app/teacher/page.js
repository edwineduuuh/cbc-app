"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  Users,
  BookOpen,
  BarChart3,
  Plus,
  Trash2,
  ClipboardList,
  Loader2,
  X,
  ChevronRight,
  ArrowLeft,
  FileText,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  SkipForward,
  Trophy,
  Copy,
  Radio,
  Hash,
} from "lucide-react";
import { Suspense } from "react";

/* ──────────────── STAT CARD ──────────────── */
function StatCard({ label, value, icon: Icon, color = "teal" }) {
  const colors = {
    teal: "from-teal-500 to-emerald-600",
    blue: "from-blue-500 to-indigo-600",
    amber: "from-amber-500 to-orange-600",
    purple: "from-purple-500 to-violet-600",
    emerald: "from-emerald-500 to-green-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-lg bg-linear-to-br ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* ──────────────── CREATE CLASSROOM MODAL ──────────────── */
const subjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Science",
  "Social Studies",
  "CRE",
  "IRE",
  "Creative Arts",
  "Agriculture",
  "Home Science",
  "Music",
  "Physical Education",
  "Health Education",
  "Business Studies",
  "Life Skills",
];

function CreateClassroomModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [timePerQuestion, setTimePerQuestion] = useState("30");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [step, setStep] = useState("form"); // form | review

  const handleGenQuestions = async () => {
    if (!subject || !grade || !topic) {
      return setError(
        "Subject, grade, and topic are required to generate questions",
      );
    }
    setGenerating(true);
    setError("");
    try {
      const data = await api.generateQuizQuestions({
        grade: `Grade ${grade}`,
        subject,
        topic,
        count: parseInt(count) || 5,
      });
      setGeneratedQuestions(data.questions || []);
      setStep("review");
    } catch (err) {
      setError(
        err.message || "Failed to generate questions. Check your AI settings.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError("Classroom name is required");
    if (generatedQuestions.length === 0)
      return setError("Generate questions first");
    setLoading(true);
    setError("");
    try {
      const data = await api.createClassroom({
        name: name.trim(),
        subject,
        grade: `Grade ${grade}`,
        time_per_question: parseInt(timePerQuestion) || 30,
        questions: generatedQuestions.map((q, i) => ({
          text: q.text,
          question_type: q.type || "mcq",
          options: q.options || [],
          correct_index: q.correct_index,
          points: q.points || 10,
          order: i + 1,
        })),
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create classroom");
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (i) => {
    setGeneratedQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">
            {step === "form"
              ? "Create Live Quiz"
              : `Review ${generatedQuestions.length} Questions`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "form" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Quiz Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fractions Challenge"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Subject *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  <option value="">Select</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Grade *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  <option value="">Select</option>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Topic *
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Addition and subtraction of fractions"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Number of Questions
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  {[3, 5, 7, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} questions
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Time per Question
                </label>
                <select
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  {[15, 20, 30, 45, 60].map((t) => (
                    <option key={t} value={t}>
                      {t} seconds
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
            <button
              onClick={handleGenQuestions}
              disabled={generating}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating
                  Questions...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Generate Questions with AI
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setStep("form")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-3 h-3" /> Back to settings
            </button>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {generatedQuestions.map((q, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Q{i + 1}: {q.text}
                    </p>
                    <button
                      onClick={() => removeQuestion(i)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options?.map((opt, j) => (
                      <div
                        key={j}
                        className={`text-xs px-2 py-1.5 rounded-lg ${
                          j === q.correct_index
                            ? "bg-green-100 text-green-700 font-semibold"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
            <button
              onClick={handleCreate}
              disabled={loading || generatedQuestions.length === 0}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Create Quiz (
                  {generatedQuestions.length} questions)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── ASSIGN QUIZ MODAL ──────────────── */
function AssignQuizModal({ classroom, onClose, onAssigned }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api
      .getQuizLibrary()
      .then((data) => {
        setQuizzes(Array.isArray(data) ? data : data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      await api.assignQuiz({
        classroom_id: classroom.id,
        quiz_id: selected,
      });
      onAssigned();
      onClose();
    } catch {
      alert("Failed to assign quiz");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">
            Assign Quiz to {classroom.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : quizzes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No quizzes available yet.
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 mb-5">
            {quizzes.map((q) => (
              <div
                key={q.id}
                onClick={() => setSelected(q.id)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selected === q.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-sm text-gray-900">{q.title}</p>
                <p className="text-xs text-gray-500">
                  {q.subject} · Grade {q.grade} · {q.questions_count || "?"}{" "}
                  questions
                </p>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={handleAssign}
          disabled={!selected || assigning}
          className="w-full py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {assigning ? "Assigning..." : "Assign Quiz"}
        </button>
      </div>
    </div>
  );
}

/* ──────────────── LIVE QUIZ CONTROL ──────────────── */
function LiveQuizControl({ classroom, onBack, onRefreshList }) {
  const [room, setRoom] = useState(classroom);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [copied, setCopied] = useState(false);
  const [report, setReport] = useState(null);

  // Poll classroom state + leaderboard every 2 seconds while live or waiting
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const [roomData, lb] = await Promise.all([
          api.getClassroom(room.id),
          api.getLeaderboard(room.id),
        ]);
        if (!active) return;
        setRoom(roomData);
        setLeaderboard(Array.isArray(lb) ? lb : lb.leaderboard || []);
        if (roomData.status === "ended" && !report) {
          try {
            const r = await api.getClassroomReport(room.id);
            setReport(r);
          } catch {}
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [room.id, report]);

  const handleStart = async () => {
    setActionLoading("start");
    try {
      const data = await api.startClassroom(room.id);
      setRoom(data);
    } catch (err) {
      alert(err.message || "Failed to start");
    } finally {
      setActionLoading("");
    }
  };

  const handleNext = async () => {
    setActionLoading("next");
    try {
      const data = await api.nextQuestion(room.id);
      setRoom(data);
    } catch (err) {
      alert(err.message || "Failed to advance");
    } finally {
      setActionLoading("");
    }
  };

  const handleEnd = async () => {
    if (!confirm("End this quiz? Students will see final results.")) return;
    setActionLoading("end");
    try {
      const data = await api.endClassroom(room.id);
      setRoom(data);
      onRefreshList();
    } catch (err) {
      alert(err.message || "Failed to end");
    } finally {
      setActionLoading("");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.join_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = room.status || "waiting";
  const currentQ =
    room.questions?.[room.current_question_index] ||
    room.live_questions?.[room.current_question_index];
  const totalQ =
    room.questions?.length ||
    room.live_questions?.length ||
    room.question_count ||
    0;
  const qIndex = room.current_question_index ?? 0;

  return (
    <div>
      <button
        onClick={() => {
          onRefreshList();
          onBack();
        }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to classrooms
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{room.name}</h2>
            <span
              className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                status === "live"
                  ? "bg-green-100 text-green-700 animate-pulse"
                  : status === "waiting"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {status === "live"
                ? "LIVE"
                : status === "waiting"
                  ? "LOBBY"
                  : "ENDED"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {room.subject} · {room.grade} · {totalQ} questions ·{" "}
            {room.time_per_question || 30}s each
          </p>
        </div>
        {status !== "ended" && (
          <div className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-4 py-3">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-lg font-mono font-bold tracking-widest">
              {room.join_code}
            </span>
            <button
              onClick={copyCode}
              className="ml-2 text-gray-400 hover:text-white"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* WAITING — Lobby */}
          {status === "waiting" && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Radio className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Waiting for students
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                Share the code{" "}
                <span className="font-mono font-bold text-gray-900">
                  {room.join_code}
                </span>{" "}
                with your students
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Students join at{" "}
                <span className="font-semibold">stadispace.com/join</span>
              </p>
              <div className="flex items-center justify-center gap-3 mb-6">
                <Users className="w-5 h-5 text-teal-600" />
                <span className="text-2xl font-bold text-gray-900">
                  {leaderboard.length}
                </span>
                <span className="text-sm text-gray-500">students joined</span>
              </div>
              {leaderboard.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {leaderboard.map((s, i) => (
                    <span
                      key={i}
                      className="bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full"
                    >
                      {s.student_name || s.name}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={handleStart}
                disabled={!!actionLoading || leaderboard.length === 0}
                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-green-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {actionLoading === "start" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Start Quiz
              </button>
            </div>
          )}

          {/* LIVE — Current Question */}
          {status === "live" && currentQ && (
            <div className="bg-white rounded-xl border-2 border-green-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Question {qIndex + 1} of {totalQ}
                </span>
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Live
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {currentQ.text}
              </h3>
              {currentQ.options && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {currentQ.options.map((opt, j) => {
                    const colors = [
                      "bg-red-50 border-red-200 text-red-700",
                      "bg-blue-50 border-blue-200 text-blue-700",
                      "bg-amber-50 border-amber-200 text-amber-700",
                      "bg-green-50 border-green-200 text-green-700",
                    ];
                    return (
                      <div
                        key={j}
                        className={`p-3 rounded-xl border-2 text-sm font-medium ${colors[j % 4]} ${
                          j === currentQ.correct_index
                            ? "ring-2 ring-green-400"
                            : ""
                        }`}
                      >
                        {opt}
                        {j === currentQ.correct_index && (
                          <CheckCircle className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-3">
                {qIndex + 1 < totalQ ? (
                  <button
                    onClick={handleNext}
                    disabled={!!actionLoading}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {actionLoading === "next" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SkipForward className="w-4 h-4" />
                    )}
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleEnd}
                    disabled={!!actionLoading}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-red-600 to-pink-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {actionLoading === "end" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    End Quiz
                  </button>
                )}
                <button
                  onClick={handleEnd}
                  disabled={!!actionLoading}
                  className="px-4 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:border-red-300 hover:text-red-600 inline-flex items-center gap-2"
                >
                  <Square className="w-4 h-4" /> End Early
                </button>
              </div>
            </div>
          )}

          {status === "live" && !currentQ && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading question data...</p>
            </div>
          )}

          {/* ENDED — Results Summary */}
          {status === "ended" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-amber-500" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Quiz Complete!
                  </h3>
                  <p className="text-sm text-gray-500">
                    {leaderboard.length} students participated
                  </p>
                </div>
              </div>
              {report?.summary && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700">{report.summary}</p>
                </div>
              )}
              {/* Full leaderboard for ended state */}
              <div className="space-y-2">
                {leaderboard.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      i === 0
                        ? "bg-amber-50 border border-amber-200"
                        : i === 1
                          ? "bg-gray-50 border border-gray-200"
                          : i === 2
                            ? "bg-orange-50 border border-orange-200"
                            : "bg-white border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0
                            ? "bg-amber-500 text-white"
                            : i === 1
                              ? "bg-gray-400 text-white"
                              : i === 2
                                ? "bg-orange-400 text-white"
                                : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="font-semibold text-sm text-gray-900">
                        {s.student_name || s.name}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-teal-600">
                      {s.total_score ?? s.score ?? 0} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Leaderboard (shown during waiting/live) */}
        {status !== "ended" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {status === "waiting" ? "Students Joined" : "Leaderboard"}
            </h4>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No students yet
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {s.student_name || s.name}
                      </span>
                    </div>
                    {status === "live" && (
                      <span className="text-xs font-bold text-teal-600">
                        {s.total_score ?? s.score ?? 0}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── CLASSES TAB ──────────────── */
function ClassesView() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  const loadClassrooms = useCallback(async () => {
    try {
      const data = await api.getClassrooms();
      setClassrooms(Array.isArray(data) ? data : data.results || []);
    } catch {
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  const deleteClassroom = async (id) => {
    if (!confirm("Delete this classroom?")) return;
    try {
      await api.deleteClassroom(id);
      setClassrooms((prev) => prev.filter((c) => c.id !== id));
      if (selectedClassroom?.id === id) setSelectedClassroom(null);
    } catch {
      alert("Failed to delete classroom");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  // Live control for selected classroom
  if (selectedClassroom) {
    return (
      <LiveQuizControl
        classroom={selectedClassroom}
        onBack={() => setSelectedClassroom(null)}
        onRefreshList={loadClassrooms}
      />
    );
  }

  // Classroom list
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">My Live Quizzes</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Quiz
        </button>
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Radio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-1">
            No live quizzes yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Create a live quiz, share the join code, and run it in real time!
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600"
          >
            Create Live Quiz
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {classrooms.map((c) => {
            const st = c.status || "waiting";
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClassroom(c)}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-teal-300 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 truncate">{c.name}</p>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        st === "live"
                          ? "bg-green-100 text-green-700"
                          : st === "waiting"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {st === "live"
                        ? "LIVE"
                        : st === "waiting"
                          ? "READY"
                          : "ENDED"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.subject || ""} · {c.grade || ""} · Code:{" "}
                    <span className="font-mono font-bold">{c.join_code}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteClassroom(c.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={(newC) => {
            setClassrooms((prev) => [newC, ...prev]);
          }}
        />
      )}
    </div>
  );
}

/* ──────────────── LESSON PLANS TAB ──────────────── */
function LessonPlansView() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewingLesson, setViewingLesson] = useState(null);
  const [form, setForm] = useState({
    grade: "",
    subject: "",
    strand: "",
    substrand: "",
    term: "1",
    week: "1",
    lesson_number: "1",
    duration: "40",
    learner_level: "Mixed ability",
    is_practical: false,
  });

  const subjects = [
    "Mathematics",
    "English",
    "Kiswahili",
    "Science & Technology",
    "Social Studies",
    "Creative Arts",
    "Religious Education",
    "Health Education",
    "Agriculture",
    "Home Science",
    "Business Studies",
    "Life Skills",
  ];

  const loadLessons = useCallback(async () => {
    try {
      const data = await api.getLessonPlans();
      setLessons(Array.isArray(data) ? data : data.results || []);
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.grade || !form.subject || !form.strand) {
      alert("Grade, subject and strand are required");
      return;
    }
    setGenerating(true);
    try {
      const result = await api.generateLesson({
        grade: parseInt(form.grade),
        subject: form.subject,
        strand: form.strand,
        substrand: form.substrand,
        term: parseInt(form.term) || 1,
        week: parseInt(form.week) || 1,
        lesson_number: parseInt(form.lesson_number) || 1,
        duration: parseInt(form.duration) || 40,
        learner_level: form.learner_level,
        is_practical: form.is_practical,
      });
      setLessons((prev) => [result, ...prev]);
      setShowForm(false);
      setViewingLesson(result);
      setForm({
        grade: "",
        subject: "",
        strand: "",
        substrand: "",
        term: "1",
        week: "1",
        lesson_number: "1",
        duration: "40",
        learner_level: "Mixed ability",
        is_practical: false,
      });
    } catch (err) {
      alert(
        err.message ||
          "Failed to generate lesson plan. Check your AI settings.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const deleteLesson = async (id) => {
    if (!confirm("Delete this lesson plan?")) return;
    try {
      await api.deleteLessonPlan(id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
      if (viewingLesson?.id === id) setViewingLesson(null);
    } catch {
      alert("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  // Viewing a single lesson
  if (viewingLesson) {
    const plan =
      typeof viewingLesson.plan === "string"
        ? (() => {
            try {
              return JSON.parse(viewingLesson.plan);
            } catch {
              return null;
            }
          })()
        : viewingLesson.plan;
    const meta = viewingLesson.meta || viewingLesson;

    return (
      <div>
        <button
          onClick={() => setViewingLesson(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to lesson plans
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {plan?.strand || meta.strand || "Lesson Plan"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {meta.subject} · Grade {meta.grade} · Term {meta.term} · Week{" "}
                {meta.week} · Lesson {meta.lesson_number}
              </p>
              {plan?.substrand && (
                <p className="text-sm text-teal-600 mt-1">
                  Sub-strand: {plan.substrand}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteLesson(viewingLesson.id)}
              className="p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {plan ? (
          <div className="space-y-4">
            {/* Learning Outcomes */}
            {plan.specific_learning_outcomes?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                    📎
                  </span>
                  Specific Learning Outcomes
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                  {plan.specific_learning_outcomes.map((slo, i) => (
                    <li key={i}>{slo}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Key Inquiry Questions */}
            {plan.key_inquiry_questions?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                    ❓
                  </span>
                  Key Inquiry Questions
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {plan.key_inquiry_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Core Competencies, Values, Issues */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plan.core_competencies?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Core Competencies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.core_competencies.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {plan.values?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Values
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.values.map((v, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {plan.pertinent_issues?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Pertinent Issues
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.pertinent_issues.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Learning Resources */}
            {plan.learning_resources?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    📚
                  </span>
                  Learning Resources
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm text-gray-700">
                  {plan.learning_resources.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Introduction */}
            {plan.introduction && (
              <div className="bg-white rounded-xl border-2 border-green-200 p-5">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                    🟢
                  </span>
                  Introduction
                  <span className="text-xs text-gray-400 font-normal ml-auto">
                    {plan.introduction.duration}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 uppercase mb-1">
                      Teacher Activity
                    </p>
                    <p className="text-sm text-gray-700">
                      {plan.introduction.teacher_activity}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-800 uppercase mb-1">
                      Learner Activity
                    </p>
                    <p className="text-sm text-gray-700">
                      {plan.introduction.learner_activity}
                    </p>
                  </div>
                </div>
                {plan.introduction.activities?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {plan.introduction.activities.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500">→</span> {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Lesson Development Steps */}
            {plan.lesson_development?.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-teal-200 p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                    📖
                  </span>
                  Lesson Development
                </h3>
                <div className="space-y-4">
                  {plan.lesson_development.map((step, i) => (
                    <div
                      key={i}
                      className="border border-gray-100 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          Step {step.step || i + 1}: {step.title}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {step.duration}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs font-semibold text-teal-700 uppercase mb-1">
                            Teacher
                          </p>
                          <p className="text-sm text-gray-700">
                            {step.teacher_activity}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">
                            Learner
                          </p>
                          <p className="text-sm text-gray-700">
                            {step.learner_activity}
                          </p>
                        </div>
                      </div>
                      {step.assessment && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          Assessment: {step.assessment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conclusion */}
            {plan.conclusion && (
              <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    🏁
                  </span>
                  Conclusion
                  <span className="text-xs text-gray-400 font-normal ml-auto">
                    {plan.conclusion.duration}
                  </span>
                </h3>
                {plan.conclusion.activities?.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-gray-700 mb-3">
                    {plan.conclusion.activities.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500">→</span> {a}
                      </li>
                    ))}
                  </ul>
                )}
                {plan.conclusion.home_activity && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-indigo-800 uppercase mb-1">
                      Home Activity
                    </p>
                    <p className="text-sm text-gray-700">
                      {plan.conclusion.home_activity}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Assessment */}
            {plan.assessment && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">
                    ✅
                  </span>
                  Assessment
                </h3>
                {plan.assessment.formative && (
                  <p className="text-sm text-gray-700 mb-3">
                    {plan.assessment.formative}
                  </p>
                )}
                {plan.assessment.questions?.length > 0 && (
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {plan.assessment.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Support & Extension */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.extended_activity && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs">
                      🚀
                    </span>
                    Extension Activity
                  </h4>
                  <p className="text-sm text-gray-700">
                    {plan.extended_activity}
                  </p>
                </div>
              )}
              {plan.support_activity && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-pink-100 text-pink-700 flex items-center justify-center text-xs">
                      🤝
                    </span>
                    Support Activity
                  </h4>
                  <p className="text-sm text-gray-700">
                    {plan.support_activity}
                  </p>
                </div>
              )}
            </div>

            {/* Teacher Notes */}
            {plan.teacher_notes && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                    📝
                  </span>
                  Teacher Notes
                </h3>
                <p className="text-sm text-gray-700">{plan.teacher_notes}</p>
              </div>
            )}

            {/* Student Notes */}
            {plan.student_notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold">
                    📄
                  </span>
                  Student Notes: {plan.student_notes.heading}
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                  {plan.student_notes.body}
                </div>
                {plan.student_notes.key_terms?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Key Terms
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plan.student_notes.key_terms.map((kt, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 rounded-lg p-2 text-sm"
                        >
                          <span className="font-semibold text-violet-700">
                            {kt.term}:
                          </span>{" "}
                          <span className="text-gray-600">{kt.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {plan.student_notes.summary_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Summary Points
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {plan.student_notes.summary_points.map((sp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-violet-500 mt-0.5">✓</span> {sp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* YouTube Links */}
            {plan.youtube_links?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">
                    ▶
                  </span>
                  Video Resources
                </h3>
                <div className="space-y-2">
                  {plan.youtube_links.map((yt, i) => (
                    <a
                      key={i}
                      href={yt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-semibold text-sm text-blue-700">
                        {yt.title}
                      </p>
                      <p className="text-xs text-gray-500">{yt.description}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Scheme of Work Entry */}
            {plan.scheme_entry && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-bold">
                    📋
                  </span>
                  Scheme of Work Entry
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Wk
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Lsn
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Strand
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Outcomes
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Resources
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b">
                          Assessment
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.wk}
                        </td>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.lsn}
                        </td>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.strand}
                          <br />
                          <span className="text-xs text-gray-400">
                            {plan.scheme_entry.substrand}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.specific_outcomes}
                        </td>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.learning_resources}
                        </td>
                        <td className="px-3 py-2 border-b text-gray-700">
                          {plan.scheme_entry.assessment}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {typeof viewingLesson.plan === "string"
                ? viewingLesson.plan
                : JSON.stringify(viewingLesson.plan, null, 2)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Lesson Plans</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Generate Lesson
        </button>
      </div>

      {/* Generation form */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-teal-200 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            AI Lesson Plan Generator
          </h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Grade *
                </label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  <option value="">Select</option>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Subject *
                </label>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  <option value="">Select</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Term *
                </label>
                <select
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  {[1, 2, 3].map((t) => (
                    <option key={t} value={t}>
                      Term {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Week
                </label>
                <select
                  value={form.week}
                  onChange={(e) => setForm({ ...form, week: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Lesson #
                </label>
                <select
                  value={form.lesson_number}
                  onChange={(e) =>
                    setForm({ ...form, lesson_number: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Lesson {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Learner Level
                </label>
                <select
                  value={form.learner_level}
                  onChange={(e) =>
                    setForm({ ...form, learner_level: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                >
                  <option value="Mixed ability">Mixed ability</option>
                  <option value="Above average">Above average</option>
                  <option value="Below average">Below average</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_practical}
                    onChange={(e) =>
                      setForm({ ...form, is_practical: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">
                    Practical Lesson
                  </span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Strand *
                </label>
                <input
                  value={form.strand}
                  onChange={(e) => setForm({ ...form, strand: e.target.value })}
                  placeholder="e.g. Numbers"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Sub-strand
                </label>
                <input
                  value={form.substrand}
                  onChange={(e) =>
                    setForm({ ...form, substrand: e.target.value })
                  }
                  placeholder="e.g. Whole Numbers"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:opacity-90 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" /> Generate with AI
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson list */}
      {lessons.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-1">
            No lesson plans yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Generate CBC-aligned lesson plans with AI in seconds
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600"
          >
            Generate Your First Lesson
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-teal-300 transition-colors"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setViewingLesson(lesson)}
              >
                <p className="font-bold text-gray-900">
                  {(lesson.meta || lesson).strand ||
                    lesson.topic ||
                    "Lesson Plan"}
                </p>
                <p className="text-xs text-gray-500">
                  {(lesson.meta || lesson).subject} · Grade{" "}
                  {(lesson.meta || lesson).grade}
                  {(lesson.meta || lesson).term
                    ? ` · Term ${(lesson.meta || lesson).term}`
                    : ""}
                  {(lesson.meta || lesson).week
                    ? ` · Week ${(lesson.meta || lesson).week}`
                    : ""}
                  {(lesson.meta || lesson).duration
                    ? ` · ${(lesson.meta || lesson).duration} mins`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingLesson(lesson)}
                  className="p-2 text-gray-400 hover:text-teal-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deleteLesson(lesson.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────── ANALYTICS TAB ──────────────── */
function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTeacherAnalytics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-900 mb-1">
          No analytics data yet
        </p>
        <p className="text-sm text-gray-500">
          Create classrooms and assign quizzes to see student performance data
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Student Analytics
      </h2>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Students"
          value={data.total_students || 0}
          icon={Users}
          color="teal"
        />
        <StatCard
          label="Quiz Sessions"
          value={data.total_attempts || 0}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          label="Avg Score"
          value={data.average_score || 0}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          label="Classrooms"
          value={data.classrooms_created || 0}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          label="Lesson Plans"
          value={data.lesson_plans_created || 0}
          icon={FileText}
          color="emerald"
        />
      </div>

      {/* Subject performance */}
      {data.subject_performance?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-900">
              Performance by Subject
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.subject_performance.map((s, i) => (
              <div
                key={i}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    {s.subject}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {s.total_quizzes} quiz{s.total_quizzes !== 1 ? "zes" : ""} ·{" "}
                    {s.total_students} student
                    {s.total_students !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-500"
                      style={{
                        width: `${Math.min(s.average_score || 0, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-12 text-right">
                    {s.average_score || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top students + Struggling students side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top students */}
        {data.top_students?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">
                Top Performing Students
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {data.top_students.map((s, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {s.student_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.quizzes_taken} quiz
                        {s.quizzes_taken !== 1 ? "zes" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-teal-600">
                    {s.avg_score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Struggling students */}
        {data.struggling_students?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Students Needing Support
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {data.struggling_students.map((s, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {s.student_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.quizzes_taken} quiz{s.quizzes_taken !== 1 ? "zes" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-500">
                    {s.avg_score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Classrooms */}
      {data.recent_classrooms?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-900">
              Recent Classrooms
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recent_classrooms.map((c) => (
              <div
                key={c.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {c.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.subject} · Grade {c.grade}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    c.status === "live"
                      ? "bg-green-100 text-green-700"
                      : c.status === "ended"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new teachers */}
      {!data.subject_performance?.length && !data.top_students?.length && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 mb-1">No quiz data yet</p>
          <p className="text-sm text-gray-500">
            Run a live classroom quiz to see student performance breakdowns
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────── MAIN DASHBOARD ──────────────── */
const TABS = [
  { id: "classes", label: "My Classes", icon: Users },
  { id: "lessons", label: "Lesson Plans", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const resolvedTab = TABS.find((t) => t.id === tabParam)?.id || "classes";
  const [activeTab, setActiveTab] = useState(resolvedTab);

  // Sync tab when URL search params change (e.g. navbar link clicks)
  const currentTab = TABS.find((t) => t.id === tabParam)?.id || "classes";
  if (currentTab !== activeTab && tabParam) {
    setActiveTab(currentTab);
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (
      !authLoading &&
      user &&
      user.role !== "teacher" &&
      user.role !== "admin" &&
      !user.is_staff
    ) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (!user || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.first_name || user.username}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your classes, generate lesson plans, and track student
            progress
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-8 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "classes" && <ClassesView />}
        {activeTab === "lessons" && <LessonPlansView />}
        {activeTab === "analytics" && <AnalyticsView />}
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <TeacherDashboard />
    </Suspense>
  );
}
