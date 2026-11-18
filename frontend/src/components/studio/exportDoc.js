/**
 * Printable / Word versions of schemes, lesson plans and records of work.
 * Built from the data (not the on-screen dark page), as plain HTML tables
 * that Word and every browser's print-to-PDF lay out the same way.
 */
export const FOOTER = "StadiSpace · stadispace.co.ke · 0704 699683 / 0717 946 924";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (xs) => (xs || []).filter(Boolean).map((x) => `<div>• ${esc(x)}</div>`).join("");
const lines = (xs) => (xs || []).filter(Boolean).map(esc).join("<br>");

const STYLE = `
  @page land { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 36pt; }
  @page port { size: 595.3pt 841.9pt; margin: 42pt; }
  div.land { page: land; } div.port { page: port; }
  @media print { @page { size: auto; margin: 14mm; } }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; }
  h1 { font-size: 15pt; margin: 0 0 4pt; } h2 { font-size: 11.5pt; margin: 14pt 0 4pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #555; padding: 4pt 5pt; vertical-align: top; text-align: left; }
  th { background: #e8eef3; font-size: 9pt; }
  td { font-size: 9pt; }
  .meta td { border: none; padding: 1pt 8pt 1pt 0; font-size: 10pt; }
  .brk td { background: #f3f3f3; font-style: italic; text-align: center; }
  .foot { margin-top: 16pt; font-size: 8pt; color: #666; text-align: center; }
  .muted { color: #555; }
`;

function metaTable(pairs) {
  const cells = pairs.filter(([, v]) => v).map(([k, v]) => `<td><b>${esc(k)}:</b> ${esc(v)}</td>`);
  const rows = [];
  for (let i = 0; i < cells.length; i += 3) rows.push(`<tr>${cells.slice(i, i + 3).join("")}</tr>`);
  return `<table class="meta">${rows.join("")}</table>`;
}

export function schemeHtml(p) {
  const m = p.meta || {};
  const body = (p.rows || []).map((r) =>
    r.break
      ? `<tr class="brk"><td>${esc(r.week)}</td><td colspan="9">${esc(r.break)}</td></tr>`
      : `<tr><td>${esc(r.week)}${r.dates ? `<div class="muted">${esc(r.dates)}</div>` : ""}</td><td>${esc(r.lesson)}</td>
        <td>${esc(r.strand)}</td><td>${esc(r.substrand)}</td>
        <td>${r.outcomes?.length ? "By the end of the lesson, the learner should be able to:" + list(r.outcomes) : ""}</td>
        <td>${esc(r.inquiry_question)}</td><td>${list(r.experiences)}</td><td>${list(r.resources)}</td>
        <td>${list(r.assessment)}</td><td>${esc(r.remarks)}</td></tr>`).join("");
  return `<div class="land"><h1>${esc(p.title)}</h1>
    ${metaTable([["School", m.school], ["Learning area", m.subject], ["Grade", m.grade], ["Term", m.term],
                 ["Year", m.year], ["Teacher", m.teacher], ["Class", m.class_name]])}
    <table><thead><tr><th>Wk</th><th>Lsn</th><th>Strand</th><th>Sub-strand</th><th>Specific learning outcomes</th>
    <th>Key inquiry question</th><th>Learning experiences</th><th>Learning resources</th><th>Assessment</th>
    <th>Reflection</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

export function planHtml(p) {
  const m = p.meta || {};
  const pl = p.plan || {};
  const step = (s) => `<tr><td>${esc(s.title || "")}<div class="muted">${esc(s.minutes)} min</div></td>
    <td>${esc(s.teacher)}</td><td>${esc(s.learners)}</td></tr>`;
  const rubric = (pl.rubric || []).length
    ? `<h2>Assessment rubric</h2><table><tr><th>Indicator</th><th>Exceeds</th><th>Meets</th><th>Approaches</th><th>Below</th></tr>
       ${pl.rubric.map((r) => `<tr><td>${esc(r.indicator)}</td><td>${esc(r.exceeds)}</td><td>${esc(r.meets)}</td>
       <td>${esc(r.approaches)}</td><td>${esc(r.below)}</td></tr>`).join("")}</table>` : "";
  const qc = (pl.quick_check || []).length
    ? `<h2>Quick check</h2>${pl.quick_check.map((q, i) => `<div><b>${i + 1}.</b> ${esc(q.question)}${
        (q.options || []).length ? `<div class="muted">${q.options.map((o, j) => `${"ABCD"[j]}. ${esc(o)}`).join(" &nbsp; ")}</div>` : ""}
        <div class="muted">Answer: ${esc(q.answer)}</div></div>`).join("")}` : "";
  return `<div class="port"><h1>Lesson Plan</h1>
    ${metaTable([["School", m.school], ["Learning area", m.subject], ["Grade", m.grade], ["Date", m.date],
                 ["Time", m.minutes ? `${m.minutes} minutes` : ""], ["Roll", m.roll], ["Term", m.term], ["Week", m.week],
                 ["Lesson", m.lesson], ["Teacher", m.teacher], ["Class", m.class_name]])}
    <p><b>Strand:</b> ${esc(m.strand)} &nbsp; <b>Sub-strand:</b> ${esc(m.substrand)}</p>
    <h2>Specific learning outcomes</h2><div>By the end of the lesson, the learner should be able to:</div>
    ${(pl.outcomes || []).map((o, i) => `<div>${"abcdefg"[i]}) ${esc(o)}</div>`).join("")}
    <h2>Key inquiry question(s)</h2>${list(pl.inquiry_questions)}
    <h2>Learning resources</h2>${list(pl.resources)}
    <h2>Core competencies</h2>${list(pl.competencies)}
    ${(pl.values || []).length ? `<h2>Values</h2>${list(pl.values)}` : ""}
    ${(pl.pcis || []).length ? `<h2>Pertinent and contemporary issues</h2>${list(pl.pcis)}` : ""}
    ${(pl.links || []).length ? `<h2>Link to other learning areas</h2>${list(pl.links)}` : ""}
    <h2>Organisation of learning</h2>
    <table><tr><th style="width:22%">Stage</th><th>Teacher</th><th>Learners</th></tr>
      ${step({ ...(pl.introduction || {}), title: "Introduction" })}
      ${(pl.development || []).map(step).join("")}
      ${step({ ...(pl.conclusion || {}), title: "Conclusion" })}</table>
    ${pl.differentiation ? `<h2>Differentiation</h2><div><b>Support:</b> ${esc(pl.differentiation.support)}</div>
      <div><b>Extension:</b> ${esc(pl.differentiation.extension)}</div>` : ""}
    ${pl.extended_activity ? `<h2>Extended activity</h2><div>${esc(pl.extended_activity)}</div>` : ""}
    <h2>Assessment</h2>${list(pl.assessment)}
    ${rubric}${qc}
    <h2>Reflection on the lesson</h2><div class="muted">${esc(pl.reflection || "")}</div>
    <div style="height:60pt;border-bottom:1px solid #999"></div></div>`;
}

const STATUS = { taught: "Taught", partly: "Partly taught", not_taught: "Not taught" };

export function recordHtml(p) {
  const m = p.meta || {};
  const body = (p.weeks || []).map((w) =>
    w.break
      ? `<tr class="brk"><td>${esc(w.week)}</td><td colspan="6">${esc(w.break)}</td></tr>`
      : (w.rows || []).map((r, i) => `<tr><td>${i === 0 ? `${esc(w.week)}${w.dates ? `<div class="muted">${esc(w.dates)}</div>` : ""}` : ""}</td>
        <td>${esc(r.lesson)}</td><td>${esc(r.date)}</td><td>${esc(r.strand)}<div class="muted">${esc(r.substrand)}</div></td>
        <td>${esc(r.work)}${r.carried_from ? `<div class="muted">(carried from week ${esc(r.carried_from)})</div>` : ""}</td>
        <td>${esc(STATUS[r.status] || "")}</td><td>${esc(r.remarks)}</td></tr>`).join("")).join("");
  return `<div class="land"><h1>${esc(p.title)}</h1>
    ${metaTable([["School", m.school], ["Learning area", m.subject], ["Grade", m.grade], ["Term", m.term],
                 ["Year", m.year], ["Teacher", m.teacher], ["TSC No.", m.tsc_number], ["Class", m.class_name]])}
    <table><thead><tr><th>Week</th><th>Lesson</th><th>Date</th><th>Strand / sub-strand</th><th>Work covered</th>
    <th>Status</th><th>Reflection / remarks</th></tr></thead><tbody>${body}</tbody></table>
    <p style="margin-top:18pt">Head of department: ____________________ &nbsp; Sign: __________ &nbsp; Date: __________</p></div>`;
}

const RENDER = { scheme_of_work: schemeHtml, lesson_plan: planHtml, record_of_work: recordHtml };

export function documentHtml(tool, payload) {
  const inner = (RENDER[tool] || (() => ""))(payload || {});
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${esc(payload?.title || "StadiSpace")}</title><style>${STYLE}</style></head>
    <body>${inner}<div class="foot">${esc(FOOTER)}</div></body></html>`;
}

export function downloadWord(tool, payload) {
  const blob = new Blob(["﻿", documentHtml(tool, payload)], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(payload?.title || "stadispace").replace(/[^\w\- ]+/g, "").trim() || "stadispace"}.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function printDoc(tool, payload) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(documentHtml(tool, payload));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
