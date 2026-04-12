/**
 * api.js — StadiSpace Teacher Portal
 * All fetch calls to the Django backend, centralized here.
 * Import in your components:  import api from "@/services/api";
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-76im.onrender.com/api";

function token() {
  return typeof window !== "undefined"
    ? localStorage.getItem("accessToken")
    : null;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
  };
}

async function request(method, path, body = null, requiresAuth = true) {
  const opts = {
    method,
    headers: requiresAuth
      ? authHeaders()
      : { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // ── LESSON PLANS ────────────────────────────────────────────

  /** List all lesson plans for the logged-in teacher */
  getLessonPlans: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request("GET", `/lessons/${params ? "?" + params : ""}`);
  },

  /**
   * Generate a lesson plan via AI.
   * @param {Object} formData - { grade, subject, term, week, lesson_number,
   *   topic, subtopic, duration, learner_level, prior_knowledge,
   *   resources, is_practical, practical_area }
   * @returns {{ id, plan, meta }}
   */
  generateLesson: (formData) => request("POST", "/lessons/generate/", formData),

  /** Get a single lesson plan */
  getLessonPlan: (id) => request("GET", `/lessons/${id}/`),

  /** Delete a lesson plan */
  deleteLessonPlan: (id) => request("DELETE", `/lessons/${id}/`),

  // ── CLASSROOMS ──────────────────────────────────────────────

  /** List teacher's classrooms */
  getClassrooms: () => request("GET", "/classrooms/"),

  /**
   * Create a new classroom with questions.
   * @param {Object} data - { name, subject, grade, time_per_question, questions: [...] }
   */
  createClassroom: (data) => request("POST", "/classrooms/", data),

  /** Get single classroom details */
  getClassroom: (id) => request("GET", `/classrooms/${id}/`),

  /** Delete a classroom */
  deleteClassroom: (id) => request("DELETE", `/classrooms/${id}/`),

  /** Start a quiz (sets status → live) */
  startClassroom: (id) => request("POST", `/classrooms/${id}/start/`),

  /** End a quiz (sets status → ended, triggers AI reports) */
  endClassroom: (id) => request("POST", `/classrooms/${id}/end/`),

  /** Advance to the next question */
  nextQuestion: (id) => request("POST", `/classrooms/${id}/next/`),

  /** Get live leaderboard */
  getLeaderboard: (classroomId) =>
    request("GET", `/classrooms/${classroomId}/leaderboard/`),

  /** Full class report with heatmap + AI insights */
  getClassroomReport: (id) => request("GET", `/classrooms/${id}/report/`),

  // ── STUDENT JOIN (no auth) ───────────────────────────────────

  /**
   * Student joins by code — returns classroom info + questions
   * @param {string} code - 6-char join code
   */
  joinClassroom: (code) =>
    request("GET", `/join/${code.toUpperCase()}/`, null, false),

  /**
   * Register student name in a classroom
   * @param {string} code
   * @param {string} studentName
   * @returns {{ session_id, student_name, classroom }}
   */
  registerStudent: (code, studentName) =>
    request(
      "POST",
      `/join/${code.toUpperCase()}/register/`,
      { student_name: studentName },
      false,
    ),

  // ── STUDENT ANSWERS (no auth) ────────────────────────────────

  /**
   * Submit an answer for a question
   * @param {number} sessionId
   * @param {{ question_id, answer_text, selected_index }} answerData
   * @returns {{ is_correct, points_awarded, ai_feedback, correct_index, total_score }}
   */
  submitAnswer: (sessionId, answerData) =>
    request("POST", `/sessions/${sessionId}/answer/`, answerData, false),

  /** Get student's full results */
  getSessionResults: (sessionId) =>
    request("GET", `/sessions/${sessionId}/results/`, null, false),

  // ── ANALYTICS ───────────────────────────────────────────────

  /** Teacher dashboard stats */
  getTeacherAnalytics: () => request("GET", "/analytics/teacher/"),
};

export default api;
