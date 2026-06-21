"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const MOTIVATIONAL_LINES = [
  "Every strand you complete brings you one step closer to mastery.",
  "Consistent practice today builds the confidence you need tomorrow.",
  "The best learners don't wait — they explore, attempt, and improve.",
  "Challenge yourself across strands. Growth happens outside the comfort zone.",
];

function ExploreContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && user?.role === "teacher") {
      router.replace("/teacher");
    }
  }, [user, authLoading, router]);

  const userGrade = user?.grade ? parseInt(user.grade) : null;
  const gradeParam = searchParams.get("grade");
  const [selectedGrade, setSelectedGrade] = useState(
    gradeParam && GRADES.includes(parseInt(gradeParam)) ? parseInt(gradeParam) : null
  );

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSubjectId, setLoadingSubjectId] = useState(null);

  const motivationalLine = MOTIVATIONAL_LINES[new Date().getDay() % MOTIVATIONAL_LINES.length];

  // Auto-select user's grade on load (only if nothing already chosen via URL)
  useEffect(() => {
    if (!selectedGrade && userGrade && GRADES.includes(userGrade)) {
      setSelectedGrade(userGrade);
    }
  }, [userGrade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load subjects when grade changes
  useEffect(() => {
    if (!selectedGrade) return;
    setSubjects([]);
    setLoadingSubjects(true);
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/subjects/?grade=${selectedGrade}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingSubjects(false));
  }, [selectedGrade]);

  const handleSubjectClick = (s) => {
    if (loadingSubjectId) return;
    setLoadingSubjectId(s.id);
    const q = new URLSearchParams({
      grade: String(selectedGrade),
      subject: String(s.id),
      name: s.name || "",
      icon: s.icon || "📚",
    });
    router.push(`/explore/quizzes?${q.toString()}`);
  };

  const firstName = user?.first_name || user?.username || "there";

  return (
    <div style={{ minHeight: "100vh", background: "#f7f9fc", fontFamily: "'Lato', sans-serif", paddingBottom: 60, paddingTop: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>

        {/* Motivational header */}
        <div style={{
          background: "linear-gradient(135deg, #0f4c8a 0%, #1a6fc4 100%)",
          borderRadius: 20,
          padding: "28px 28px",
          marginBottom: 16,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 160, height: 160,
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute", bottom: -50, right: 60,
            width: 100, height: 100,
            background: "rgba(255,255,255,0.04)",
            borderRadius: "50%",
          }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {userGrade ? `Grade ${userGrade} · CBE` : "CBE Learning"}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, maxWidth: 480, margin: 0 }}>
            {motivationalLine}
          </p>
          {userGrade && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 30, padding: "6px 14px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                Your grade is pre-selected below - or explore any grade you&apos;d like to review
              </span>
            </div>
          )}
        </div>

        {/* Grade selector */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e8eaf0", padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Select grade
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRADES.map((g) => {
              const isSelected = selectedGrade === g;
              const isUserGrade = userGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? "#1a6fc4" : "#e8eaf0"}`,
                    background: isSelected ? "#1a6fc4" : isUserGrade ? "#f0f7ff" : "#fff",
                    color: isSelected ? "#fff" : isUserGrade ? "#1a6fc4" : "#6b7280",
                    fontSize: 14,
                    fontWeight: isSelected || isUserGrade ? 700 : 500,
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  Grade {g}
                  {isUserGrade && !isSelected && (
                    <span style={{
                      position: "absolute", top: -6, right: -6,
                      background: "#1a6fc4", color: "#fff",
                      fontSize: 9, fontWeight: 800,
                      borderRadius: 20, padding: "1px 5px",
                      letterSpacing: "0.03em",
                    }}>
                      MINE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Learning areas */}
        <AnimatePresence>
          {selectedGrade && (
            <motion.div id="subject-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#fff", borderRadius: 20, border: "1px solid #e8eaf0", padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Select learning area
              </p>
              {loadingSubjects ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #e8eaf0", borderTopColor: "#1a6fc4", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                  {subjects.map((s) => {
                    const isThisLoading = loadingSubjectId === s.id;
                    return (
                      <button key={s.id} onClick={() => handleSubjectClick(s)}
                        disabled={!!loadingSubjectId}
                        style={{
                          padding: "14px 14px",
                          borderRadius: 14,
                          border: `2px solid ${isThisLoading ? "#1a6fc4" : "#e8eaf0"}`,
                          background: isThisLoading ? "#e8f4ff" : "#f7f9fc",
                          display: "flex", alignItems: "center", gap: 10,
                          transition: "all 0.15s", textAlign: "left",
                          boxShadow: isThisLoading ? "0 2px 12px rgba(26,111,196,0.12)" : "none",
                          opacity: loadingSubjectId && !isThisLoading ? 0.5 : 1,
                          cursor: loadingSubjectId ? "default" : "pointer",
                        }}
                        onMouseEnter={(e) => { if (!loadingSubjectId) e.currentTarget.style.borderColor = "#bdd7f5"; }}
                        onMouseLeave={(e) => { if (!loadingSubjectId) e.currentTarget.style.borderColor = "#e8eaf0"; }}
                      >
                        <span style={{ fontSize: 24 }}>{s.icon || "📚"}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isThisLoading ? 700 : 500, color: isThisLoading ? "#1a6fc4" : "#1a1a2e", lineHeight: 1.3 }}>
                          {s.name}
                        </span>
                        {isThisLoading && <Loader2 size={16} color="#1a6fc4" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}
