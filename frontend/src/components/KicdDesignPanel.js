"use client";

import { useState } from "react";

/**
 * Shows the official KICD curriculum design for a sub-strand.
 *
 * Point of this component: a question and its marking scheme should be worded
 * against the actual learning outcome, not from memory. The grader scores an
 * answer only against the teacher's key, so the key's wording is the ceiling on
 * marking accuracy - having the outcome on screen while authoring is what
 * raises it.
 *
 * Everything here is read-only. These strings are quoted verbatim from the
 * design by `manage.py ingest_kicd`; corrections belong in Django admin so the
 * provenance in `kicd_source` stays meaningful.
 */
export default function KicdDesignPanel({ substrand, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!substrand) return null;

  const outcomes = substrand.learning_outcomes || [];
  const inquiry = substrand.inquiry_questions || [];
  const competencies = substrand.core_competencies || [];
  const experiences = substrand.learning_experiences || [];

  if (!outcomes.length && !inquiry.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-xs text-amber-800">
          No KICD design data loaded for{" "}
          <span className="font-medium">{substrand.name}</span>. Run{" "}
          <code className="font-mono">manage.py load_kicd</code>, or write the
          marking scheme from the printed design.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-emerald-50"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          KICD design
          {substrand.kicd_code ? ` · ${substrand.kicd_code}` : ""} {substrand.name}
          {substrand.suggested_duration ? ` · ${substrand.suggested_duration}` : ""}
        </span>
        <span className="text-xs text-emerald-700 shrink-0">
          {open ? "Hide" : `Show ${outcomes.length} outcome${outcomes.length !== 1 ? "s" : ""}`}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {outcomes.length > 0 && (
            <Section title="Specific learning outcomes">
              <ol className="space-y-1">
                {outcomes.map((o, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-gray-400 shrink-0">
                      {String.fromCharCode(97 + i)})
                    </span>
                    <span>{o}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {inquiry.length > 0 && (
            <Section title={`Key inquiry question${inquiry.length !== 1 ? "s" : ""}`}>
              <ul className="space-y-0.5">
                {inquiry.map((q, i) => (
                  <li key={i} className="text-xs italic text-gray-600">
                    {q}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {competencies.length > 0 && (
            <Section title="Core competencies">
              <ul className="space-y-0.5">
                {competencies.map((c, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {experiences.length > 0 && (
            <Section title="Suggested learning experiences" collapsed>
              <ul className="space-y-0.5">
                {experiences.map((e, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    {e}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {substrand.kicd_source && (
            <p className="text-xs text-gray-400">Source: {substrand.kicd_source}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, collapsed = false }) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
      >
        {title} {collapsed ? (open ? "−" : "+") : ""}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
