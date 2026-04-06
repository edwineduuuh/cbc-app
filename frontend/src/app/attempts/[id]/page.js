"use client";
import { fetchWithAuth } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  Trophy,
  Star,
  Sparkles,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
function renderMath(text) {
  if (!text) return "";
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      try {
        return katex.renderToString(expr.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        return expr;
      }
    })
    .replace(/\$([\s\S]+?)\$/g, (_, expr) => {
      try {
        return katex.renderToString(expr.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return expr;
      }
    });
}
function getGradeBand(score, grade) {
  if (!grade) return null;
  if (grade >= 4 && grade <= 6) {
    if (score >= 75)
      return {
        grade: "EE",
        label: "Exceeds Expectations",
        color: "#059669",
        bg: "#d1fae5",
      };
    if (score >= 50)
      return {
        grade: "ME",
        label: "Meets Expectations",
        color: "#2563eb",
        bg: "#dbeafe",
      };
    if (score >= 25)
      return {
        grade: "AE",
        label: "Approaches Expectations",
        color: "#d97706",
        bg: "#fef3c7",
      };
    return {
      grade: "BE",
      label: "Below Expectations",
      color: "#dc2626",
      bg: "#fee2e2",
    };
  }
  if (score >= 90)
    return {
      grade: "EE1",
      label: "Exceeds Expectations",
      color: "#059669",
      bg: "#d1fae5",
    };
  if (score >= 75)
    return {
      grade: "EE2",
      label: "Exceeds Expectations",
      color: "#059669",
      bg: "#d1fae5",
    };
  if (score >= 58)
    return {
      grade: "ME1",
      label: "Meets Expectations",
      color: "#2563eb",
      bg: "#dbeafe",
    };
  if (score >= 41)
    return {
      grade: "ME2",
      label: "Meets Expectations",
      color: "#2563eb",
      bg: "#dbeafe",
    };
  if (score >= 31)
    return {
      grade: "AE1",
      label: "Approaches Expectations",
      color: "#d97706",
      bg: "#fef3c7",
    };
  if (score >= 21)
    return {
      grade: "AE2",
      label: "Approaches Expectations",
      color: "#d97706",
      bg: "#fef3c7",
    };
  if (score >= 11)
    return {
      grade: "BE1",
      label: "Below Expectations",
      color: "#dc2626",
      bg: "#fee2e2",
    };
  return {
    grade: "BE2",
    label: "Below Expectations",
    color: "#dc2626",
    bg: "#fee2e2",
  };
}

function getMessage(score) {
  if (score >= 90)
    return {
      emoji: "🏆",
      title: "Outstanding!",
      body: "You absolutely crushed this. Your understanding is exceptional — keep pushing these boundaries!",
    };
  if (score >= 75)
    return {
      emoji: "⭐",
      title: "Excellent Work!",
      body: "You are performing at a really high level. A bit more focus on the tricky areas and you will be hitting perfect scores!",
    };
  if (score >= 50)
    return {
      emoji: "💪",
      title: "Good Progress!",
      body: "You are building solid foundations. Review the questions you found tricky and you will see real improvement.",
    };
  if (score >= 30)
    return {
      emoji: "🌱",
      title: "Keep Building!",
      body: "You are making progress and that counts. Go back through the material and try again — each attempt makes you stronger.",
    };
  return {
    emoji: "💡",
    title: "Every Journey Starts Somewhere",
    body: "This shows you exactly what to work on. Start with one concept at a time, ask for help, and keep going.",
  };
}

// ─── Shareable Card (rendered off-screen for download) ───────
function ShareCard({ score, gradeBand, quizTitle, marks, total, forwardRef }) {
  const scoreColor =
    score >= 75
      ? "#059669"
      : score >= 50
        ? "#2563eb"
        : score >= 30
          ? "#d97706"
          : "#dc2626";
  return (
    <div
      ref={forwardRef}
      style={{
        position: "fixed",
        left: -9999,
        top: 0,
        width: 600,
        padding: 48,
        background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#6b7280",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          StadiSpace
        </div>
        <div style={{ fontSize: 16, color: "#374151", fontWeight: 500 }}>
          {quizTitle}
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: scoreColor,
            lineHeight: 1,
          }}
        >
          {score}%
        </div>
        {gradeBand && (
          <div
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "6px 20px",
              borderRadius: 40,
              background: gradeBand.bg,
              color: gradeBand.color,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {gradeBand.grade} — {gradeBand.label}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 48,
          marginBottom: 32,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111827" }}>
            {marks}/{total}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Marks</div>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
        stadispace.co.ke
      </div>
    </div>
  );
}

export default function AttemptResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shareCardRef = useRef(null);

  const [results, setResults] = useState(null);
  const [quizGrade, setQuizGrade] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchResults();
    fetchCreditsStatus();
  }, [params.id, user]);

  useEffect(() => {
    const currentPath = window.location.pathname;
    window.history.replaceState(null, "", currentPath);
    const handler = () => window.history.pushState(null, "", currentPath);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const fetchCreditsStatus = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetchWithAuth(`${API}/credits/status/`);
      if (res.ok) {
        const data = await res.json();
        setCredits(
          data.quiz_credits === "unlimited" ? 999 : data.quiz_credits || 0,
        );
        setIsPremium(
          data.has_subscription === true || data.quiz_credits === "unlimited",
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResults = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetchWithAuth(`${API}/attempts/${params.id}/`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        const quizRes = await fetch(
          `${API}/quizzes/${data.quiz?.id || data.quiz_id}/`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (quizRes.ok) {
          const qd = await quizRes.json();
          setQuizGrade(qd.grade);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `stadispace-result-${score}pct.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      alert("Download failed. Please try again.");
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const text = `I scored ${score}% on ${results?.quiz?.title || "a quiz"} on StadiSpace! 📚\nJoin me at stadispace.co.ke`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "StadiSpace Results", text });
      } catch (e) {
        console.error(e);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Result copied to clipboard!");
    }
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid #e2e8f0",
            borderTopColor: "#1a6fc4",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  if (!results)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b", marginBottom: 16 }}>
            Results not found.
          </p>
          <Link href="/explore">
            <button
              style={{
                color: "#1a6fc4",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ← Back to Explore
            </button>
          </Link>
        </div>
      </div>
    );

  const feedback = results.detailed_feedback || {};
  const questionIds = Object.keys(feedback);
  const score = Math.round(results.score);
  const gradeBand = getGradeBand(score, quizGrade);
  const message = getMessage(score);
  const scoreColor =
    score >= 75
      ? "#059669"
      : score >= 50
        ? "#2563eb"
        : score >= 30
          ? "#d97706"
          : "#dc2626";
  const scoreBg =
    score >= 75
      ? "#d1fae5"
      : score >= 50
        ? "#dbeafe"
        : score >= 30
          ? "#fef3c7"
          : "#fee2e2";
  const timeTaken =
    results.completed_at && results.started_at
      ? Math.round(
          (new Date(results.completed_at) - new Date(results.started_at)) /
            60000,
        )
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* Hidden share card */}
      <ShareCard
        forwardRef={shareCardRef}
        score={score}
        gradeBand={gradeBand}
        quizTitle={results.quiz?.title || "Quiz"}
        marks={results.total_marks_awarded || 0}
        total={results.total_max_marks || 0}
      />

      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px" }}
      >
        {/* Back */}
        <button
          onClick={() => router.push("/explore")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#64748b",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={16} /> Back to Explore
        </button>

        {/* Hero Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "40px 32px",
            marginBottom: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "1px solid #f1f5f9",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
            }}
          />

          {score >= 90 && (
            <Trophy
              size={48}
              color={scoreColor}
              style={{ margin: "0 auto 16px" }}
            />
          )}
          {score >= 75 && score < 90 && (
            <Award
              size={48}
              color={scoreColor}
              style={{ margin: "0 auto 16px" }}
            />
          )}

          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {results.quiz?.title || "Quiz Results"}
          </p>

          {/* Big score */}
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              color: scoreColor,
              lineHeight: 1,
              marginBottom: 8,
              fontFamily: "Instrument Serif, serif",
            }}
          >
            {score}%
          </div>

          {/* Grade band */}
          {gradeBand && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 18px",
                borderRadius: 40,
                background: gradeBand.bg,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: gradeBand.color,
                }}
              >
                {gradeBand.grade}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: gradeBand.color,
                }}
              >
                {gradeBand.label}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Marks",
                value: `${results.total_marks_awarded ?? 0} / ${results.total_max_marks ?? 0}`,
              },
              {
                label: "Correct",
                value: `${results.correct_answers ?? 0} / ${results.total_questions ?? 0}`,
              },
              timeTaken ? { label: "Time", value: `${timeTaken} min` } : null,
            ]
              .filter(Boolean)
              .map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 500,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
          </div>

          {/* Share + Download */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={handleShare}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 12,
                background: "#f1f5f9",
                border: "none",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Share2 size={15} /> Share Result
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 12,
                background: scoreColor,
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <Download size={15} /> {downloading ? "Saving…" : "Download Card"}
            </button>
          </div>
        </motion.div>

        {/* Encouraging message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 32,
            border: "1px solid #f1f5f9",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 32, flexShrink: 0 }}>{message.emoji}</span>
          <div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              {message.title}
            </p>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              {message.body}
            </p>
          </div>
        </motion.div>

        {/* Detailed Feedback */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 16,
          }}
        >
          Question Feedback
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {questionIds.map((qId, index) => {
            const item = feedback[qId];
            const isOpen = expanded[qId] !== false; // default open
            const correct = item.is_correct;

            return (
              <motion.div
                key={qId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${correct ? "#d1fae5" : "#fee2e2"}`,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Question header — always visible */}
                <button
                  onClick={() => toggleExpand(qId)}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    background: correct ? "#f0fdf4" : "#fff5f5",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: correct ? "#d1fae5" : "#fee2e2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {correct ? (
                        <CheckCircle size={18} color="#059669" />
                      ) : (
                        <XCircle size={18} color="#dc2626" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          Question {index + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: correct ? "#d1fae5" : "#fee2e2",
                            color: correct ? "#059669" : "#dc2626",
                            flexShrink: 0,
                          }}
                        >
                          {item.marks_awarded} / {item.max_marks} marks
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMath(
                            item.question_text?.length > 100
                              ? item.question_text.slice(0, 100) + "…"
                              : item.question_text,
                          ),
                        }}
                      />
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} color="#94a3b8" />
                  ) : (
                    <ChevronDown size={16} color="#94a3b8" />
                  )}
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px" }}>
                    {/* Full question text */}
                    <div
                      style={{
                        paddingTop: 16,
                        paddingBottom: 12,
                        borderBottom: "1px solid #f1f5f9",
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#0f172a",
                          lineHeight: 1.65,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMath(item.question_text),
                        }}
                      />
                    </div>

                    {/* Your answer */}
                    <div
                      style={{
                        background: "#eff6ff",
                        borderRadius: 12,
                        padding: "12px 16px",
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#1d4ed8",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        Your Answer
                      </p>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#1e3a5f",
                          lineHeight: 1.6,
                        }}
                      >
                        {!item.student_answer ? (
                          <span
                            style={{ color: "#94a3b8", fontStyle: "italic" }}
                          >
                            (No answer provided)
                          </span>
                        ) : typeof item.student_answer === "object" ? (
                          Object.entries(item.student_answer).map(
                            ([partId, ans]) => (
                              <div
                                key={partId}
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <span style={{ color: "#3b82f6" }}>•</span>
                                <span>{String(ans)}</span>
                              </div>
                            ),
                          )
                        ) : (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: renderMath(
                                item.question_type === "math"
                                  ? `$${item.student_answer}$`
                                  : item.student_answer,
                              ),
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* AI Feedback */}
                    <div
                      style={{
                        background: correct ? "#f0fdf4" : "#fffbeb",
                        border: `1px solid ${correct ? "#bbf7d0" : "#fde68a"}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: correct ? "#059669" : "#92400e",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        {correct ? "✓ Correct!" : "Feedback"}
                      </p>
                      <div
                        style={{
                          fontSize: 14,
                          color: correct ? "#065f46" : "#78350f",
                          lineHeight: 1.7,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMath(
                            item.feedback
                              ?.replace(
                                /\(([a-z])\)\s*/g,
                                "<br/><strong>Part ($1):</strong> ",
                              )
                              ?.replace(/^<br\/>/, "")
                              ?.replace(/\n/g, "<br/>") || "",
                          ),
                        }}
                      />

                      {/* Personalized message */}
                      {item.personalized_message && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px solid ${correct ? "#bbf7d0" : "#fde68a"}`,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              color: correct ? "#065f46" : "#78350f",
                            }}
                          >
                            💡 {item.personalized_message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Study tip */}
                    {item.study_tip && (
                      <div
                        style={{
                          background: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          borderRadius: 12,
                          padding: "12px 16px",
                          marginBottom: 12,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#7c3aed",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          📚 Study Tip
                        </p>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#581c87",
                            lineHeight: 1.6,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: renderMath(
                              item.study_tip?.replace(/\n/g, "<br/>") || "",
                            ),
                          }}
                        />
                      </div>
                    )}

                    {/* Points missed */}
                    {item.points_missed && item.points_missed.length > 0 && (
                      <div
                        style={{
                          background: "#fff7ed",
                          border: "1px solid #fed7aa",
                          borderRadius: 12,
                          padding: "12px 16px",
                          marginBottom: 12,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#c2410c",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          ⚠ Points Missed
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {item.points_missed.map((point, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 13,
                                color: "#9a3412",
                                lineHeight: 1.6,
                                marginBottom: 2,
                              }}
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Correct answer */}
                    {!correct && item.correct_answer && (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: "12px 16px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#475569",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          Correct Answer
                        </p>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#0f172a",
                            lineHeight: 1.6,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: renderMath(
                              item.correct_answer?.replace(/\n/g, "<br/>") ||
                                "",
                            ),
                          }}
                        />
                        {item.explanation && (
                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 8,
                              borderTop: "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                color: "#64748b",
                                lineHeight: 1.6,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: renderMath(
                                  item.explanation?.replace(/\n/g, "<br/>") ||
                                    "",
                                ),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div
          style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          {isPremium ? (
            <>
              <button
                onClick={() => router.push("/explore")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Continue Learning
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "#fff",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "2px solid #e2e8f0",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </>
          ) : credits > 0 ? (
            <>
              <button
                onClick={() => router.push("/explore")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Take Another Quiz ({credits} free left)
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "#fff",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "2px solid #e2e8f0",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/subscribe")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                🎓 Subscribe to Continue
              </button>
              <button
                onClick={() => router.push(`/quizzes/${results.quiz?.id}`)}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "#fff",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "2px solid #e2e8f0",
                  cursor: "pointer",
                }}
              >
                🔄 Try Again
              </button>
            </>
          )}
        </div>

        {!isPremium && credits === 0 && (
          <div
            style={{
              marginTop: 16,
              padding: "16px 20px",
              borderRadius: 16,
              background: "#fffbeb",
              border: "2px solid #fde68a",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#92400e",
                marginBottom: 4,
              }}
            >
              You have used all your free quizzes!
            </p>
            <p style={{ fontSize: 13, color: "#b45309" }}>
              Subscribe now to unlock unlimited access and continue your
              learning journey.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
