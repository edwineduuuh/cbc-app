"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

/**
 * Grade and learning area, then tick boxes for strands and their sub-strands.
 *
 * A real end-of-term paper covers several sub-strands, often across more than
 * one strand, so picking exactly one was the wrong shape for the job.
 *
 * A ticked strand with none of its sub-strands ticked means the whole strand.
 * That is also what the backend does with it, so ticking fourteen boxes to say
 * "all of this strand" is never necessary.
 *
 * Reads /facilitator/curriculum/?tree=1, which returns only sub-strands that
 * carry KICD learning outcomes - offering one we cannot ground a generation in
 * wastes a facilitator's time and produces a paper with no curriculum behind it.
 *
 * Calls onSelect(selection | null) where selection is
 * { grade, subjectId, subjectName, strandIds, substrandIds, substrands }.
 */
// wholeSubject: report the grade and subject even with nothing ticked (a
// scheme or record can cover the whole subject).
export default function CurriculumPicker({ onSelect, wholeSubject = false }) {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tree, setTree] = useState([]);

  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [strandIds, setStrandIds] = useState([]);     // ticked strands
  const [subIds, setSubIds] = useState([]);           // ticked sub-strands

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (qs, key, setter, label) => {
    setBusy(label);
    setError("");

    // The backend sleeps when idle and a cold start can take 30s+, which is
    // longer than the shared client's 25s abort. Give this call its own,
    // longer signal and retry once, so a sleeping server looks like a slow
    // page rather than a broken one.
    const attempt = (ms) => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), ms);
      return fetchWithAuth(`${API}/facilitator/curriculum/${qs}`, {
        signal: ac.signal,
      }).finally(() => clearTimeout(t));
    };

    try {
      let r;
      try {
        r = await attempt(45000);
      } catch (first) {
        if (first?.name !== "AbortError") throw first;
        setError("Waking the server up, one moment...");
        r = await attempt(45000);      // cold start is a one-off cost
      }
      setError("");

      // Say which thing is actually wrong. "Check your connection" sends
      // someone hunting their wifi when the real cause is a backend that
      // has not been redeployed, or a database with no curriculum in it.
      if (r.status === 404) {
        setError(
          "This server does not have the curriculum endpoint yet. The backend " +
          "needs to be redeployed with the latest code."
        );
        setter([]);
        return;
      }
      if (r.status === 403) {
        setError("Your account does not have facilitator access.");
        setter([]);
        return;
      }
      if (!r.ok) {
        setError(`The server returned an error (${r.status}). Try again shortly.`);
        setter([]);
        return;
      }

      const d = await r.json();
      const rows = d[key] || [];
      setter(rows);
      if (label === "grades" && rows.length === 0) {
        setError(
          "No curriculum has been loaded on this server yet. Run " +
          "“manage.py load_kicd”, or redeploy so it runs automatically."
        );
      }
    } catch (e) {
      setError(
        e?.name === "AbortError"
          ? "The server is taking too long to wake up. Reload the page in a moment."
          : "Could not reach the server. Check your connection."
      );
      setter([]);
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    load("", "grades", setGrades, "grades");
  }, [load]);

  const pickGrade = (g) => {
    setGrade(g);
    setSubject(""); setStrandIds([]); setSubIds([]);
    setSubjects([]); setTree([]);
    if (g) load(`?grade=${g}`, "subjects", setSubjects, "subjects");
  };

  const pickSubject = (s) => {
    setSubject(s);
    setStrandIds([]); setSubIds([]); setTree([]);
    if (s) load(`?grade=${grade}&subject=${s}&tree=1`, "strands", setTree, "strands");
  };

  // ── what is actually selected ───────────────────────────────────────────
  // A strand ticked with no children ticked means all of its children, so the
  // summary has to resolve that the same way the backend does.
  const chosen = useMemo(() => {
    const out = [];
    for (const t of tree) {
      if (!strandIds.includes(t.id)) continue;
      const ticked = t.substrands.filter((s) => subIds.includes(s.id));
      out.push(...(ticked.length ? ticked : t.substrands));
    }
    return out;
  }, [tree, strandIds, subIds]);

  useEffect(() => {
    if (!grade || !subject || (chosen.length === 0 && !wholeSubject)) {
      onSelect?.(null);
      return;
    }
    onSelect?.({
      grade,
      subjectId: subject,
      subjectName: subjects.find((s) => String(s.id) === String(subject))?.name || "",
      strandIds,
      substrandIds: subIds,
      substrands: chosen,
    });
    // onSelect is a setter from the page; including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, subject, strandIds, subIds, chosen, subjects, wholeSubject]);

  const toggleStrand = (t) => {
    setStrandIds((cur) => {
      if (cur.includes(t.id)) {
        // Untick its children too, or they linger invisibly and come back
        // the moment the strand is ticked again.
        const kids = new Set(t.substrands.map((s) => s.id));
        setSubIds((s) => s.filter((id) => !kids.has(id)));
        return cur.filter((id) => id !== t.id);
      }
      return [...cur, t.id];
    });
  };

  const toggleSub = (t, s) => {
    setSubIds((cur) =>
      cur.includes(s.id) ? cur.filter((id) => id !== s.id) : [...cur, s.id]);
    setStrandIds((cur) => (cur.includes(t.id) ? cur : [...cur, t.id]));
  };

  const selectCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 " +
    "disabled:text-gray-400";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
  const linkCls = "text-xs font-medium text-emerald-700 hover:text-emerald-800";
  const boxCls = "mt-0.5 w-4 h-4 shrink-0 accent-emerald-600 cursor-pointer";

  const openStrands = tree.filter((t) => strandIds.includes(t.id));

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Grade</label>
          <select className={selectCls} value={grade}
                  onChange={(e) => pickGrade(e.target.value)}>
            <option value="">Select a grade</option>
            {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Learning area</label>
          <select className={selectCls} value={subject} disabled={!grade || busy === "subjects"}
                  onChange={(e) => pickSubject(e.target.value)}>
            <option value="">
              {busy === "subjects" ? "Loading..." : grade ? "Select a learning area" : "Select a grade first"}
            </option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── strands ─────────────────────────────────────────────────────── */}
      {subject && tree.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <label className={labelCls + " mb-0"}>Strands</label>
              <p className="text-[11px] text-gray-400">
                {strandIds.length} of {tree.length} selected
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" className={linkCls}
                      onClick={() => setStrandIds(tree.map((t) => t.id))}>
                Select all
              </button>
              <button type="button" className={linkCls}
                      onClick={() => { setStrandIds([]); setSubIds([]); }}>
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {tree.map((t) => (
              <label key={t.id}
                     className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" className={boxCls}
                       checked={strandIds.includes(t.id)}
                       onChange={() => toggleStrand(t)} />
                <span className="min-w-0">
                  <span className="block text-sm text-gray-800">
                    {t.kicd_code ? `${t.kicd_code} ` : ""}{t.name}
                  </span>
                  <span className="block text-[11px] text-gray-400">
                    {t.substrand_count} sub-strand{t.substrand_count === 1 ? "" : "s"}
                    {t.has_rubric ? " · rubric in the design" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── sub-strands, grouped under each ticked strand ───────────────── */}
      {openStrands.length > 0 && (
        <div>
          <label className={labelCls + " mb-0"}>Sub-strands</label>
          <p className="text-[11px] text-gray-400 mb-1.5">
            Leave a strand&apos;s sub-strands unticked to cover all of them.
          </p>

          <div className="space-y-2.5">
            {openStrands.map((t) => {
              const ticked = t.substrands.filter((s) => subIds.includes(s.id));
              return (
                <div key={t.id} className="rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {t.kicd_code ? `${t.kicd_code} ` : ""}{t.name}
                    </p>
                    <div className="flex gap-3 shrink-0">
                      <button type="button" className={linkCls}
                              onClick={() => setSubIds((cur) => [
                                ...cur.filter((id) => !t.substrands.some((s) => s.id === id)),
                                ...t.substrands.map((s) => s.id),
                              ])}>
                        All
                      </button>
                      <button type="button" className={linkCls}
                              onClick={() => setSubIds((cur) =>
                                cur.filter((id) => !t.substrands.some((s) => s.id === id)))}>
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {t.substrands.map((s) => (
                      <label key={s.id}
                             className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" className={boxCls}
                               checked={subIds.includes(s.id)}
                               onChange={() => toggleSub(t, s)} />
                        <span className="min-w-0">
                          <span className="block text-sm text-gray-800">
                            {s.kicd_code ? `${s.kicd_code} ` : ""}{s.name}
                          </span>
                          <span className="block text-[11px] text-gray-400">
                            {s.outcome_count} learning outcome{s.outcome_count === 1 ? "" : "s"}
                            {s.suggested_duration ? ` · ${s.suggested_duration}` : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {ticked.length === 0 && (
                    <p className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
                      Nothing ticked - the whole strand will be covered.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading {busy}...
        </p>
      )}
    </div>
  );
}
