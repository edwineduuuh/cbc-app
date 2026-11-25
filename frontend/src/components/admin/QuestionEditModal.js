"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import FinancialStatementEditor from "@/components/FinancialStatementEditor";
import { StrandPicker } from "./kicd";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const formFrom = (d) => ({
  topic: d.topic ? String(d.topic) : "",
  substrand: d.substrand ? String(d.substrand) : "",
  question_text: d.question_text || "",
  question_type: d.question_type || "mcq",
  difficulty: d.difficulty || "easy",
  option_a: d.option_a || "",
  option_b: d.option_b || "",
  option_c: d.option_c || "",
  option_d: d.option_d || "",
  correct_answer: d.correct_answer || "",
  explanation: d.explanation || "",
  statement_subtype: d.statement_subtype || "",
  marking_scheme: d.marking_scheme || null,
});

/**
 * Edit one question in place (used by the quiz create + edit pages).
 * Includes its KICD strand and sub-strand, so questions can be filed
 * correctly from wherever they are being picked.
 */
export default function QuestionEditModal({ question, onClose, onSaved }) {
  const [full, setFull] = useState(question);
  const [form, setForm] = useState(() => formFrom(question));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/admin/questions/${question.id}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setFull(d); setForm(formFrom(d)); } })
      .catch(() => {});
  }, [question.id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isMcq = form.question_type === "mcq" || form.question_type === "math";

  const save = async () => {
    setSaving(true);
    setError("");
    const token = localStorage.getItem("accessToken");
    const body = {
      ...form,
      topic: form.topic ? Number(form.topic) : full.topic,
      substrand: form.substrand ? Number(form.substrand) : null,
    };
    try {
      const res = await fetch(`${API}/admin/questions/${question.id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.substrand || data.detail || Object.values(data).flat().join(" ") || "Couldn't save the question.");
        return;
      }
      onSaved(data);
    } catch {
      setError("Network error - try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Edit Question</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KICD strand and sub-strand {full.subject_name ? `· ${full.subject_name} Grade ${full.grade}` : ""}
            </label>
            <StrandPicker
              subject={full.subject}
              grade={full.grade}
              value={{ topic: form.topic, substrand: form.substrand }}
              onChange={(v) => set(v)}
              legacyName={full.topic_name}
              allowEmpty={false}
              subEmptyLabel="- Choose sub-strand -"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              selectCls={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <p className="text-xs text-gray-400 mb-1">
              Use <code>&lt;u&gt;word&lt;/u&gt;</code> to underline, <code>&lt;b&gt;</code> to bold, <code>$math$</code> for inline math
            </p>
            <textarea rows={3} className={inputCls} value={form.question_text} onChange={(e) => set({ question_text: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
              <select
                className={inputCls}
                value={form.question_type}
                onChange={(e) => {
                  const t = e.target.value;
                  const clear = t !== "mcq" && t !== "math";
                  set({ question_type: t, ...(clear && { option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "" }) });
                }}
              >
                <option value="mcq">MCQ</option>
                <option value="math">Math</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="structured">Structured</option>
                <option value="essay">Essay</option>
                <option value="financial_statement">Financial Statement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select className={inputCls} value={form.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          {isMcq && (
            <div className="grid grid-cols-2 gap-3">
              {["a", "b", "c", "d"].map((l) => (
                <div key={l}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Option {l.toUpperCase()}</label>
                  <input type="text" className={inputCls} value={form[`option_${l}`]} onChange={(e) => set({ [`option_${l}`]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          {isMcq ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select className={inputCls} value={form.correct_answer} onChange={(e) => set({ correct_answer: e.target.value })}>
                <option value="">Select…</option>
                {["A", "B", "C", "D"].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          ) : form.question_type === "fill_blank" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <input type="text" className={inputCls} value={form.correct_answer} onChange={(e) => set({ correct_answer: e.target.value })} />
            </div>
          ) : form.question_type === "financial_statement" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Type</label>
                <select className={inputCls} value={form.statement_subtype || ""} onChange={(e) => set({ statement_subtype: e.target.value, marking_scheme: null })}>
                  <option value="">Select statement type…</option>
                  <option value="balance_sheet">Balance Sheet</option>
                  <option value="income_statement">Income Statement</option>
                  <option value="trading_account">Trading / P&amp;L Account</option>
                  <option value="cash_flow">Cash Flow Statement</option>
                  <option value="t_account">T-Account / Ledger</option>
                  <option value="trial_balance">Trial Balance</option>
                </select>
              </div>
              {form.statement_subtype && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Define Correct Answer Structure</label>
                  <FinancialStatementEditor subtype={form.statement_subtype} value={form.marking_scheme} onChange={(schema) => set({ marking_scheme: schema })} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Answer / Marking Scheme</label>
              <textarea rows={4} className={inputCls} value={form.explanation} onChange={(e) => set({ explanation: e.target.value })} />
            </div>
          )}
          {isMcq && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
              <textarea rows={2} className={inputCls} value={form.explanation} onChange={(e) => set({ explanation: e.target.value })} />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
            {saving ? "Saving…" : "Save Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
