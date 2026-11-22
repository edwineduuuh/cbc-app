"use client";

import { renderMathHtml, tidyFeedback } from "@/lib/math";

/**
 * Feedback for one answer (a whole question or one part), laid out the same
 * everywhere: the marker's comment in short paragraphs, then the worked
 * solution under "How to work it out". Maths, ladders and tables rendered.
 */

function mdTables(text) {
  const re = /(\|.+\|[ \t]*\n\|[-| :]+\|[ \t]*\n(?:\|.+\|[ \t]*(?:\n|$))*)/g;
  return text.replace(re, (block) => {
    const rows = block.trim().split("\n").map((r) => r.trim());
    const cells = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
    const td = "padding:6px 12px;border:1px solid var(--border);color:var(--text);font-size:13px";
    const head = cells(rows[0]).map((c) => `<th style="${td};background:var(--bg-secondary);font-weight:700;text-align:left">${c}</th>`).join("");
    const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td style="${td}">${c}</td>`).join("")}</tr>`).join("");
    return `<table style="border-collapse:collapse;margin:8px 0;max-width:100%"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>\n`;
  });
}

export function feedbackParagraphs(text) {
  const t = tidyFeedback(text || "")
    .trim()
    .replace(/^\s*(✓\s*)?(Correct!?|Not quite\.?|Partially correct\.?)\s*/i, "");
  if (!t) return "";
  return mdTables(t)
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i, a) => `<p style="margin:0 0 ${i < a.length - 1 ? 10 : 0}px 0">${renderMathHtml(s)}</p>`)
    .join("");
}

export default function WorkedFeedback({ feedback, studyTip, accent = "#20B8A6", fontSize = 13.5 }) {
  const body = feedbackParagraphs(feedback);
  const tipText = (studyTip || "").trim();
  const tip = tipText && !(feedback || "").includes(tipText.slice(0, 60)) ? feedbackParagraphs(tipText) : "";
  if (!body && !tip) return null;
  return (
    <div style={{ fontSize, color: "var(--text)", lineHeight: 1.75 }}>
      {body && <div dangerouslySetInnerHTML={{ __html: body }} />}
      {tip && (
        <div style={{ marginTop: body ? 12 : 0, paddingTop: body ? 12 : 0, borderTop: body ? "1px solid var(--border)" : "none" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>
            How to work it out
          </p>
          <div dangerouslySetInnerHTML={{ __html: tip }} />
        </div>
      )}
    </div>
  );
}

/**
 * Per-part results for a question with parts. Uses the server's part_results
 * when it sends them; older servers only send one combined text
 * "(a) …\n\n(b) …", which is split here so each part still gets its own
 * feedback under its own answer.
 */
export function partResultsOf(fb, parts) {
  if (!fb || !Array.isArray(parts) || !parts.length) return [];
  if (Array.isArray(fb.part_results) && fb.part_results.length) return fb.part_results;
  const text = String(fb.feedback || "").replace(/\\n/g, "\n");
  const labels = parts.map((p) => String(p.part_label).replace(/[^\w]/g, "")).filter(Boolean);
  if (!labels.length) return [];
  const esc = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:^|\\n)\\s*\\((${esc})\\)\\s*`, "g");
  const hits = [...text.matchAll(re)];
  if (!hits.length) return [];
  return hits.map((h, i) => {
    const seg = text.slice(h.index + h[0].length, i + 1 < hits.length ? hits[i + 1].index : undefined).trim();
    const part = parts.find((p) => String(p.part_label).replace(/[^\w]/g, "") === h[1]);
    const max = Number(part?.max_marks) || 1;
    const zero = /^Not quite|^Jibu sahihi ni|^Si sahihi/i.test(seg);
    const partly = /^Partially/i.test(seg);
    const correct = (seg.match(/correct answer is\s+(.+?)\.?\s*(?:\n|$)/i) || [])[1] || "";
    return {
      part_id: part?.id,
      part_label: h[1],
      feedback: zero ? seg.replace(/^Not quite\.\s*The correct answer is\s+.+?\.\s*/i, "") : seg,
      study_tip: "",
      correct_answer: zero ? correct.replace(/\$/g, "") : "",
      max_marks: max,
      marks_awarded: zero ? 0 : partly ? max / 2 : max,
      is_correct: !zero && !partly,
    };
  });
}

/**
 * One part's feedback as an FAQ-style dropdown, placed directly under that
 * part. Closed by default; the header already says right / wrong and marks.
 */
export function PartFeedbackDropdown({ result, showCorrect = true, renderAnswer }) {
  const st = statusOf(result);
  if (!st) return null;
  return (
    // Always open under its part - no toggle to find.
    <div className="ss-part-feedback" style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          borderRadius: 12,
          background: st.tint,
          border: `1px solid ${st.color}44`,
          color: "var(--text)",
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        <span style={{ color: st.color, fontWeight: 800 }}>{st.icon} {st.label}</span>
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· Feedback &amp; working</span>
      </div>
      <div
        style={{
          marginTop: 8,
          background: "var(--bg-secondary)",
          borderLeft: `3px solid ${st.color}`,
          borderRadius: 12,
          padding: "12px 16px",
        }}
      >
        {showCorrect && st.key !== "full" && result.correct_answer ? (
          <p style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 10 }}>
            <b>Correct answer: </b>
            <span dangerouslySetInnerHTML={{ __html: renderAnswer ? renderAnswer(String(result.correct_answer)) : renderMathHtml(String(result.correct_answer)) }} />
          </p>
        ) : null}
        <WorkedFeedback feedback={result.feedback} studyTip={result.study_tip} accent={st.color} />
      </div>
    </div>
  );
}

/** Status colours shared by part cards and chips. */
export function statusOf(r) {
  if (!r) return null;
  const full = r.max_marks > 0 ? r.marks_awarded >= r.max_marks : r.is_correct;
  const zero = (r.marks_awarded ?? 0) <= 0;
  return full
    ? { key: "full", color: "#3CCB8B", tint: "rgba(60,203,139,0.10)", label: "Correct", icon: "✓" }
    : zero
      ? { key: "zero", color: "#F07178", tint: "rgba(240,113,120,0.10)", label: "Not quite", icon: "✗" }
      : { key: "part", color: "#E8B65B", tint: "rgba(232,182,91,0.10)", label: "Partly correct", icon: "½" };
}
