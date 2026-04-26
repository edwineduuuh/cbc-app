"use client";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation"; // ADDED useSearchParams
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Flag,
  Send,
  Loader2,
  X,
  Menu,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import SimpleMathInput from "@/components/SimpleMathInput";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

// ─── Math Rendering ───────────────────────────────────────────────────────────
function _katex(expr, display) {
  try {
    return katex
      .renderToString(expr.trim(), { displayMode: display, throwOnError: false })
      .replace(/<svg /g, '<svg style="display:inline;overflow:visible;" ');
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

// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useTimer(totalSeconds, onExpire) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);
  const pct = (remaining / totalSeconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = pct < 20;
  return {
    display: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    pct,
    isUrgent,
    remaining,
  };
}

// ─── MCQ Option ───────────────────────────────────────────────────────────────
function MCQOption({ letter, text, selected, onClick }) {
  const colorMap = {
    A: {
      idle: "#e8f4ff",
      idleBorder: "#bdd7f5",
      idleText: "#1e6bb8",
      activeBg: "#1a6fc4",
      activeText: "#fff",
    },
    B: {
      idle: "#eafaf3",
      idleBorder: "#a8e6c4",
      idleText: "#1a7a4a",
      activeBg: "#1d8f57",
      activeText: "#fff",
    },
    C: {
      idle: "#fff8e6",
      idleBorder: "#f0d690",
      idleText: "#9a6c00",
      activeBg: "#d4900a",
      activeText: "#fff",
    },
    D: {
      idle: "#fdeef0",
      idleBorder: "#f5b8c0",
      idleText: "#c0334a",
      activeBg: "#c0334a",
      activeText: "#fff",
    },
  };
  const c = colorMap[letter];
  const bg = selected ? c.activeBg : c.idle;
  const border = selected ? c.activeBg : c.idleBorder;
  const textColor = selected ? c.activeText : "#1a1a2e";

  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: 16,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: selected
          ? `0 4px 20px ${c.activeBg}44`
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: selected ? "rgba(255,255,255,0.25)" : c.idleBorder,
          color: selected ? c.activeText : c.idleText,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {letter}
      </div>
      <span
        style={{
          fontSize: 15,
          fontWeight: selected ? 600 : 500,
          color: textColor,
          lineHeight: 1.5,
          textAlign: "left",
          flex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: renderMath(text) }}
      />
      {selected && <CheckCircle size={20} color={c.activeText} />}
    </button>
  );
}

// ─── Table Input ──────────────────────────────────────────────────────────────
function TableInput({ tableData, value, onChange }) {
  const rows = tableData?.rows || [];
  const cellAnswers = (typeof value === "object" && value !== null) ? value : {};

  const handleCell = (r, c, val) => {
    const key = `${r}_${c}`;
    const next = { ...cellAnswers, [key]: val };
    onChange(next);
  };

  if (!rows.length) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 280 }}>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const key = `${r}_${c}`;
                return (
                  <td
                    key={c}
                    style={{
                      border: "2px solid #d1d5db",
                      padding: cell.e ? "6px" : "10px 14px",
                      background: cell.e ? "#eff6ff" : "#f9fafb",
                      fontWeight: cell.e ? 500 : 600,
                      fontSize: 15,
                      color: "#0d0d1a",
                      minWidth: 80,
                      textAlign: "center",
                    }}
                  >
                    {cell.e ? (
                      <input
                        type="text"
                        value={cellAnswers[key] ?? ""}
                        onChange={(e) => handleCell(r, c, e.target.value)}
                        placeholder="?"
                        style={{
                          width: "100%",
                          border: "2px solid",
                          borderColor: cellAnswers[key] ? "#1a6fc4" : "#bdd7f5",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#0d0d1a",
                          background: "#fff",
                          textAlign: "center",
                          fontFamily: "inherit",
                          outline: "none",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#1a6fc4")}
                        onBlur={(e) =>
                          (e.target.style.borderColor = cellAnswers[key] ? "#1a6fc4" : "#bdd7f5")
                        }
                      />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: renderMath(cell.v || "") }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Question Nav Panel ───────────────────────────────────────────────────────
function QuestionNav({ questions, answers, currentIdx, onJump, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            position: "fixed",
            top: 65,
            left: 0,
            right: 0,
            zIndex: 25,
            background: "#fff",
            borderBottom: "1px solid #e8eaf0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            padding: "8px 16px",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {questions.map((_, i) => {
              const a = answers[i];
              const answered = a !== undefined && a !== "" &&
                (typeof a !== "object" || Object.values(a).some((c) => c !== ""));
              const current = i === currentIdx;
              return (
                <button
                  key={i}
                  onClick={() => onJump(i)}
                  title={`Q${i + 1}`}
                  style={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 10,
                    border: current ? "2px solid #1a6fc4" : "2px solid transparent",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    background: current
                      ? "#1a6fc4"
                      : answered
                        ? "#d4edda"
                        : "#f0f2f7",
                    color: current ? "#fff" : answered ? "#1a7a4a" : "#8892a4",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Syne', sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────
function SubmitModal({ open, onConfirm, onCancel, unanswered, submitting }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(10,10,30,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.93, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.93, y: 20 }}
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 32,
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#e8f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Send size={24} color="#1a6fc4" />
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                textAlign: "center",
                color: "#0d0d1a",
                marginBottom: 10,
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Submit Quiz?
            </h3>
            {unanswered > 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#d4900a",
                  textAlign: "center",
                  marginBottom: 24,
                  lineHeight: 1.6,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                <strong>{unanswered}</strong> question
                {unanswered !== 1 ? "s" : ""} unanswered. You can still go back.
              </p>
            ) : (
              <p
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  textAlign: "center",
                  marginBottom: 24,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                All questions answered. Ready!
              </p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "2px solid #e8eaf0",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Marking your answers…
                  </>
                ) : (
                  "Submit Now"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ result, quiz }) {
  const score = Math.round(result.score ?? 0);
  const passed = score >= (quiz?.passing_score ?? 75);
  const color = score >= 75 ? "#1d8f57" : score >= 50 ? "#d4900a" : "#c0334a";
  const circumference = 2 * Math.PI * 68;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0f6ff 0%, #f9fff4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;500;600;700&display=swap');`}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: 440 }}
      >
        {/* Score ring */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <svg width={160} height={160} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={80}
              cy={80}
              r={68}
              fill="none"
              stroke="#e8eaf0"
              strokeWidth={10}
            />
            <motion.circle
              cx={80}
              cy={80}
              r={68}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
              transition={{
                duration: 1.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.3,
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: "#0d0d1a",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {score}%
            </span>
            <span
              style={{
                fontSize: 12,
                color: passed ? "#1d8f57" : "#c0334a",
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              {passed ? "PASSED ✓" : "TRY AGAIN"}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 28,
            marginBottom: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            border: "1px solid #e8eaf0",
          }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              textAlign: "center",
              color: "#0d0d1a",
              marginBottom: 24,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {passed ? "🎉 Well done!" : "📚 Keep going!"}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "Marks",
                value: `${result.total_marks_awarded ?? 0} / ${result.total_max_marks ?? 0}`,
              },
              {
                label: "Correct",
                value: `${result.correct_answers ?? "—"} questions`,
              },
              {
                label: "Time Taken",
                value: result.time_taken
                  ? `${Math.floor(result.time_taken / 60)}m ${result.time_taken % 60}s`
                  : "—",
              },
              { label: "Pass Mark", value: `${quiz?.passing_score ?? 75}%` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "#f7f9fc",
                  borderRadius: 14,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "#8892a4",
                    fontWeight: 600,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0d0d1a",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          {/* ========== ADD THIS CODE HERE ========== */}
          {result.detailed_feedback &&
            Object.keys(result.detailed_feedback).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "#0d0d1a",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  📝 Your Answers
                </h3>

                {Object.entries(result.detailed_feedback).map(
                  ([qId, feedback], idx) => (
                    <div
                      key={qId}
                      style={{
                        background: feedback.is_correct ? "#f0fdf4" : "#fffbeb",
                        border: `2px solid ${feedback.is_correct ? "#1d8f57" : "#d4900a"}`,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                      }}
                    >
                      {/* Question number */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            background: feedback.is_correct
                              ? "#1d8f57"
                              : "#d4900a",
                            color: "#fff",
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {idx + 1}
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: feedback.is_correct ? "#1d8f57" : "#d4900a",
                          }}
                        >
                          {feedback.marks_awarded}/{feedback.max_marks} marks
                        </span>
                      </div>

                      {/* Question text */}
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0d0d1a",
                          marginBottom: 8,
                        }}
                      >
                        {feedback.question_text}
                      </p>

                      {/* Your answer */}
                      <div style={{ marginBottom: 8 }}>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          Your answer:
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            color: "#0d0d1a",
                            background: "#fff",
                            padding: 8,
                            borderRadius: 8,
                          }}
                        >
                          {feedback.student_answer || "No answer"}
                        </p>
                      </div>

                      {/* AI Feedback */}
                      {feedback.feedback && (
                        <div
                          style={{
                            background: "#fff",
                            padding: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            💡 Feedback:
                          </p>
                          <p
                            style={{
                              fontSize: 13,
                              color: "#0d0d1a",
                              lineHeight: 1.6,
                            }}
                          >
                            {feedback.feedback}
                          </p>
                        </div>
                      )}

                      {/* What you got right */}
                      {feedback.points_earned &&
                        feedback.points_earned.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#1d8f57",
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              ✓ You got credit for:
                            </p>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 20,
                                fontSize: 13,
                                color: "#0d0d1a",
                              }}
                            >
                              {feedback.points_earned.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* What you missed */}
                      {feedback.points_missed &&
                        feedback.points_missed.length > 0 && (
                          <div>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#d4900a",
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              ✗ You missed:
                            </p>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 20,
                                fontSize: 13,
                                color: "#0d0d1a",
                              }}
                            >
                              {feedback.points_missed.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  ),
                )}
              </div>
            )}
          {/* Guest Progress Notice */}
          {result.is_guest && (
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
                border: "2px solid #0ea5e9",
                borderRadius: 16,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0369a1",
                  marginBottom: 4,
                }}
              >
                💡 Guest Mode: Results shown once only
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "#075985",
                }}
              >
                Sign up to save your progress, track improvement, and unlock 4
                more free quizzes!
              </p>
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/explore" style={{ flex: 1 }}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "2px solid #e8eaf0",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Browse Quizzes
              </button>
            </Link>
            {result.id && (
              <Link href={`/attempts/${result.id}`} style={{ flex: 1 }}>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  Review Answers
                </button>
              </Link>
            )}
          </div>
        </div>

        <Link href="/explore">
          <button
            style={{
              width: "100%",
              padding: "12px 0",
              background: "none",
              border: "none",
              color: "#8892a4",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            Try Another Quiz <ChevronRight size={16} />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Timer Badge ──────────────────────────────────────────────────────────────
function TimerBadge({ totalSeconds, onExpire }) {
  const { display, isUrgent } = useTimer(totalSeconds, onExpire);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 12,
        background: isUrgent ? "#fdeef0" : "#f0f6ff",
        border: `2px solid ${isUrgent ? "#f5b8c0" : "#bdd7f5"}`,
        animation: isUrgent ? "pulse 1s infinite" : "none",
      }}
    >
      <Clock size={14} color={isUrgent ? "#c0334a" : "#1a6fc4"} />
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: isUrgent ? "#c0334a" : "#1a6fc4",
          fontFamily: "'Syne', sans-serif",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {display}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizTakePage({ params }) {
  const { user } = useAuth();
  useEffect(() => {
    if (
      user &&
      (user.role === "admin" ||
        user.role === "super_admin" ||
        user.role === "teacher")
    ) {
      router.push("/admin");
    }
  }, [user]);

  const router = useRouter();
  const { id: quizId } = use(params);

  // READ GUEST SESSION FROM URL QUERY PARAMETER
  const searchParams = useSearchParams();
  const guestSessionFromUrl = searchParams.get("guest_session");

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [result, setResult] = useState(null);
  const [showNav, setShowNav] = useState(true);
  const [flagged, setFlagged] = useState(new Set());
  const quizStartedAt = useRef(new Date().toISOString());

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.values(answers).filter((v) => {
    if (v === undefined || v === "") return false;
    if (typeof v === "object" && v !== null) return Object.values(v).some((c) => c !== "");
    return true;
  }).length;
  const unanswered = totalQ - answeredCount;
  const progressPct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  useEffect(() => {
    // Allow guests to access quiz
    if (!user && !guestSessionFromUrl) {
      router.push("/explore");
      return;
    }
    if (!quizId) return;
    const token = localStorage.getItem("accessToken");
    (async () => {
      try {
        const headers = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${API}/quizzes/${quizId}/`, { headers });
        const data = await res.json();
        setQuiz(data);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("Failed to load quiz:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, quizId, router, guestSessionFromUrl]);

  const handleAnswer = useCallback(
    (value) => {
      setAnswers((prev) => ({ ...prev, [currentIdx]: value }));
    },
    [currentIdx],
  );

  // Capture current math-field value before navigating away
  const captureMathField = useCallback(() => {
    const mf = document.querySelector("math-field");
    if (mf) {
      const val = mf.value?.trim();
      if (val && val !== "\\placeholder{}") {
        setAnswers((prev) => ({ ...prev, [currentIdx]: val }));
      }
    }
  }, [currentIdx]);

  const goToQuestion = useCallback((idx) => {
    captureMathField();
    setCurrentIdx(idx);
  }, [captureMathField]);

  const handleQuizSubmit = async () => {
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout
    try {
      // Snapshot answers + capture any visible math field directly
      const finalAnswers = { ...answers };
      const mf = document.querySelector("math-field");
      if (mf) {
        const val = mf.value?.trim();
        if (val && val !== "\\placeholder{}") {
          finalAnswers[currentIdx] = val;
        }
      }
      const answersDict = {};
      questions.forEach((q, idx) => {
        if (finalAnswers[idx]) answersDict[q.id] = finalAnswers[idx];
      });

      // Get token and guest session
      const token = localStorage.getItem("accessToken");
      const guestSession =
        guestSessionFromUrl || localStorage.getItem("guest_session_id");

      // Build payload
      const payload = {
        quiz_id: parseInt(quizId),
        answers: answersDict,
        started_at: quizStartedAt.current,
      };

      // Add session_id for guests
      if (!token && guestSession) {
        payload.session_id = guestSession;
      }

      // Build headers
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API}/quizzes/submit/`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      // Handle quota/credits exhausted (402)
      if (response.status === 402) {
        if (data.quota_exceeded) {
          // Guest ran out → show signup modal
          const shouldSignup = confirm(
            data.message +
              "\n\nWould you like to sign up for 4 more free quizzes?",
          );
          if (shouldSignup) {
            router.push("/register");
          } else {
            router.push("/explore");
          }
        } else if (data.credits_exhausted) {
          // User ran out → show payment modal
          const shouldSubscribe = confirm(
            data.message + "\n\nWould you like to subscribe now?",
          );
          if (shouldSubscribe) {
            router.push("/student/payments");
          } else {
            router.push("/explore");
          }
        }
        return;
      }

      if (response.ok) {
        // Handle guest
        if (data.is_guest) {
          const guestQuizHistory = JSON.parse(
            localStorage.getItem("guest_quiz_history") || "[]",
          );
          guestQuizHistory.push({
            quiz_title: quiz?.title || "Quiz",
            score: data.score || 0,
            marks: `${data.total_marks_awarded || 0}/${data.total_max_marks || 0}`,
            date: new Date().toISOString(),
          });
          localStorage.setItem(
            "guest_quiz_history",
            JSON.stringify(guestQuizHistory),
          );
          // Update guest quota in localStorage
          localStorage.setItem("guest_quizzes_taken", data.guest_quizzes_taken);

          // Show signup prompt if they've used both free quizzes
          if (data.show_signup_prompt) {
            setTimeout(() => {
              const shouldSignup = confirm(
                `🎉 Quiz complete! You scored ${data.score}%\n\n` +
                  `You've used your 2 free quizzes!\n\n` +
                  `Sign up now to get 2 MORE free quizzes + save your progress.`,
              );
              if (shouldSignup) {
                router.push("/register");
                return;
              }
            }, 1500);
          }

          // For guests, show results inline (no saved attempt)
          setResult(data);
        } else {
          // For authenticated users, redirect to saved attempt
          router.replace(`/attempts/${data.id}`);
        }
      } else {
        alert(`Error: ${data.error || "Submission failed"}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        alert("Marking is taking longer than expected. Please try submitting again.");
      } else {
        alert("Submission failed: " + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(currentIdx) ? next.delete(currentIdx) : next.add(currentIdx);
      return next;
    });
  };

  const handleTimerExpire = useCallback(() => {
    if (!result) setShowSubmitModal(true);
  }, [result]);

  // ── Loading ──
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f9fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid #e8eaf0",
              borderTopColor: "#1a6fc4",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              color: "#8892a4",
              fontSize: 14,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            Loading quiz…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;500;600;700&display=swap');`}</style>
      </div>
    );

  if (result) return <ResultsScreen result={result} quiz={quiz} />;

  if (!currentQ)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f9fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#8892a4", fontSize: 14 }}>No questions found.</p>
          <Link href="/explore">
            <button
              style={{
                marginTop: 16,
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

  const isMCQ = currentQ.question_type === "mcq";
  const isFillBlank = currentQ.question_type === "fill_blank";
  const isMath = currentQ.question_type === "math";
  const isTable = currentQ.question_type === "table";
  const isText =
    currentQ.question_type === "structured" ||
    currentQ.question_type === "essay";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f9fc",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus { outline: none; }
        button { font-family: inherit; }
      `}</style>

      <SubmitModal
        open={showSubmitModal}
        onConfirm={handleQuizSubmit}
        onCancel={() => setShowSubmitModal(false)}
        unanswered={unanswered}
        submitting={submitting}
      />
      <QuestionNav
        questions={questions}
        answers={answers}
        currentIdx={currentIdx}
        onJump={goToQuestion}
        show={showNav}
      />

      {/* ── Top Bar ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#fff",
          borderBottom: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 16px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link href="/explore">
            <button
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "2px solid #e8eaf0",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={16} color="#6b7280" />
            </button>
          </Link>

          {/* Progress */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#8892a4" }}>
                {answeredCount} of {totalQ} answered
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a6fc4" }}>
                {Math.round(progressPct)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#e8eaf0",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #1a6fc4, #0ea5c9)",
                  borderRadius: 99,
                }}
              />
            </div>
          </div>

          {quiz?.duration_minutes && (
            <TimerBadge
              totalSeconds={quiz.duration_minutes * 60}
              onExpire={handleTimerExpire}
            />
          )}

          <button
            onClick={() => setShowNav((p) => !p)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "2px solid #e8eaf0",
              background: showNav ? "#e8f4ff" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={16} color={showNav ? "#1a6fc4" : "#6b7280"} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 120px" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question number + flag */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: "#1a6fc4",
                    color: "#fff",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 15,
                    fontFamily: "'Syne', sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {currentIdx + 1}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#8892a4",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {currentQ.question_type?.replace("_", " ") || "MCQ"}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "#bcc3d0", marginLeft: 8 }}
                  >
                    · {currentQ.max_marks} mark
                    {currentQ.max_marks !== 1 ? "s" : ""}
                  </span>
                  {flagged.has(currentIdx) && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#d4900a",
                        fontWeight: 700,
                        marginLeft: 10,
                      }}
                    >
                      ⚑ Flagged
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={toggleFlag}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `2px solid ${flagged.has(currentIdx) ? "#f0d690" : "#e8eaf0"}`,
                  background: flagged.has(currentIdx) ? "#fff8e6" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Flag
                  size={15}
                  color={flagged.has(currentIdx) ? "#d4900a" : "#bcc3d0"}
                />
              </button>
            </div>

            {/* Quiz title */}
            {quiz?.title && (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#bcc3d0",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {quiz.title}
              </p>
            )}

            {/* Question text */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "22px 24px",
                marginBottom: 24,
                border: "2px solid #e8eaf0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#0d0d1a",
                  lineHeight: 1.65,
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMath(currentQ.question_text),
                }}
              />
            </div>

            {/* Question image */}
            {currentQ.question_image_url && (
              <div
                style={{
                  marginBottom: 24,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "2px solid #e8eaf0",
                  background: "#fff",
                }}
              >
                <img
                  src={currentQ.question_image_url}
                  alt="Question diagram"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    maxHeight: "500px",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            {/* MCQ Options */}
            {isMCQ && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {["A", "B", "C", "D"].map((letter) => {
                  const text = currentQ[`option_${letter.toLowerCase()}`];
                  if (!text) return null;
                  return (
                    <MCQOption
                      key={letter}
                      letter={letter}
                      text={text}
                      selected={answers[currentIdx] === letter}
                      onClick={() => handleAnswer(letter)}
                    />
                  );
                })}
              </div>
            )}

            {/* Fill blank / Math */}
            {(isFillBlank || isMath) && (
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#8892a4",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  {isMath ? "Enter your answer" : "Type your answer"}
                </p>
                {isMath ? (
                  <SimpleMathInput
                    value={answers[currentIdx] ?? ""}
                    onChange={(val) => handleAnswer(val)}
                  />
                ) : (
                <input
                  type="text"
                  value={answers[currentIdx] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer here…"
                  style={{
                    width: "100%",
                    border: "2px solid #e8eaf0",
                    borderRadius: 16,
                    padding: "14px 18px",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#0d0d1a",
                    background: "#fff",
                    fontFamily: "'Lato', sans-serif",
                    transition: "border-color 0.15s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6fc4")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
                />
                )}
              </div>
            )}

            {/* Structured / Essay */}
            {isText && (
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#8892a4",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  {currentQ.question_type === "essay"
                    ? "Write your essay"
                    : "Write your answer"}
                </p>
                <div style={{ position: "relative" }}>
                  <textarea
                    value={answers[currentIdx] ?? ""}
                    onChange={(e) => handleAnswer(e.target.value)}
                    rows={currentQ.question_type === "essay" ? 8 : 5}
                    placeholder={
                      currentQ.question_type === "essay"
                        ? "Begin your essay here…"
                        : "Explain your answer in detail…"
                    }
                    style={{
                      width: "100%",
                      border: "2px solid #e8eaf0",
                      borderRadius: 16,
                      padding: "14px 18px",
                      fontSize: 15,
                      color: "#0d0d1a",
                      background: "#fff",
                      fontFamily: "'Lato', sans-serif",
                      lineHeight: 1.7,
                      resize: "none",
                      transition: "border-color 0.15s",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a6fc4")}
                    onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 14,
                      fontSize: 11,
                      color: "#bcc3d0",
                      fontWeight: 600,
                    }}
                  >
                    {(answers[currentIdx] ?? "").length} chars
                  </span>
                </div>
                {currentQ.max_marks > 1 && (
                  <p style={{ fontSize: 12, color: "#8892a4", marginTop: 8 }}>
                    Worth {currentQ.max_marks} marks — provide a detailed
                    answer.
                  </p>
                )}
              </div>
            )}

            {/* Table */}
            {isTable && (
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#8892a4",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Fill in the table
                </p>
                <TableInput
                  tableData={currentQ.table_data}
                  value={answers[currentIdx]}
                  onChange={(val) => handleAnswer(val)}
                />
                {currentQ.max_marks > 1 && (
                  <p style={{ fontSize: 12, color: "#8892a4", marginTop: 8 }}>
                    Worth {currentQ.max_marks} marks — fill all cells.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Nav ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: "#fff",
          borderTop: "1px solid #e8eaf0",
          padding: "14px 16px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => goToQuestion(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "2px solid #e8eaf0",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: currentIdx === 0 ? "not-allowed" : "pointer",
              opacity: currentIdx === 0 ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} color="#6b7280" />
          </button>

          {currentIdx < totalQ - 1 ? (
            <button
              onClick={() => goToQuestion(currentIdx + 1)}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "'Syne', sans-serif",
                boxShadow: "0 4px 16px rgba(26,111,196,0.3)",
              }}
            >
              Next Question <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => { captureMathField(); setShowSubmitModal(true); }}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #1d8f57, #0ea5c9)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "'Syne', sans-serif",
                boxShadow: "0 4px 16px rgba(29,143,87,0.3)",
              }}
            >
              <Send size={18} /> Submit Quiz
            </button>
          )}

          {currentIdx < totalQ - 1 && unanswered === 0 && (
            <button
              onClick={() => { captureMathField(); setShowSubmitModal(true); }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                border: "2px solid #a8e6c4",
                background: "#eafaf3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="All answered — submit now"
            >
              <Send size={18} color="#1d8f57" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
