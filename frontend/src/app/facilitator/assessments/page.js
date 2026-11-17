"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import CurriculumPicker from "@/components/CurriculumPicker";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const COUNTS = [5, 10, 15, 20, 25, 30, 40];

// Two to three minutes: the paper is written, then every question is checked
// and weak ones replaced, then any diagram is drawn. A spinner alone reads as
// "hung" at that length, so step through what is happening and keep an
// elapsed counter.
const STAGES = [
  "Reading the curriculum design...",
  "Choosing which outcomes to assess...",
  "Writing the questions...",
  "Writing the marking schemes...",
  "Checking every question against the sub-strand...",
  "Working out the answers independently...",
  "Replacing any question that failed the check...",
];

export default function AssessmentsPage() {
  const router = useRouter();
  const [selection, setSelection] = useState(null);
  const [count, setCount] = useState(10);
  const [description, setDescription] = useState("");
  const [diagrams, setDiagrams] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const chosen = selection?.substrands || [];

  const generate = async () => {
    if (!selection || busy) return;
    setBusy(true); setError(""); setStage(0); setElapsed(0);

    const t1 = setInterval(() => setElapsed((s) => s + 1), 1000);
    const t2 = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 12000);
    timers.current = [t1, t2];

    // The server now answers straight away with the id of a paper it is
    // building in the background, so this request is short. It used to hold
    // the connection open for the whole two minutes, which is why it died.
    const ac = new AbortController();
    const hardStop = setTimeout(() => ac.abort(), 45000);

    try {
      const r = await fetchWithAuth(`${API}/facilitator/assessments/generate/`, {
        method: "POST",
        body: JSON.stringify({
          strands: selection.strandIds,
          substrands: selection.substrandIds,
          count, description, diagrams,
        }),
        signal: ac.signal,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not generate the assessment");
      // The paper has its own page from this moment, which shows it being
      // built. Closing the tab no longer loses it.
      router.push(`/facilitator/library/${d.id}`);
    } catch (e) {
      // "Failed to fetch" is what the browser says for a connection that
      // died, which tells a facilitator nothing and sent us hunting the
      // wrong bug. Name the likely cause instead.
      const dropped =
        e?.name === "TypeError" || /failed to fetch|network/i.test(e?.message || "");
      setError(
        e?.name === "AbortError"
          ? "The server took too long to answer. Try again, or ask for fewer questions."
          : dropped
          ? "The connection to the server dropped before the paper came back. " +
            "This usually means it took too long. Try again, or ask for fewer " +
            "questions, or untick the diagram."
          : e.message || "Could not generate the assessment"
      );
    } finally {
      clearTimeout(hardStop);
      timers.current.forEach(clearInterval);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Assessment generator</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Build an assessment from the KICD curriculum design for what you are teaching.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <CurriculumPicker onSelect={setSelection} />

        {/* What the questions will be based on. Shown before generating so a
            facilitator can tell this is the real design, not invented. */}
        {chosen.length === 1 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Will assess these learning outcomes
            </p>
            <ol className="mt-2 space-y-1">
              {(chosen[0].learning_outcomes || []).map((o, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-gray-400">{String.fromCharCode(97 + i)})</span>
                  <span>{o}</span>
                </li>
              ))}
            </ol>
            {(chosen[0].inquiry_questions || []).length > 0 && (
              <p className="mt-2 text-xs italic text-gray-600">
                {chosen[0].inquiry_questions[0]}
              </p>
            )}
          </div>
        )}

        {chosen.length > 1 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              This paper will cover {chosen.length} sub-strands
            </p>
            <ul className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {chosen.map((s) => (
                <li key={s.id} className="text-xs text-gray-700">
                  {s.kicd_code ? `${s.kicd_code} ` : ""}{s.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-gray-500">
              {chosen.reduce((n, s) => n + (s.outcome_count || 0), 0)} learning
              outcomes in total.
            </p>
          </div>
        )}

        {/* Ten questions over fourteen sub-strands is not an assessment of
            any of them. Say so before it is paid for, not after. */}
        {chosen.length > count && (
          <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {count} questions across {chosen.length} sub-strands means some get
            no question at all. Ask for more questions, or tick fewer.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Number of questions
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Anything else about this assessment?
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="This box decides the paper. For example: all structured questions, no multiple choice; an end-of-term exam with a comprehension passage; 40 minutes; include a question on a local farming example; harder than usual."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={diagrams}
            onChange={(e) => setDiagrams(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-600"
          />
          <span>
            <span className="block text-sm font-medium text-gray-800">
              Draw a diagram where a question needs one
            </span>
            <span className="block text-xs text-gray-500">
              Adds about a minute. Each diagram is drawn once and reused by
              every later assessment that needs the same one.
            </span>
          </span>
        </label>

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={!selection || busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "Generating..." : "Generate assessment"}
        </button>

        {busy && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-700">{STAGES[stage]}</p>
            <p className="text-xs text-gray-400 mt-1">
              {elapsed}s elapsed. Two to three minutes is normal - the questions
              are written, then checked one by one, then any diagram is drawn.
              You can leave this page open.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
