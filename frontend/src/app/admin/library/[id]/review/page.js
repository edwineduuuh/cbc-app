"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, RotateCcw, Pencil, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const C = {
  card: { background: "#14243A", border: "1px solid #1F3350" },
  field: { background: "#0F1F3D", color: "#F5F7FA", border: "1px solid #2B4058" },
  muted: { color: "#A9B9CC" },
  faint: { color: "#7F93AB" },
};
const TABS = [
  ["flagged", "Needs a look"],
  ["proposed", "All awaiting review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

function pct(n) { return `${Math.round((n || 0) * 100)}%`; }
function mapLabel(m) { return m ? `Grade ${m.grade} · ${m.subject || ""} · ${m.strand} › ${m.name}` : "No mapping"; }

/** Pick a real sub-strand: learning area → grade → strand → sub-strand. */
function CurriculumPicker({ initial, onPick, onCancel }) {
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState(initial?.subject_id || "");
  const [grade, setGrade] = useState(initial?.grade || "");
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState(initial?.strand_id || "");
  const [subs, setSubs] = useState([]);
  const [sub, setSub] = useState("");

  useEffect(() => { fetch(`${API}/subjects/`).then((r) => r.json()).then((d) => Array.isArray(d) && setSubjects(d)).catch(() => {}); }, []);
  useEffect(() => {
    if (!subject) return setTopics([]);
    const p = new URLSearchParams({ subject });
    if (grade) p.set("grade", grade);
    fetch(`${API}/topics/?${p}`).then((r) => r.json()).then((d) => setTopics(Array.isArray(d) ? d : [])).catch(() => {});
  }, [subject, grade]);
  useEffect(() => {
    if (!topic) return setSubs([]);
    fetch(`${API}/substrands/?topic=${topic}`).then((r) => r.json()).then((d) => setSubs(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, [topic]);

  const sel = "w-full rounded-lg px-2.5 py-2 text-sm";
  return (
    <div className="rounded-xl p-3 mt-3 space-y-2" style={{ background: "#0F1F3D", border: "1px solid #2B4058" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={C.muted}>Choose from the curriculum</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }} className={sel} style={C.field}>
          <option value="">Learning area…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setTopic(""); }} className={sel} style={C.field}>
          <option value="">Any grade</option>{GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!subject} className={sel} style={C.field}>
          <option value="">Strand…</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}{grade ? "" : ` (G${t.grade})`}</option>)}
        </select>
        <select value={sub} onChange={(e) => setSub(e.target.value)} disabled={!topic} className={sel} style={C.field}>
          <option value="">Sub-strand…</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button disabled={!sub} onClick={() => onPick(Number(sub))} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#0E7490", color: "#fff" }}>Approve with this</button>
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs" style={C.muted}>Cancel</button>
      </div>
    </div>
  );
}

function QuestionCard({ q, onChange }) {
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.text);
  const [answer, setAnswer] = useState(q.answer);
  const [err, setErr] = useState("");

  const review = async (body) => {
    setBusy(true); setErr("");
    try {
      const r = await fetchWithAuth(`${API}/admin/library/questions/${q.id}/review/`, { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "That didn't work.");
      onChange(d);
      setPicking(false); setEditing(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const status = q.review_status;
  return (
    <li className="rounded-2xl p-4 sm:p-5" style={C.card}>
      <div className="flex items-center gap-2 flex-wrap mb-2 text-xs" style={C.faint}>
        <span className="font-semibold" style={{ color: "#F5F7FA" }}>Q{q.label || "?"}</span>
        <span>Page {q.page}</span>
        {q.marks != null && <span>· {q.marks} mark{q.marks === 1 ? "" : "s"}</span>}
        {q.question_type && <span>· {q.question_type.replace("_", " ")}</span>}
        {q.edited && <span className="rounded-full px-2 py-0.5" style={{ background: "#1B2C43" }}>edited</span>}
        {status !== "proposed" && (
          <span className="ml-auto rounded-full px-2 py-0.5 font-semibold uppercase"
            style={status === "approved" ? { color: "#5EE6C1", background: "rgba(32,184,166,0.12)" } : { color: "#A9B9CC", background: "rgba(169,185,204,0.12)" }}>
            {status}{q.corrected ? " · corrected" : ""}
          </span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2 mb-3">
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={C.field} />
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer / marking point" className="w-full rounded-lg px-3 py-2 text-sm" style={C.field} />
          <p className="text-xs" style={C.faint}>The original text from the PDF is kept; this edit is stored beside it.</p>
          <div className="flex gap-2">
            <button onClick={() => review({ action: "edit", text, answer })} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#0E7490", color: "#fff" }}>Save</button>
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs" style={C.muted}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-2">{q.text}</p>
          {q.options?.length > 0 && <ul className="text-sm mb-2 space-y-0.5" style={C.muted}>{q.options.map((o, i) => <li key={i}>{o}</li>)}</ul>}
          <p className="text-sm mb-3"><span style={C.faint}>Answer: </span>{q.answer || <span style={{ color: "#F5C76B" }}>none found</span>}</p>
        </>
      )}

      {q.flags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {q.flags.map((f) => (
            <span key={f.code} className="flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5" style={{ color: "#F5C76B", background: "rgba(245,199,107,0.10)" }}>
              <AlertTriangle className="w-3 h-3" /> {f.text}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: "#0F1F3D" }}>
        {status === "approved" ? (
          <p className="text-sm"><span style={C.faint}>Approved: </span>{mapLabel(q.approved)}</p>
        ) : (
          <>
            <p className="text-sm">
              <Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1" style={{ color: "#20B8A6" }} />
              <span style={C.faint}>AI suggests: </span>{mapLabel(q.proposed)}
              {q.proposed && <span className="ml-2 text-xs font-semibold" style={{ color: q.confidence >= 0.75 ? "#5EE6C1" : "#F5C76B" }}>{pct(q.confidence)}</span>}
            </p>
            {q.reason && <p className="text-xs mt-1" style={C.faint}>{q.reason}</p>}
            {q.alternatives?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs" style={C.faint}>Or:</span>
                {q.alternatives.map((a) => (
                  <button key={a.id} onClick={() => review({ action: "approve", substrand_id: a.id })} disabled={busy}
                    className="text-xs rounded-full px-2.5 py-0.5" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
                    {a.strand} › {a.name} ({pct(a.confidence)})
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {err && <p className="text-xs mb-2" style={{ color: "#F7A1A7" }}>{err}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "proposed" && (
          <>
            {q.proposed && (
              <button onClick={() => review({ action: "approve" })} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#0E7490", color: "#fff" }}>
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
            )}
            <button onClick={() => setPicking((v) => !v)} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
              {q.proposed ? "Correct mapping" : "Map it"}
            </button>
            <button onClick={() => review({ action: "reject" })} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1B2C43", border: "1px solid #24384F", color: "#F7A1A7" }}>
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        )}
        {status !== "proposed" && (
          <button onClick={() => review({ action: "reopen" })} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reopen
          </button>
        )}
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs" style={C.muted}>
            <Pencil className="w-3.5 h-3.5" /> Edit text
          </button>
        )}
      </div>
      {picking && <CurriculumPicker initial={q.proposed} onPick={(id) => review({ action: "approve", substrand_id: id })} onCancel={() => setPicking(false)} />}
    </li>
  );
}

export default function ReviewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("flagged");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API}/admin/library/${id}/extraction/`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch { setError("Couldn't load this resource."); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  // Keep checking while the AI is still reading.
  const running = data?.run && ["queued", "running"].includes(data.run.status);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running, load]);

  const post = async (url, after) => {
    setBusy(true); setError("");
    try {
      const r = await fetchWithAuth(url, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "That didn't work.");
      after?.(d);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const update = (q) => setData((d) => ({ ...d, questions: d.questions.map((x) => (x.id === q.id ? q : x)) }));

  const qs = (data?.questions || []).filter((q) =>
    tab === "flagged" ? q.review_status === "proposed" && q.flags.length > 0 : q.review_status === tab);
  const counts = data?.counts || {};
  const tabCount = { flagged: counts.flagged_open, proposed: counts.proposed, approved: counts.approved, rejected: counts.rejected };
  const chip = (a) => ({ background: a ? "#20B8A6" : "#14243A", color: a ? "#080F1D" : "#A9B9CC", border: `1px solid ${a ? "#20B8A6" : "#24384F"}` });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" style={{ color: "#F5F7FA" }}>
      <Link href="/admin/library" className="inline-flex items-center gap-1.5 text-sm mb-4" style={C.muted}><ArrowLeft className="w-4 h-4" /> Library</Link>
      <h1 className="font-display text-4xl mb-1">{data?.resource?.title || "…"}</h1>
      <p className="text-sm mb-5" style={C.muted}>
        Questions found in this PDF, each matched to the curriculum by AI. Only questions you approve can be used by the Assessment Generator
        {data?.resource && !data.resource.extraction_eligible && <span style={{ color: "#F5C76B" }}> - and only once this PDF is marked as a generator source</span>}.
      </p>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 mb-4" style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)" }}>{error}</p>}

      {data && (
        <div className="rounded-2xl p-4 mb-5" style={C.card}>
          {!data.run ? (
            <p className="text-sm" style={C.muted}>Not analysed yet.</p>
          ) : running ? (
            <p className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#20B8A6" }} /> Reading the PDF and matching questions to the curriculum… this takes a minute or two.</p>
          ) : data.run.status === "failed" ? (
            <p className="text-sm" style={{ color: "#F7A1A7" }}>The analysis failed: {data.run.error}</p>
          ) : (
            <div className="text-sm space-y-1">
              <p>
                Read {data.run.pages_read} of {data.run.pages_total} pages ·{" "}
                {data.run.document_guess?.learning_area || "learning area unknown"}
                {data.run.document_guess?.grade_used ? ` · around Grade ${data.run.document_guess.grade_used}` : ""}
              </p>
              {(data.run.notes || []).map((n, i) => <p key={i} style={{ color: "#F5C76B" }}>{n}</p>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => post(`${API}/admin/library/${id}/analyse/`)} disabled={busy || running}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
              <RefreshCw className="w-3.5 h-3.5" /> {data.run ? "Analyse again" : "Analyse"}
            </button>
            {counts.confident_open > 0 && (
              <button onClick={() => post(`${API}/admin/library/${id}/extraction/approve-confident/`)} disabled={busy}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#0E7490", color: "#fff" }}>
                <Check className="w-3.5 h-3.5" /> Approve {counts.confident_open} confident, unflagged
              </button>
            )}
          </div>
          {data.run && <p className="text-xs mt-2" style={C.faint}>Analysing again replaces questions still awaiting review; approved and rejected ones are kept.</p>}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm" style={chip(tab === v)}>
            {l} {tabCount[v] != null && <span className="opacity-70">({tabCount[v]})</span>}
          </button>
        ))}
      </div>

      {data && qs.length === 0 ? (
        <p className="rounded-2xl p-6 text-sm" style={{ ...C.card, ...C.muted }}>Nothing in this list.</p>
      ) : (
        <ul className="space-y-3">{qs.map((q) => <QuestionCard key={q.id} q={q} onChange={update} />)}</ul>
      )}
    </div>
  );
}
