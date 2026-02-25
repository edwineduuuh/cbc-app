"use client";

import { useState, useEffect, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:#f0f4f0;}
    .font-display{font-family:'Playfair Display',serif;}
    .hero-bg{background:linear-gradient(135deg,#0a3d1f 0%,#0f5c2e 40%,#1a7a42 100%);}
    .card{background:white;border-radius:16px;border:1px solid #e2ece2;box-shadow:0 2px 10px rgba(0,40,0,0.07);}
    .card-hover{transition:transform 0.2s,box-shadow 0.2s;cursor:pointer;}
    .card-hover:hover{transform:translateY(-3px);box-shadow:0 14px 32px rgba(0,40,0,0.13);}
    .btn-primary{background:linear-gradient(135deg,#0f5c2e,#1a7a42);color:white;border:none;border-radius:12px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px;}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,92,46,0.35);}
    .btn-primary:disabled{opacity:0.55;cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-gold{background:linear-gradient(135deg,#f5a623,#e8870a);color:white;border:none;border-radius:12px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px;}
    .btn-gold:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(245,166,35,0.4);}
    .btn-outline{background:transparent;color:#0f5c2e;border:2px solid #0f5c2e;border-radius:12px;padding:9px 18px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px;}
    .btn-outline:hover{background:#f0faf0;}
    .input{width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border 0.2s;}
    .input:focus{border-color:#0f5c2e;box-shadow:0 0 0 3px rgba(15,92,46,0.1);}
    .select{width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;background:white;cursor:pointer;}
    .select:focus{border-color:#0f5c2e;}
    .textarea{width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;resize:vertical;min-height:90px;}
    .textarea:focus{border-color:#0f5c2e;}
    .label{display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;}
    .badge-green{background:#dcfce7;color:#15803d;}
    .badge-amber{background:#fef3c7;color:#92400e;}
    .badge-blue{background:#dbeafe;color:#1d4ed8;}
    .badge-red{background:#fee2e2;color:#dc2626;}
    .badge-purple{background:#ede9fe;color:#7c3aed;}
    .nav-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;cursor:pointer;font-size:14px;font-weight:600;border:none;width:100%;text-align:left;transition:all 0.15s;color:rgba(255,255,255,0.65);background:transparent;}
    .nav-btn:hover{background:rgba(255,255,255,0.1);color:white;}
    .nav-btn.active{background:rgba(255,255,255,0.18);color:white;}
    .spin{animation:spin 1s linear infinite;}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    .pulse{animation:pulse 2s ease-in-out infinite;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    .slide-up{animation:slideUp 0.35s ease;}
    @keyframes slideUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    .dot-bg{background-image:radial-gradient(circle,rgba(255,255,255,0.14) 1px,transparent 1px);background-size:26px 26px;}
    .lesson-out h1{font-family:'Playfair Display',serif;font-size:21px;color:#0a3d1f;margin:18px 0 10px;border-bottom:2px solid #dcfce7;padding-bottom:8px;}
    .lesson-out h2{font-family:'Playfair Display',serif;font-size:17px;color:#0f5c2e;margin:15px 0 8px;}
    .lesson-out h3{font-size:14px;font-weight:700;color:#1a7a42;margin:11px 0 5px;}
    .lesson-out p{font-size:13px;line-height:1.75;color:#374151;margin-bottom:9px;}
    .lesson-out ul,.lesson-out ol{margin:7px 0 11px 18px;}
    .lesson-out li{font-size:13px;line-height:1.7;color:#374151;margin-bottom:3px;}
    .lesson-out table{width:100%;border-collapse:collapse;margin:11px 0;font-size:12px;}
    .lesson-out th{background:#0f5c2e;color:white;padding:8px 10px;text-align:left;font-weight:700;}
    .lesson-out td{padding:7px 10px;border-bottom:1px solid #e8ede8;}
    .lesson-out tr:nth-child(even) td{background:#f5fff5;}
    .lesson-out .yt{display:inline-flex;align-items:center;gap:6px;background:#fee2e2;color:#dc2626;padding:5px 11px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;margin:3px 0;}
    .lesson-out .diagram{background:#f0faf0;border:1.5px solid #86efac;border-radius:11px;padding:14px;margin:10px 0;font-size:12px;font-family:monospace;white-space:pre-wrap;line-height:1.5;}
    .lesson-out .tag{display:inline-block;background:#0f5c2e;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;}
    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-thumb{background:#86efac;border-radius:3px;}
    @media print{.no-print{display:none!important;}.print-show{display:block!important;}body{background:white;}}
  `}</style>
);

// ── CBC Data ──────────────────────────────────────────────────────────────────
const GRADES = [
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
];
const SUBJECTS = {
  "Grade 4": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Science & Technology",
    "Agriculture and Nutrition",
    "Social Studies",
    "Creative Arts",
    "IRE",
    "CRE",
  ],
  "Grade 5": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Science & Technology",
    "Agriculture and Nutrition",
    "Social Studies",
    "Creative Arts",
    "IRE",
    "CRE",
  ],
  "Grade 6": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Science & Technology",
    "Agriculture and Nutrition",
    "Social Studies",
    "Creative Arts",
    "IRE",
    "CRE",
  ],
  "Grade 7": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Integrated Science",
    "Social Studies",
    "Pre-Technical Studies",
    "Agriculture",
    "Creative Arts",
    "CRE",
    "IRE",
  ],
  "Grade 8": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Integrated Science",
    "Social Studies",
    "Pre-Technical Studies",
    "Agriculture",
    "Creative Arts",
    "CRE",
    "IRE",
  ],
  "Grade 9": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Integrated Science",
    "Social Studies",
    "Pre-Technical Studies",
    "Agriculture",
    "Creative Arts",
    "CRE",
    "IRE",
  ],
  "Grade 10": [
    "Mathematics",
    "English",
    "Kiswahili",
    "Integrated Science",
    "Social Studies",
    "Pre-Technical Studies",
    "Agriculture",
    "Creative Arts",
    "CRE",
    "IRE",
  ],
};

const panels = [
  { id: "lessons", label: "Lesson Plans" },
  { id: "classroom", label: "Quiz Classrooms" },
  { id: "history", label: "Past Quizzes" }, // ← ADD THIS LINE
  { id: "analytics", label: "Analytics" },
];
// ── Claude API ────────────────────────────────────────────────────────────────
// ── Backend API ───────────────────────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function authToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("accessToken")
    : null;
}
function authHeaders() {
  const t = authToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}
async function api(method, path, body = null, auth = true) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: auth ? authHeaders() : { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.detail || "Request failed");
  return data;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Ic({ n, s = 18, c = "currentColor" }) {
  const map = {
    dashboard: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    lesson: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    classroom: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    report: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    sparkles: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    print: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
      </svg>
    ),
    plus: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    check: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    x: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    users: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    trophy: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
    ),
    logout: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
      </svg>
    ),
    lightning: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    play: (
      <svg width={s} height={s} fill={c} viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    book: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    arrow: (
      <svg
        width={s}
        height={s}
        fill="none"
        stroke={c}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    ),
  };
  return map[n] || null;
}

function Spinner({ size = 16 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.3)`,
        borderTop: `2px solid white`,
        borderRadius: "50%",
      }}
      className="spin"
    />
  );
}

function Loader({ text = "Generating with AI..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          border: "4px solid #dcfce7",
          borderTop: "4px solid #0f5c2e",
          borderRadius: "50%",
        }}
        className="spin"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Ic n="sparkles" s={15} c="#0f5c2e" />
        <span style={{ color: "#0f5c2e", fontWeight: 700, fontSize: 14 }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// LESSON PLANNER
// ══════════════════════════════════════════════════════════
function LessonPlanner() {
  const [f, setF] = useState({
    grade: "Grade 4",
    subject: "Mathematics",
    topic: "",
    subtopic: "",
    duration: "40 minutes",
    type: "Both Theory and Practical",
    objectives: "",
    prior: "",
    needs: "",
    resources: "",
    assessment: "Formative",
    project: false,
    term: "Term 1",
    week: "Week 1",
  });
  const [tab, setTab] = useState("plan");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState({ plan: "", notes: "", scheme: "" });
  const [done, setDone] = useState(false);
  const subs = SUBJECTS[f.grade] || [];

  async function generate() {
    if (!f.topic.trim()) return alert("Please enter a topic.");
    setBusy(true);
    setDone(false);
    try {
      const result = await api("POST", "/lessons/generate/", {
        grade: f.grade,
        subject: f.subject,
        term: f.term,
        week: parseInt(f.week?.replace("Week ", "") || "1"),
        lesson_number: 1,
        topic: f.topic,
        subtopic: f.subtopic || "",
        duration: f.duration,
        learner_level: f.needs || "Mixed ability",
        prior_knowledge: f.prior || "",
        resources: f.resources || "",
        is_practical: f.project || false,
        practical_area: f.project ? f.topic + " practical" : "",
      });
      // result = { id, plan, meta }
      // plan has: scheme_entry, student_notes, youtube_links, diagrams etc.
      // We convert the JSON plan into printable HTML for the 3 tabs
      const p = result.plan;
      const planHtml = buildLessonPlanHtml(p, f, result.meta);
      const notesHtml = buildNotesHtml(p, f);
      const schemeHtml = buildSchemeHtml(p, f, result.meta);
      setOut({ plan: planHtml, notes: notesHtml, scheme: schemeHtml });
      setDone(true);
      setTab("plan");
    } catch (e) {
      alert("Generation failed: " + e.message);
    }
    setBusy(false);
  }

  function buildLessonPlanHtml(p, f, meta) {
    const slos = (p.specific_learning_outcomes || [])
      .map((s, i) => `<li>SLO ${i + 1}: ${s}</li>`)
      .join("");
    const steps = (p.lesson_development || [])
      .map(
        (s) => `
      <tr><td><b>Step ${s.step}</b><br/><i>${s.duration}</i></td>
      <td><b>${s.title}</b></td>
      <td>${s.teacher_activity}</td><td>${s.learner_activity}</td>
      <td><i>${s.assessment || ""}</i></td></tr>`,
      )
      .join("");
    const ytLinks = (p.youtube_links || [])
      .map(
        (y) =>
          `<a class="yt" href="${y.url}" target="_blank">🎬 ${y.title}</a> — ${y.description}<br/>`,
      )
      .join("");
    const assessQs = (p.assessment?.questions || [])
      .map((q, i) => `<li>${q}</li>`)
      .join("");
    return `
<h1>CBC Lesson Plan — ${f.subject}</h1>
<div class="tag">${p.strand || ""}</div> &nbsp; <div class="tag">${p.substrand || ""}</div>
<table><tr><th>Grade</th><th>Subject</th><th>Term</th><th>Week</th><th>Duration</th><th>Date</th></tr>
<tr><td>${f.grade}</td><td>${f.subject}</td><td>${f.term}</td><td>${f.week}</td><td>${f.duration}</td><td>____________</td></tr></table>
<table><tr><th>School</th><th>Teacher</th><th>Strand</th><th>Sub-strand</th></tr>
<tr><td>________________________</td><td>________________________</td><td>${p.strand || ""}</td><td>${p.substrand || ""}</td></tr></table>
<h2>Specific Learning Outcomes</h2><ol>${slos}</ol>
<h2>Key Inquiry Questions</h2><ul>${(p.key_inquiry_questions || []).map((q) => `<li>${q}</li>`).join("")}</ul>
<h2>Core Competencies</h2>${(p.core_competencies || []).join(" &bull; ")}
<h2>Values & PCIs</h2>${(p.values || []).join(" &bull; ")} | ${(p.pertinent_issues || []).join(" &bull; ")}
<h2>Learning Resources</h2><ul>${(p.learning_resources || []).map((r) => `<li>${r}</li>`).join("")}</ul>
<h2>YouTube / Digital Resources</h2>${ytLinks}
<h2>Lesson Procedure</h2>
<table><tr><th>Time</th><th>Step</th><th>Teacher Activity</th><th>Learner Activity</th><th>Assessment</th></tr>
<tr><td><b>Intro</b><br/>${p.introduction?.duration || "5 min"}</td><td>Introduction</td>
<td>${p.introduction?.teacher_activity || ""}</td><td>${p.introduction?.learner_activity || ""}</td><td>—</td></tr>
${steps}
<tr><td><b>Conclusion</b><br/>${p.conclusion?.duration || "5 min"}</td><td>Wrap-up</td>
<td>${(p.conclusion?.activities || []).join("; ")}</td><td>Students summarize key points</td>
<td>—</td></tr></table>
<h2>Assessment Questions</h2><ol>${assessQs}</ol>
<h2>Home Activity</h2><p>${p.conclusion?.home_activity || ""}</p>
${p.practical_project ? `<h2>Practical Project</h2><p>${p.practical_project}</p>` : ""}
${p.extended_activity ? `<h2>Extended Activity (Gifted Learners)</h2><p>${p.extended_activity}</p>` : ""}
${p.support_activity ? `<h2>Support Activity (Remedial)</h2><p>${p.support_activity}</p>` : ""}
<h2>Teacher Notes</h2><p>${p.teacher_notes || ""}</p>
<br/><table><tr><th>Teacher Signature</th><th>Date</th><th>HOD Signature</th><th>Date</th></tr>
<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td>____________</td>
<td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td>____________</td></tr></table>`;
  }

  function buildNotesHtml(p, f) {
    const notes = p.student_notes || {};
    const terms = (notes.key_terms || [])
      .map((t) => `<tr><td><b>${t.term}</b></td><td>${t.definition}</td></tr>`)
      .join("");
    const summary = (notes.summary_points || [])
      .map((s) => `<li>${s}</li>`)
      .join("");
    const diagrams = (p.diagrams || [])
      .map(
        (
          d,
        ) => `<h3>${d.title}</h3><div class="diagram">[${d.type.toUpperCase()}]

${d.description}

Caption: ${d.caption}</div>`,
      )
      .join("");
    const ytLinks = (p.youtube_links || [])
      .map(
        (y) =>
          `<li><a class="yt" href="${y.url}" target="_blank">🎬 ${y.title}</a> — ${y.description}</li>`,
      )
      .join("");
    return `
<h1>${notes.heading || f.topic} — Learner Notes</h1>
<p><b>Grade:</b> ${f.grade} &nbsp;|&nbsp; <b>Subject:</b> ${f.subject} &nbsp;|&nbsp; <b>Term:</b> ${f.term}</p>
<h2>Introduction</h2><p>${notes.body || ""}</p>
<h2>Key Vocabulary</h2><table><tr><th>Term</th><th>Definition</th></tr>${terms}</table>
<h2>Diagrams & Illustrations</h2>${diagrams}
<h2>Digital Learning Resources</h2><ul>${ytLinks}</ul>
${p.practical_project ? `<h2>Practical Project / Experiment</h2><div style="background:#f0fff0;border:2px solid #86efac;padding:16px;border-radius:8px;">${p.practical_project}</div>` : ""}
<h2>Summary</h2><ul>${summary}</ul>
<br/><div style="background:#fffbeb;border:2px solid #fde68a;padding:14px;border-radius:8px;">
<b>📝 Revision Questions</b><br/>${(p.assessment?.questions || []).map((q, i) => `${i + 1}. ${q}`).join("<br/>")}</div>`;
  }

  function buildSchemeHtml(p, f, meta) {
    const se = p.scheme_entry || {};
    return `
<h1>Scheme of Work — ${f.subject} | ${f.grade} | ${f.term}</h1>
<table>
<tr><th>Wk</th><th>Lsn</th><th>Strand</th><th>Sub-strand</th><th>Specific Outcomes</th><th>Key Questions</th><th>Learning Experiences</th><th>Resources</th><th>Assessment</th><th>Remarks</th></tr>
<tr><td>${se.wk || f.week}</td><td>${se.lsn || "1"}</td><td>${se.strand || p.strand || ""}</td>
<td>${se.substrand || p.substrand || ""}</td><td>${se.specific_outcomes || ""}</td>
<td>${se.key_questions || ""}</td><td>${se.learning_experiences || ""}</td>
<td>${se.learning_resources || ""}</td><td>${se.assessment || ""}</td>
<td>${se.reflection || ""}</td></tr>
<tr><td colspan="10" style="background:#f5f5f5;font-style:italic;color:#666;">
Weeks 2-4: Continue with related sub-strands as per term planner</td></tr>
</table>
<p style="margin-top:20px;font-size:12px;color:#555;">Generated by CBC Kenya Teacher Portal · ${new Date().toLocaleDateString()}</p>`;
  }

  function doPrint() {
    const content =
      tab === "plan" ? out.plan : tab === "notes" ? out.notes : out.scheme;
    const title =
      tab === "plan"
        ? "Lesson Plan"
        : tab === "notes"
          ? "Lesson Notes"
          : "Scheme of Work";
    const w = window.open("", "_blank");
    w.document
      .write(`<!DOCTYPE html><html><head><title>CBC ${title} – ${f.topic}</title>
    <style>body{font-family:Georgia,serif;max-width:820px;margin:40px auto;padding:20px;color:#111;line-height:1.7;}
    h1{color:#0a3d1f;border-bottom:3px solid #0f5c2e;padding-bottom:8px;font-size:22px;}
    h2{color:#0f5c2e;font-size:18px;margin-top:20px;}h3{color:#1a7a42;font-size:15px;}
    table{width:100%;border-collapse:collapse;}th{background:#0f5c2e;color:white;padding:8px;text-align:left;}
    td{padding:7px 9px;border:1px solid #ccc;}tr:nth-child(even){background:#f5fff5;}
    .yt{color:#cc0000;font-weight:bold;}.diagram{background:#f5fff5;border:2px solid #86efac;padding:14px;border-radius:8px;font-family:monospace;white-space:pre-wrap;}
    .tag{display:inline-block;background:#0f5c2e;color:white;font-size:10px;padding:2px 7px;border-radius:4px;text-transform:uppercase;}
    </style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 108px)" }}>
      {/* Form */}
      <div style={{ width: 320, flexShrink: 0, overflowY: "auto" }}>
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ic n="lesson" s={19} c="white" />
            </div>
            <div>
              <div
                className="font-display"
                style={{ fontSize: 15, fontWeight: 700, color: "#0a3d1f" }}
              >
                Lesson Planner
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                TSC-Compliant AI Generator
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <label className="label">Term</label>
                <select
                  className="select"
                  value={f.term}
                  onChange={(e) => setF({ ...f, term: e.target.value })}
                >
                  {["Term 1", "Term 2", "Term 3"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Week</label>
                <select
                  className="select"
                  value={f.week}
                  onChange={(e) => setF({ ...f, week: e.target.value })}
                >
                  {Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`).map(
                    (w) => (
                      <option key={w}>{w}</option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Grade *</label>
              <select
                className="select"
                value={f.grade}
                onChange={(e) =>
                  setF({
                    ...f,
                    grade: e.target.value,
                    subject: SUBJECTS[e.target.value][0],
                  })
                }
              >
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select
                className="select"
                value={f.subject}
                onChange={(e) => setF({ ...f, subject: e.target.value })}
              >
                {subs.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Topic / Strand *</label>
              <input
                className="input"
                placeholder="e.g. Photosynthesis, Fractions…"
                value={f.topic}
                onChange={(e) => setF({ ...f, topic: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Sub-topic</label>
              <input
                className="input"
                placeholder="Optional refinement…"
                value={f.subtopic}
                onChange={(e) => setF({ ...f, subtopic: e.target.value })}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <label className="label">Duration</label>
                <select
                  className="select"
                  value={f.duration}
                  onChange={(e) => setF({ ...f, duration: e.target.value })}
                >
                  {[
                    "30 min",
                    "40 min",
                    "60 min",
                    "80 min",
                    "Double (80 min)",
                  ].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assessment</label>
                <select
                  className="select"
                  value={f.assessment}
                  onChange={(e) => setF({ ...f, assessment: e.target.value })}
                >
                  {[
                    "Formative",
                    "Summative",
                    "Practical",
                    "Portfolio",
                    "Peer",
                  ].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Learning Area Type</label>
              <select
                className="select"
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value })}
              >
                {[
                  "Theoretical",
                  "Practical/Hands-on",
                  "Both Theory and Practical",
                  "Laboratory",
                  "Field Trip",
                  "Project-Based",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prior Knowledge</label>
              <input
                className="input"
                placeholder="What learners already know…"
                value={f.prior}
                onChange={(e) => setF({ ...f, prior: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Special Needs / Differentiation</label>
              <input
                className="input"
                placeholder="Learners needing support…"
                value={f.needs}
                onChange={(e) => setF({ ...f, needs: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Available Resources</label>
              <input
                className="input"
                placeholder="Textbooks, lab equipment…"
                value={f.resources}
                onChange={(e) => setF({ ...f, resources: e.target.value })}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f0faf0",
                borderRadius: 10,
                padding: "10px 13px",
                border: "1.5px solid #86efac",
                cursor: "pointer",
              }}
              onClick={() => setF({ ...f, project: !f.project })}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: "2px solid #0f5c2e",
                  background: f.project ? "#0f5c2e" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {f.project && <Ic n="check" s={11} c="white" />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f5c2e" }}>
                Include practical project / experiment
              </span>
            </div>
            <div>
              <label className="label">Custom Learning Objectives</label>
              <textarea
                className="textarea"
                style={{ minHeight: 75 }}
                placeholder="Optional: specify your own SLOs…"
                value={f.objectives}
                onChange={(e) => setF({ ...f, objectives: e.target.value })}
              />
            </div>
            <button
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
                fontSize: 15,
              }}
              onClick={generate}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Spinner /> Generating…
                </>
              ) : (
                <>
                  <Ic n="sparkles" s={15} c="white" /> Generate All Documents
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {!done && !busy && (
          <div
            className="card"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <Ic n="lesson" s={38} c="white" />
            </div>
            <div
              className="font-display"
              style={{ fontSize: 22, color: "#0a3d1f", marginBottom: 10 }}
            >
              CBC AI Lesson Generator
            </div>
            <p
              style={{
                color: "#6b7280",
                textAlign: "center",
                maxWidth: 380,
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Fill the form and click <strong>Generate All Documents</strong> to
              instantly create a full TSC-compliant lesson plan, learner notes
              with YouTube links & diagrams, and a 4-week scheme of work.
            </p>
          </div>
        )}
        {busy && (
          <div className="card" style={{ flex: 1 }}>
            <Loader text="AI crafting your CBC lesson documents (3 documents simultaneously)…" />
          </div>
        )}
        {done && !busy && (
          <div
            className="card"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid #e2ece2",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { id: "plan", label: "📋 Lesson Plan" },
                  { id: "notes", label: "📖 Learner Notes" },
                  { id: "scheme", label: "📅 Scheme of Work" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 9,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      background:
                        tab === t.id
                          ? "linear-gradient(135deg,#0f5c2e,#1a7a42)"
                          : "#f3f4f6",
                      color: tab === t.id ? "white" : "#6b7280",
                      transition: "all 0.15s",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                className="btn-primary"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={doPrint}
              >
                <Ic n="print" s={13} c="white" /> Print / PDF
              </button>
            </div>
            <div
              style={{ flex: 1, overflowY: "auto", padding: 24 }}
              className="lesson-out"
              dangerouslySetInnerHTML={{
                __html:
                  tab === "plan"
                    ? out.plan
                    : tab === "notes"
                      ? out.notes
                      : out.scheme,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// KAHOOT CLASSROOMS
// ══════════════════════════════════════════════════════════
const mkCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();
const STUDENT_NAMES = [
  "Amina",
  "Baraka",
  "Cynthia",
  "Daniel",
  "Esther",
  "Felix",
  "Grace",
  "Hassan",
  "Imani",
  "Joyce",
  "Kevin",
  "Lydia",
  "Martin",
  "Nancy",
  "Omar",
  "Phoebe",
];

function buildClassReportHtml(data, filter) {
  const students = data.students || [];
  const summary = data.summary || {};
  const heatmap = data.question_heatmap || [];
  const rows = students
    .map(
      (s) => `
    <tr>
      <td><b>${s.student_name}</b></td>
      <td>${s.total_score}/${s.total_possible}</td>
      <td style="color:${s.percentage >= 80 ? "#166534" : s.percentage >= 60 ? "#92400e" : "#991b1b"};font-weight:700">${s.percentage}%</td>
      <td>${s.ai_report?.summary || "-"}</td>
    </tr>`,
    )
    .join("");
  const heatRows = heatmap
    .map(
      (q) => `
    <tr>
      <td>Q${q.order}: ${q.text.substring(0, 50)}…</td>
      <td style="background:${q.percent_correct >= 70 ? "#dcfce7" : q.percent_correct >= 40 ? "#fef3c7" : "#fee2e2"};text-align:center;font-weight:700">${q.percent_correct}%</td>
      <td><span style="background:${q.difficulty === "easy" ? "#dcfce7" : q.difficulty === "medium" ? "#fef3c7" : "#fee2e2"};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase">${q.difficulty}</span></td>
    </tr>`,
    )
    .join("");
  return `
<h1>Class Performance Report</h1>
<p><b>Classroom:</b> ${data.classroom?.name || ""} &nbsp;|&nbsp;
<b>Subject:</b> ${data.classroom?.subject || ""} &nbsp;|&nbsp;
<b>Grade:</b> ${data.classroom?.grade || ""}</p>
<h2>Summary</h2>
<table><tr><th>Total Students</th><th>Class Average</th><th>Total Points</th><th>Class %</th></tr>
<tr><td>${summary.total_students || 0}</td><td>${summary.class_average || 0}</td>
<td>${summary.total_possible || 0}</td><td>${summary.class_percent || 0}%</td></tr></table>
<h2>Student Results</h2>
<table><tr><th>Student</th><th>Score</th><th>%</th><th>AI Feedback</th></tr>${rows}</table>
<h2>Question Analysis</h2>
<table><tr><th>Question</th><th>% Correct</th><th>Difficulty</th></tr>${heatRows}</table>
<p style="margin-top:20px;font-size:11px;color:#666">Generated by CBC Kenya Teacher Portal · ${new Date().toLocaleDateString()}</p>`;
}

function Classrooms() {
  const [view, setView] = useState("list"); // list|create|lobby|live|results
  const [rooms, setRooms] = useState([
    {
      id: 1,
      code: "MATH42",
      name: "Grade 4 Maths Quiz",
      grade: "Grade 4",
      subject: "Mathematics",
      timePerQ: 30,
      questions: [
        {
          text: "What is 12 + 8?",
          type: "mcq",
          options: ["18", "20", "22", "24"],
          answer: 1,
          points: 10,
        },
        {
          text: "A triangle has how many sides?",
          type: "mcq",
          options: ["2", "3", "4", "5"],
          answer: 1,
          points: 10,
        },
      ],
      students: [],
      status: "idle",
    },
  ]);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({
    name: "",
    grade: "Grade 4",
    subject: "Mathematics",
    timePerQ: 30,
  });
  const [qs, setQs] = useState([
    { text: "", type: "mcq", options: ["", "", "", ""], answer: 0, points: 10 },
  ]);
  const [live, setLive] = useState({
    qi: 0,
    timeLeft: 30,
    phase: "question",
    scores: {},
  });
  const [aiTopic, setAiTopic] = useState("");
  const [aiN, setAiN] = useState(5);
  const [genBusy, setGenBusy] = useState(false);
  const timerRef = useRef();

  function startTimer(secs) {
    clearInterval(timerRef.current);
    let t = secs;
    setLive((p) => ({ ...p, timeLeft: t, phase: "question" }));
    timerRef.current = setInterval(() => {
      t--;
      setLive((p) => {
        if (t <= 0) {
          clearInterval(timerRef.current);
          return { ...p, timeLeft: 0, phase: "reveal" };
        }
        return { ...p, timeLeft: t };
      });
    }, 1000);
  }

  async function createRoom() {
    const valid = qs.filter((q) => q.text.trim());
    if (!form.name || !valid.length)
      return alert("Add a name and at least one question.");
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        grade: form.grade,
        time_per_question: form.timePerQ,
        questions: valid.map((q, i) => ({
          text: q.text,
          question_type:
            q.type === "open"
              ? "open"
              : q.type === "truefalse"
                ? "truefalse"
                : "mcq",
          options: q.options || [],
          correct_index: q.answer ?? 0,
          points: q.points || 10,
          order: i + 1,
        })),
      };
      const room = await api("POST", "/classrooms/", payload);
      // Normalise backend response to match local shape
      const localRoom = {
        ...room,
        code: room.join_code,
        timePerQ: room.time_per_question,
        questions: (room.questions || valid).map((q) => ({
          ...q,
          type: q.question_type || q.type || "mcq",
          options: q.options || [],
          answer: q.correct_index ?? 0,
        })),
        students: [],
        status: "lobby",
      };
      setRooms((p) => [localRoom, ...p]);
      setActive(localRoom);
      setView("lobby");
    } catch (e) {
      alert("Failed to create classroom: " + e.message);
    }
  }

  async function startGame() {
    try {
      await api("POST", `/classrooms/${active.id}/start/`);
    } catch (_) {}
    const updated = { ...active, status: "live" };
    setActive(updated);
    setRooms((p) => p.map((r) => (r.id === updated.id ? updated : r)));
    setLive({
      qi: 0,
      timeLeft: active.timePerQ,
      phase: "question",
      scores: {},
    });
    setView("live");
    startTimer(active.timePerQ);
  }

  function nextQ() {
    const next = live.qi + 1;
    if (next >= active.questions.length) {
      endGame();
      return;
    }
    setLive((p) => ({ ...p, qi: next, phase: "question" }));
    startTimer(active.timePerQ);
  }

  async function endGame() {
    clearInterval(timerRef.current);
    try {
      await api("POST", `/classrooms/${active.id}/end/`);
    } catch (_) {}
    const updated = { ...active, status: "done" };
    setActive(updated);
    setRooms((p) => p.map((r) => (r.id === updated.id ? updated : r)));
    setView("results");
  }

  function simJoin() {
    const name =
      STUDENT_NAMES[Math.floor(Math.random() * STUDENT_NAMES.length)] +
      Math.floor(Math.random() * 90 + 10);
    setActive((p) => {
      const u = {
        ...p,
        students: [...p.students, { id: Date.now(), name, score: 0 }],
      };
      setRooms((r) => r.map((x) => (x.id === u.id ? u : x)));
      return u;
    });
  }

  async function genAIQs() {
    if (!aiTopic.trim()) return alert("Enter a topic");
    setGenBusy(true);
    try {
      const result = await api("POST", "/lessons/generate-questions/", {
        grade: form.grade,
        subject: form.subject,
        topic: aiTopic,
        count: aiN,
      });
      setQs(
        (result.questions || []).map((q) => ({
          text: q.text,
          type: q.type || "mcq",
          options: q.options || ["", "", "", ""],
          answer: q.correct_index ?? 0,
          points: q.points || 10,
        })),
      );
    } catch (e) {
      alert("AI generation failed – try again.");
    }
    setGenBusy(false);
  }

  const updateQ = (i, k, v) =>
    setQs((p) => p.map((q, idx) => (idx === i ? { ...q, [k]: v } : q)));
  const updateOpt = (qi, oi, v) =>
    setQs((p) =>
      p.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? v : o)) }
          : q,
      ),
    );
  const pct = (live.timeLeft / (active?.timePerQ || 30)) * 100;
  const timerColor =
    live.timeLeft > 10 ? "#16a34a" : live.timeLeft > 5 ? "#f59e0b" : "#dc2626";

  // ── LIVE ──
  if (view === "live" && active) {
    const q = active.questions[live.qi];
    const COLORS = ["#e74c3c", "#3498db", "#f39c12", "#27ae60"];
    const SHAPES = ["▲", "◆", "●", "■"];
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          height: "calc(100vh-108px)",
        }}
      >
        <div
          className="card"
          style={{
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Question {live.qi + 1} of {active.questions.length}
            </div>
            <div
              className="font-display"
              style={{ fontSize: 17, color: "#0a3d1f" }}
            >
              {active.name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 60, height: 60 }}>
              <svg
                width={60}
                height={60}
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx={30}
                  cy={30}
                  r={24}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={5}
                />
                <circle
                  cx={30}
                  cy={30}
                  r={24}
                  fill="none"
                  stroke={timerColor}
                  strokeWidth={5}
                  strokeDasharray={151}
                  strokeDashoffset={151 * (1 - pct / 100)}
                  style={{
                    transition: "stroke-dashoffset 1s linear,stroke 0.3s",
                  }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 17,
                  color: timerColor,
                }}
              >
                {live.timeLeft}
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
                {active.students.length}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                Players
              </div>
            </div>
            {live.phase === "reveal" ? (
              <button className="btn-primary" onClick={nextQ}>
                {live.qi + 1 >= active.questions.length ? "🏁 End" : "Next →"}
              </button>
            ) : (
              <button
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={endGame}
              >
                End Game
              </button>
            )}
          </div>
        </div>

        <div
          className="card"
          style={{
            flex: 1,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg,#0a3d1f,#1a7a42)",
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
              Q{live.qi + 1}
            </div>
            <div
              className="font-display"
              style={{ fontSize: 21, color: "white", lineHeight: 1.4 }}
            >
              {q.text}
            </div>
            <div
              style={{ marginTop: 8, display: "inline-block" }}
              className="badge badge-amber"
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
            {(q.options || []).filter(Boolean).map((opt, i) => {
              let bg = COLORS[i];
              if (live.phase === "reveal")
                bg = i === q.answer ? "#16a34a" : "#9ca3af";
              return (
                <div
                  key={i}
                  style={{
                    background: bg,
                    color: "white",
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    transition: "background 0.4s",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{SHAPES[i]}</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {live.phase === "reveal" && i === q.answer && (
                    <Ic n="check" s={22} c="white" />
                  )}
                </div>
              );
            })}
          </div>
          {live.phase === "question" && (
            <div
              style={{
                background: "#f0faf0",
                borderRadius: 11,
                padding: "11px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                className="pulse"
                style={{
                  width: 9,
                  height: 9,
                  background: "#16a34a",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "#0f5c2e", fontWeight: 600 }}>
                Students answer at <strong>cbckenya.com/join</strong> using code{" "}
                <strong style={{ fontSize: 16, letterSpacing: "0.1em" }}>
                  {active.code}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (view === "results" && active) {
    const results = active.students
      .map((s) => ({
        ...s,
        score: Math.floor(Math.random() * active.questions.length) * 10 + 10,
        correct: Math.floor(Math.random() * active.questions.length + 1),
        total: active.questions.length,
      }))
      .sort((a, b) => b.score - a.score);
    const avg = results.length
      ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
      : 0;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          height: "calc(100vh-108px)",
        }}
      >
        <div
          className="card"
          style={{
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              className="font-display"
              style={{ fontSize: 18, color: "#0a3d1f" }}
            >
              🏁 {active.name} — Results
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {results.length} students • {active.questions.length} questions
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-outline" onClick={() => window.print()}>
              <Ic n="print" s={14} c="#0f5c2e" /> Print All Reports
            </button>
            <button className="btn-primary" onClick={() => setView("list")}>
              ← Back
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
          }}
        >
          {[
            { l: "Students", v: results.length, c: "#0f5c2e" },
            { l: "Class Average", v: `${avg} pts`, c: "#f59e0b" },
            { l: "Questions", v: active.questions.length, c: "#3b82f6" },
          ].map((s) => (
            <div
              key={s.l}
              className="card"
              style={{ padding: "16px 18px", textAlign: "center" }}
            >
              <div
                className="font-display"
                style={{ fontSize: 28, fontWeight: 900, color: s.c }}
              >
                {s.v}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              padding: "13px 20px",
              borderBottom: "1px solid #e2ece2",
              fontWeight: 700,
              color: "#0a3d1f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ic n="trophy" s={16} c="#f59e0b" /> Leaderboard & Individual
            Feedback
          </div>
          {results.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              No students joined. Use "Simulate Join" in the lobby to test.
            </div>
          )}
          {results.map((s, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
            const pct = Math.round((s.correct / s.total) * 100);
            return (
              <div
                key={s.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      i < 3
                        ? "linear-gradient(135deg,#f5a623,#e8870a)"
                        : "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: i < 3 ? "white" : "#374151",
                    fontSize: i < 3 ? 18 : 14,
                    flexShrink: 0,
                  }}
                >
                  {medal || i + 1}
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {s.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {s.correct}/{s.total} correct • {pct}% accuracy
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: "#f3f4f6",
                      borderRadius: 3,
                      marginTop: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "linear-gradient(90deg,#0f5c2e,#1a7a42)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{ fontWeight: 900, fontSize: 20, color: "#0f5c2e" }}
                  >
                    {s.score}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#9ca3af",
                      }}
                    >
                      {" "}
                      pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LOBBY ──
  if (view === "lobby" && active)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh-108px)",
        }}
      >
        <div
          className="card"
          style={{ width: 540, padding: 40, textAlign: "center" }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <Ic n="classroom" s={36} c="white" />
          </div>
          <div
            className="font-display"
            style={{ fontSize: 24, color: "#0a3d1f", marginBottom: 6 }}
          >
            {active.name}
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 22 }}>
            Share the code with your students
          </p>
          <div
            style={{
              background: "linear-gradient(135deg,#0a3d1f,#1a7a42)",
              borderRadius: 18,
              padding: "28px 32px",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              Join Code
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 52,
                color: "#f5a623",
                fontWeight: 900,
                letterSpacing: "0.18em",
              }}
            >
              {active.code}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
                marginTop: 8,
              }}
            >
              Students visit{" "}
              <strong style={{ color: "white" }}>cbckenya.com/join</strong>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <Ic n="users" s={16} c="#0f5c2e" />
            <span style={{ fontWeight: 700, color: "#0f5c2e", fontSize: 18 }}>
              {active.students.length}
            </span>
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              students waiting
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginBottom: 20,
              maxHeight: 100,
              overflowY: "auto",
            }}
          >
            {active.students.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "5px 13px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {s.name}
              </div>
            ))}
            {!active.students.length && (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No students yet…</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn-outline" onClick={simJoin}>
              + Simulate Join
            </button>
            <button
              className="btn-primary"
              style={{ padding: "12px 28px", fontSize: 15 }}
              onClick={startGame}
              disabled={!active.students.length}
            >
              <Ic n="play" s={16} c="white" /> Start ({active.students.length})
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
            Click "Simulate Join" to test the flow
          </p>
        </div>
      </div>
    );

  // ── CREATE ──
  if (view === "create")
    return (
      <div style={{ display: "flex", gap: 18, height: "calc(100vh-108px)" }}>
        <div style={{ width: 290, flexShrink: 0, overflowY: "auto" }}>
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                fontWeight: 700,
                color: "#0a3d1f",
                fontSize: 14,
                marginBottom: 14,
              }}
            >
              ⚙️ Game Settings
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div>
                <label className="label">Game Name *</label>
                <input
                  className="input"
                  placeholder="e.g. End of Term Quiz"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Grade</label>
                <select
                  className="select"
                  value={form.grade}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grade: e.target.value,
                      subject: SUBJECTS[e.target.value][0],
                    })
                  }
                >
                  {GRADES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <select
                  className="select"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                >
                  {(SUBJECTS[form.grade] || []).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Seconds / Question</label>
                <select
                  className="select"
                  value={form.timePerQ}
                  onChange={(e) =>
                    setForm({ ...form, timePerQ: Number(e.target.value) })
                  }
                >
                  {[15, 20, 30, 45, 60, 90].map((t) => (
                    <option key={t} value={t}>
                      {t}s
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  background: "#f0faf0",
                  borderRadius: 12,
                  padding: 14,
                  border: "1.5px solid #86efac",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#0f5c2e",
                    fontSize: 12,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Ic n="sparkles" s={13} c="#0f5c2e" /> AI Generate Questions
                </div>
                <input
                  className="input"
                  style={{ marginBottom: 8, fontSize: 13 }}
                  placeholder="Topic…"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    className="select"
                    style={{ width: 80, fontSize: 13 }}
                    value={aiN}
                    onChange={(e) => setAiN(Number(e.target.value))}
                  >
                    {[3, 5, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}Qs
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      padding: "8px",
                      fontSize: 13,
                    }}
                    onClick={genAIQs}
                    disabled={genBusy}
                  >
                    {genBusy ? (
                      <Spinner />
                    ) : (
                      <Ic n="sparkles" s={13} c="white" />
                    )}{" "}
                    {genBusy ? "…" : "Generate"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-outline"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "9px",
                    fontSize: 13,
                  }}
                  onClick={() => setView("list")}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "9px",
                    fontSize: 13,
                  }}
                  onClick={createRoom}
                >
                  Create →
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 700, color: "#0a3d1f" }}>
              {qs.filter((q) => q.text).length} Question(s)
            </span>
            <button
              className="btn-outline"
              style={{ padding: "7px 14px", fontSize: 13 }}
              onClick={() =>
                setQs((p) => [
                  ...p,
                  {
                    text: "",
                    type: "mcq",
                    options: ["", "", "", ""],
                    answer: 0,
                    points: 10,
                  },
                ])
              }
            >
              <Ic n="plus" s={14} c="#0f5c2e" /> Add
            </button>
          </div>
          {qs.map((q, qi) => (
            <div key={qi} className="card" style={{ padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {qi + 1}
                </div>
                <select
                  className="select"
                  style={{ width: 150, fontSize: 13 }}
                  value={q.type}
                  onChange={(e) => updateQ(qi, "type", e.target.value)}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="truefalse">True / False</option>
                  <option value="short">Short Answer (AI marks)</option>
                </select>
                <select
                  className="select"
                  style={{ width: 90, fontSize: 13 }}
                  value={q.points}
                  onChange={(e) =>
                    updateQ(qi, "points", Number(e.target.value))
                  }
                >
                  {[5, 10, 15, 20].map((p) => (
                    <option key={p} value={p}>
                      {p} pts
                    </option>
                  ))}
                </select>
                <button
                  style={{
                    marginLeft: "auto",
                    background: "#fee2e2",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 9px",
                    cursor: "pointer",
                  }}
                  onClick={() => setQs((p) => p.filter((_, i) => i !== qi))}
                >
                  <Ic n="x" s={13} c="#dc2626" />
                </button>
              </div>
              <textarea
                className="textarea"
                style={{ minHeight: 65, marginBottom: 12, fontSize: 13 }}
                placeholder={`Question ${qi + 1}…`}
                value={q.text}
                onChange={(e) => updateQ(qi, "text", e.target.value)}
              />
              {q.type === "mcq" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <input
                        type="radio"
                        name={`a${qi}`}
                        checked={q.answer === oi}
                        onChange={() => updateQ(qi, "answer", oi)}
                        style={{
                          accentColor: "#0f5c2e",
                          width: 15,
                          height: 15,
                          flexShrink: 0,
                        }}
                      />
                      <input
                        className="input"
                        style={{ padding: "7px 11px", fontSize: 13 }}
                        placeholder={`Option ${["A", "B", "C", "D"][oi]}`}
                        value={opt}
                        onChange={(e) => updateOpt(qi, oi, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {q.type === "truefalse" && (
                <div style={{ display: "flex", gap: 10 }}>
                  {["True", "False"].map((tf, ti) => (
                    <label
                      key={tf}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                        justifyContent: "center",
                        padding: "9px",
                        borderRadius: 10,
                        border: `2px solid ${q.answer === ti ? "#0f5c2e" : "#e5e7eb"}`,
                        background: q.answer === ti ? "#f0faf0" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name={`a${qi}`}
                        checked={q.answer === ti}
                        onChange={() => updateQ(qi, "answer", ti)}
                        style={{ accentColor: "#0f5c2e" }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          color: q.answer === ti ? "#0f5c2e" : "#6b7280",
                          fontSize: 14,
                        }}
                      >
                        {tf}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "short" && (
                <div
                  style={{
                    background: "#fef3c7",
                    borderRadius: 9,
                    padding: "9px 13px",
                    fontSize: 12,
                    color: "#92400e",
                    fontWeight: 600,
                  }}
                >
                  ⚡ Open-ended — AI will mark automatically
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

  // ── LIST ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="font-display"
            style={{ fontSize: 22, color: "#0a3d1f" }}
          >
            Quiz Classrooms
          </div>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Kahoot-style live quizzes — students join with a code, no account
            needed
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setView("create");
            setQs([
              {
                text: "",
                type: "mcq",
                options: ["", "", "", ""],
                answer: 0,
                points: 10,
              },
            ]);
          }}
        >
          <Ic n="plus" s={15} c="white" /> New Game Room
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
          gap: 14,
        }}
      >
        {rooms.map((room) => (
          <div
            key={room.id}
            className="card card-hover"
            style={{ padding: 22 }}
            onClick={() => {
              setActive(room);
              setView(room.status === "done" ? "results" : "lobby");
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ic n="classroom" s={22} c="white" />
              </div>
              <span
                className={`badge ${room.status === "done" ? "badge-blue" : room.status === "live" ? "badge-red" : "badge-green"}`}
              >
                {room.status === "done"
                  ? "Completed"
                  : room.status === "live"
                    ? "🔴 Live"
                    : "Ready"}
              </span>
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#111",
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              {room.name}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              {room.grade} • {room.subject}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 12,
              }}
            >
              <span>{room.questions?.length || 0} questions</span>
              <span>{room.students?.length || 0} students</span>
            </div>
            <div
              style={{
                background: "#f0faf0",
                borderRadius: 9,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Code
              </span>
              <span
                className="font-display"
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  color: "#f5a623",
                  letterSpacing: "0.12em",
                }}
              >
                {room.code}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════
const MOCK_STUDENTS = [
  {
    name: "Amina Wanjiku",
    score: 87,
    correct: 13,
    total: 15,
    grade: "A",
    trend: "↑",
    strong: "Fractions",
    weak: "Decimals",
  },
  {
    name: "Baraka Ochieng",
    score: 62,
    correct: 9,
    total: 15,
    grade: "C+",
    trend: "→",
    strong: "Geometry",
    weak: "Algebra",
  },
  {
    name: "Cynthia Muthoni",
    score: 94,
    correct: 14,
    total: 15,
    grade: "A+",
    trend: "↑",
    strong: "All topics",
    weak: "None",
  },
  {
    name: "Daniel Kipchoge",
    score: 45,
    correct: 7,
    total: 15,
    grade: "D+",
    trend: "↓",
    strong: "Basic arithmetic",
    weak: "Word problems",
  },
  {
    name: "Esther Akinyi",
    score: 78,
    correct: 12,
    total: 15,
    grade: "B+",
    trend: "↑",
    strong: "Measurement",
    weak: "Fractions",
  },
  {
    name: "Felix Mutua",
    score: 55,
    correct: 8,
    total: 15,
    grade: "C",
    trend: "→",
    strong: "Number patterns",
    weak: "Division",
  },
  {
    name: "Grace Otieno",
    score: 91,
    correct: 14,
    total: 15,
    grade: "A",
    trend: "↑",
    strong: "Algebra",
    weak: "Statistics",
  },
  {
    name: "Hassan Mwangi",
    score: 68,
    correct: 10,
    total: 15,
    grade: "B-",
    trend: "→",
    strong: "Geometry",
    weak: "Fractions",
  },
];

function Reports() {
  const [filter, setFilter] = useState({
    grade: "Grade 4",
    subject: "Mathematics",
  });
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [fb, setFb] = useState({});

  const gc = (g) =>
    g.startsWith("A")
      ? "#15803d"
      : g.startsWith("B")
        ? "#1d4ed8"
        : g.startsWith("C")
          ? "#f59e0b"
          : "#dc2626";
  const avg = Math.round(
    MOCK_STUDENTS.reduce((a, s) => a + s.score, 0) / MOCK_STUDENTS.length,
  );

  async function genReport() {
    setBusy(true);
    try {
      // Fetch live report from backend — falls back to mock data for demo
      try {
        const liveReport = await api(
          "GET",
          `/classrooms/${filter.classroomId || 1}/report/`,
        );
        const html = buildClassReportHtml(liveReport, filter);
        setReport(html);
      } catch (_) {
        // demo fallback
        setReport(
          "<h2>No classroom selected</h2><p>Run a quiz first, then view its report here.</p>",
        );
      }
    } catch (e) {
      alert("Report generation failed.");
    }
    setBusy(false);
  }

  async function getFeedback(s) {
    setFb((p) => ({ ...p, [s.name]: "loading" }));
    try {
      // Use AI report from session if available, else generate inline
      const fb =
        s.ai_report?.summary ||
        (s.score >= 80
          ? `Excellent work, ${s.name}! You demonstrated strong mastery of ${filter.subject}. Keep up the fantastic effort!`
          : s.score >= 60
            ? `Good effort, ${s.name}. You scored ${s.score}% — review the topics you found tricky and you will improve quickly.`
            : `${s.name}, don't give up! A score of ${s.score}% shows there is room to grow. Speak with your teacher for extra support.`);
      setFb((p) => ({ ...p, [s.name]: fb }));
    } catch (e) {
      setFb((p) => ({ ...p, [s.name]: "Unable to generate feedback." }));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: "calc(100vh-108px)",
      }}
    >
      <div
        className="card"
        style={{
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            className="font-display"
            style={{ fontSize: 20, color: "#0a3d1f" }}
          >
            Student Reports
          </div>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            AI-powered insights, individualised feedback & printable reports
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: 130, fontSize: 13 }}
            value={filter.grade}
            onChange={(e) => setFilter({ ...filter, grade: e.target.value })}
          >
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 160, fontSize: 13 }}
            value={filter.subject}
            onChange={(e) => setFilter({ ...filter, subject: e.target.value })}
          >
            {(SUBJECTS[filter.grade] || []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={genReport}
            disabled={busy}
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            {busy ? <Spinner /> : <Ic n="sparkles" s={13} c="white" />} AI Class
            Report
          </button>
          <button
            className="btn-outline"
            style={{ padding: "9px 16px", fontSize: 13 }}
            onClick={() => window.print()}
          >
            <Ic n="print" s={13} c="#0f5c2e" /> Print All
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {[
          { l: "Class Average", v: `${avg}%`, c: "#0f5c2e" },
          { l: "Total Students", v: MOCK_STUDENTS.length, c: "#3b82f6" },
          {
            l: "Top Score",
            v: `${Math.max(...MOCK_STUDENTS.map((s) => s.score))}%`,
            c: "#f59e0b",
          },
          {
            l: "Need Support",
            v: MOCK_STUDENTS.filter((s) => s.score < 60).length,
            c: "#dc2626",
          },
        ].map((s) => (
          <div key={s.l} className="card" style={{ padding: "14px 18px" }}>
            <div
              className="font-display"
              style={{ fontSize: 28, fontWeight: 900, color: s.c }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, flex: 1, overflow: "hidden" }}>
        <div className="card" style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              padding: "13px 20px",
              borderBottom: "1px solid #e2ece2",
              fontWeight: 700,
              color: "#0a3d1f",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Ic n="users" s={15} c="#0f5c2e" /> {filter.grade} —{" "}
            {filter.subject} ({MOCK_STUDENTS.length} students)
          </div>
          {MOCK_STUDENTS.map((s, i) => (
            <div key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div
                style={{
                  padding: "13px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: `${gc(s.grade)}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: gc(s.grade),
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {s.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    ✅ {s.strong} &nbsp;•&nbsp; ⚠️ {s.weak}
                  </div>
                  {fb[s.name] && fb[s.name] !== "loading" && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#0f5c2e",
                        background: "#f0faf0",
                        padding: "6px 10px",
                        borderRadius: 8,
                        marginTop: 6,
                        fontStyle: "italic",
                        borderLeft: "3px solid #0f5c2e",
                      }}
                    >
                      {fb[s.name]}
                    </div>
                  )}
                  {fb[s.name] === "loading" && (
                    <div
                      style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}
                      className="pulse"
                    >
                      AI generating feedback…
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: gc(s.grade),
                      }}
                    >
                      {s.score}%
                    </span>
                    <span
                      className={`badge ${s.grade.startsWith("A") ? "badge-green" : s.grade.startsWith("B") ? "badge-blue" : s.grade.startsWith("C") ? "badge-amber" : "badge-red"}`}
                    >
                      {s.grade}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}
                  >
                    {s.correct}/{s.total} {s.trend}
                  </div>
                  <button
                    style={{
                      background: "#f0faf0",
                      border: "1px solid #86efac",
                      borderRadius: 7,
                      padding: "4px 11px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f5c2e",
                      cursor: "pointer",
                    }}
                    onClick={() => getFeedback(s)}
                  >
                    ✨ AI Feedback
                  </button>
                </div>
              </div>
              <div
                style={{
                  padding: "0 20px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: "#f3f4f6",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${s.score}%`,
                      background: `linear-gradient(90deg,${gc(s.grade)},${gc(s.grade)}88)`,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {(report || busy) && (
          <div
            className="card"
            style={{ width: 370, flexShrink: 0, overflowY: "auto" }}
          >
            <div
              style={{
                padding: "13px 20px",
                borderBottom: "1px solid #e2ece2",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#0a3d1f",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Ic n="sparkles" s={15} c="#f59e0b" /> AI Class Report
              </div>
              <button
                className="btn-outline"
                style={{ padding: "5px 11px", fontSize: 12 }}
                onClick={() => window.print()}
              >
                <Ic n="print" s={12} c="#0f5c2e" /> Print
              </button>
            </div>
            {busy ? (
              <Loader text="Generating class report…" />
            ) : (
              <div
                style={{ padding: 18 }}
                className="lesson-out"
                dangerouslySetInnerHTML={{ __html: report }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function Dashboard({ go }) {
  const stats = [
    { l: "Lessons Created", v: 7, icon: "lesson", c: "#0f5c2e", bg: "#dcfce7" },
    { l: "Game Rooms", v: 3, icon: "classroom", c: "#3b82f6", bg: "#dbeafe" },
    {
      l: "Students Reached",
      v: 142,
      icon: "users",
      c: "#f59e0b",
      bg: "#fef3c7",
    },
    {
      l: "Reports Generated",
      v: 12,
      icon: "report",
      c: "#7c3aed",
      bg: "#ede9fe",
    },
  ];
  const actions = [
    {
      label: "New Lesson Plan",
      desc: "AI-powered CBC notes, YouTube links & diagrams",
      icon: "lesson",
      grad: "linear-gradient(135deg,#0f5c2e,#1a7a42)",
      panel: "lesson",
    },
    {
      label: "Launch Quiz Game",
      desc: "Kahoot-style live quiz — students join with a code",
      icon: "classroom",
      grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
      panel: "classroom",
    },
    {
      label: "View Reports",
      desc: "AI feedback, leaderboards & printable class reports",
      icon: "report",
      grad: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
      panel: "reports",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          background:
            "linear-gradient(135deg,#0a3d1f 0%,#0f5c2e 40%,#1a7a42 100%)",
          borderRadius: 20,
          padding: "30px 34px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="dot-bg"
          style={{ position: "absolute", inset: 0, opacity: 0.5 }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "5px 14px",
              marginBottom: 12,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Ic n="sparkles" s={13} c="#f5a623" />
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.9)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              CBC Kenya Teacher Suite
            </span>
          </div>
          <div
            className="font-display"
            style={{ fontSize: 30, color: "white", marginBottom: 8 }}
          >
            Good morning, Teacher! 👋
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              maxWidth: 500,
            }}
          >
            Your all-in-one CBC teaching suite — lesson planning, live quizzes,
            AI marking & student reports.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
        }}
      >
        {stats.map((s) => (
          <div key={s.l} className="card" style={{ padding: "17px 18px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: s.bg,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 11,
              }}
            >
              <Ic n={s.icon} s={20} c={s.c} />
            </div>
            <div
              className="font-display"
              style={{ fontSize: 30, fontWeight: 900, color: s.c }}
            >
              {s.v}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            fontWeight: 700,
            color: "#0a3d1f",
            marginBottom: 12,
            fontSize: 15,
          }}
        >
          Quick Actions
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
          }}
        >
          {actions.map((a) => (
            <div
              key={a.panel}
              className="card card-hover"
              style={{ padding: 24, background: a.grad, cursor: "pointer" }}
              onClick={() => go(a.panel)}
            >
              <div style={{ position: "relative" }}>
                <div
                  className="dot-bg"
                  style={{ position: "absolute", inset: -24, opacity: 0.5 }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Ic n={a.icon} s={22} c="white" />
                  </div>
                  <div
                    className="font-display"
                    style={{ fontSize: 18, color: "white", marginBottom: 6 }}
                  >
                    {a.label}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.72)",
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    {a.desc}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Open <Ic n="arrow" s={14} c="rgba(255,255,255,0.9)" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div
          style={{
            fontWeight: 700,
            color: "#0a3d1f",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ic n="lightning" s={15} c="#f59e0b" /> Pro Tips
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {[
            "Generate a full 4-week Scheme of Work in seconds from the Lesson Planner",
            "Use AI to generate quiz questions — saves hours of preparation",
            "Students join your live quiz with just a 6-digit code — no account needed",
            "Print individual student reports with AI feedback for parent meetings",
          ].map((tip, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "11px 13px",
                background: "#f0faf0",
                borderRadius: 10,
                border: "1px solid #dcfce7",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  background: "#dcfce7",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Ic n="check" s={11} c="#0f5c2e" />
              </div>
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                {tip}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════
export default function App() {
  const [panel, setPanel] = useState("dashboard");
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "lesson", label: "Lesson Planner", icon: "lesson" },
    { id: "classroom", label: "Quiz Classrooms", icon: "classroom" },
    { id: "reports", label: "Reports", icon: "report" },
  ];
  return (
    <>
      <GlobalStyles />
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 230,
            flexShrink: 0,
            background: "linear-gradient(180deg,#0a3d1f 0%,#0d4d25 100%)",
            display: "flex",
            flexDirection: "column",
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 8px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.14)",
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ic n="book" s={18} c="white" />
            </div>
            <div>
              <div
                className="font-display"
                style={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                CBC Kenya
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Teacher Panel
              </div>
            </div>
          </div>
          <nav
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {nav.map((item) => (
              <button
                key={item.id}
                className={`nav-btn ${panel === item.id ? "active" : ""}`}
                onClick={() => setPanel(item.id)}
              >
                <Ic
                  n={item.icon}
                  s={17}
                  c={panel === item.id ? "white" : "rgba(255,255,255,0.6)"}
                />
                {item.label}
              </button>
            ))}
          </nav>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 12,
              marginTop: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 8px",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "linear-gradient(135deg,#f5a623,#e8870a)",
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  color: "white",
                  fontSize: 13,
                }}
              >
                T
              </div>
              <div>
                <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
                  Teacher
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                  CBC Kenya
                </div>
              </div>
            </div>
            <button className="nav-btn">
              <Ic n="logout" s={16} c="rgba(255,255,255,0.55)" /> Sign Out
            </button>
          </div>
        </div>

        {/* Main */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Topbar */}
          <div
            style={{
              background: "white",
              borderBottom: "1px solid #e2ece2",
              padding: "0 26px",
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              className="font-display"
              style={{ fontSize: 17, color: "#0a3d1f", fontWeight: 700 }}
            >
              {nav.find((n) => n.id === panel)?.label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 12px",
                  background: "#f0faf0",
                  borderRadius: 20,
                  border: "1px solid #dcfce7",
                }}
              >
                <Ic n="sparkles" s={13} c="#0f5c2e" />
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#0f5c2e" }}
                >
                  AI-Powered
                </span>
              </div>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                2026 · Term 1
              </span>
            </div>
          </div>

          {/* Content */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: 22 }}
            className="slide-up"
            key={panel}
          >
            {panel === "dashboard" && <Dashboard go={setPanel} />}
            {panel === "lesson" && <LessonPlanner />}
            {panel === "classroom" && <Classrooms />}
            {panel === "history" && <PastQuizzesView />}
            {panel === "reports" && <Reports />}
          </div>
        </div>
      </div>
    </>
  );
}

function PastQuizzesView() {
  const [rooms, setRooms] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setBusy(true);
    try {
      const data = await api("GET", "/classrooms/");
      setRooms(
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      );
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  }

  async function deleteRoom(id) {
    if (!confirm("Delete this classroom?")) return;
    try {
      await api("DELETE", `/classrooms/${id}/`);
      setRooms(rooms.filter((r) => r.id !== id));
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  if (busy) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 24, marginBottom: 20 }}>
        Past Quizzes ({rooms.length})
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
          gap: 16,
        }}
      >
        {rooms.map((room) => (
          <div
            key={room.id}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {room.name}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              {room.grade} • {room.subject}
            </div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              📝 {room.questions?.length || 0} questions • 👥{" "}
              {room.student_count || 0} students
            </div>
            <div
              style={{
                background: "#f0faf0",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280" }}>CODE</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#f5a623" }}>
                {room.join_code}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
              {new Date(room.created_at).toLocaleDateString()}
            </div>
            <button
              onClick={() => deleteRoom(room.id)}
              style={{
                width: "100%",
                background: "#fee2e2",
                color: "#dc2626",
                border: "none",
                borderRadius: 8,
                padding: "8px",
                cursor: "pointer",
              }}
            >
              🗑️ Delete
            </button>
          </div>
        ))}

        {rooms.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: 60,
              color: "#9ca3af",
            }}
          >
            No past quizzes yet
          </div>
        )}
      </div>
    </div>
  );
}