import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StadiSpace — CBE Learning Platform for Kenya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(124,58,237,0.25)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.2)",
            transform: "translate(-30%, 30%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 50,
            padding: "10px 28px",
            marginBottom: 32,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 22, fontWeight: 600 }}>
            🇰🇪 Made for Kenya
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 24,
            letterSpacing: "-2px",
          }}
        >
          StadiSpace
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 800,
            marginBottom: 48,
          }}
        >
          CBE Quizzes & Learning for Kenyan Students
          <br />
          Grades 4–10 · MCQ & Structured Marking · Progress Tracking
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24 }}>
          {["2 Free Quizzes", "All CBE Subjects", "From KES 149/week"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 12,
                padding: "14px 28px",
                color: "#fff",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              ✓ {label}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            color: "rgba(255,255,255,0.5)",
            fontSize: 20,
          }}
        >
          stadispace.co.ke
        </div>
      </div>
    ),
    { ...size },
  );
}
