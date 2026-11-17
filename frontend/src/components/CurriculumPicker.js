"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

/**
 * Grade > Learning area > Strand > Sub-strand, for the Facilitators Portal.
 *
 * Separate from SubstrandPicker, which multi-selects for quiz building. This
 * one selects exactly one sub-strand and reads /facilitator/curriculum/,
 * which only returns sub-strands that actually carry KICD learning outcomes -
 * offering one we cannot ground a generation in wastes a facilitator's time
 * and produces a document with no curriculum behind it.
 *
 * Calls onSelect(substrand | null), where substrand carries its outcomes so
 * the caller can show what the generation will be based on.
 */
export default function CurriculumPicker({ onSelect }) {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [subs, setSubs] = useState([]);

  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [strand, setStrand] = useState("");
  const [sub, setSub] = useState("");

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
    setSubject(""); setStrand(""); setSub("");
    setSubjects([]); setStrands([]); setSubs([]);
    onSelect?.(null);
    if (g) load(`?grade=${g}`, "subjects", setSubjects, "subjects");
  };

  const pickSubject = (s) => {
    setSubject(s);
    setStrand(""); setSub("");
    setStrands([]); setSubs([]);
    onSelect?.(null);
    if (s) load(`?grade=${grade}&subject=${s}`, "strands", setStrands, "strands");
  };

  const pickStrand = (t) => {
    setStrand(t);
    setSub("");
    setSubs([]);
    onSelect?.(null);
    if (t) load(`?topic=${t}`, "substrands", setSubs, "substrands");
  };

  const pickSub = (id) => {
    setSub(id);
    onSelect?.(subs.find((x) => String(x.id) === String(id)) || null);
  };

  const selectCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 " +
    "disabled:text-gray-400";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

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

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Strand</label>
          <select className={selectCls} value={strand} disabled={!subject || busy === "strands"}
                  onChange={(e) => pickStrand(e.target.value)}>
            <option value="">
              {busy === "strands" ? "Loading..." : subject ? "Select a strand" : "Select a learning area first"}
            </option>
            {strands.map((t) => (
              <option key={t.id} value={t.id}>
                {t.kicd_code ? `${t.kicd_code} ` : ""}{t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Sub-strand</label>
          <select className={selectCls} value={sub} disabled={!strand || busy === "substrands"}
                  onChange={(e) => pickSub(e.target.value)}>
            <option value="">
              {busy === "substrands" ? "Loading..." : strand ? "Select a sub-strand" : "Select a strand first"}
            </option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kicd_code ? `${s.kicd_code} ` : ""}{s.name}
                {s.suggested_duration ? ` (${s.suggested_duration})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading {busy}...
        </p>
      )}
    </div>
  );
}
