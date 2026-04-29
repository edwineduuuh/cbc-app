"use client";
import { fetchWithAuth } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
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
const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";
function _patchKatexSvg(html) {
  return html.replace(/<svg([^>]*)>/g, (_, attrs) => {
    if (attrs.includes('style="')) {
      return '<svg' + attrs.replace('style="', 'style="display:inline;') + '>';
    }
    return '<svg style="display:inline;"' + attrs + '>';
  });
}
function _katex(expr, display) {
  try {
    return _patchKatexSvg(
      katex.renderToString(expr.trim(), { displayMode: display, throwOnError: false })
    );
  } catch {
    return expr;
  }
}
function renderMath(text) {
  if (!text) return "";
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => _katex(expr, true))
    .replace(/\$([\s\S]+?)\$/g,     (_, expr) => _katex(expr, false));
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

// ─── Professional Report Card (rendered off-screen for PDF export) ───────
function ReportCard({
  studentName,
  studentGrade,
  studentId,
  quizTitle,
  score,
  gradeBand,
  marks,
  total,
  correctAnswers,
  timeTaken,
  message,
  date,
  feedbackItems,
  quizType,
  totalQuestions,
  reportRef,
}) {
  const scoreColor =
    score >= 75
      ? "#0f766e"
      : score >= 50
        ? "#1d4ed8"
        : score >= 30
          ? "#b45309"
          : "#991b1b";

  return (
    <div
      ref={reportRef}
      style={{
        position: "fixed",
        left: -9999,
        top: 0,
        width: 940,
        padding: 48,
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: 40,
          borderRadius: 28,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 80px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#475569",
                fontWeight: 700,
              }}
            >
              Academic Performance Report
            </p>
            <h1
              style={{
                margin: "16px 0 0",
                fontSize: 38,
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              StadiSpace Report Card
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              Report date
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {date}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569" }}>
              {quizType || "Quiz"}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              padding: 26,
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#6b7280",
                fontWeight: 700,
              }}
            >
              Student
            </p>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 22,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              {studentName || "Student Name"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
              {studentGrade || "Grade N/A"}
            </p>
            {studentId && (
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Student ID: {studentId}
              </p>
            )}
          </div>

          <div
            style={{
              padding: 26,
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#6b7280",
                fontWeight: 700,
              }}
            >
              Performance Summary
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 18,
              }}
            >
              {[
                { label: "Score", value: `${score}%`, color: scoreColor },
                {
                  label: "Grade Band",
                  value: gradeBand
                    ? `${gradeBand.grade} — ${gradeBand.label}`
                    : "N/A",
                  color: gradeBand ? gradeBand.color : "#475569",
                },
                {
                  label: "Marks",
                  value: `${marks} / ${total}`,
                  color: "#111827",
                },
                {
                  label: "Correct",
                  value: `${correctAnswers} / ${totalQuestions || "N/A"}`,
                  color: "#111827",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 19,
                      fontWeight: 800,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: 24,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#6b7280",
                fontWeight: 700,
              }}
            >
              Highlights
            </p>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 15,
                lineHeight: 1.75,
                color: "#334155",
              }}
            >
              {message.body}
            </p>
          </div>
          <div
            style={{
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: 24,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#6b7280",
                fontWeight: 700,
              }}
            >
              Teacher note
            </p>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 19,
                fontWeight: 800,
                color: scoreColor,
              }}
            >
              {message.emoji} {message.title}
            </p>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 14,
                lineHeight: 1.75,
                color: "#334155",
              }}
            >
              {message.body}
            </p>
          </div>
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 18,
            }}
          >
            Detailed Question Feedback
          </h2>
          <div style={{ display: "grid", gap: 18 }}>
            {feedbackItems.map((item) => (
              <div
                key={item.index}
                style={{
                  borderRadius: 20,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Question {item.index}
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 13,
                        color: "#475569",
                        lineHeight: 1.65,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMath(item.question_text),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: item.correct ? "#d1fae5" : "#fee2e2",
                      color: item.correct ? "#0f766e" : "#b91c1c",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {item.correct ? "Correct" : "Needs review"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "#475569",
                      }}
                    >
                      Student answer
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 14,
                        color: "#0f172a",
                        lineHeight: 1.7,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMath(item.student_answer),
                      }}
                    />
                  </div>
                  {!item.correct && (
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          color: "#475569",
                        }}
                      >
                        Correct answer
                      </p>
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 14,
                          color: "#0f172a",
                          lineHeight: 1.7,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMath(item.correct_answer || ""),
                        }}
                      />
                    </div>
                  )}
                </div>

                {item.feedback && (
                  <div
                    style={{
                      marginTop: 16,
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: 16,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "#475569",
                      }}
                    >
                      Feedback
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 14,
                        color: "#0f172a",
                        lineHeight: 1.8,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMath(item.feedback),
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#6b7280",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Prepared by
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              StadiSpace Academic Team
            </p>
          </div>
          <div style={{ textAlign: "right", color: "#94a3b8", fontSize: 12 }}>
            <p style={{ margin: 0 }}>www.stadispace.co.ke</p>
            <p style={{ margin: "8px 0 0" }}>Official student report</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttemptResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const reportCardRef = useRef(null);

  const [results, setResults] = useState(null);
  const [quizGrade, setQuizGrade] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef(null);

  const fetchCreditsStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API}/credits/status/`);
      if (res.ok) {
        const data = await res.json();
        setCredits(data.quiz_credits === "unlimited" ? 999 : data.quiz_credits || 0);
        setIsPremium(data.has_subscription === true || data.quiz_credits === "unlimited");
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchResults = useCallback(async () => {
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [params.id]);

  // Poll the lightweight status endpoint until grading completes.
  const startPolling = useCallback(() => {
    setGrading(true);
    setLoading(false);
    let attempts = 0;
    const MAX_POLLS = 60; // 2 min max
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetchWithAuth(`${API}/attempts/${params.id}/grading-status/`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollRef.current);
          setGrading(false);
          fetchResults();
          fetchCreditsStatus();
        } else if (data.status === "grading_failed" || attempts >= MAX_POLLS) {
          clearInterval(pollRef.current);
          setGrading(false);
          setLoading(false);
        }
      } catch { /* network blip — keep polling */ }
    }, 2000);
  }, [params.id, fetchResults, fetchCreditsStatus]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    // Check status first — if the attempt is still grading, start polling.
    (async () => {
      try {
        const res = await fetchWithAuth(`${API}/attempts/${params.id}/grading-status/`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "grading") { startPolling(); return; }
          if (data.status === "grading_failed") { setLoading(false); return; }
        }
      } catch { /* fall through to full fetch */ }
      fetchResults();
      fetchCreditsStatus();
    })();
    return () => clearInterval(pollRef.current);
  }, [params.id, user, router, fetchResults, fetchCreditsStatus, startPolling]);

  useEffect(() => {
    const currentPath = window.location.pathname;
    window.history.replaceState(null, "", currentPath);
    const handler = () => window.history.pushState(null, "", currentPath);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pageElement = reportCardRef.current;
      if (!pageElement) throw new Error("Download element not available");

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const pageWidth = pdf.internal.pageSize.getWidth() - 20;
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let position = 10;
      let remainingHeight = imgHeight;

      pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        position -= pageHeight;
        pdf.addImage(imgData, "PNG", 10, position, pageWidth, imgHeight);
        remainingHeight -= pageHeight;
      }

      const pageCount = pdf.getNumberOfPages();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(10);
      pdf.setTextColor("#64748b");
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.text(`Page ${page} of ${pageCount}`, pdfWidth / 2, pdfHeight - 10, {
          align: "center",
        });
      }

      pdf.save(`stadispace-result-${Math.round(results?.score ?? 0)}pct.pdf`);
    } catch (e) {
      console.error(e);
      alert("Unable to generate the PDF. Please try again.");
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const score = Math.round(results?.score ?? 0);
    const url = window.location.href;
    const text = `I scored ${score}% on ${results?.quiz?.title || "a quiz"} on StadiSpace! 📚\nSee my results and improve at ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "StadiSpace Results", text, url });
      } catch (e) {
        console.error(e);
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Result link copied to clipboard!");
    }
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (grading)
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "'Lato', sans-serif" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "#1a6fc4", animation: "spin 0.9s linear infinite" }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>Marking your answers…</p>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>AI is reviewing each question. This usually takes 15–30 seconds.</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  if (loading)
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#1a6fc4", animation: "spin 0.8s linear infinite" }} />
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

      {/* Hidden report card used only for PDF generation */}
      <ReportCard
        studentName={`${user?.first_name || user?.username || "Student"} ${user?.last_name || ""}`.trim()}
        studentGrade={`Grade ${user?.grade || "N/A"}`}
        studentId={user?.id}
        quizTitle={results.quiz?.title || "Quiz"}
        score={score}
        gradeBand={gradeBand}
        marks={results.total_marks_awarded || 0}
        total={results.total_max_marks || 0}
        correctAnswers={results.correct_answers ?? 0}
        timeTaken={timeTaken}
        message={message}
        date={new Date(results.completed_at || Date.now()).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          },
        )}
        feedbackItems={questionIds.map((qId, index) => {
          const item = feedback[qId];
          return {
            index: index + 1,
            correct: item.is_correct,
            question_text: renderMath(item.question_text || ""),
            student_answer: item.student_answer
              ? typeof item.student_answer === "object"
                ? Object.entries(item.student_answer)
                    .map(
                      ([partId, ans]) =>
                        `<strong>${partId}:</strong> ${String(ans)}`,
                    )
                    .join("<br/>")
                : renderMath(
                    item.question_type === "math"
                      ? `$${item.student_answer}$`
                      : item.student_answer,
                  )
              : "<em>No answer provided</em>",
            correct_answer: item.correct_answer
              ? renderMath(item.correct_answer.replace(/\n/g, "<br/>") || "")
              : "",
            feedback: renderMath(
              item.feedback
                ?.replace(
                  /\(([a-z])\)\s*/g,
                  "<br/><strong>Part ($1):</strong> ",
                )
                ?.replace(/^<br\/>/, "")
                ?.replace(/\n/g, "<br/>") || "",
            ),
          };
        })}
        quizType={results.quiz?.subject || "Quiz"}
        totalQuestions={results.total_questions}
        reportRef={reportCardRef}
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
              <Download size={15} />{" "}
              {downloading ? "Generating…" : "Download Report"}
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
            const partial = !correct && item.marks_awarded > 0;
            const cardColor = correct ? "#d1fae5" : partial ? "#fde68a" : "#fee2e2";
            const cardBg   = correct ? "#f0fdf4" : partial ? "#fffbeb" : "#fff5f5";
            const textColor = correct ? "#059669" : partial ? "#92400e" : "#dc2626";

            return (
              <motion.div
                key={qId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${cardColor}`,
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
                    background: cardBg,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: cardColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {correct ? (
                        <CheckCircle size={18} color="#059669" />
                      ) : partial ? (
                        <Award size={18} color="#d97706" />
                      ) : (
                        <XCircle size={18} color="#dc2626" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                          Question {index + 1}
                          {item.question_type === "multipart" && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#ede9fe", borderRadius: 6, padding: "1px 6px", marginLeft: 8 }}>
                              Multipart
                            </span>
                          )}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 700, padding: "3px 10px",
                          borderRadius: 20, background: cardColor, color: textColor, flexShrink: 0,
                        }}>
                          {item.marks_awarded} / {item.max_marks} marks
                        </span>
                      </div>
                      <p
                        style={{ fontSize: 13, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}
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
                  {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px" }}>

                    {/* ── MULTIPART: each part as a full independent card ── */}
                    {item.question_type === "multipart" && item.part_results?.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
                        {item.part_results.map((part, pi) => {
                          const pCorrect = part.is_correct;
                          const pPartial = !pCorrect && part.marks_awarded > 0;
                          const pColor = pCorrect ? "#059669" : pPartial ? "#d97706" : "#dc2626";
                          const pBg    = pCorrect ? "#f0fdf4"  : pPartial ? "#fffbeb"  : "#fff5f5";
                          const pBorder = pCorrect ? "#bbf7d0" : pPartial ? "#fde68a"  : "#fecaca";
                          const pChipBg = pCorrect ? "#d1fae5" : pPartial ? "#fde68a"  : "#fee2e2";
                          // Resolve letter → full option text using quiz question parts
                          const quizQ = results.quiz?.questions?.find(q => String(q.id) === String(qId));
                          const quizPart = quizQ?.parts?.find(p => p.id === part.part_id);
                          const sLetter = String(part.student_answer || "").toUpperCase();
                          const studentAnswerText = (quizPart && sLetter)
                            ? (quizPart[`option_${sLetter.toLowerCase()}`] || part.student_answer || "No answer")
                            : (part.student_answer || "No answer");
                          const cLetter = String(part.correct_answer || "").toUpperCase();
                          const correctAnswerText = (quizPart && cLetter)
                            ? (quizPart[`option_${cLetter.toLowerCase()}`] || part.correct_answer || "")
                            : (part.correct_answer || "");
                          return (
                            <div
                              key={part.part_id ?? pi}
                              style={{
                                borderRadius: 14,
                                border: `2px solid ${pBorder}`,
                                overflow: "hidden",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                              }}
                            >
                              {/* Part header */}
                              <div style={{
                                background: pBg,
                                padding: "12px 16px",
                                display: "flex", alignItems: "flex-start", gap: 12,
                                borderBottom: `1px solid ${pBorder}`,
                              }}>
                                {/* Label badge */}
                                <div style={{
                                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                  background: pColor, color: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 800, fontSize: 14,
                                }}>
                                  {part.part_label?.toUpperCase() || String.fromCharCode(97 + pi).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.5, margin: 0 }}
                                    dangerouslySetInnerHTML={{ __html: renderMath(part.question_text || "") }}
                                  />
                                </div>
                                {/* Marks chip */}
                                <div style={{
                                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
                                }}>
                                  <span style={{
                                    fontSize: 13, fontWeight: 800, padding: "4px 12px",
                                    borderRadius: 20, background: pChipBg, color: pColor, whiteSpace: "nowrap",
                                  }}>
                                    {part.marks_awarded} / {part.max_marks} marks
                                  </span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: pColor }}>
                                    {pCorrect ? "✓ Full marks" : pPartial ? "Partial credit" : "✗ No marks"}
                                  </span>
                                </div>
                              </div>

                              {/* Part body */}
                              <div style={{ background: "#fff", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

                                {/* Your answer */}
                                <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 14px" }}>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                                    Your Answer
                                  </p>
                                  <div style={{ fontSize: 13, color: "#1e3a5f", lineHeight: 1.6 }}>
                                    {studentAnswerText && studentAnswerText !== "No answer"
                                      ? <span dangerouslySetInnerHTML={{ __html: renderMath(studentAnswerText) }} />
                                      : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>(No answer provided)</span>
                                    }
                                  </div>
                                </div>

                                {/* Feedback */}
                                {part.feedback && (
                                  <div style={{
                                    background: pCorrect ? "#f0fdf4" : pPartial ? "#fffbeb" : "#fff7ed",
                                    borderRadius: 10, padding: "10px 14px",
                                    borderLeft: `3px solid ${pColor}`,
                                  }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: pColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                                      {pCorrect ? "✓ Feedback" : "Feedback"}
                                    </p>
                                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}
                                      dangerouslySetInnerHTML={{ __html: renderMath((part.feedback || "").replace(/\n/g, "<br/>")) }}
                                    />
                                  </div>
                                )}

                                {/* Correct answer — only when not full marks */}
                                {!pCorrect && correctAnswerText && (
                                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px dashed #cbd5e1" }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                                      Correct Answer
                                    </p>
                                    <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6, margin: 0 }}
                                      dangerouslySetInnerHTML={{ __html: renderMath(correctAnswerText.replace(/\n/g, "<br/>")) }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── REGULAR (non-multipart) blocks below ── */}
                    {item.question_type !== "multipart" && <>

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
                        ) : typeof item.student_answer === "object" ? (() => {
                          const quizQ = results.quiz?.questions?.find(q => String(q.id) === String(qId));
                          return Object.entries(item.student_answer).map(
                            ([partId, ans]) => {
                              const answerPart = quizQ?.parts?.find(p => String(p.id) === String(partId));
                              const letter = String(ans || "").toUpperCase();
                              const fullText = (answerPart && letter)
                                ? (answerPart[`option_${letter.toLowerCase()}`] || String(ans))
                                : String(ans);
                              return (
                                <div key={partId} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                                  <span style={{ color: "#3b82f6" }}>•</span>
                                  <span>{fullText || "(No answer)"}</span>
                                </div>
                              );
                            }
                          );
                        })() : (
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

                    {/* Study tip — hide if it's a duplicate of the feedback (>300 chars is a red flag) */}
                    {item.study_tip && item.study_tip.length <= 300 && !item.feedback?.includes(item.study_tip?.slice(0, 80)) && (
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
                              dangerouslySetInnerHTML={{
                                __html: renderMath(point),
                              }}
                            />
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Correct answer — not shown for tables (points_missed covers it in plain English) */}
                    {!correct && item.correct_answer && item.question_type !== "table" && (
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
                              item.correct_answer?.replace(/\n/g, "<br/>") || "",
                            ),
                          }}
                        />
                      </div>
                    )}

                    </>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Upgrade banner — only shown when no credits left */}
          {!isPremium && credits === 0 && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 16,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1d4ed8",
                  marginBottom: 4,
                }}
              >
                You have used your 2 free quizzes
              </p>
              <p style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
                Subscribe for KES 500/month to keep going — unlimited quizzes,
                all learning areas, Grades 4–10.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {isPremium || credits > 0 ? (
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
                  {credits > 0 && !isPremium
                    ? `Continue learning (${credits} free left)`
                    : "Continue learning"}
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
                    flex: 2,
                    minWidth: 180,
                    padding: "14px 0",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Unlock unlimited access — KES 500/mo
                </button>
                <button
                  onClick={() => router.push(`/quizzes/${results.quiz?.id}`)}
                  style={{
                    flex: 1,
                    minWidth: 120,
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
                  Try again
                </button>
              </>
            )}
          </div>
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
