"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import {
  ArrowLeft, Bookmark, Check, Eye, EyeOff, Loader2, Pencil, Printer, AlertTriangle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

export default function LibraryItemPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
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
        method: "PATCH",
        body: JSON.stringify(body),
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

  // Edits go to local state; one explicit save sends them. Autosaving each
  // keystroke would mean a request per character over a 3G connection.
  const editQuestion = (idx, patchObj) => {
    setItem((it) => {
      const questions = it.payload.questions.map((q, i) =>
        i === idx ? { ...q, ...patchObj } : q);
      const total = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
      return { ...it, payload: { ...it.payload, questions, total_marks: total } };
    });
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>;
  }
  if (!item) {
    return <p className="text-sm text-red-600">{error || "Not found."}</p>;
  }

  const p = item.payload || {};
  const questions = p.questions || [];

  return (
    <div className="max-w-3xl">
      {/* Toolbar - hidden when printing, so a printed paper is just the paper */}
      <div className="print:hidden mb-5">
        <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> My Library
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
            onBlur={(e) => e.target.value !== "" && patch({ title: e.target.value })}
            className="flex-1 min-w-[200px] rounded-xl border border-transparent hover:border-gray-200 focus:border-emerald-500 bg-transparent px-2 py-1.5 text-xl font-bold text-gray-900 focus:outline-none"
          />
          <button onClick={() => patch({ bookmarked: !item.bookmarked })}
                  className="p-2 rounded-lg hover:bg-gray-100" aria-label="Save">
            <Bookmark className={`w-4 h-4 ${item.bookmarked ? "fill-emerald-600 text-emerald-600" : "text-gray-400"}`} />
          </button>
          <button onClick={() => setShowAnswers((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
            {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAnswers ? "Hide answers" : "Show answers"}
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

        {editing && (
          <button
            onClick={() => patch({ payload: item.payload })}
            disabled={saving}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-gray-300"
          >
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

      {/* The paper itself */}
      <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 print:border-0 print:p-0">
        <header className="mb-5 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
            {questions.length ? ` · ${questions.length} questions` : ""}
            {p.total_marks ? ` · ${p.total_marks} marks` : ""}
          </p>
          {p.covers && <p className="text-xs text-gray-500 mt-0.5">Covers: {p.covers}</p>}
          {p.instructions && (
            <p className="mt-3 text-sm text-gray-700"><strong>Instructions:</strong> {p.instructions}</p>
          )}
        </header>

        <ol className="space-y-6">
          {questions.map((q, idx) => (
            <li key={idx}>
              <div className="flex gap-2">
                <span className="font-semibold text-gray-900 shrink-0">{q.number ?? idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <textarea
                      value={q.question_text}
                      onChange={(e) => editQuestion(idx, { question_text: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{q.question_text}</p>
                  )}

                  {q.type === "mcq" && q.options && (
                    <ul className="mt-2 space-y-1">
                      {Object.entries(q.options).map(([k, v]) => {
                        const right = showAnswers && k === q.correct_answer;
                        return (
                          <li key={k} className={`text-sm ${right ? "font-semibold text-emerald-700" : "text-gray-700"}`}>
                            {k}) {v}{right ? "  ✓" : ""}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {(q.parts || []).length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {q.parts.map((part, pi) => (
                        <li key={pi} className="text-sm text-gray-800">
                          ({part.label}) {part.question_text}
                          {part.marks ? <span className="text-gray-400"> ({part.marks} marks)</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {showAnswers && (q.marking_scheme || []).length > 0 && (
                    <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 print:bg-white">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Marking scheme</p>
                      <ul className="mt-1 space-y-0.5">
                        {q.marking_scheme.map((pt, si) => (
                          <li key={si} className="text-xs text-gray-700">
                            <span className="text-gray-400">[{pt.marks}]</span> {pt.point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">
                  {editing ? (
                    <input
                      type="number" min={0} value={q.marks}
                      onChange={(e) => editQuestion(idx, { marks: Number(e.target.value) })}
                      className="w-14 rounded border border-gray-200 px-1 py-0.5 text-right"
                    />
                  ) : (
                    `(${q.marks} ${q.marks === 1 ? "mark" : "marks"})`
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
