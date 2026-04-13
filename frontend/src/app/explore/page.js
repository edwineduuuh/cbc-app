"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, BookOpen } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const QUIZ_TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "topical", label: "Strand quizzes" },
  { id: "exam", label: "Integrated assessments" },
];

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Teachers should never see student browse page
  useEffect(() => {
    if (!authLoading && user?.role === "teacher") {
      router.replace("/teacher");
    }
  }, [user, authLoading, router]);

  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedStrand, setSelectedStrand] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState({});

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  const [freeAttemptsLeft, setFreeAttemptsLeft] = useState(2);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Credits
  useEffect(() => {
    if (!user) {
      const deviceUsed = parseInt(
        localStorage.getItem("device_quizzes_used") || "0",
      );
      setFreeAttemptsLeft(Math.max(0, 2 - deviceUsed));
      return;
    }
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/credits/status/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setIsSubscribed(!!data.has_subscription);
        setFreeAttemptsLeft(data.quiz_credits ?? 0);
      })
      .catch(() => {});
  }, [user]);

  // Attempts map
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/attempts/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        const list = Array.isArray(data) ? data : data.results || [];
        list.forEach((a) => {
          if (!map[a.quiz] || a.score > map[a.quiz].score) map[a.quiz] = a;
        });
        setAttempts(map);
      })
      .catch(() => {});
  }, [user]);

  // Load subjects when grade changes
  useEffect(() => {
    if (!selectedGrade) return;
    setSelectedSubject(null);
    setQuizzes([]);
    setStrands([]);
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

  // Load strands + quizzes when subject changes
  useEffect(() => {
    if (!selectedGrade || !selectedSubject) return;
    setSelectedStrand(null);
    setSelectedTab("all");

    const token = localStorage.getItem("accessToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Load strands
    fetch(
      `${API}/topics/?subject=${selectedSubject.id}&grade=${selectedGrade}`,
      { headers },
    )
      .then((r) => r.json())
      .then((data) => setStrands(Array.isArray(data) ? data : []))
      .catch(() => {});

    // Load quizzes
    setLoadingQuizzes(true);
    fetch(
      `${API}/quizzes/?grade=${selectedGrade}&subject=${selectedSubject.id}`,
      { headers },
    )
      .then((r) => r.json())
      .then((data) =>
        setQuizzes(Array.isArray(data) ? data : data.results || []),
      )
      .catch(() => {})
      .finally(() => setLoadingQuizzes(false));
  }, [selectedGrade, selectedSubject]);

  // Filter quizzes based on tab + strand
  const filteredQuizzes = quizzes.filter((q) => {
    const typeMatch =
      selectedTab === "all" ||
      (selectedTab === "topical" && q.quiz_type === "topical") ||
      (selectedTab === "exam" && q.quiz_type === "exam");
    const strandMatch = !selectedStrand || q.topic === selectedStrand.id;
    return typeMatch && strandMatch;
  });

  const handleQuizClick = (quiz) => {
    if (!user && !authLoading) {
      const deviceUsed = parseInt(
        localStorage.getItem("device_quizzes_used") || "0",
      );
      if (deviceUsed >= 2) {
        router.push("/register?reason=quota");
        return;
      }
      router.push(`/quizzes/${quiz.id}`);
      return;
    }
    if (!isSubscribed && freeAttemptsLeft <= 0) {
      router.push("/subscribe");
      return;
    }
    router.push(`/quizzes/${quiz.id}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f9fc",
        fontFamily: "'Lato', sans-serif",
        paddingBottom: 60,
        paddingTop: 24,
      }}
    >
      {/* <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
      `}</style> */}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
        {/* Grade selector */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #e8eaf0",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#8892a4",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Select grade
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 12,
                  border: `2px solid ${selectedGrade === g ? "#1a6fc4" : "#e8eaf0"}`,
                  background: selectedGrade === g ? "#e8f4ff" : "#fff",
                  color: selectedGrade === g ? "#1a6fc4" : "#6b7280",
                  fontSize: 14,
                  fontWeight: selectedGrade === g ? 700 : 500,
                  transition: "all 0.15s",
                }}
              >
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        {/* Learning areas */}
        <AnimatePresence>
          {selectedGrade && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#fff",
                borderRadius: 20,
                border: "1px solid #e8eaf0",
                padding: 20,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#8892a4",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}
              >
                Select learning area
              </p>
              {loadingSubjects ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "20px 0",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      border: "3px solid #e8eaf0",
                      borderTopColor: "#1a6fc4",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 8,
                  }}
                >
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubject(s)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: `2px solid ${selectedSubject?.id === s.id ? "#1a6fc4" : "#e8eaf0"}`,
                        background:
                          selectedSubject?.id === s.id ? "#e8f4ff" : "#f7f9fc",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{s.icon || "📚"}</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: selectedSubject?.id === s.id ? 700 : 500,
                          color:
                            selectedSubject?.id === s.id
                              ? "#1a6fc4"
                              : "#1a1a2e",
                          lineHeight: 1.3,
                        }}
                      >
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quizzes panel */}
        <AnimatePresence>
          {selectedSubject && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#fff",
                borderRadius: 20,
                border: "1px solid #e8eaf0",
                padding: 20,
              }}
            >
              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: "1px solid #e8eaf0",
                  overflowX: "auto",
                }}
              >
                {QUIZ_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedTab(tab.id);
                      setSelectedStrand(null);
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      border: "none",
                      background:
                        selectedTab === tab.id ? "#1a6fc4" : "#f0f2f7",
                      color: selectedTab === tab.id ? "#fff" : "#6b7280",
                      fontSize: 13,
                      fontWeight: selectedTab === tab.id ? 700 : 500,
                      transition: "all 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Strand chips — only show for strand quizzes or all */}
              {selectedTab !== "exam" && strands.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <button
                    onClick={() => setSelectedStrand(null)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `1px solid ${!selectedStrand ? "#bdd7f5" : "#e8eaf0"}`,
                      background: !selectedStrand ? "#e8f4ff" : "#f7f9fc",
                      color: !selectedStrand ? "#1a6fc4" : "#6b7280",
                      fontWeight: !selectedStrand ? 700 : 400,
                    }}
                  >
                    All strands
                  </button>
                  {strands.map((strand) => (
                    <button
                      key={strand.id}
                      onClick={() => setSelectedStrand(strand)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        border: `1px solid ${selectedStrand?.id === strand.id ? "#bdd7f5" : "#e8eaf0"}`,
                        background:
                          selectedStrand?.id === strand.id
                            ? "#e8f4ff"
                            : "#f7f9fc",
                        color:
                          selectedStrand?.id === strand.id
                            ? "#1a6fc4"
                            : "#6b7280",
                        fontWeight:
                          selectedStrand?.id === strand.id ? 700 : 400,
                      }}
                    >
                      {strand.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Quiz list */}
              {loadingQuizzes ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "32px 0",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      border: "3px solid #e8eaf0",
                      borderTopColor: "#1a6fc4",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <BookOpen
                    size={40}
                    color="#bcc3d0"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <p style={{ fontSize: 14, color: "#8892a4" }}>
                    No quizzes found
                  </p>
                  <p style={{ fontSize: 13, color: "#bcc3d0", marginTop: 4 }}>
                    Check back soon — more content is being added
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {filteredQuizzes.map((quiz) => {
                    const attempt = attempts[quiz.id];
                    const score = attempt ? Math.round(attempt.score) : null;
                    const isExam = quiz.quiz_type === "exam";
                    const scoreColor =
                      score >= 75
                        ? "#1d8f57"
                        : score >= 50
                          ? "#d4900a"
                          : "#c0334a";

                    return (
                      <button
                        key={quiz.id}
                        onClick={() => handleQuizClick(quiz)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 16,
                          border: "1.5px solid #e8eaf0",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "#bdd7f5")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#e8eaf0")
                        }
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#0d0d1a",
                              }}
                            >
                              {quiz.title}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 20,
                                background: isExam ? "#f0eeff" : "#e8f4ff",
                                color: isExam ? "#534ab7" : "#1a6fc4",
                                fontWeight: 600,
                              }}
                            >
                              {isExam ? "Integrated assessment" : "Strand quiz"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontSize: 12, color: "#8892a4" }}>
                              {quiz.total_questions || 0} questions ·{" "}
                              {quiz.duration_minutes || 30} mins
                            </span>
                            {score !== null && (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: scoreColor,
                                }}
                              >
                                Last: {score}%
                              </span>
                            )}
                          </div>
                          {score !== null && (
                            <div
                              style={{
                                height: 3,
                                background: "#f0f2f7",
                                borderRadius: 99,
                                marginTop: 8,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${score}%`,
                                  background: scoreColor,
                                  borderRadius: 99,
                                  transition: "width 0.6s ease",
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          size={18}
                          color="#bcc3d0"
                          style={{ flexShrink: 0 }}
                        />
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
