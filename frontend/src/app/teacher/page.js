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
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-teal-600 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-teal-600 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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
function SimpleToast({ msg, type, onClose }) {
  if (!msg) return null;
  const bg = type === "error" ? "#dc2626" : "#059669";
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "12px 24px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {msg}
    </div>
  );
}

function AssignQuizModal({ classroom, onClose, onAssigned }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
      showToast("Failed to assign quiz", "error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <SimpleToast msg={toastMsg?.msg} type={toastMsg?.type} />
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
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-teal-600 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {assigning ? "Assigning..." : "Assign Quiz"}
          </button>
        </div>
      </div>
    </>
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
  const [toastMsg, setToastMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
      showToast(err.message || "Failed to start", "error");
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
      showToast(err.message || "Failed to advance", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleEnd = () => {
    setConfirmModal({
      open: true,
      message: "End this quiz? Students will see final results.",
      onConfirm: async () => {
        setActionLoading("end");
        try {
          const data = await api.endClassroom(room.id);
          setRoom(data);
          onRefreshList();
        } catch (err) {
          showToast(err.message || "Failed to end", "error");
        } finally {
          setActionLoading("");
        }
      },
    });
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
          {/* WAITING - Lobby */}
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
                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-green-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
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

          {/* LIVE - Current Question */}
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
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
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
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
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

          {/* ENDED - Results Summary */}
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

        {/* Sidebar - Leaderboard (shown during waiting/live) */}
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

      {/* Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setConfirmModal({ open: false, message: "", onConfirm: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 font-semibold text-center mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ open: false, message: "", onConfirm: null })} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ open: false, message: "", onConfirm: null }); }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition">Confirm</button>
            </div>
          </div>
        </div>
      )}
      <SimpleToast msg={toastMsg?.msg} type={toastMsg?.type} />
    </div>
  );
}

/* ──────────────── CLASSES TAB ──────────────── */
function ClassesView() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

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

  const deleteClassroom = (id) => {
    setConfirmModal({
      open: true,
      message: "Delete this classroom?",
      onConfirm: async () => {
        try {
          await api.deleteClassroom(id);
          setClassrooms((prev) => prev.filter((c) => c.id !== id));
          if (selectedClassroom?.id === id) setSelectedClassroom(null);
        } catch {
          showToast("Failed to delete classroom", "error");
        }
      },
    });
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:opacity-90"
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
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600"
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

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setConfirmModal({ open: false, message: "", onConfirm: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 font-semibold text-center mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ open: false, message: "", onConfirm: null })} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ open: false, message: "", onConfirm: null }); }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition">Confirm</button>
            </div>
          </div>
        </div>
      )}
      <SimpleToast msg={toastMsg?.msg} type={toastMsg?.type} />
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
                      className="h-full rounded-full bg-teal-500"
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
                    <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-xs">
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
