"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

export const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const codeKey = (c) =>
  String(c || "")
    .split(".")
    .map((n) => String(parseInt(n, 10) || 0).padStart(3, "0"))
    .join(".");

/** "1.0 Numbers" - the strand number from the KICD design, then its name. */
export const strandLabel = (t) => (t?.kicd_code ? `${t.kicd_code} ${t.name}` : t?.name || "");
export const subLabel = (s) => (s?.kicd_code ? `${s.kicd_code} ${s.name}` : s?.name || "");

function useList(url) {
  const [state, setState] = useState({ url: null, list: [] });
  useEffect(() => {
    if (!url) return;
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setState({ url, list: Array.isArray(d) ? d : d.results || [] }))
      .catch(() => live && setState({ url, list: [] }));
    return () => { live = false; };
  }, [url]);
  return url && state.url === url ? state.list : [];
}

/** Official KICD strands for a learning area + grade, in design order. */
export function useKicdStrands(subject, grade) {
  const list = useList(subject && grade ? `${API}/topics/?official=1&subject=${subject}&grade=${grade}` : null);
  return [...list].sort((a, b) => codeKey(a.kicd_code).localeCompare(codeKey(b.kicd_code)) || a.name.localeCompare(b.name));
}

/** Sub-strands of one strand, in design order. */
export function useSubstrands(topic) {
  const list = useList(topic ? `${API}/substrands/?topic=${topic}` : null);
  return [...list].sort((a, b) => codeKey(a.kicd_code).localeCompare(codeKey(b.kicd_code)) || a.name.localeCompare(b.name));
}

/**
 * Strand + sub-strand selects. `value` = {topic, substrand}. A strand that is
 * not one of the KICD strands (an old hand-typed one) is still shown, marked,
 * so it is never silently dropped - the admin picks the KICD one instead.
 */
export function StrandPicker({ subject, grade, value, onChange, legacyName, className = "", selectCls = "", allowEmpty = true, emptyLabel = "All strands", subEmptyLabel = "All sub-strands" }) {
  const strands = useKicdStrands(subject, grade);
  const subs = useSubstrands(value.topic);
  const isLegacy = value.topic && strands.length > 0 && !strands.some((t) => String(t.id) === String(value.topic));
  return (
    <div className={className}>
      <select
        value={value.topic || ""}
        onChange={(e) => onChange({ topic: e.target.value, substrand: "" })}
        className={selectCls}
        disabled={!subject || !grade}
        aria-label="Strand"
      >
        {allowEmpty && <option value="">{!subject || !grade ? "Pick learning area + grade first" : emptyLabel}</option>}
        {isLegacy && <option value={value.topic}>⚠ {legacyName || "Old strand"} (not a KICD strand)</option>}
        {strands.map((t) => (
          <option key={t.id} value={t.id}>{strandLabel(t)}</option>
        ))}
      </select>
      <select
        value={value.substrand || ""}
        onChange={(e) => onChange({ ...value, substrand: e.target.value })}
        className={selectCls}
        disabled={!value.topic || subs.length === 0}
        aria-label="Sub-strand"
      >
        <option value="">{value.topic && subs.length === 0 ? "No sub-strands" : subEmptyLabel}</option>
        {subs.map((s) => (
          <option key={s.id} value={s.id}>{subLabel(s)}</option>
        ))}
      </select>
    </div>
  );
}

/** Chips for a question's place in the curriculum. */
export function CurriculumChips({ q }) {
  return (
    <>
      {q.topic_name && (
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full max-w-[220px] truncate" title={q.topic_name}>
          {q.topic_name}
        </span>
      )}
      {q.substrand_name ? (
        <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full max-w-[220px] truncate" title={q.substrand_name}>
          › {q.substrand_name}
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full" title="Open the question to choose its KICD sub-strand">
          No sub-strand
        </span>
      )}
    </>
  );
}
