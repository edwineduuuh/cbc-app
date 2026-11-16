"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import CurriculumPicker from "@/components/CurriculumPicker";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const COUNTS = [5, 10, 15, 20, 25, 30];

// Generation takes roughly a minute. A spinner alone reads as "hung" at that
// length, so step through what is happening and keep an elapsed counter.
const STAGES = [
  "Reading the curriculum design...",
  "Choosing which outcomes to assess...",
  "Writing the questions...",
  "Writing the marking schemes...",
  "Checking the marks add up...",
];

export default function AssessmentsPage() {
  const router = useRouter();
  const [substrand, setSubstrand] = useState(null);
  const [count, setCount] = useState(10);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const generate = async () => {
    if (!substrand || busy) return;
    setBusy(true); setError(""); setStage(0); setElapsed(0);

    const t1 = setInterval(() => setElapsed((s) => s + 1), 1000);
    const t2 = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 12000);
    timers.current = [t1, t2];

    try {
      const r = await fetchWithAuth(`${API}/facilitator/assessments/generate/`, {
        method: "POST",
        body: JSON.stringify({ substrand: substrand.id, count, description }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not generate the assessment");
      router.push(`/facilitator/library/${d.id}`);
    } catch (e) {
      setError(e.message || "Could not generate the assessment");
    } finally {
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
        <CurriculumPicker onSelect={setSubstrand} />

        {/* What the questions will be based on. Shown before generating so a
            facilitator can tell this is the real design, not invented. */}
        {substrand && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Will assess these learning outcomes
            </p>
            <ol className="mt-2 space-y-1">
              {(substrand.learning_outcomes || []).map((o, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-gray-400">{String.fromCharCode(97 + i)})</span>
                  <span>{o}</span>
                </li>
              ))}
            </ol>
            {(substrand.inquiry_questions || []).length > 0 && (
              <p className="mt-2 text-xs italic text-gray-600">
                {substrand.inquiry_questions[0]}
              </p>
            )}
          </div>
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
            placeholder="For example: an end-of-term test, mostly structured questions, include one question on a local farming example, suitable for a 40-minute lesson."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={!substrand || busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "Generating..." : "Generate assessment"}
        </button>

        {busy && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-700">{STAGES[stage]}</p>
            <p className="text-xs text-gray-400 mt-1">
              {elapsed}s elapsed. This usually takes about a minute - you can leave
              this page open.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
