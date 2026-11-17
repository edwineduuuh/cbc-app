"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import {
  ArrowLeft, Bookmark, Check, Copy, Loader2, Pencil, Printer, AlertTriangle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const TYPE_LABEL = { mcq: "Multiple choice", structured: "Structured" };

/** Ruled lines a learner writes on. Roughly two per mark, with a floor so a
 *  1-mark part is still usable, because a printed paper with nowhere to write
 *  is not a paper. */
function AnswerLines({ marks }) {
  const n = Math.max(3, Math.min(Number(marks) || 2, 10) * 2);
  return (
    <div className="mt-2 space-y-5" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border-b border-gray-300 print:border-gray-400" />
      ))}
    </div>
  );
}

export default function LibraryItemPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("assessment");   // assessment | scheme
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/${id}/`);
      if (r.status === 404) { router.replace("/facilitator/library"); return; }
      setItem(await r.json());
    } catch {
      setError("Could not open this item.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body) => {
    setSaving(true); setError("");
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/${id}/`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      setItem(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  // Edits stay local until an explicit save: autosaving each keystroke is one
  // request per character on a 3G connection.
  const editQuestion = (idx, patchObj) => {
    setItem((it) => {
      const questions = it.payload.questions.map((q, i) =>
        i === idx ? { ...q, ...patchObj } : q);
      return {
        ...it,
        payload: {
          ...it.payload,
          questions,
          total_marks: questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
        },
      };
    });
  };

  const copy = async (what) => {
    const p = item.payload || {};
    const qs = p.questions || [];
    let text;
    if (what === "assessment") {
      text = [
        item.title,
        `${qs.length} questions · ${p.total_marks} marks`,
        p.covers ? `Covers: ${p.covers}` : "",
        "", p.instructions || "", "",
        ...qs.map((q) => {
          const head = `${q.number}. ${q.question_text}  (${q.marks} ${q.marks === 1 ? "mark" : "marks"})`;
          const opts = q.options
            ? Object.entries(q.options).map(([k, v]) => `   ${k}) ${v}`) : [];
          const parts = (q.parts || []).map(
            (pt) => `   (${pt.label}) ${pt.question_text}${pt.marks ? `  (${pt.marks} marks)` : ""}`);
          return [head, ...opts, ...parts].join("\n");
        }),
      ].filter(Boolean).join("\n");
    } else {
      text = [`${item.title} - Marking scheme`, "",
        ...qs.map((q) => {
          const head = `${q.number}. ${q.marks} ${q.marks === 1 ? "mark" : "marks"} · ${TYPE_LABEL[q.type] || q.type}`;
          if (q.type === "mcq") {
            return `${head}\n   ${q.correct_answer}) ${q.options?.[q.correct_answer] || ""}`;
          }
          const body = (q.marking_scheme || []).map((g) => {
            const label = [g.part ? `(${g.part})` : "", g.award].filter(Boolean).join(" ");
            return [label ? `   ${label}` : "",
              ...(g.points || []).map((pt) => `      - ${pt}`)].filter(Boolean).join("\n");
          });
          return [head, ...body].join("\n");
        })].join("\n\n");
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>;
  }
  if (!item) return <p className="text-sm text-red-600">{error || "Not found."}</p>;

  const p = item.payload || {};
  const questions = p.questions || [];
  const showScheme = tab === "scheme";

  return (
    <div className="max-w-3xl">
      {/* Toolbar - hidden on print so a printed paper is just the paper */}
      <div className="print:hidden mb-5">
        <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> My Library
        </Link>

        <p className="text-xs font-semibold text-emerald-700">
          {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
        </p>

        <div className="flex flex-wrap items-start gap-2 mt-1">
          <input
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
            onBlur={(e) => e.target.value !== "" && patch({ title: e.target.value })}
            className="flex-1 min-w-[220px] rounded-xl border border-transparent hover:border-gray-200 focus:border-emerald-500 bg-transparent px-2 py-1.5 text-2xl font-bold text-gray-900 focus:outline-none"
          />
          <button onClick={() => patch({ bookmarked: !item.bookmarked })}
                  className="p-2 rounded-lg hover:bg-gray-100" aria-label="Save">
            <Bookmark className={`w-4 h-4 ${item.bookmarked ? "fill-emerald-600 text-emerald-600" : "text-gray-400"}`} />
          </button>
          <button onClick={() => setEditing((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                    editing ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            <Pencil className="w-3.5 h-3.5" /> {editing ? "Done" : "Edit"}
          </button>
          <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-1 px-2">
          {questions.length} questions · {p.total_marks} marks
        </p>
        {p.covers && <p className="text-xs text-gray-500 px-2">Covers: {p.covers}</p>}

        {/* Tabs, so a blank paper can be printed without the answers on it */}
        <div className="flex items-center justify-between gap-3 mt-4 border-b border-gray-200">
          <div className="flex gap-1">
            {[["assessment", "Assessment"], ["scheme", "Marking scheme"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                        tab === k ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => copy(showScheme ? "scheme" : "assessment")}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 mb-1">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : `Copy ${showScheme ? "marking scheme" : "assessment"}`}
          </button>
        </div>

        {editing && (
          <button onClick={() => patch({ payload: item.payload })} disabled={saving}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-gray-300">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save changes
          </button>
        )}
        {saved && <p className="mt-2 text-xs text-emerald-700">Saved.</p>}
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
        {(p.warnings || []).length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold text-amber-800">Check these before printing</p>
            <ul className="mt-1 space-y-0.5">
              {p.warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 print:border-0 print:p-0">
        <header className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            {item.title}{showScheme ? " - Marking scheme" : ""}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
            {` · ${questions.length} questions · ${p.total_marks} marks`}
          </p>
          {p.covers && <p className="text-xs text-gray-500 mt-0.5">Covers: {p.covers}</p>}
          {!showScheme && p.instructions && (
            <p className="mt-3 text-sm text-gray-700"><strong>Instructions:</strong> {p.instructions}</p>
          )}
          {!showScheme && (
            <div className="mt-4 hidden print:grid grid-cols-2 gap-6 text-sm">
              <p className="border-b border-gray-400 pb-1">Name:</p>
              <p className="border-b border-gray-400 pb-1">Class:</p>
            </div>
          )}
        </header>

        <ol className="space-y-7">
          {questions.map((q, idx) => (
            <li key={idx} className="break-inside-avoid">
              <div className="flex gap-2">
                <span className="font-semibold text-gray-900 shrink-0">{q.number ?? idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  {editing && !showScheme ? (
                    <textarea value={q.question_text} rows={3}
                      onChange={(e) => editQuestion(idx, { question_text: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                  ) : (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{q.question_text}</p>
                  )}

                  {!showScheme && (
                    <>
                      {q.type === "mcq" && q.options && (
                        <ul className="mt-2 space-y-1">
                          {Object.entries(q.options).map(([k, v]) => (
                            <li key={k} className="text-sm text-gray-700">{k}) {v}</li>
                          ))}
                        </ul>
                      )}

                      {(q.parts || []).length > 0 ? (
                        <ul className="mt-2 space-y-3">
                          {q.parts.map((part, pi) => (
                            <li key={pi} className="text-sm text-gray-800">
                              ({part.label}) {part.question_text}
                              {part.marks ? <span className="text-gray-400"> ({part.marks} marks)</span> : null}
                              <AnswerLines marks={part.marks} />
                            </li>
                          ))}
                        </ul>
                      ) : q.type === "structured" ? (
                        <AnswerLines marks={q.marks} />
                      ) : null}

                      <p className="mt-2 text-[11px] text-gray-400">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"}
                        {` · ${TYPE_LABEL[q.type] || q.type}`}
                        {item.substrand ? ` · ${item.substrand}` : ""}
                      </p>
                    </>
                  )}

                  {showScheme && (
                    <div className="mt-2">
                      <p className="text-[11px] text-gray-400 mb-1">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"} · {TYPE_LABEL[q.type] || q.type}
                      </p>
                      {q.type === "mcq" ? (
                        <p className="text-sm font-semibold text-emerald-700">
                          {q.correct_answer}) {q.options?.[q.correct_answer]}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(q.marking_scheme || []).map((g, gi) => (
                            <div key={gi}>
                              <p className="text-sm text-gray-900">
                                {g.part && <span className="font-semibold">({g.part}) </span>}
                                {g.award || `${g.marks} ${g.marks === 1 ? "mark" : "marks"}`}
                              </p>
                              <ul className="mt-1 ml-4 space-y-0.5 list-disc">
                                {(g.points || []).map((pt, pi) => (
                                  <li key={pi} className="text-sm text-gray-700">{pt}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">
                  {editing && !showScheme ? (
                    <input type="number" min={0} value={q.marks}
                      onChange={(e) => editQuestion(idx, { marks: Number(e.target.value) })}
                      className="w-14 rounded border border-gray-200 px-1 py-0.5 text-right" />
                  ) : (
                    `(${q.marks})`
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
