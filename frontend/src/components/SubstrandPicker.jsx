"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Loader2, Sparkles, Check } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

// Full literal class strings so Tailwind's JIT picks them up (no interpolation).
const THEMES = {
  indigo: {
    link: "text-indigo-600",
    btn: "bg-indigo-600 hover:bg-indigo-700",
    selected: "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30",
    box: "border-indigo-500 bg-indigo-500 text-white",
  },
  emerald: {
    link: "text-emerald-600",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    selected: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30",
    box: "border-emerald-500 bg-emerald-500 text-white",
  },
};

/**
 * Shared drill-down: Grade → Learning area → Strand (one) → Sub-strand (multi).
 * Calls onStart({ topicId, title, substrandIds: number[] }).
 */
export default function SubstrandPicker({ onStart, accent = "indigo", startLabel = "Start" }) {
  const t = THEMES[accent] || THEMES.indigo;

  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [subs, setSubs] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    fetchWithAuth(`${API}/subjects/`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.results || [];
        // Kiswahili is blocked from AI lessons/flash cards (AI invents wrong grammar)
        setSubjects(list.filter((s) => (s.name || "").trim().toLowerCase() !== "kiswahili"));
      })
      .catch(() => {});
  }, []);

  const loadTopics = (sub, gr) => {
    setTopicId("");
    setSubs([]);
    setSelected(new Set());
    if (!sub || !gr) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    fetchWithAuth(`${API}/topics/?subject=${sub}&grade=${gr}`)
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : d.results || []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  };

  const loadSubstrands = (tid) => {
    setTopicId(tid);
    setSelected(new Set());
    if (!tid) {
      setSubs([]);
      return;
    }
    setLoadingSubs(true);
    fetchWithAuth(`${API}/substrands/?topic=${tid}`)
      .then((r) => r.json())
      .then((d) => setSubs(Array.isArray(d) ? d : d.results || []))
      .catch(() => setSubs([]))
      .finally(() => setLoadingSubs(false));
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = subs.length > 0 && selected.size === subs.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(subs.map((s) => s.id)));

  const start = () => {
    const topic = topics.find((x) => String(x.id) === String(topicId));
    const subjectName = subjects.find((s) => String(s.id) === String(subject))?.name;
    const ids = [...selected];
    const chosen = subs.filter((s) => selected.has(s.id)).map((s) => s.name);
    const scope =
      ids.length === 0
        ? "Whole strand"
        : ids.length === subs.length
        ? "All sub-strands"
        : chosen.join(", ");
    onStart({
      topicId,
      substrandIds: ids,
      title: `${subjectName} • Grade ${grade} • ${topic?.name} • ${scope}`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Grade + learning area */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={grade}
          onChange={(e) => {
            const v = e.target.value;
            setGrade(v);
            loadTopics(subject, v);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Grade</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select
          value={subject}
          onChange={(e) => {
            const v = e.target.value;
            setSubject(v);
            loadTopics(v, grade);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Learning area</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Strand (single) */}
      {grade && subject && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-500">Strand</label>
          {loadingTopics ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading strands…
            </div>
          ) : (
            <select
              value={topicId}
              onChange={(e) => loadSubstrands(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Choose a strand</option>
              {topics.map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Sub-strands (multi) */}
      {topicId && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-500">
              Sub-strands <span className="font-normal">(pick one or more)</span>
            </label>
            {subs.length > 0 && (
              <button onClick={toggleAll} className={`text-sm font-semibold hover:underline ${t.link}`}>
                {allSelected ? "Clear all" : "Select all"}
              </button>
            )}
          </div>

          {loadingSubs ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sub-strands…
            </div>
          ) : subs.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20">
              No sub-strands here yet — we’ll use the whole strand.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {subs.map((s) => {
                const on = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      on
                        ? t.selected
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        on ? t.box : "border-gray-300"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Start (sub-strands optional → whole-strand fallback) */}
      {topicId && (
        <button
          onClick={start}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white transition ${t.btn}`}
        >
          <Sparkles className="h-4 w-4" />
          {startLabel}
        </button>
      )}
    </div>
  );
}
