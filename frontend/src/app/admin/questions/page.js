"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/ui/Toast";
import {
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  FileDown,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Filter,
  Hash,
  BarChart3,
  Loader2,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";
const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const DIFFICULTIES = ["easy", "medium", "hard"];
const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "fill_blank", label: "Fill in Blank" },
  { value: "math", label: "Math" },
  { value: "structured", label: "Structured" },
  { value: "essay", label: "Essay" },
  { value: "table", label: "Table" },
  { value: "multipart", label: "Multipart" },
];
const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};
const TYPE_COLORS = {
  mcq: "bg-blue-100 text-blue-700",
  fill_blank: "bg-purple-100 text-purple-700",
  math: "bg-indigo-100 text-indigo-700",
  structured: "bg-teal-100 text-teal-700",
  essay: "bg-pink-100 text-pink-700",
  table: "bg-orange-100 text-orange-700",
};
const GRADE_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-fuchsia-500 to-fuchsia-600",
  "from-lime-500 to-lime-600",
  "from-orange-500 to-orange-600",
];

function makeDefaultTable(rows = 2, cols = 5) {
  return {
    table_type: "fill_in",
    rows: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ v: "", e: false, a: "" }))
    ),
    marking: "ai",
  };
}

function pairsToRows(headers, pairs) {
  return [
    [{ v: headers[0], e: false, a: "" }, { v: headers[1], e: false, a: "" }],
    ...pairs.map((p) => [
      { v: p.key, e: false, a: "" },
      { v: "", e: true, a: p.value },
    ]),
  ];
}

function TableBuilder({ value, onChange }) {
  const tableType = value?.table_type || "fill_in";
  const marking   = value?.marking || "ai";

  // ── Fill-in / Static grid state ──
  const rows    = value?.rows || makeDefaultTable().rows;
  const numRows = rows.length;
  const numCols = rows[0]?.length || 5;

  // ── Matching state ──
  const matchHeaders = value?.match_headers || ["Column A", "Column B"];
  const matchPairs   = value?.match_pairs   || [{ key: "", value: "" }];

  const emit = (updates) => {
    const next = { ...value, ...updates };
    if (next.table_type === "matching") {
      next.rows = pairsToRows(
        next.match_headers || matchHeaders,
        next.match_pairs   || matchPairs
      );
    }
    onChange(next);
  };

  const updateCell = (r, c, field, val) => {
    const next = rows.map((row, ri) =>
      row.map((cell, ci) => ri === r && ci === c ? { ...cell, [field]: val } : cell)
    );
    emit({ rows: next });
  };

  const resize = (newR, newC) => {
    const next = Array.from({ length: newR }, (_, r) =>
      Array.from({ length: newC }, (_, c) => rows[r]?.[c] || { v: "", e: false, a: "" })
    );
    emit({ rows: next });
  };

  const updatePair = (i, field, val) =>
    emit({ match_pairs: matchPairs.map((p, pi) => pi === i ? { ...p, [field]: val } : p) });

  return (
    <div className="space-y-3">

      {/* ── Type + Marking controls ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Mode</label>
          <select
            value={tableType}
            onChange={(e) => emit({ table_type: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm font-medium"
          >
            <option value="static">Static (display only)</option>
            <option value="fill_in">Fill-in (students type)</option>
            <option value="matching">Matching (drag &amp; drop)</option>
          </select>
        </div>
        {tableType !== "static" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Marking</label>
            <select
              value={marking}
              onChange={(e) => emit({ marking: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="ai">AI (Recommended)</option>
              <option value="case_insensitive">Case Insensitive</option>
              <option value="exact">Exact Match</option>
            </select>
          </div>
        )}
        {tableType !== "matching" && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Rows</label>
              <input type="number" min={1} max={20} value={numRows}
                onChange={(e) => resize(Math.max(1, +e.target.value), numCols)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Columns</label>
              <input type="number" min={1} max={10} value={numCols}
                onChange={(e) => resize(numRows, Math.max(1, +e.target.value))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" />
            </div>
          </>
        )}
      </div>

      {/* ── Matching pairs editor ── */}
      {tableType === "matching" && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded font-semibold"
              placeholder="Column A header (e.g. Device)"
              value={matchHeaders[0]}
              onChange={(e) => emit({ match_headers: [e.target.value, matchHeaders[1]] })}
            />
            <span className="text-gray-400 font-bold">→</span>
            <input
              className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded font-semibold"
              placeholder="Column B header (e.g. Use)"
              value={matchHeaders[1]}
              onChange={(e) => emit({ match_headers: [matchHeaders[0], e.target.value] })}
            />
            <div className="w-7" />
          </div>
          {/* Pairs */}
          {matchPairs.map((pair, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded"
                placeholder={`Item ${i + 1} (Column A)`}
                value={pair.key}
                onChange={(e) => updatePair(i, "key", e.target.value)}
              />
              <span className="text-gray-400">→</span>
              <input
                className={`flex-1 text-sm px-2 py-1.5 rounded border ${pair.value ? "border-blue-300" : "border-red-400 bg-red-50 placeholder:text-red-400"}`}
                placeholder={pair.value ? "Correct match" : "⚠ Required!"}
                value={pair.value}
                onChange={(e) => updatePair(i, "value", e.target.value)}
              />
              <button
                type="button"
                onClick={() => emit({ match_pairs: matchPairs.filter((_, pi) => pi !== i) })}
                className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:bg-red-50 text-sm font-bold"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => emit({ match_pairs: [...matchPairs, { key: "", value: "" }] })}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >+ Add pair</button>
          <p className="text-xs text-gray-400">Left column = items shown to student. Right column = correct match (shuffled into pool).</p>
        </div>
      )}

      {/* ── Grid editor (static / fill_in) ── */}
      {tableType !== "matching" && (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-full text-sm">
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}
                        className={`border border-gray-200 p-2 align-top min-w-[100px] ${cell.e ? "bg-blue-50" : "bg-gray-50"}`}
                      >
                        <input
                          className="w-full text-sm bg-transparent border-0 focus:outline-none font-medium"
                          placeholder="Value"
                          value={cell.v}
                          onChange={(e) => updateCell(r, c, "v", e.target.value)}
                        />
                        {tableType === "fill_in" && (
                          <>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="checkbox" checked={cell.e}
                                onChange={(e) => updateCell(r, c, "e", e.target.checked)}
                                className="w-3 h-3 accent-blue-600"
                              />
                              <span className="text-xs text-gray-500">Student fills</span>
                            </div>
                            {cell.e && (
                              <input
                                className={`mt-1 w-full text-xs rounded px-1.5 py-1 bg-white ${cell.a ? "border border-blue-300 placeholder:text-blue-300" : "border-2 border-red-400 placeholder:text-red-400 bg-red-50"}`}
                                placeholder={cell.a ? "Correct answer" : "⚠ Required!"}
                                value={cell.a}
                                onChange={(e) => updateCell(r, c, "a", e.target.value)}
                              />
                            )}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            {tableType === "fill_in"
              ? 'Check "Student fills" on cells where students enter answers. Set the correct answer for each editable cell.'
              : "Static table — students cannot edit any cell. Use this for reference tables."}
          </p>
        </>
      )}
    </div>
  );
}

function makeDefaultPart(index) {
  return {
    part_label: String.fromCharCode(97 + index),
    question_text: "",
    question_type: "structured",
    correct_answer: "",
    max_marks: 1,
    explanation: "",
  };
}

function PartsBuilder({ parts, onChange }) {
  const addPart = () => onChange([...parts, makeDefaultPart(parts.length)]);
  const removePart = (i) => onChange(parts.filter((_, idx) => idx !== i));
  const updatePart = (i, field, val) =>
    onChange(parts.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Sub-questions ({parts.length} parts · {parts.reduce((s, p) => s + Number(p.max_marks || 1), 0)} marks total)
        </p>
        <button
          type="button"
          onClick={addPart}
          className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium"
        >
          + Add Part
        </button>
      </div>
      {parts.map((part, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-indigo-700 w-6">({part.part_label})</span>
            <input
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5"
              placeholder="Part question text"
              value={part.question_text}
              onChange={(e) => updatePart(i, "question_text", e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center"
              title="Marks"
              value={part.max_marks}
              onChange={(e) => updatePart(i, "max_marks", e.target.value)}
            />
            <span className="text-xs text-gray-400">mk</span>
            <button type="button" onClick={() => removePart(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
          <textarea
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            placeholder="Correct answer for this part"
            value={part.correct_answer}
            onChange={(e) => updatePart(i, "correct_answer", e.target.value)}
          />
          <input
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500"
            placeholder="Explanation (optional)"
            value={part.explanation}
            onChange={(e) => updatePart(i, "explanation", e.target.value)}
          />
        </div>
      ))}
      {parts.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">No parts yet. Click &quot;Add Part&quot; to begin.</p>
      )}
    </div>
  );
}

export default function QuestionManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedGrades, setExpandedGrades] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAnswers, setShowAnswers] = useState({});

  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    difficulty: "",
    type: "",
    search: "",
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
    substrand: "",
    grade: "",
    question_text: "",
    question_type: "mcq",
    math_format: "open",  // "open" | "mcq" — only used when question_type === "math"
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
    table_data: null,
    parts: [],
  });

  const [filteredTopics, setFilteredTopics] = useState([]);
  const [editFilteredTopics, setEditFilteredTopics] = useState([]);
  const [filteredSubstrands, setFilteredSubstrands] = useState([]);
  const [editFilteredSubstrands, setEditFilteredSubstrands] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [createImageFile, setCreateImageFile] = useState(null);
  const [createImagePreview, setCreateImagePreview] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImageDeleted, setEditImageDeleted] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    const loadMeta = async () => {
      try {
        const [subRes, topRes] = await Promise.all([
          fetchWithAuth(`${API}/subjects/`),
          fetchWithAuth(`${API}/topics/`),
        ]);
        if (subRes.ok) {
          const data = await subRes.json();
          setSubjects(Array.isArray(data) ? data : data.results || []);
        }
        if (topRes.ok) {
          const data = await topRes.json();
          setTopics(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    };
    loadMeta();
  }, [authLoading, user]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.type) params.append("type", filters.type);
    if (filters.search) params.append("search", filters.search);
    try {
      params.append("page_size", "9999");
      const res = await fetchWithAuth(
        `${API}/admin/questions/manage/?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setQuestions(list);
      setTotalCount(data.count || list.length);
    } catch (err) {
      console.error("Load questions failed:", err);
      setQuestions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadQuestions();
  }, [authLoading, user, loadQuestions]);

  useEffect(() => {
    if (formData.subject) {
      let filtered = topics.filter((t) => t.subject == formData.subject);
      if (formData.grade) filtered = filtered.filter((t) => t.grade == formData.grade);
      setFilteredTopics(filtered);
      // clear topic if it no longer belongs to the new grade/subject
      if (formData.topic && !filtered.find((t) => t.id == formData.topic)) {
        setFormData((prev) => ({ ...prev, topic: "" }));
      }
    } else {
      setFilteredTopics([]);
    }
  }, [formData.subject, formData.grade, topics]);

  useEffect(() => {
    if (editingQuestion && editingQuestion.subject) {
      let filtered = topics.filter((t) => t.subject == editingQuestion.subject);
      if (editingQuestion.grade) filtered = filtered.filter((t) => t.grade == editingQuestion.grade);
      setEditFilteredTopics(filtered);
    }
  }, [editingQuestion, topics]);

  // Load substrands for create form when topic changes
  useEffect(() => {
    if (!formData.topic) { setFilteredSubstrands([]); return; }
    fetchWithAuth(`${API}/substrands/?topic=${formData.topic}`)
      .then((r) => r.json())
      .then((d) => setFilteredSubstrands(Array.isArray(d) ? d : d.results || []))
      .catch(() => setFilteredSubstrands([]));
    // Clear substrand when topic changes
    setFormData((prev) => ({ ...prev, substrand: "" }));
  }, [formData.topic]);

  // Load substrands for edit form when topic changes
  useEffect(() => {
    const topicId = editingQuestion?.topic;
    if (!topicId) { setEditFilteredSubstrands([]); return; }
    fetchWithAuth(`${API}/substrands/?topic=${topicId}`)
      .then((r) => r.json())
      .then((d) => setEditFilteredSubstrands(Array.isArray(d) ? d : d.results || []))
      .catch(() => setEditFilteredSubstrands([]));
  }, [editingQuestion?.topic]);

  const groupedQuestions = useMemo(() => {
    const grouped = {};
    questions.forEach((q) => {
      const grade = q.grade || "Unknown";
      const subject = q.subject_name || "Uncategorized";
      if (!grouped[grade]) grouped[grade] = {};
      if (!grouped[grade][subject]) grouped[grade][subject] = [];
      grouped[grade][subject].push(q);
    });
    return grouped;
  }, [questions]);

  const stats = useMemo(() => {
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    questions.forEach((q) => {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    });
    return { byDifficulty };
  }, [questions]);

  const toggleGrade = (grade) =>
    setExpandedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }));
  const toggleSubject = (key) =>
    setExpandedSubjects((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAnswer = (id) =>
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (questions.length > 0) {
      setExpandedGrades((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const grades = {};
        Object.keys(groupedQuestions).forEach((g) => {
          grades[g] = true;
        });
        return grades;
      });
    }
  }, [questions, groupedQuestions]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      topic: "",
      substrand: "",
      grade: "",
      question_text: "",
      question_type: "mcq",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "",
      explanation: "",
      difficulty: "medium",
      table_data: null,
      parts: [],
    });
    setFilteredSubstrands([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "question_type") {
      setFormData((prev) => ({
        ...prev,
        question_type: value,
        math_format: "open",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "",
        table_data: value === "table" ? makeDefaultTable() : null,
      }));
    } else if (name === "math_format") {
      setFormData((prev) => ({
        ...prev,
        math_format: value,
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "",
        table_data: value === "table" ? makeDefaultTable() : null,
        parts: value === "multipart"
          ? (prev.parts?.length > 0 ? prev.parts : [makeDefaultPart(0)])
          : [],
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === "question_type") {
      setEditingQuestion((prev) => ({
        ...prev,
        question_type: value,
        math_format: "open",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "",
        table_data: value === "table" ? (prev.table_data || makeDefaultTable()) : prev.table_data,
      }));
    } else if (name === "math_format") {
      setEditingQuestion((prev) => ({
        ...prev,
        math_format: value,
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "",
        table_data: value === "table" ? (prev.table_data || makeDefaultTable()) : null,
        parts: value === "multipart"
          ? (prev.parts?.length > 0 ? prev.parts : [makeDefaultPart(0)])
          : [],
      }));
    } else {
      setEditingQuestion({ ...editingQuestion, [name]: value });
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const fd = new FormData();
    if (formData.topic) fd.append("topic", parseInt(formData.topic));
    if (formData.substrand) fd.append("substrand", parseInt(formData.substrand));
    fd.append("question_text", formData.question_text.trim());
    fd.append("question_type", formData.question_type || "mcq");
    const isMcqStyle = formData.question_type === "mcq" ||
      (formData.question_type === "math" && formData.math_format === "mcq");
    const isTableStyle = formData.question_type === "table" ||
      (formData.question_type === "math" && formData.math_format === "table");
    const isMultipartStyle = formData.question_type === "multipart" ||
      (formData.question_type === "math" && formData.math_format === "multipart");
    if (isMcqStyle) {
      fd.append("option_a", formData.option_a.trim());
      fd.append("option_b", formData.option_b.trim());
      fd.append("option_c", formData.option_c.trim());
      fd.append("option_d", formData.option_d.trim());
      fd.append("correct_answer", formData.correct_answer ? formData.correct_answer.toUpperCase() : "");
    } else if (!isTableStyle && !isMultipartStyle) {
      fd.append("correct_answer", formData.correct_answer || "");
    }
    if (isTableStyle && formData.table_data) {
      fd.append("table_data", JSON.stringify(formData.table_data));
    }
    fd.append(
      "explanation",
      formData.explanation ? formData.explanation.trim() : "",
    );
    fd.append("max_marks", parseInt(formData.max_marks) || 1);
    fd.append("difficulty", formData.difficulty || "medium");
    if (createImageFile) fd.append("question_image", createImageFile);
    if (isMultipartStyle && formData.parts?.length > 0) {
      fd.append("parts", JSON.stringify(formData.parts));
    }
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/create/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Question created successfully!");
        setShowCreateModal(false);
        resetForm();
        setCreateImageFile(null);
        setCreateImagePreview(null);
        loadQuestions();
      } else {
        showToast(
          data.topic?.[0] || data.detail || JSON.stringify(data),
          "error",
        );
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    }
    setActionLoading(false);
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append("topic", editingQuestion.topic);
      if (editingQuestion.substrand) fd.append("substrand", editingQuestion.substrand);
      else fd.append("substrand", "");
      fd.append("question_text", editingQuestion.question_text);
      fd.append("question_type", editingQuestion.question_type || "mcq");
      const isMcqStyleEdit = editingQuestion.question_type === "mcq" ||
        (editingQuestion.question_type === "math" && editingQuestion.math_format === "mcq");
      const isTableStyleEdit = editingQuestion.question_type === "table" ||
        (editingQuestion.question_type === "math" && editingQuestion.math_format === "table");
      const isMultipartStyleEdit = editingQuestion.question_type === "multipart" ||
        (editingQuestion.question_type === "math" && editingQuestion.math_format === "multipart");
      if (isMcqStyleEdit) {
        fd.append("option_a", editingQuestion.option_a || "");
        fd.append("option_b", editingQuestion.option_b || "");
        fd.append("option_c", editingQuestion.option_c || "");
        fd.append("option_d", editingQuestion.option_d || "");
        fd.append("correct_answer", editingQuestion.correct_answer || "");
      } else if (!isTableStyleEdit && !isMultipartStyleEdit) {
        fd.append("correct_answer", editingQuestion.correct_answer || "");
      }
      if (isTableStyleEdit && editingQuestion.table_data) {
        fd.append("table_data", JSON.stringify(editingQuestion.table_data));
      }
      fd.append("max_marks", parseInt(editingQuestion.max_marks) || 1);
      fd.append("explanation", editingQuestion.explanation || "");
      fd.append("difficulty", editingQuestion.difficulty || "medium");
      if (editImageFile) {
        fd.append("question_image", editImageFile);
      } else if (editImageDeleted) {
        fd.append("delete_image", "true");
      }
      if (isMultipartStyleEdit && editingQuestion.parts?.length > 0) {
        fd.append("parts", JSON.stringify(editingQuestion.parts));
      }
      const res = await fetchWithAuth(
        `${API}/admin/questions/${editingQuestion.id}/`,
        {
          method: "PUT",
          body: fd,
        },
      );
      if (res.ok) {
        showToast("Question updated successfully!");
        setShowEditModal(false);
        setEditingQuestion(null);
        setEditImageFile(null);
        setEditImagePreview(null);
        setEditImageDeleted(false);
        loadQuestions();
      } else {
        const data = await res.json();
        showToast(data.detail || JSON.stringify(data), "error");
      }
    } catch (err) {
      showToast("Error updating question", "error");
    }
    setActionLoading(false);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (
      !confirm(
        "Are you sure you want to delete this question? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/${questionId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Question deleted!");
        loadQuestions();
      } else {
        showToast("Error deleting question", "error");
      }
    } catch (err) {
      showToast("Error deleting question", "error");
    }
  };

  const openEditModal = async (q) => {
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/${q.id}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fullQ = await res.json();
      setEditingQuestion({
        ...fullQ,
        math_format: fullQ.question_type === "math"
          ? (fullQ.option_a ? "mcq"
            : fullQ.table_data ? "table"
            : fullQ.parts?.length > 0 ? "multipart"
            : "open")
          : "open",
      });
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditImageDeleted(false);
      setShowEditModal(true);
    } catch (err) {
      showToast("Could not load question details", "error");
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      showToast("Please select a CSV file", "error");
      return;
    }
    setActionLoading(true);
    const fd = new FormData();
    fd.append("file", csvFile);
    try {
      const res = await fetchWithAuth(`${API}/admin/questions/bulk-import/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Questions imported!");
        setShowBulkImport(false);
        setCsvFile(null);
        loadQuestions();
      } else {
        showToast(data.error || "Import failed", "error");
      }
    } catch (err) {
      showToast("Error importing questions", "error");
    }
    setActionLoading(false);
  };

  const downloadTemplate = () => {
    const csv =
      "subject_name,topic_name,grade,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty\nMathematics,Numbers,8,What is 2+2?,2,3,4,5,C,Addition is combining numbers,easy";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const sortedGrades = Object.keys(groupedQuestions).sort((a, b) => a - b);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Question Bank
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {totalCount} question{totalCount !== 1 ? "s" : ""} total
                  {filters.subject || filters.grade || filters.search
                    ? " (filtered)"
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Question
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox
              icon={<Hash className="w-5 h-5 text-emerald-600" />}
              bg="bg-emerald-100"
              value={totalCount}
              label="Total Questions"
            />
            <StatBox
              icon={<BarChart3 className="w-5 h-5 text-green-600" />}
              bg="bg-green-100"
              value={stats.byDifficulty.easy}
              label="Easy"
            />
            <StatBox
              icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
              bg="bg-amber-100"
              value={stats.byDifficulty.medium}
              label="Medium"
            />
            <StatBox
              icon={<BarChart3 className="w-5 h-5 text-red-600" />}
              bg="bg-red-100"
              value={stats.byDifficulty.hard}
              label="Hard"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-white rounded-xl border p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search questions..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filters.subject}
                      onChange={(e) =>
                        setFilters({ ...filters, subject: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Learning Areas</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.grade}
                      onChange={(e) =>
                        setFilters({ ...filters, grade: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Grades</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.difficulty}
                      onChange={(e) =>
                        setFilters({ ...filters, difficulty: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Difficulties</option>
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters({ ...filters, type: e.target.value })
                      }
                      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(filters.subject ||
                    filters.grade ||
                    filters.difficulty ||
                    filters.type ||
                    filters.search) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">Active:</span>
                      {filters.search && (
                        <FilterTag
                          label={`"${filters.search}"`}
                          color="bg-gray-100 text-gray-700"
                          onRemove={() =>
                            setFilters({ ...filters, search: "" })
                          }
                        />
                      )}
                      {filters.subject && (
                        <FilterTag
                          label={
                            subjects.find((s) => s.id == filters.subject)
                              ?.name || "Subject"
                          }
                          color="bg-blue-100 text-blue-700"
                          onRemove={() =>
                            setFilters({ ...filters, subject: "" })
                          }
                        />
                      )}
                      {filters.grade && (
                        <FilterTag
                          label={`Grade ${filters.grade}`}
                          color="bg-emerald-100 text-emerald-700"
                          onRemove={() => setFilters({ ...filters, grade: "" })}
                        />
                      )}
                      {filters.difficulty && (
                        <FilterTag
                          label={filters.difficulty}
                          color="bg-amber-100 text-amber-700"
                          onRemove={() =>
                            setFilters({ ...filters, difficulty: "" })
                          }
                        />
                      )}
                      {filters.type && (
                        <FilterTag
                          label={
                            QUESTION_TYPES.find((t) => t.value === filters.type)
                              ?.label || filters.type
                          }
                          color="bg-purple-100 text-purple-700"
                          onRemove={() => setFilters({ ...filters, type: "" })}
                        />
                      )}
                      <button
                        onClick={() =>
                          setFilters({
                            subject: "",
                            grade: "",
                            difficulty: "",
                            type: "",
                            search: "",
                          })
                        }
                        className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-6 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-24 h-8 bg-gray-200 rounded-lg" />
                    <div className="w-16 h-6 bg-gray-100 rounded" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-20 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white rounded-xl border text-center py-16 px-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No questions found
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {filters.subject || filters.grade || filters.search
                  ? "No questions match your current filters. Try adjusting your search criteria."
                  : "Start building your question bank by creating questions or importing from a CSV file."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {(filters.subject || filters.grade || filters.search) && (
                  <button
                    onClick={() =>
                      setFilters({
                        subject: "",
                        grade: "",
                        difficulty: "",
                        type: "",
                        search: "",
                      })
                    }
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Question
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGrades.map((grade, gi) => {
                const subjectsInGrade = groupedQuestions[grade];
                const gradeTotal = Object.values(subjectsInGrade).reduce(
                  (sum, qs) => sum + qs.length,
                  0,
                );
                const sortedSubjectNames = Object.keys(subjectsInGrade).sort();
                const isGradeExpanded = expandedGrades[grade] !== false;
                const colorClass = GRADE_COLORS[gi % GRADE_COLORS.length];
                return (
                  <div
                    key={grade}
                    className="bg-white rounded-xl border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGrade(grade)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`bg-linear-to-r ${colorClass} text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm`}
                        >
                          Grade {grade}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 font-medium">
                            {gradeTotal} question{gradeTotal !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-gray-400">&bull;</span>
                          <span className="text-sm text-gray-400">
                            {sortedSubjectNames.length} learning area
                            {sortedSubjectNames.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {isGradeExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isGradeExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t">
                            {sortedSubjectNames.map((subjectName) => {
                              const subjectQuestions =
                                subjectsInGrade[subjectName];
                              const subKey = `${grade}-${subjectName}`;
                              const isSubExpanded =
                                expandedSubjects[subKey] !== false;
                              const byStrand = {};
                              subjectQuestions.forEach((q) => {
                                const strand = q.topic_name || "General";
                                if (!byStrand[strand]) byStrand[strand] = [];
                                byStrand[strand].push(q);
                              });
                              return (
                                <div
                                  key={subjectName}
                                  className="border-b last:border-b-0"
                                >
                                  <button
                                    onClick={() => toggleSubject(subKey)}
                                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors bg-gray-50/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <BookOpen className="w-4 h-4 text-blue-500" />
                                      <span className="font-semibold text-gray-800 text-sm">
                                        {subjectName}
                                      </span>
                                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                        {subjectQuestions.length} question
                                        {subjectQuestions.length !== 1
                                          ? "s"
                                          : ""}
                                      </span>
                                      {Object.keys(byStrand).length > 1 && (
                                        <span className="text-xs text-gray-400">
                                          {Object.keys(byStrand).length} strands
                                        </span>
                                      )}
                                    </div>
                                    {isSubExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>
                                  <AnimatePresence>
                                    {isSubExpanded && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        {Object.keys(byStrand)
                                          .sort()
                                          .map((strandName) => (
                                            <div key={strandName}>
                                              {Object.keys(byStrand).length >
                                                1 && (
                                                <div className="px-8 py-2 bg-gray-50 border-t">
                                                  <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                                                    {strandName}
                                                  </span>
                                                  <span className="text-xs text-gray-400 ml-2">
                                                    (
                                                    {
                                                      byStrand[strandName]
                                                        .length
                                                    }
                                                    )
                                                  </span>
                                                </div>
                                              )}
                                              <div className="divide-y divide-gray-100">
                                                {byStrand[strandName].map(
                                                  (q, qi) => (
                                                    <QuestionCard
                                                      key={q.id}
                                                      question={q}
                                                      index={qi}
                                                      showAnswer={
                                                        showAnswers[q.id]
                                                      }
                                                      onToggleAnswer={() =>
                                                        toggleAnswer(q.id)
                                                      }
                                                      onEdit={() =>
                                                        openEditModal(q)
                                                      }
                                                      onDelete={() =>
                                                        handleDeleteQuestion(
                                                          q.id,
                                                        )
                                                      }
                                                    />
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <ModalOverlay onClose={() => setShowCreateModal(false)}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Create New Question
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Learning Area"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    options={subjects.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="Select Learning Area"
                  />
                  <SelectField
                    label="Strand"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    required
                    disabled={!formData.subject}
                    options={filteredTopics.map((t) => ({
                      value: t.id,
                      label: `${t.name} — Grade ${t.grade}`,
                    }))}
                    placeholder="Select Strand"
                  />
                </div>
                {/* Substrand — optional, loads after strand is picked */}
                {filteredSubstrands.length > 0 && (
                  <SelectField
                    label="Substrand (optional)"
                    name="substrand"
                    value={formData.substrand}
                    onChange={handleChange}
                    options={filteredSubstrands.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="— Select substrand —"
                  />
                )}
                <div className="grid grid-cols-3 gap-4">
                  <SelectField
                    label="Grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    options={GRADES.map((g) => ({
                      value: g,
                      label: `Grade ${g}`,
                    }))}
                    placeholder="Select Grade"
                  />
                  <SelectField
                    label="Difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    options={DIFFICULTIES.map((d) => ({
                      value: d,
                      label: d.charAt(0).toUpperCase() + d.slice(1),
                    }))}
                  />
                  <InputField
                    label="Max Marks"
                    name="max_marks"
                    type="number"
                    min={1}
                    value={formData.max_marks}
                    onChange={handleChange}
                    required
                    placeholder="Set max marks"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <SelectField
                    label="Type"
                    name="question_type"
                    value={formData.question_type}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.value === "multipart") {
                        setFormData((fd) => ({
                          ...fd,
                          parts: fd.parts?.length > 0 ? fd.parts : [makeDefaultPart(0)],
                        }));
                      }
                    }}
                    options={QUESTION_TYPES}
                  />
                </div>
                {/* Math answer-format picker — shown before question text so teacher picks format first */}
                {formData.question_type === "math" && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Answer Format</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        ["open",      "Open Answer"],
                        ["mcq",       "Multiple Choice"],
                        ["table",     "Table"],
                        ["multipart", "Multipart"],
                      ].map(([val, lbl]) => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-indigo-800">
                          <input
                            type="radio"
                            name="math_format"
                            value={val}
                            checked={formData.math_format === val}
                            onChange={handleChange}
                          />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question text — stem + parts for multipart, plain for everything else */}
                {(formData.question_type === "multipart" ||
                  (formData.question_type === "math" && formData.math_format === "multipart")) ? (
                  <div className="space-y-4">
                    <TextField
                      label="Question Stem (intro text / reading passage)"
                      name="question_text"
                      value={formData.question_text}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Read the poem below then answer the questions that follow..."
                    />
                    <PartsBuilder
                      parts={formData.parts || []}
                      onChange={(p) => setFormData((prev) => ({ ...prev, parts: p }))}
                    />
                  </div>
                ) : (
                  <TextField
                    label="Question"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleChange}
                    required
                    rows={3}
                    placeholder="Enter the question..."
                  />
                )}

                {/* MCQ options */}
                {(formData.question_type === "mcq" ||
                  (formData.question_type === "math" && formData.math_format === "mcq")) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Option A" name="option_a" value={formData.option_a} onChange={handleChange} required />
                      <InputField label="Option B" name="option_b" value={formData.option_b} onChange={handleChange} required />
                      <InputField label="Option C" name="option_c" value={formData.option_c} onChange={handleChange} required />
                      <InputField label="Option D" name="option_d" value={formData.option_d} onChange={handleChange} required />
                    </div>
                    <SelectField
                      label="Correct Answer"
                      name="correct_answer"
                      value={formData.correct_answer}
                      onChange={handleChange}
                      required
                      options={["A", "B", "C", "D"].map((v) => ({ value: v, label: v }))}
                      placeholder="Select"
                    />
                  </>
                )}

                {/* Open math / fill_blank correct answer */}
                {(formData.question_type === "fill_blank" ||
                  (formData.question_type === "math" && formData.math_format === "open")) && (
                  <InputField
                    label="Correct Answer"
                    name="correct_answer"
                    value={formData.correct_answer}
                    onChange={handleChange}
                    required
                    placeholder={formData.question_type === "math" ? "e.g. \\frac{1}{4} or 0.25" : "Enter the correct answer"}
                  />
                )}

                {/* Table builder */}
                {(formData.question_type === "table" ||
                  (formData.question_type === "math" && formData.math_format === "table")) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Table Builder</label>
                    <TableBuilder
                      value={formData.table_data || makeDefaultTable()}
                      onChange={(td) => setFormData((prev) => ({ ...prev, table_data: td }))}
                    />
                  </div>
                )}
                <TextField
                  label={
                    formData.question_type === "structured" ||
                    formData.question_type === "essay"
                      ? "Model Answer / Marking Scheme"
                      : "Explanation (Optional)"
                  }
                  name="explanation"
                  value={formData.explanation}
                  onChange={handleChange}
                  rows={
                    formData.question_type === "structured" ||
                    formData.question_type === "essay"
                      ? 4
                      : 2
                  }
                  placeholder={
                    formData.question_type === "structured" ||
                    formData.question_type === "essay"
                      ? "Write the expected answer or marking scheme..."
                      : "Why is this the correct answer?"
                  }
                />
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Image (Optional)
                  </label>
                  {createImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={createImagePreview}
                        alt="Preview"
                        className="max-h-32 rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCreateImageFile(null);
                          setCreateImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Click to upload diagram / image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setCreateImageFile(f);
                          const r = new FileReader();
                          r.onload = (ev) =>
                            setCreateImagePreview(ev.target.result);
                          r.readAsDataURL(f);
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Create Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                      setCreateImageFile(null);
                      setCreateImagePreview(null);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {showEditModal && editingQuestion && (
            <ModalOverlay
              onClose={() => {
                setShowEditModal(false);
                setEditingQuestion(null);
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Question
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingQuestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Learning Area"
                    name="subject"
                    value={editingQuestion.subject}
                    onChange={handleEditChange}
                    required
                    options={subjects.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="Select Learning Area"
                  />
                  <SelectField
                    label="Strand"
                    name="topic"
                    value={editingQuestion.topic}
                    onChange={handleEditChange}
                    required
                    options={editFilteredTopics.map((t) => ({
                      value: t.id,
                      label: `${t.name} — Grade ${t.grade}`,
                    }))}
                    placeholder="Select Strand"
                  />
                </div>
                {/* Substrand — optional, loads after strand is picked */}
                {editFilteredSubstrands.length > 0 && (
                  <SelectField
                    label="Substrand (optional)"
                    name="substrand"
                    value={editingQuestion.substrand || ""}
                    onChange={handleEditChange}
                    options={editFilteredSubstrands.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="— Select substrand —"
                  />
                )}
                <div className="grid grid-cols-4 gap-4">
                  <SelectField
                    label="Grade"
                    name="grade"
                    value={editingQuestion.grade}
                    onChange={handleEditChange}
                    options={GRADES.map((g) => ({
                      value: g,
                      label: `Grade ${g}`,
                    }))}
                  />
                  <SelectField
                    label="Difficulty"
                    name="difficulty"
                    value={editingQuestion.difficulty}
                    onChange={handleEditChange}
                    options={DIFFICULTIES.map((d) => ({
                      value: d,
                      label: d.charAt(0).toUpperCase() + d.slice(1),
                    }))}
                  />
                  <SelectField
                    label="Type"
                    name="question_type"
                    value={editingQuestion.question_type || "mcq"}
                    onChange={(e) => {
                      handleEditChange(e);
                      if (e.target.value === "multipart" && !editingQuestion.parts?.length) {
                        setEditingQuestion((eq) => ({
                          ...eq,
                          parts: [makeDefaultPart(0)],
                        }));
                      }
                    }}
                    options={QUESTION_TYPES}
                  />
                  <InputField
                    label="Max Marks"
                    name="max_marks"
                    type="number"
                    min={1}
                    value={editingQuestion.max_marks || 1}
                    onChange={handleEditChange}
                    required
                    placeholder="Set max marks"
                  />
                </div>
                {/* Math answer-format picker */}
                {editingQuestion.question_type === "math" && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Answer Format</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        ["open",      "Open Answer"],
                        ["mcq",       "Multiple Choice"],
                        ["table",     "Table"],
                        ["multipart", "Multipart"],
                      ].map(([val, lbl]) => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-indigo-800">
                          <input
                            type="radio"
                            name="math_format"
                            value={val}
                            checked={(editingQuestion.math_format || "open") === val}
                            onChange={handleEditChange}
                          />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question text */}
                {(editingQuestion.question_type === "multipart" ||
                  (editingQuestion.question_type === "math" && (editingQuestion.math_format || "open") === "multipart")) ? (
                  <div className="space-y-4">
                    <TextField
                      label="Question Stem (intro text / reading passage)"
                      name="question_text"
                      value={editingQuestion.question_text}
                      onChange={handleEditChange}
                      rows={3}
                    />
                    <PartsBuilder
                      parts={editingQuestion.parts || []}
                      onChange={(p) => setEditingQuestion((prev) => ({ ...prev, parts: p }))}
                    />
                  </div>
                ) : (
                  <TextField
                    label="Question"
                    name="question_text"
                    value={editingQuestion.question_text}
                    onChange={handleEditChange}
                    required
                    rows={3}
                  />
                )}

                {/* MCQ options */}
                {(editingQuestion.question_type === "mcq" ||
                  (editingQuestion.question_type === "math" && (editingQuestion.math_format || "open") === "mcq")) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Option A" name="option_a" value={editingQuestion.option_a || ""} onChange={handleEditChange} required />
                      <InputField label="Option B" name="option_b" value={editingQuestion.option_b || ""} onChange={handleEditChange} required />
                      <InputField label="Option C" name="option_c" value={editingQuestion.option_c || ""} onChange={handleEditChange} required />
                      <InputField label="Option D" name="option_d" value={editingQuestion.option_d || ""} onChange={handleEditChange} required />
                    </div>
                    <SelectField
                      label="Correct Answer"
                      name="correct_answer"
                      value={editingQuestion.correct_answer || ""}
                      onChange={handleEditChange}
                      required
                      options={["A", "B", "C", "D"].map((v) => ({ value: v, label: v }))}
                      placeholder="Select"
                    />
                  </>
                )}

                {/* Open math / fill_blank correct answer */}
                {(editingQuestion.question_type === "fill_blank" ||
                  (editingQuestion.question_type === "math" && (editingQuestion.math_format || "open") === "open")) && (
                  <InputField
                    label="Correct Answer"
                    name="correct_answer"
                    value={editingQuestion.correct_answer || ""}
                    onChange={handleEditChange}
                    required
                    placeholder={editingQuestion.question_type === "math" ? "e.g. \\frac{1}{4} or 0.25" : "Enter the correct answer"}
                  />
                )}

                {/* Table builder */}
                {(editingQuestion.question_type === "table" ||
                  (editingQuestion.question_type === "math" && (editingQuestion.math_format || "open") === "table")) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Table Builder</label>
                    <TableBuilder
                      value={editingQuestion.table_data || makeDefaultTable()}
                      onChange={(td) => setEditingQuestion((prev) => ({ ...prev, table_data: td }))}
                    />
                  </div>
                )}
                <TextField
                  label={
                    editingQuestion.question_type === "structured" ||
                    editingQuestion.question_type === "essay"
                      ? "Model Answer / Marking Scheme"
                      : "Explanation"
                  }
                  name="explanation"
                  value={editingQuestion.explanation || ""}
                  onChange={handleEditChange}
                  rows={
                    editingQuestion.question_type === "structured" ||
                    editingQuestion.question_type === "essay"
                      ? 4
                      : 2
                  }
                  placeholder={
                    editingQuestion.question_type === "structured" ||
                    editingQuestion.question_type === "essay"
                      ? "Write the expected answer or marking scheme..."
                      : "Why is this the correct answer?"
                  }
                />
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Image
                  </label>
                  {editImagePreview || editingQuestion.question_image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={
                          editImagePreview || editingQuestion.question_image_url
                        }
                        alt="Preview"
                        className="max-h-32 rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreview(null);
                          setEditImageDeleted(true);
                          setEditingQuestion({
                            ...editingQuestion,
                            question_image_url: null,
                          });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Click to upload / replace image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setEditImageFile(f);
                          const r = new FileReader();
                          r.onload = (ev) =>
                            setEditImagePreview(ev.target.result);
                          r.readAsDataURL(f);
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Update Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingQuestion(null);
                      setEditImageFile(null);
                      setEditImagePreview(null);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Bulk Import Modal */}
        <AnimatePresence>
          {showBulkImport && (
            <ModalOverlay onClose={() => setShowBulkImport(false)}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Bulk Import Questions
                </h2>
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 mb-3">
                  Upload a CSV file with your questions. Download the template
                  to see the required format.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50"
                >
                  <FileDown className="w-4 h-4" />
                  Download Template
                </button>
              </div>
              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    {csvFile && (
                      <p className="mt-2 text-sm text-emerald-600 font-medium">
                        {csvFile.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Import Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkImport(false);
                      setCsvFile(null);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function QuestionCard({
  question: q,
  index,
  showAnswer,
  onToggleAnswer,
  onEdit,
  onDelete,
}) {
  const typeLabel =
    QUESTION_TYPES.find((t) => t.value === q.question_type)?.label ||
    q.question_type ||
    "MCQ";
  return (
    <div className="px-6 py-4 hover:bg-gray-50/50 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {q.topic_name && (
              <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                {q.topic_name}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty] || "bg-gray-100 text-gray-600"}`}
            >
              {q.difficulty}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-600"}`}
            >
              {typeLabel}
            </span>
            {q.question_image_url && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-600">
                <ImageIcon className="w-3 h-3 inline mr-1" />
                Has Image
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 leading-relaxed">
            {q.question_text}
          </p>
          {q.question_image_url && (
            <div className="mt-2">
              <img
                src={q.question_image_url}
                alt="Question diagram"
                className="max-h-32 rounded-lg border object-contain"
              />
            </div>
          )}
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {["A", "B", "C", "D"].map((letter) => {
                  const optionText = q[`option_${letter.toLowerCase()}`];
                  if (!optionText) return null;
                  const isCorrect =
                    q.correct_answer &&
                    q.correct_answer.toUpperCase() === letter;
                  return (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isCorrect ? "bg-green-50 border border-green-200 text-green-800 font-medium" : "bg-gray-50 text-gray-700"}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
                      >
                        {letter}
                      </span>
                      <span className="truncate">{optionText}</span>
                      {isCorrect && (
                        <Check className="w-4 h-4 text-green-600 shrink-0 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleAnswer}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={showAnswer ? "Hide answer" : "Show answer"}
          >
            {showAnswer ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

function StatBox({ icon, bg, value, label }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterTag({ label, color, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${color}`}
    >
      {label}
      <button onClick={onRemove}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required,
  disabled,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputField({ label, name, value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  required,
  rows = 3,
  placeholder,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
      />
    </div>
  );
}
