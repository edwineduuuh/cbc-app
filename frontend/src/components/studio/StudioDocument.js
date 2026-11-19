"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Download, Printer, Pencil, Check, Loader2, FileText, AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { API } from "@/components/studio/StudioForm";
import { documentHtml, downloadWord, printDoc } from "@/components/studio/exportDoc";

/** The document exactly as it prints, on white sheets. */
function Preview({ tool, payload }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(900);
  const html = useMemo(() => documentHtml(tool, payload), [tool, payload]);
  return (
    <iframe ref={ref} title="Preview" srcDoc={html}
      onLoad={() => {
        try { setHeight(ref.current.contentDocument.documentElement.scrollHeight + 20); } catch {}
      }}
      className="w-full rounded-2xl border border-gray-200"
      style={{ height, background: "#dfe4e9" }} />
  );
}

const toLines = (xs) => (xs || []).join("\n");
const fromLines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

function Bullets({ items }) {
  if (!items?.length) return null;
  return <ul className="space-y-0.5">{items.map((x, i) => <li key={i}>• {x}</li>)}</ul>;
}

function Area({ value, onChange, rows = 3 }) {
  return (
    <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-[160px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
  );
}

// ── Scheme of work ─────────────────────────────────────────────────────────
function SchemeView({ item, payload, setPayload, editing }) {
  const router = useRouter();
  const [planning, setPlanning] = useState(null);
  const [err, setErr] = useState("");
  const setRow = (i, patch) =>
    setPayload((p) => ({ ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const plan = async (i) => {
    setPlanning(i); setErr("");
    try {
      const r = await fetchWithAuth(`${API}/facilitator/plans/generate/`, {
        method: "POST", body: JSON.stringify({ scheme_id: item.id, row: i, minutes: 40 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not start the lesson plan.");
      router.push(`/facilitator/library/${d.id}`);
    } catch (e) { setErr(e.message); setPlanning(null); }
  };

  const m = payload.meta || {};
  return (
    <>
      <p className="text-xs text-gray-500 mb-3">
        {[m.school, m.class_name && `Class ${m.class_name}`, m.teacher, m.year && `Year ${m.year}`].filter(Boolean).join(" · ")}
      </p>
      {(payload.warnings || []).map((w, i) => (
        <p key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {w}
        </p>
      ))}
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-[1100px] w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {["Wk", "Lsn", "Strand / sub-strand", "Specific learning outcomes", "Key inquiry question",
                "Learning experiences", "Resources", "Assessment", "Reflection", ""].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2 border-b border-gray-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((r, i) => r.break ? (
              <tr key={i} className="bg-gray-50">
                <td className="px-3 py-2 font-semibold">{r.week}</td>
                <td colSpan={9} className="px-3 py-2 italic text-gray-500 text-center">{r.break}</td>
              </tr>
            ) : (
              <tr key={i} className="align-top border-t border-gray-100">
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.week}{r.dates && <div className="font-normal text-[10px] text-gray-400">{r.dates}</div>}</td>
                <td className="px-3 py-2">{r.lesson}</td>
                <td className="px-3 py-2 min-w-[140px]">
                  <div className="text-gray-500">{r.strand}</div>
                  <div className="font-semibold text-gray-900">{r.substrand}</div>
                  {r.of > 1 && <div className="text-[10px] text-gray-400">lesson {r.part} of {r.of}</div>}
                  {r.practice_questions > 0 && (
                    <div className="mt-1 inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                      {r.practice_questions} practice Qs on StadiSpace
                    </div>
                  )}
                </td>
                {editing ? (
                  <>
                    <td className="px-2 py-2"><Area value={toLines(r.outcomes)} onChange={(v) => setRow(i, { outcomes: fromLines(v) })} /></td>
                    <td className="px-2 py-2"><Area value={r.inquiry_question || ""} onChange={(v) => setRow(i, { inquiry_question: v })} /></td>
                    <td className="px-2 py-2"><Area value={toLines(r.experiences)} onChange={(v) => setRow(i, { experiences: fromLines(v) })} /></td>
                    <td className="px-2 py-2"><Area value={toLines(r.resources)} onChange={(v) => setRow(i, { resources: fromLines(v) })} /></td>
                    <td className="px-2 py-2"><Area value={toLines(r.assessment)} onChange={(v) => setRow(i, { assessment: fromLines(v) })} /></td>
                    <td className="px-2 py-2"><Area value={r.remarks || ""} onChange={(v) => setRow(i, { remarks: v })} /></td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 min-w-[200px]"><Bullets items={r.outcomes} /></td>
                    <td className="px-3 py-2 min-w-[140px]">{r.inquiry_question}</td>
                    <td className="px-3 py-2 min-w-[200px]"><Bullets items={r.experiences} /></td>
                    <td className="px-3 py-2 min-w-[120px]"><Bullets items={r.resources} /></td>
                    <td className="px-3 py-2 min-w-[110px]"><Bullets items={r.assessment} /></td>
                    <td className="px-3 py-2 min-w-[100px] text-gray-500">{r.remarks}</td>
                  </>
                )}
                <td className="px-2 py-2">
                  {r.substrand_id && (
                    <button onClick={() => plan(i)} disabled={planning !== null}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                      {planning === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Plan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Lesson plan ────────────────────────────────────────────────────────────
// Defined at module level: components declared inside a render are new on
// every keystroke, which throws away the focus of the box being typed in.
function Section({ title, children }) {
  return (
    <section className="py-3 border-t border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1.5">{title}</h3>
      <div className="text-sm text-gray-800">{children}</div>
    </section>
  );
}

function PlanList({ title, items, editing, onChange }) {
  return (
    <Section title={title}>
      {editing ? <Area value={toLines(items)} onChange={(v) => onChange(fromLines(v))} /> : <Bullets items={items} />}
    </Section>
  );
}

function PlanView({ payload, setPayload, editing }) {
  const m = payload.meta || {};
  const pl = payload.plan || {};
  const set = (patch) => setPayload((p) => ({ ...p, plan: { ...p.plan, ...patch } }));
  const setStep = (key, i, patch) => {
    if (key === "development") set({ development: pl.development.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
    else set({ [key]: { ...pl[key], ...patch } });
  };
  const ListField = ({ k, title }) => (
    <PlanList title={title} items={pl[k]} editing={editing} onChange={(v) => set({ [k]: v })} />
  );
  const steps = [["introduction", 0, { ...(pl.introduction || {}), title: "Introduction" }],
    ...(pl.development || []).map((s, i) => ["development", i, s]),
    ["conclusion", 0, { ...(pl.conclusion || {}), title: "Conclusion" }]];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
        {[["Grade", m.grade], ["Learning area", m.subject], ["Date", m.date], ["Time", m.minutes && `${m.minutes} min`],
          ["School", m.school], ["Class", m.class_name], ["Roll", m.roll], ["Term / week", [m.term, m.week].filter(Boolean).join(" / ")]]
          .filter(([, v]) => v).map(([k, v]) => <div key={k}><span className="text-gray-400">{k}:</span> {v}</div>)}
      </div>
      <p className="text-sm mb-1"><b>Strand:</b> {m.strand} &nbsp; <b>Sub-strand:</b> {m.substrand}</p>
      <Section title="Specific learning outcomes">
        <p className="text-xs text-gray-500 mb-1">By the end of the lesson, the learner should be able to:</p>
        {editing ? <Area value={toLines(pl.outcomes)} onChange={(v) => set({ outcomes: fromLines(v) })} />
          : <ol>{(pl.outcomes || []).map((o, i) => <li key={i}>{"abcdefg"[i]}) {o}</li>)}</ol>}
      </Section>
      {ListField({ k: "inquiry_questions", title: "Key inquiry question(s)" })}
      {ListField({ k: "resources", title: "Learning resources" })}
      {ListField({ k: "competencies", title: "Core competencies" })}
      {(editing || pl.values?.length > 0) && ListField({ k: "values", title: "Values" })}
      {(editing || pl.pcis?.length > 0) && ListField({ k: "pcis", title: "Pertinent and contemporary issues" })}
      <Section title="Organisation of learning">
        <div className="space-y-2">
          {steps.map(([key, i, s]) => (
            <div key={`${key}${i}`} className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-900">{s.title} <span className="font-normal text-gray-400">· {s.minutes} min</span></p>
              {editing ? (
                <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                  <Area value={s.teacher || ""} onChange={(v) => setStep(key, i, { teacher: v })} />
                  <Area value={s.learners || ""} onChange={(v) => setStep(key, i, { learners: v })} />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 mt-1 text-xs">
                  <p><span className="text-gray-400">Teacher:</span> {s.teacher}</p>
                  <p><span className="text-gray-400">Learners:</span> {s.learners}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      {pl.differentiation && (
        <Section title="Differentiation">
          <p><b>Support:</b> {pl.differentiation.support}</p>
          <p><b>Extension:</b> {pl.differentiation.extension}</p>
        </Section>
      )}
      {pl.extended_activity && <Section title="Extended activity">{pl.extended_activity}</Section>}
      {ListField({ k: "assessment", title: "Assessment" })}
      {(pl.rubric || []).length > 0 && (
        <Section title="Assessment rubric (KICD)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500">{["Indicator", "Exceeds", "Meets", "Approaches", "Below"].map((h) => <th key={h} className="text-left p-1.5">{h}</th>)}</tr></thead>
              <tbody>{pl.rubric.map((r, i) => (
                <tr key={i} className="align-top border-t border-gray-100">
                  {[r.indicator, r.exceeds, r.meets, r.approaches, r.below].map((c, j) => <td key={j} className="p-1.5">{c}</td>)}
                </tr>))}</tbody>
            </table>
          </div>
        </Section>
      )}
      {(pl.quick_check || []).length > 0 && (
        <Section title="Quick check · from the StadiSpace question bank">
          <ol className="space-y-2">
            {pl.quick_check.map((q, i) => (
              <li key={i}>
                <p>{i + 1}. {q.question}</p>
                {(q.options || []).length > 0 && <p className="text-xs text-gray-500">{q.options.map((o, j) => `${"ABCD"[j]}. ${o}`).join("   ")}</p>}
                <p className="text-xs text-emerald-700">Answer: {q.answer}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}
      <Section title="Reflection on the lesson">
        <Area value={pl.reflection || ""} onChange={(v) => set({ reflection: v })} rows={3} />
      </Section>
    </div>
  );
}

// ── Record of work ─────────────────────────────────────────────────────────
const STATUSES = [["taught", "Taught"], ["partly", "Partly"], ["not_taught", "Not taught"]];

function RecordView({ payload, setPayload }) {
  const weeks = payload.weeks || [];
  const todayWeek = useMemo(() => {
    const now = new Date();
    const w = weeks.find((w) => w.monday && now >= new Date(w.monday) && now < new Date(new Date(w.monday).getTime() + 7 * 864e5));
    return w ? w.week : weeks.find((w) => !w.break)?.week;
  }, [weeks]);
  const [open, setOpen] = useState(todayWeek);

  const all = weeks.flatMap((w) => w.rows || []).filter((r) => !r.carried_from);
  const done = all.filter((r) => r.status === "taught").length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  const update = (wi, ri, patch) => setPayload((p) => {
    const ws = p.weeks.map((w) => ({ ...w, rows: [...(w.rows || [])] }));
    const row = { ...ws[wi].rows[ri], ...patch };
    ws[wi].rows[ri] = row;
    if ("status" in patch) {
      // Not (fully) taught: carry it into the next teaching week, once.
      const key = `${ws[wi].week}:${ri}`;
      const next = ws.findIndex((w, j) => j > wi && !w.break);
      if (next !== -1) {
        ws[next].rows = ws[next].rows.filter((r) => r.carry_key !== key || r.status);
        if (patch.status === "not_taught" || patch.status === "partly") {
          ws[next].rows.unshift({ ...row, status: "", date: "", remarks: "", carried_from: ws[wi].week, carry_key: key });
        }
      }
    }
    return { ...p, weeks: ws };
  });

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-gray-900">Term coverage</span>
          <span className="text-gray-600">{done} of {all.length} lessons taught · {pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
      </div>
      {weeks.map((w, wi) => (
        <div key={w.week} className="bg-white rounded-2xl border border-gray-200">
          <button onClick={() => setOpen(open === w.week ? null : w.week)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <span className="text-sm font-semibold text-gray-900">
              Week {w.week} {w.dates && <span className="font-normal text-gray-400 text-xs">· {w.dates}</span>}
              {w.week === todayWeek && <span className="ml-2 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px]">this week</span>}
            </span>
            <span className="text-xs text-gray-500">
              {w.break ? w.break : `${(w.rows || []).filter((r) => r.status === "taught").length}/${(w.rows || []).length} taught`}
            </span>
          </button>
          {open === w.week && !w.break && (
            <div className="px-4 pb-4 space-y-2">
              {(w.rows || []).map((r, ri) => (
                <div key={ri} className={`rounded-xl border p-3 ${r.carried_from ? "border-amber-200 bg-amber-50/40" : "border-gray-200"}`}>
                  <p className="text-xs text-gray-500">Lesson {r.lesson} · {r.strand}{r.carried_from ? ` · carried from week ${r.carried_from}` : ""}</p>
                  <p className="text-sm font-semibold text-gray-900">{r.substrand}</p>
                  {r.work && r.work !== r.substrand && <p className="text-xs text-gray-600 mt-0.5">{r.work}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {STATUSES.map(([v, l]) => (
                      <button key={v} onClick={() => update(wi, ri, { status: r.status === v ? "" : v })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border ${r.status === v
                          ? v === "taught" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-amber-500 border-amber-500 text-white"
                          : "border-gray-200 text-gray-600"}`}>{l}</button>
                    ))}
                    <input type="date" value={r.date || ""} onChange={(e) => update(wi, ri, { date: e.target.value })}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs" />
                  </div>
                  <input value={r.remarks || ""} onChange={(e) => update(wi, ri, { remarks: e.target.value })}
                    placeholder="Reflection / remarks" className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs" />
                </div>
              ))}
              <button onClick={() => setPayload((p) => ({ ...p, weeks: p.weeks.map((x, j) => j !== wi ? x : {
                ...x, rows: [...(x.rows || []), { lesson: (x.rows || []).length + 1, strand: "", substrand: "Extra lesson", work: "", status: "", date: "", remarks: "" }] }) }))}
                className="text-xs font-semibold text-emerald-700 hover:underline">+ Add a lesson</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── shell ──────────────────────────────────────────────────────────────────
export default function StudioDocument({ item, setItem }) {
  const [payload, setPayload] = useState(item.payload || {});
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState(item.tool === "record_of_work" ? "log" : "preview");
  const [saved, setSaved] = useState("saved");      // saved | saving | unsaved | error
  const first = useRef(true);
  const isRecord = item.tool === "record_of_work";

  const save = async (body) => {
    setSaved("saving");
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/${item.id}/`, { method: "PATCH", body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      setSaved("saved");
    } catch { setSaved("error"); }
  };

  // Every change saves itself a moment after the last keystroke.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved("unsaved");
    const t = setTimeout(() => save({ payload }), 900);
    return () => clearTimeout(t);
  }, [payload]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishEditing = () => setEditing(false);
  const label = { scheme_of_work: "Scheme of work", lesson_plan: "Lesson plan", record_of_work: "Record of work" }[item.tool];

  return (
    <div className={item.tool === "lesson_plan" ? "max-w-3xl" : "max-w-6xl"}>
      <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" /> My Library
      </Link>
      <p className="text-xs font-semibold text-emerald-700">{label}{item.grade ? ` · Grade ${item.grade}` : ""}{item.subject ? ` · ${item.subject}` : ""}</p>
      <div className="flex flex-wrap items-start gap-2 mt-1 mb-4">
        <input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })}
          onBlur={(e) => e.target.value && save({ title: e.target.value })}
          className="flex-1 min-w-[220px] rounded-xl border border-transparent hover:border-gray-200 focus:border-emerald-500 bg-transparent px-2 py-1.5 text-2xl font-bold text-gray-900 focus:outline-none" />
        <button onClick={() => { setItem({ ...item, bookmarked: !item.bookmarked }); save({ bookmarked: !item.bookmarked }); }}
          className="p-2 rounded-lg hover:bg-gray-100" aria-label="Save to favourites">
          <Bookmark className={`w-4 h-4 ${item.bookmarked ? "fill-emerald-600 text-emerald-600" : "text-gray-400"}`} />
        </button>
        {!isRecord && (
          <button onClick={() => { if (editing) finishEditing(); else { setEditing(true); setTab("edit"); } }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${editing ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            {editing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />} {editing ? "Done" : "Edit"}
          </button>
        )}
        <button onClick={() => printDoc(item.tool, { ...payload, title: item.title })}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          <Printer className="w-3.5 h-3.5" /> Print / PDF
        </button>
        <button onClick={() => downloadWord(item.tool, { ...payload, title: item.title })}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
          <Download className="w-3.5 h-3.5" /> Word
        </button>
      </div>
      <p className="text-[11px] text-gray-400 -mt-2 mb-3 px-2">
        {saved === "saving" ? "Saving…" : saved === "error" ? "Couldn't save - check your connection." : saved === "unsaved" ? "Unsaved changes" : "All changes saved"}
      </p>

      <div className="flex gap-1 mb-3 rounded-xl border border-gray-200 p-1 w-fit">
        {[["preview", "Preview"], [isRecord ? "log" : "edit", isRecord ? "Log this week" : "Edit"]].map(([v, l]) => (
          <button key={v} onClick={() => { setTab(v); if (v !== "edit") setEditing(false); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${tab === v ? "bg-emerald-600 text-white" : "text-gray-600"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "preview" && <Preview tool={item.tool} payload={{ ...payload, title: item.title }} />}
      {tab === "edit" && item.tool === "scheme_of_work" && <SchemeView item={item} payload={payload} setPayload={setPayload} editing />}
      {tab === "edit" && item.tool === "lesson_plan" && <PlanView payload={payload} setPayload={setPayload} editing />}
      {tab === "log" && <RecordView payload={payload} setPayload={setPayload} />}
    </div>
  );
}
