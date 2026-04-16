"use client";
import { fetchWithAuth } from "@/lib/api";
import { use } from "react";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
} from "lucide-react";
import SimpleMathInput from "@/components/SimpleMathInput";
import katex from "katex";
import "katex/dist/katex.min.css";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";
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

// ─── Passage Content Formatter ────────────────────────────────────────────────
function PassageContent({
  type,
  content,
  activeBlank = null,
  answeredBlanks = {},
}) {
  const t = (type || "").toLowerCase();

  // Renders text and replaces __N__ with interactive blank spans
  const renderWithBlanks = (text) => {
    const parts = text.split(/(__\d+__)/g);
    return parts.map((part, i) => {
      const match = part.match(/^__(\d+)__$/);
      if (!match) return part;
      const num = parseInt(match[1]);
      const isActive = activeBlank === num;
      const answer = answeredBlanks[num];
      return (
        <span
          key={i}
          id={`blank-${num}`}
          style={{
            display: "inline-block",
            minWidth: 80,
            borderBottom: `2px solid ${isActive ? "#1a6fc4" : answer ? "#1d8f57" : "#8892a4"}`,
            background: isActive
              ? "#e8f4ff"
              : answer
                ? "#eafaf3"
                : "transparent",
            color: isActive ? "#1a6fc4" : answer ? "#1d8f57" : "#6b7280",
            fontWeight: answer ? 700 : 400,
            padding: "0 6px 2px",
            borderRadius: 4,
            margin: "0 2px",
            transition: "all 0.3s ease",
            boxShadow: isActive ? "0 0 0 3px #bdd7f5" : "none",
            fontSize: 15,
          }}
        >
          {answer ?? `_${num}_`}
        </span>
      );
    });
  };

  if (t === "poem") {
    return (
      <div style={{ fontStyle: "italic", color: "#374151" }}>
        {content.split("\n").map((line, i) => (
          <div
            key={i}
            style={{
              lineHeight: 2.2,
              paddingLeft: line.startsWith("  ") ? 24 : 0,
              minHeight: line.trim() === "" ? 20 : "auto",
              fontSize: 15,
            }}
          >
            {line.trim() === "" ? "\u00A0" : line}
          </div>
        ))}
      </div>
    );
  }

  if (t === "dialogue") {
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    const speakerColors = [
      "#1a6fc4",
      "#1d8f57",
      "#c0334a",
      "#d4900a",
      "#764ba2",
      "#0ea5c9",
      "#e05d20",
      "#2d6a4f",
    ];
    const speakerMap = {};
    let colorIdx = 0;
    const getColor = (speaker) => {
      const key = speaker.trim().toLowerCase();
      if (!speakerMap[key]) {
        speakerMap[key] = speakerColors[colorIdx % speakerColors.length];
        colorIdx++;
      }
      return speakerMap[key];
    };
    return (
      <div style={{ color: "#374151" }}>
        {lines.map((line, i) => {
          const match = line.match(/^([^:]{1,40}):\s*(.+)/);
          if (match) {
            const speaker = match[1].trim();
            const speech = match[2].trim();
            const color = getColor(speaker);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color,
                    fontSize: 11,
                    minWidth: 70,
                    maxWidth: 80,
                    flexShrink: 0,
                    paddingTop: 3,
                    fontFamily: "'Lato', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    lineHeight: 1.3,
                    opacity: 0.85,
                  }}
                >
                  {speaker}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    color: "#1a1a2e",
                    flex: 1,
                    lineHeight: 1.75,
                  }}
                >
                  {speech}
                </span>
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: "#8892a4",
                fontStyle: "italic",
                marginBottom: 10,
                paddingLeft: 8,
                borderLeft: "3px solid #e8eaf0",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "narrative" || t === "prose" || t === "story") {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
    return (
      <div>
        {paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontSize: 15,
              lineHeight: 1.9,
              color: "#374151",
              marginBottom: 14,
              textIndent: "1.4em",
            }}
          >
            {renderWithBlanks(para.trim())}
          </p>
        ))}
      </div>
    );
  }

  // Default — handles blanks too
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.9,
        color: "#374151",
        whiteSpace: "pre-line",
      }}
    >
      {renderWithBlanks(content)}
    </p>
  );
}

// ─── Math Input ───────────────────────────────────────────────────────────────
function MathInput({ value, onChange }) {
  const mfRef = useRef(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    import("mathlive").then((ML) => {
      try {
        if (ML.default)
          ML.default.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
        if (window.MathfieldElement)
          window.MathfieldElement.fontsDirectory =
            "https://unpkg.com/mathlive@0.109.0/dist/fonts/";
      } catch (err) {
        console.error("MathLive init failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    const el = mfRef.current;
    if (!el || value === undefined) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  const readValue = useCallback(() => {
    const el = mfRef.current;
    if (!el) return;
    const currentValue = el.value?.trim() || "";
    if (currentValue && currentValue !== "\\placeholder{}")
      onChange(currentValue);
  }, [onChange]);

  useEffect(() => {
    const el = mfRef.current;
    if (!el) return;
    const events = ["input", "change", "blur", "keyup", "keydown"];
    events.forEach((event) => el.addEventListener(event, readValue));
    const timeout = setTimeout(readValue, 300);
    return () => {
      events.forEach((event) => el.removeEventListener(event, readValue));
      clearTimeout(timeout);
    };
  }, [readValue]);

  return (
    <div
      style={{
        border: "2px solid #e8eaf0",
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        minHeight: "68px",
      }}
    >
      <math-field
        ref={mfRef}
        style={{
          width: "100%",
          padding: "16px 18px",
          fontSize: "18px",
          display: "block",
          minHeight: "68px",
        }}
        virtual-keyboard-mode="onfocus"
        fonts-directory="https://unpkg.com/mathlive@0.109.0/dist/fonts/"
      />
    </div>
  );
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
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? c.activeBg : c.idle,
        border: `2px solid ${selected ? c.activeBg : c.idleBorder}`,
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
          color: selected ? c.activeText : "#1a1a2e",
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

// ─── Question Nav ─────────────────────────────────────────────────────────────
function QuestionNav({ questions, answers, currentIdx, onJump, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="question-nav"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "14px 10px",
            borderRadius: "16px 0 0 16px",
            background: "#fff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
            border: "1px solid #e8eaf0",
            borderRight: "none",
          }}
        >
          {questions.map((_, i) => {
            const answered = answers[i] !== undefined && answers[i] !== "";
            const current = i === currentIdx;
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                title={`Q${i + 1}`}
                style={{
                  width: current ? 36 : 28,
                  height: current ? 36 : 28,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 11,
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
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────
const facts = [
  "💡 CBE focuses on skills and competency, not just memorization.",
  "📚 Regular practice improves retention by up to 80%.",
  "🧠 Taking quizzes is more effective than re-reading notes.",
  "⏱️ Short daily practice sessions beat long weekly cramming.",
  "🎯 Students who review mistakes improve faster than those who don't.",
];
const fact = facts[Math.floor(Math.random() * facts.length)];

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
            {submitting && (
              <div
                style={{
                  background: "#f0f6ff",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#1a6fc4",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  We are marking your answers…
                </p>
                <p style={{ fontSize: 12, color: "#8892a4" }}>{fact}</p>
              </div>
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
                    Marking…
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
  const feedback = result.detailed_feedback || {};
  const questionIds = Object.keys(feedback);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0f6ff 0%, #f9fff4 100%)",
        padding: "24px 16px 80px",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
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
            style={{ position: "absolute", marginTop: 0, textAlign: "center" }}
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
            <p
              style={{
                fontSize: 12,
                color: passed ? "#1d8f57" : "#c0334a",
                fontWeight: 700,
              }}
            >
              {passed ? "PASSED ✓" : "TRY AGAIN"}
            </p>
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
              fontSize: 22,
              fontWeight: 800,
              textAlign: "center",
              color: "#0d0d1a",
              marginBottom: 20,
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
              marginBottom: 20,
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
              { label: "Questions", value: result.total_questions ?? "—" },
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
                }}
              >
                Browse Quizzes
              </button>
            </Link>
            <Link href="/register?reason=quota" style={{ flex: 1 }}>
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
                }}
              >
                Save My Results
              </button>
            </Link>
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 8,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            Create a free account to unlock full feedback
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.9,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            See exactly what you got wrong, AI explanations per question, study
            tips, and save your progress.
          </p>
          <Link href="/register?reason=quota">
            <button
              style={{
                background: "#fff",
                color: "#764ba2",
                padding: "12px 28px",
                borderRadius: 12,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Create Free Account →
            </button>
          </Link>
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#0d0d1a",
            marginBottom: 16,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Question Breakdown
        </h2>
        {questionIds.map((qId, index) => {
          const item = feedback[qId];
          const question = quiz.questions.find((q) => q.id === qId);
          return (
            <div
              key={qId}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                marginBottom: 12,
                border: "1px solid #e8eaf0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: item.is_correct ? "#d4edda" : "#fdeef0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.is_correct ? (
                      <CheckCircle size={16} color="#1d8f57" />
                    ) : (
                      <span style={{ fontSize: 14 }}>✗</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#0d0d1a",
                      fontSize: 14,
                    }}
                  >
                    Question {index + 1}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: item.is_correct ? "#1d8f57" : "#c0334a",
                    background: item.is_correct ? "#d4edda" : "#fdeef0",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {item.marks_awarded} / {item.max_marks} marks
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 12,
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMath(item.question_text),
                }}
              />
              <div
                style={{
                  background: "#f0f6ff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1a6fc4",
                    marginBottom: 4,
                  }}
                >
                  YOUR ANSWER
                </p>
                <p style={{ fontSize: 14, color: "#1e3a5f" }}>
                  {item.student_answer || "(No answer)"}
                </p>
              </div>
              <div
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    filter: "blur(4px)",
                    background: "#f9fafb",
                    padding: "10px 14px",
                    userSelect: "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    AI FEEDBACK
                  </p>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    Detailed AI feedback explaining exactly what you missed and
                    how to improve.
                  </p>
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Link href="/register?reason=quota">
                    <button
                      style={{
                        background: "#1a6fc4",
                        color: "#fff",
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🔒 Unlock Free
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Working Panel ────────────────────────────────────────────────────────────
function WorkingPanel({ questionIdx, onWorkingCapture }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasWorking, setHasWorking] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMode(null);
    setHasWorking(false);
  }, [questionIdx]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  useEffect(() => {
    if (mode === "canvas") setTimeout(initCanvas, 50);
  }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasWorking(true);
  };
  const stopDraw = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    if (hasWorking) {
      const canvas = canvasRef.current;
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      onWorkingCapture(base64);
    }
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasWorking(false);
    onWorkingCapture(null);
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      onWorkingCapture(base64);
      setHasWorking(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!mode) setMode(isMobile ? "camera" : "canvas");
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 10,
          border: "2px dashed #bdd7f5",
          background: hasWorking ? "#e8f4ff" : "#f7f9fc",
          color: hasWorking ? "#1a6fc4" : "#8892a4",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ✏️ {hasWorking ? "Working saved ✓" : "Show your working (optional)"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 12,
            background: "#fff",
            borderRadius: 16,
            border: "2px solid #e8eaf0",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["canvas", "camera"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "2px solid " + (mode === m ? "#1a6fc4" : "#e8eaf0"),
                  background: mode === m ? "#e8f4ff" : "#fff",
                  color: mode === m ? "#1a6fc4" : "#8892a4",
                  cursor: "pointer",
                }}
              >
                {m === "canvas" ? "✏️ Draw" : "📷 Photo"}
              </button>
            ))}
          </div>
          {mode === "canvas" && (
            <div>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 10,
                  border: "1.5px solid #e8eaf0",
                  cursor: "crosshair",
                  touchAction: "none",
                  background: "#fff",
                  display: "block",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={clearCanvas}
                  style={{
                    fontSize: 12,
                    color: "#c0334a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🗑 Clear
                </button>
              </div>
            </div>
          )}
          {mode === "camera" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #1a6fc4, #0ea5c9)",
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {hasWorking ? "📷 Retake Photo" : "📷 Take Photo / Upload"}
              </button>
              {hasWorking && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#1d8f57",
                    marginTop: 8,
                    fontWeight: 600,
                  }}
                >
                  ✓ Working captured
                </p>
              )}
            </div>
          )}
        </div>
      )}
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
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
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
  const [workingImages, setWorkingImages] = useState({});
  const [activeBlank, setActiveBlank] = useState(null); // ← blank highlight state
  const quizStartedAt = useRef(new Date().toISOString());

  const currentQ = questions[currentIdx];

  const totalQ = questions.length;
  const answeredCount = questions.filter((q, idx) => {
    if (workingImages[idx]) return true; // working image counts as answered
    const v = answers[idx];
    if (v === undefined || v === null) return false;
    if (typeof v === "object") return Object.keys(v).length > 0;
    const s = String(v).trim();
    return s !== "" && s !== "\\placeholder{}";
  }).length;
  const unanswered = totalQ - answeredCount;
  const progressPct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  useEffect(() => {
    if (!quizId) return;
    const token = localStorage.getItem("accessToken");
    (async () => {
      try {
        const res = token
          ? await fetchWithAuth(`${API}/quizzes/${quizId}/`)
          : await fetch(`${API}/quizzes/${quizId}/`);
        if (!res.ok) throw new Error("Quiz load failed");
        const data = await res.json();
        setQuiz(data);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("❌ Failed to load quiz:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, user, guestSessionFromUrl, router]);

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

  const openSubmitModal = useCallback(() => {
    captureMathField();
    setTimeout(() => setShowSubmitModal(true), 50);
  }, [captureMathField]);

  const handleQuizSubmit = async () => {
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
    try {
      // Final capture of any visible math field
      captureMathField();

      const answersDict = {};
      questions.forEach((q, idx) => {
        let answer = answers[idx];
        if (answer === undefined || answer === null) return;
        if (typeof answer === "string") answer = answer.trim();
        if (
          typeof answer === "string" &&
          answer.length > 0 &&
          answer !== "\\placeholder{}"
        ) {
          answersDict[q.id] = answer;
        } else if (
          typeof answer === "object" &&
          answer !== null &&
          Object.keys(answer).length > 0
        ) {
          answersDict[q.id] = answer;
        }
      });

      const token = localStorage.getItem("accessToken");
      const payload = {
        quiz_id: parseInt(quizId, 10),
        answers: answersDict,
        working_images: workingImages,
        started_at: quizStartedAt.current,
      };
      if (!token)
        payload.session_id =
          "device_" + (localStorage.getItem("device_quizzes_used") || "0");

      const fetchOpts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      };

      const response = await (token ? fetchWithAuth : fetch)(
        `${API}/quizzes/submit/`,
        fetchOpts,
      );

      clearTimeout(timeout);

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Server returned invalid response (not JSON)");
      }

      if (response.status === 402) {
        if (data?.quota_exceeded) router.push("/register?reason=quota");
        else if (data?.credits_exhausted) router.push("/subscribe");
        return;
      }
      if (!response.ok) {
        alert(data?.error || "Submission failed. Please try again.");
        return;
      }
      if (data.show_signup_prompt) {
        router.push("/register?reason=quota");
        return;
      }
      if (data.is_guest) {
        const used = parseInt(
          localStorage.getItem("device_quizzes_used") || "0",
        );
        localStorage.setItem("device_quizzes_used", String(used + 1));
        setResult(data);
      } else {
        if (data.id) router.replace(`/attempts/${data.id}`);
        else setResult(data);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("Submit error:", error);
      if (error.name === 'AbortError') {
        alert("Marking is taking longer than expected. Please try submitting again.");
      } else {
        alert(error.message || "Failed to submit quiz. Check your connection.");
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
    if (!result) openSubmitModal();
  }, [result, openSubmitModal]);

  if (loading) {
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (result) return <ResultsScreen result={result} quiz={quiz} />;

  if (!currentQ) {
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
  }

  const isMCQ = currentQ.question_type === "mcq";
  const isFillBlank = currentQ.question_type === "fill_blank";
  const isMath = currentQ.question_type === "math";
  const isText =
    currentQ.question_type === "structured" ||
    currentQ.question_type === "essay";

  // Build answeredBlanks map: { blankNum: optionText }
  const answeredBlanks = Object.fromEntries(
    (currentQ.parts || [])
      .map((part) => {
        const letter =
          typeof answers[currentIdx] === "object"
            ? answers[currentIdx]?.[part.id]
            : null;
        const optionText = letter
          ? part[`option_${letter.toLowerCase()}`]
          : null;
        return [parseInt(part.part_label), optionText];
      })
      .filter(([, v]) => v),
  );

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
        .question-nav { display: flex; }
        @media (max-width: 768px) { .question-nav { display: none !important; } }
        .passage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .passage-panel { position: sticky; top: 80px; align-self: start; max-height: calc(100vh - 100px); overflow-y: auto; padding-bottom: 40px; }
        @media (max-width: 768px) {
          .passage-grid { display: flex !important; flex-direction: column !important; }
          .passage-panel { position: static !important; max-height: none !important; overflow-y: visible !important; margin-bottom: 20px; }
        }
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

      {/* Top Bar */}
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

      {/* Content */}
      <div
        className={currentQ?.passage ? "passage-grid" : ""}
        style={{
          maxWidth: currentQ?.passage ? 1200 : 680,
          margin: "0 auto",
          padding: "32px 16px 120px",
          ...(currentQ?.passage ? {} : { display: "block" }),
        }}
      >
        {/* Passage Panel */}
        {currentQ?.passage && (
          <div
            className="passage-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              border: "2px solid #e8eaf0",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#8892a4",
                  background: "#f0f2f7",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {currentQ.passage.passage_type}
              </span>
              {currentQ.passage.author && (
                <span style={{ fontSize: 12, color: "#8892a4" }}>
                  — {currentQ.passage.author}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0d0d1a",
                marginBottom: 16,
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {currentQ.passage.title}
            </h3>
            <PassageContent
              type={currentQ.passage.passage_type}
              content={currentQ.passage.content}
              activeBlank={activeBlank}
              answeredBlanks={answeredBlanks}
            />
          </div>
        )}

        {/* Questions Panel */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question header */}
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
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    window.open(currentQ.question_image_url, "_blank")
                  }
                >
                  <Image
                    src={currentQ.question_image_url}
                    alt="Question diagram"
                    width={800}
                    height={500}
                    style={{ width: "100%", height: "auto", display: "block" }}
                    priority={currentIdx === 0}
                  />
                  <div
                    style={{
                      padding: "8px 14px",
                      background: "#f7f9fc",
                      fontSize: 11,
                      color: "#8892a4",
                      fontWeight: 600,
                    }}
                  >
                    Click to view full size
                  </div>
                </div>
              )}

              {/* MCQ */}
              {isMCQ && !(currentQ.parts && currentQ.parts.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
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

              {isMath ? (
                workingImages[currentIdx] ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#1d8f57",
                      fontWeight: 600,
                      padding: "12px 0",
                    }}
                  >
                    ✓ Working photo captured — no need to type your answer.
                  </p>
                ) : isMCQ ? null : (
                  <SimpleMathInput
                    value={answers[currentIdx] ?? ""}
                    onChange={(val) => handleAnswer(val)}
                  />
                )
              ) : isFillBlank &&
                !(currentQ.parts && currentQ.parts.length > 0) ? (
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
              ) : null}

              {/* Structured / Essay */}
              {isText && !(currentQ.parts && currentQ.parts.length > 0) && (
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
                        bottom: 10,
                        right: 12,
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

              {/* Working panel */}
              {(isMath || (currentQ.parts && currentQ.parts.length > 0)) && (
                <WorkingPanel
                  questionIdx={currentIdx}
                  onWorkingCapture={(base64) =>
                    setWorkingImages((prev) => ({
                      ...prev,
                      [currentIdx]: base64,
                    }))
                  }
                />
              )}

              {/* Multi-part questions */}
              {currentQ.parts && currentQ.parts.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {currentQ.parts.map((part) => {
                    const partAnswer =
                      typeof answers[currentIdx] === "object"
                        ? (answers[currentIdx]?.[part.id] ?? "")
                        : "";
                    const blankNum = parseInt(part.part_label);

                    const handlePartAnswer = (value) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [currentIdx]: {
                          ...(typeof prev[currentIdx] === "object"
                            ? prev[currentIdx]
                            : {}),
                          [part.id]: value,
                        },
                      }));
                      // Highlight and scroll to the matching blank in the passage
                      setActiveBlank(blankNum);
                      setTimeout(() => {
                        document
                          .getElementById(`blank-${blankNum}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }, 50);
                      setTimeout(() => setActiveBlank(null), 1500);
                    };

                    return (
                      <div
                        key={part.id}
                        style={{
                          background: "#fff",
                          borderRadius: 16,
                          padding: 20,
                          border: "2px solid #e8eaf0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "#1a6fc4",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 13,
                            }}
                          >
                            {part.part_label}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#8892a4",
                              fontWeight: 600,
                            }}
                          >
                            {part.max_marks} mark
                            {part.max_marks !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 15,
                            color: "#0d0d1a",
                            lineHeight: 1.65,
                            marginBottom: 14,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: renderMath(part.question_text),
                          }}
                        />
                        {part.question_type === "mcq" ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            {["A", "B", "C", "D"].map((letter) => {
                              const text =
                                part[`option_${letter.toLowerCase()}`];
                              if (!text) return null;
                              return (
                                <MCQOption
                                  key={letter}
                                  letter={letter}
                                  text={text}
                                  selected={partAnswer === letter}
                                  onClick={() => handlePartAnswer(letter)}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ position: "relative" }}>
                            <textarea
                              value={partAnswer}
                              onChange={(e) => handlePartAnswer(e.target.value)}
                              rows={3}
                              placeholder="Write your answer here…"
                              style={{
                                width: "100%",
                                border: "2px solid #e8eaf0",
                                borderRadius: 14,
                                padding: "12px 16px",
                                fontSize: 15,
                                color: "#0d0d1a",
                                background: "#fff",
                                fontFamily: "'Lato', sans-serif",
                                lineHeight: 1.7,
                                resize: "none",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "#1a6fc4")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "#e8eaf0")
                              }
                            />
                            <span
                              style={{
                                position: "absolute",
                                bottom: 10,
                                right: 12,
                                fontSize: 11,
                                color: "#bcc3d0",
                                fontWeight: 600,
                              }}
                            >
                              {partAnswer.length} chars
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Nav */}
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
              onClick={openSubmitModal}
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
              onClick={openSubmitModal}
              title="All answered — submit now"
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
            >
              <Send size={18} color="#1d8f57" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
