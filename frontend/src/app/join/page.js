"use client";

import { useState, useEffect } from "react";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

function api(method, path, body = null) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(async (res) => {
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid white",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  );
}

export default function JoinPage() {
  const [step, setStep] = useState("code"); // code | nickname | lobby | live | results
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [classroom, setClassroom] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastQIndex, setLastQIndex] = useState(-1);

  // Poll for classroom status (both lobby AND live)
  useEffect(() => {
    if ((step === "lobby" || step === "live") && code) {
      const interval = setInterval(async () => {
        try {
          const data = await api("GET", `/join/${code}/`);
          setClassroom(data);

          // Lobby → Live transition
          if (step === "lobby" && data.status === "live") {
            setStep("live");
            setCurrentQ(data.current_question_index || 0);
            setTimeLeft(data.time_per_question || 30);
            setLastQIndex(data.current_question_index || 0);
          }

          // Live: sync question index with teacher
          if (step === "live") {
            if (data.status === "ended") {
              setStep("results");
            } else {
              const newIdx = data.current_question_index || 0;
              if (newIdx !== currentQ) {
                setCurrentQ(newIdx);
                setTimeLeft(data.time_per_question || 30);
                setLastQIndex(newIdx);
              }
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }, 1000); // Poll every second for responsiveness
      return () => clearInterval(interval);
    }
  }, [step, code, currentQ]);

  // Countdown timer
  useEffect(() => {
    if (step !== "live" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, lastQIndex]);

  async function joinWithCode() {
    setError("");
    setBusy(true);
    try {
      const data = await api("GET", `/join/${code.toUpperCase()}/`);
      setClassroom(data);
      setStep("nickname");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function register() {
    setError("");
    setBusy(true);
    try {
      const data = await api("POST", `/join/${code}/register/`, {
        student_name: nickname,
      });
      setSessionId(data.session_id);
      setStep("lobby");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function submitAnswer(questionId, answerIndex) {
    try {
      const result = await api("POST", `/sessions/${sessionId}/answer/`, {
        question_id: questionId,
        selected_index: answerIndex,
        answer_text: classroom.questions[currentQ].options[answerIndex],
      });

      setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
      setScore(result.total_score);

      // Don't auto-advance - wait for teacher to advance question
      // Student will see next question when teacher clicks "Next"
    } catch (e) {
      console.error("Submit error:", e);
    }
  }

  // ── CODE ENTRY ──
  if (step === "code") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a3d1f 0%, #1a7a42 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 40,
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
          }}
        >
          {/* Subscription encouragement card */}
          <div
            style={{
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e42 100%)",
              borderRadius: 14,
              padding: "18px 18px 18px 18px",
              marginBottom: 24,
              color: "#7c4700",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 2px 8px 0 rgba(251,191,36,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span style={{ fontSize: 24, marginRight: 10 }}>⭐</span>
            <span>
              Want unlimited quizzes at home? <br />
              <span style={{ color: "#b45309", fontWeight: 900 }}>
                Subscribe to StadiSpace
              </span>{" "}
              for full access!
            </span>
          </div>
          <div
            style={{
              width: 70,
              height: 70,
              background: "linear-gradient(135deg, #0f5c2e, #1a7a42)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 32,
            }}
          >
            🎮
          </div>
          <h1
            style={{
              fontSize: 28,
              color: "#0a3d1f",
              marginBottom: 10,
              fontWeight: 900,
            }}
          >
            Join Quiz
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 30, fontSize: 14 }}>
            Enter the code your teacher gave you
          </p>

          <input
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "2px solid #e5e7eb",
              borderRadius: 12,
              fontSize: 24,
              fontWeight: 900,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: 16,
              outline: "none",
            }}
            placeholder="ABCD12"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === "Enter" && joinWithCode()}
            maxLength={6}
            autoFocus
          />

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={joinWithCode}
            disabled={busy || code.length < 4}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #0f5c2e, #1a7a42)",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: busy || code.length < 4 ? 0.5 : 1,
            }}
          >
            {busy ? <Spinner /> : "Enter →"}
          </button>
        </div>
      </div>
    );
  }

  // ── NICKNAME ENTRY ──
  if (step === "nickname") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a3d1f 0%, #1a7a42 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 40,
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 32,
            }}
          >
            👤
          </div>
          <h1
            style={{
              fontSize: 28,
              color: "#0a3d1f",
              marginBottom: 10,
              fontWeight: 900,
            }}
          >
            {classroom?.name}
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 30, fontSize: 14 }}>
            {classroom?.subject} • {classroom?.grade}
          </p>

          <input
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "2px solid #e5e7eb",
              borderRadius: 12,
              fontSize: 18,
              textAlign: "center",
              marginBottom: 16,
              outline: "none",
            }}
            placeholder="Your nickname..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && register()}
            maxLength={20}
            autoFocus
          />

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={register}
            disabled={busy || !nickname.trim()}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: busy || !nickname.trim() ? 0.5 : 1,
            }}
          >
            {busy ? <Spinner /> : "Join Game →"}
          </button>
        </div>
      </div>
    );
  }

  // ── LOBBY ──
  if (step === "lobby") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a3d1f 0%, #1a7a42 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 40,
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: "#fef3c7",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 40,
            }}
          >
            ⏳
          </div>
          <h1
            style={{
              fontSize: 24,
              color: "#0a3d1f",
              marginBottom: 10,
              fontWeight: 900,
            }}
          >
            You're in, {nickname}!
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 30, fontSize: 14 }}>
            Waiting for your teacher to start the quiz...
          </p>

          <div
            style={{
              background: "#f0faf0",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 900, color: "#0f5c2e" }}>
              {classroom?.questions?.length || 0}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
              Questions
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "#6b7280",
              fontSize: 13,
            }}
          >
            <div
              className="pulse"
              style={{
                width: 8,
                height: 8,
                background: "#16a34a",
                borderRadius: "50%",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span>Connected • Waiting for teacher...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── LIVE QUIZ ──
  if (step === "live") {
    const q = classroom?.questions?.[currentQ];
    if (!q) return null;

    const COLORS = ["#e74c3c", "#3498db", "#f39c12", "#27ae60"];
    const SHAPES = ["▲", "◆", "●", "■"];
    const hasAnswered = answers[q.id] !== undefined;
    const maxTime = classroom?.time_per_question || 30;
    const timerPct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0;
    const timerColor =
      timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#16a34a";

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a3d1f 0%, #1a7a42 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "12px 20px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
              Question {currentQ + 1} of {classroom.questions.length}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0a3d1f" }}>
              {nickname}
            </div>
          </div>
          <div
            style={{
              background: "#f0faf0",
              borderRadius: 10,
              padding: "8px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f5c2e" }}>
              {score}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
              Points
            </div>
          </div>
        </div>

        {/* Countdown Timer Bar */}
        <div
          style={{
            background: "#e5e7eb",
            borderRadius: 8,
            height: 8,
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${timerPct}%`,
              height: "100%",
              background: timerColor,
              borderRadius: 8,
              transition: "width 1s linear, background 0.3s",
            }}
          />
        </div>
        <div
          style={{
            textAlign: "center",
            marginBottom: 10,
            fontSize: 14,
            fontWeight: 700,
            color: timerColor,
          }}
        >
          ⏱ {timeLeft}s
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 30,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0a3d1f, #1a7a42)",
              borderRadius: 14,
              padding: "22px 28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              Q{currentQ + 1}
            </div>
            <div style={{ fontSize: 20, color: "white", lineHeight: 1.4 }}>
              {q.text}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-block",
                background: "rgba(245,166,35,0.2)",
                border: "1px solid rgba(245,166,35,0.5)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                color: "#fef3c7",
                fontWeight: 700,
              }}
            >
              {q.points} pts
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              flex: 1,
            }}
          >
            {q.options?.filter(Boolean).map((opt, i) => (
              <button
                key={i}
                onClick={() =>
                  !hasAnswered && timeLeft > 0 && submitAnswer(q.id, i)
                }
                disabled={hasAnswered || timeLeft === 0}
                style={{
                  background: hasAnswered
                    ? i === answers[q.id]
                      ? "#16a34a"
                      : "#e5e7eb"
                    : COLORS[i],
                  color:
                    hasAnswered && i !== answers[q.id] ? "#6b7280" : "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: hasAnswered ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: hasAnswered && i !== answers[q.id] ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 24 }}>{SHAPES[i]}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{opt}</span>
              </button>
            ))}
          </div>

          {hasAnswered && (
            <div
              style={{
                background: "#dcfce7",
                color: "#15803d",
                padding: "12px 16px",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ✓ Answer submitted! Waiting for teacher to continue...
            </div>
          )}

          {!hasAnswered && timeLeft === 0 && (
            <div
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: "12px 16px",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ⏱ Time&apos;s up! Waiting for next question...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (step === "results") {
    const totalPossible =
      classroom?.questions?.reduce((sum, q) => sum + (q.points || 10), 0) || 0;
    const percentage =
      totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a3d1f 0%, #1a7a42 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 40,
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              background: "linear-gradient(135deg, #f5a623, #e8870a)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 50,
            }}
          >
            {percentage >= 80 ? "🏆" : percentage >= 60 ? "🎉" : "💪"}
          </div>
          <h1
            style={{
              fontSize: 32,
              color: "#0a3d1f",
              marginBottom: 10,
              fontWeight: 900,
            }}
          >
            {percentage >= 80
              ? "Amazing!"
              : percentage >= 60
                ? "Great Job!"
                : "Good Effort!"}
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 30, fontSize: 14 }}>
            Here's how you did, {nickname}
          </p>

          <div
            style={{
              background: "#f0faf0",
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: "#0f5c2e",
                marginBottom: 8,
              }}
            >
              {score}
              <span style={{ fontSize: 24, color: "#6b7280" }}>
                /{totalPossible}
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>
              Total Points
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#f5a623",
                marginTop: 12,
              }}
            >
              {percentage}%
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "#dbeafe",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8" }}>
                {Object.keys(answers).length}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                Answered
              </div>
            </div>
            <div
              style={{
                background: "#fef3c7",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>
                {classroom?.questions?.length || 0}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                Questions
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            Great job! Ask your teacher for your detailed feedback.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
