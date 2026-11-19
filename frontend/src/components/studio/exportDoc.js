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
  @page land { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 28pt; }
  @page port { size: 595.3pt 841.9pt; margin: 40pt; }
  div.land { page: land; } div.port { page: port; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #222; margin: 0; }
  h1 { font-size: 15pt; font-weight: bold; text-align: center; margin: 0 0 6pt; letter-spacing: .2pt; }
  .line { text-align: center; font-size: 10pt; margin: 0 0 12pt; }
  .line span { margin: 0 9pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #b9c3cc; padding: 5pt 6pt; vertical-align: top; text-align: left; }
  th { background: #e6f4f1; color: #1d5c55; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
  td { font-size: 8pt; line-height: 1.35; }
  td.wk { font-weight: bold; text-align: center; }
  td.c { text-align: center; }
  .lead { color: #333; }
  .brk td { background: #f5f7f8; font-style: italic; text-align: center; color: #555; }
  h2 { font-size: 10.5pt; margin: 12pt 0 4pt; color: #1d5c55; text-transform: uppercase; }
  .box td { border: 1px solid #b9c3cc; font-size: 9pt; }
  .meta td { border: none; padding: 1pt 10pt 1pt 0; font-size: 9.5pt; }
  .muted { color: #666; }
  .foot { margin-top: 10pt; font-size: 7.5pt; color: #888; text-align: center; }
  .pb { page-break-before: always; }
  @media screen {
    body { background: #dfe4e9; padding: 18px 0; }
    .sheet { background: #fff; margin: 0 auto 18px; padding: 26px 30px; box-shadow: 0 1px 4px rgba(0,0,0,.18); }
    .land .sheet, .sheet.land { width: 1050px; min-height: 700px; }
    .port .sheet, .sheet.port { width: 760px; min-height: 1000px; }
    .pb { page-break-before: auto; }
  }
  @media print { .sheet { padding: 0; } @page { margin: 12mm; } }
`;

function metaTable(pairs) {
  const cells = pairs.filter(([, v]) => v).map(([k, v]) => `<td><b>${esc(k)}:</b> ${esc(v)}</td>`);
  const rows = [];
  for (let i = 0; i < cells.length; i += 3) rows.push(`<tr>${cells.slice(i, i + 3).join("")}</tr>`);
  return `<table class="meta">${rows.join("")}</table>`;
}

const code = (c, name) => (c ? `${esc(c)} ${esc(name)}` : esc(name));
const bulletsWithLead = (lead, xs) =>
  (xs || []).length ? `<div class="lead">${esc(lead)}</div>${list(xs)}` : "";

const SCHEME_HEAD = `<tr><th style="width:3%">Wk</th><th style="width:3%">Lsn</th><th style="width:8%">Strand</th>
  <th style="width:9%">Sub-strand</th><th style="width:18%">Lesson learning outcomes</th>
  <th style="width:18%">Learning experiences</th><th style="width:10%">Key inquiry questions</th>
  <th style="width:9%">Learning resources</th><th style="width:9%">Assessment methods</th>
  <th style="width:8%">Reflection</th></tr>`;

export function schemeHtml(p) {
  const m = p.meta || {};
  // Group rows by week: one page per week, as schools print them.
  const weeks = [];
  for (const r of p.rows || []) {
    if (!weeks.length || weeks[weeks.length - 1].week !== r.week) weeks.push({ week: r.week, rows: [] });
    weeks[weeks.length - 1].rows.push(r);
  }
  const line = [["School", m.school], ["Teacher", m.teacher], ["Subject", m.subject], ["Grade", m.grade],
    ["Class", m.class_name], ["Term", m.term], ["Year", m.year]]
    .filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join("");
  const pages = weeks.map((w, i) => {
    const brk = w.rows[0]?.break;
    const body = brk
      ? `<tr class="brk"><td class="wk">${esc(w.week)}</td><td colspan="9">${esc(brk)}</td></tr>`
      : w.rows.map((r, j) => `<tr>
          ${j === 0 ? `<td class="wk" rowspan="${w.rows.length}">${esc(w.week)}${r.dates ? `<div class="muted" style="font-weight:normal">${esc(r.dates)}</div>` : ""}</td>` : ""}
          <td class="c">${esc(r.lesson)}</td>
          <td>${code(r.strand_code, r.strand)}</td>
          <td>${code(r.kicd_code, r.substrand)}</td>
          <td>${bulletsWithLead("By the end of the lesson, the learner should be able to:", r.outcomes)}</td>
          <td>${bulletsWithLead("The learner is guided to:", r.experiences)}</td>
          <td>${r.inquiry_question ? list([r.inquiry_question]) : ""}</td>
          <td>${list(r.resources)}</td>
          <td>${list(r.assessment)}</td>
          <td>${esc(r.remarks)}</td></tr>`).join("");
    return `<div class="sheet land${i ? " pb" : ""}">
      ${i === 0 ? `<h1>SCHEME OF WORK</h1><div class="line">${line}</div>` : ""}
      <table><thead>${SCHEME_HEAD}</thead><tbody>${body}</tbody></table>
      <div class="foot">${esc(FOOTER)} · Page ${i + 1}</div></div>`;
  }).join("");
  return `<div class="land">${pages}</div>`;
}

export function planHtml(p) {
  const m = p.meta || {};
  const pl = p.plan || {};
  const step = (s, title) => `<tr><td style="width:20%"><b>${esc(title || s.title || "")}</b><div class="muted">${esc(s.minutes)} minutes</div></td>
    <td>${esc(s.teacher)}</td><td>${esc(s.learners)}</td></tr>`;
  const qc = (pl.quick_check || []).length
    ? `<h2>Quick check</h2>${pl.quick_check.map((q, i) => `<div style="margin-bottom:4pt"><b>${i + 1}.</b> ${esc(q.question)}${
        (q.options || []).length ? `<div class="muted">${q.options.map((o, j) => `${"ABCD"[j]}. ${esc(o)}`).join(" &nbsp; ")}</div>` : ""}
        <div class="muted">Answer: ${esc(q.answer)}</div></div>`).join("")}` : "";
  const cell = (k, v) => `<td><b>${esc(k)}:</b> ${esc(v || "")}</td>`;
  return `<div class="port"><div class="sheet port">
    <h1>LESSON PLAN</h1>
    <table class="box">
      <tr>${cell("School", m.school)}${cell("Learning area", m.subject)}${cell("Grade", m.grade)}</tr>
      <tr>${cell("Date", m.date)}${cell("Time", m.minutes ? `${m.minutes} minutes` : "")}${cell("Roll", m.roll)}</tr>
      <tr>${cell("Term", m.term)}${cell("Week", m.week)}${cell("Teacher", m.teacher)}</tr>
      <tr><td colspan="3"><b>Strand:</b> ${code(m.strand_code, m.strand)} &nbsp;&nbsp; <b>Sub-strand:</b> ${code(m.kicd_code, m.substrand)}</td></tr>
    </table>
    <h2>Specific learning outcomes</h2><div class="lead">By the end of the lesson, the learner should be able to:</div>
    ${(pl.outcomes || []).map((o, i) => `<div>${"abcdefg"[i]}) ${esc(o)}</div>`).join("")}
    <h2>Key inquiry question(s)</h2>${list(pl.inquiry_questions)}
    <h2>Learning resources</h2>${list(pl.resources)}
    <h2>Core competencies</h2>${list(pl.competencies)}
    ${(pl.values || []).length ? `<h2>Values</h2>${list(pl.values)}` : ""}
    ${(pl.pcis || []).length ? `<h2>Pertinent and contemporary issues</h2>${list(pl.pcis)}` : ""}
    ${(pl.links || []).length ? `<h2>Link to other learning areas</h2>${list(pl.links)}` : ""}
    <h2>Organisation of learning</h2>
    <table><thead><tr><th>Stage</th><th>Teacher's activity</th><th>Learners' activity</th></tr></thead><tbody>
      ${step(pl.introduction || {}, "Introduction")}
      ${(pl.development || []).map((s) => step(s)).join("")}
      ${step(pl.conclusion || {}, "Conclusion")}</tbody></table>
    ${pl.differentiation ? `<h2>Differentiation</h2><div><b>Support:</b> ${esc(pl.differentiation.support)}</div>
      <div><b>Extension:</b> ${esc(pl.differentiation.extension)}</div>` : ""}
    ${pl.extended_activity ? `<h2>Extended activity</h2><div>${esc(pl.extended_activity)}</div>` : ""}
    <h2>Assessment</h2>${list(pl.assessment)}
    ${qc}
    <h2>Reflection on the lesson</h2><div>${esc(pl.reflection || "")}</div>
    <div style="height:50pt;border-bottom:1px solid #aaa"></div>
    <div class="foot">${esc(FOOTER)}</div></div></div>`;
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
  const line = [["School", m.school], ["Teacher", m.teacher], ["TSC No.", m.tsc_number], ["Subject", m.subject],
    ["Grade", m.grade], ["Class", m.class_name], ["Term", m.term], ["Year", m.year]]
    .filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join("");
  return `<div class="land"><div class="sheet land"><h1>RECORD OF WORK</h1><div class="line">${line}</div>
    <table><thead><tr><th>Week</th><th>Lesson</th><th>Date</th><th>Strand / sub-strand</th><th>Work covered</th>
    <th>Status</th><th>Reflection / remarks</th></tr></thead><tbody>${body}</tbody></table>
    <p style="margin-top:18pt">Head of department: ____________________ &nbsp; Sign: __________ &nbsp; Date: __________</p>
    <div class="foot">${esc(FOOTER)}</div></div></div>`;
}

const RENDER = { scheme_of_work: schemeHtml, lesson_plan: planHtml, record_of_work: recordHtml };

export function documentHtml(tool, payload) {
  const inner = (RENDER[tool] || (() => ""))(payload || {});
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${esc(payload?.title || "StadiSpace")}</title><style>${STYLE}</style></head>
    <body>${inner}</body></html>`;
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
