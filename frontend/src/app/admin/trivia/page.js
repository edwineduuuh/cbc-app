"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Upload, X, Pencil, Trash2, Download, Loader2, Check, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";
const C = {
  card: { background: "#14243A", border: "1px solid #1F3350" },
  field: { background: "#0F1F3D", color: "#F5F7FA", border: "1px solid #2B4058" },
  muted: { color: "#A9B9CC" },
};
const TYPES = { mcq: "Multiple choice", true_false: "True or false", picture: "Picture", short: "Type the answer" };
const DIFFS = ["easy", "medium", "hard", "expert"];
const DIFF_COLOR = { easy: "#3CCB8B", medium: "#E8B65B", hard: "#FF9F5A", expert: "#F07178" };
const MODES = { quick: "Quick Play", daily: "Daily Challenge", picture: "Picture Trivia", true_false: "True or False",
  teasers: "Brain Teasers", category: "Category Challenge", survival: "Survival" };
const CONDITIONS = {
  games: "Games finished ≥ N", perfect: "Perfect round (all correct, ≥ N questions)",
  fast: "N fast correct answers in one game (< 5s each)", category: "Correct answers in a category ≥ N",
  mode: "Games finished in a mode ≥ N", daily: "Daily Challenges completed ≥ N", survival: "Survival run of N",
  streak: "N correct in a row", collector: "Badges unlocked ≥ N", level: "Reach level N",
};
const LETTERS = "ABCDEF";

async function api(path, { method = "GET", body, form } = {}) {
  const r = await fetchWithAuth(`${API}/admin/trivia/${path}`, {
    method, ...(form ? { body: form } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status === 204) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || d.detail || "Request failed.");
  return d;
}

function Field({ label, children, hint, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={C.muted}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: "#7F93AB" }}>{hint}</span>}
    </label>
  );
}
const input = "w-full rounded-xl px-3 py-2.5 text-sm";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-8" style={{ background: "rgba(4,10,20,0.8)" }} role="dialog" aria-modal="true">
      <div className={`w-full ${wide ? "max-w-5xl" : "max-w-xl"} rounded-2xl p-5 sm:p-6`} style={{ background: "#0F1F3D", border: "1px solid #26384F" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg" style={C.card}><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorLine({ text }) {
  return text ? <p role="alert" className="text-sm rounded-xl px-4 py-3 my-3" style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)" }}>{text}</p> : null;
}

/* ───────────────────────── Overview ───────────────────────── */
function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("analytics/").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <ErrorLine text={err} />;
  if (!d) return <Loader2 className="w-6 h-6 animate-spin" />;
  const maxDaily = Math.max(1, ...d.daily.map((x) => x.players));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Games played", d.games], ["Players", d.players], ["Active (7 days)", d.active_7d], ["Average score", d.avg_score],
          ["Accuracy", `${d.accuracy}%`], ["Published questions", d.questions.published], ["Drafts", d.questions.draft], ["Badges earned", d.badges_earned]]
          .map(([l, v]) => (
            <div key={l} className="rounded-2xl p-4" style={C.card}>
              <p className="text-xs uppercase tracking-wide font-semibold" style={C.muted}>{l}</p>
              <p className="text-2xl font-bold mt-1">{v}</p>
            </div>
          ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={C.card}>
          <p className="font-semibold mb-3">Daily Challenge players - last 14 days</p>
          <div className="flex items-end gap-1 h-32">
            {d.daily.map((x) => (
              <div key={x.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${x.date}: ${x.players}`}>
                <span className="text-[10px]" style={C.muted}>{x.players || ""}</span>
                <div className="w-full rounded-t" style={{ height: `${(x.players / maxDaily) * 100}%`, minHeight: 2, background: "#20B8A6" }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-4" style={C.card}>
          <p className="font-semibold mb-3">Most played modes</p>
          {d.modes.length ? d.modes.map((m) => <p key={m.mode} className="flex justify-between text-sm py-1"><span>{m.mode}</span><b>{m.games}</b></p>)
            : <p className="text-sm" style={C.muted}>No games yet.</p>}
          <p className="font-semibold mt-4 mb-2">Most answered categories</p>
          {d.categories.length ? d.categories.map((c) => <p key={c.category} className="flex justify-between text-sm py-1"><span>{c.category}</span><b>{c.answers}</b></p>)
            : <p className="text-sm" style={C.muted}>No answers yet.</p>}
        </div>
        <div className="rounded-2xl p-4" style={C.card}>
          <p className="font-semibold mb-3">Hardest questions (5+ answers)</p>
          {d.hardest.length ? d.hardest.map((q) => (
            <p key={q.id} className="flex justify-between gap-3 text-sm py-1.5" style={{ borderTop: "1px solid #1F3350" }}>
              <span className="truncate">#{q.id} {q.text}</span><b style={{ color: "#F07178" }}>{q.correct_rate}%</b>
            </p>)) : <p className="text-sm" style={C.muted}>Not enough answers yet.</p>}
        </div>
        <div className="rounded-2xl p-4" style={C.card}>
          <p className="font-semibold mb-3">Badges earned</p>
          {d.badges.map((b) => <p key={b.name} className="flex justify-between text-sm py-1"><span>{b.icon} {b.name}</span><b>{b.earned}</b></p>)}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Questions ───────────────────────── */
const EMPTY_Q = { category: "", type: "mcq", difficulty: "medium", is_teaser: false, text: "", options: ["", "", "", ""],
  correct_index: null, accepted_answers: "", explanation: "", source: "", time_limit: "", min_grade: "", max_grade: "",
  status: "draft", image_alt: "" };

function Preview({ f, cats, imgUrl, explUrl }) {
  const cat = cats.find((c) => String(c.id) === String(f.category));
  const opts = f.type === "true_false" ? ["✓ TRUE", "✗ FALSE"] : f.options.filter(Boolean);
  return (
    <div className="rounded-2xl p-4" style={{ background: "#081321", border: "1px solid #26384F" }}>
      <p className="text-[11px] uppercase tracking-wider font-bold mb-3" style={C.muted}>Player preview</p>
      <div className="flex gap-2 mb-3">
        {cat && <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `${cat.color}26`, color: cat.color }}>{cat.icon} {cat.name}</span>}
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: DIFF_COLOR[f.difficulty] }}>{f.difficulty}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imgUrl && <img src={imgUrl} alt={f.image_alt} className="w-full max-h-44 object-contain rounded-xl mb-3" style={{ background: "#0F1F3D" }} />}
      <p className="text-lg font-extrabold mb-3">{f.text || "Your question appears here"}</p>
      {f.type === "short" ? (
        <div className="rounded-xl px-3 py-3 text-sm" style={C.field}>Type your answer…</div>
      ) : (
        <div className={`grid gap-2 ${f.type === "true_false" ? "grid-cols-2" : ""}`}>
          {opts.map((o, i) => (
            <div key={i} className="rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center gap-2"
              style={{ background: "#14243A", border: `2px solid ${f.correct_index === i ? "#3CCB8B" : "#26384F"}` }}>
              {f.type !== "true_false" && <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "#4D8DDA", color: "#080F1D" }}>{LETTERS[i]}</span>}
              {o}
            </div>
          ))}
        </div>
      )}
      {f.explanation && <p className="text-sm mt-3 rounded-xl px-3 py-2" style={{ background: "rgba(77,141,218,0.10)", color: "#CFE0F5" }}>💡 <b>Did you know?</b> {f.explanation}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {explUrl && <img src={explUrl} alt="Explanation picture" className="w-full max-h-44 object-contain rounded-xl mt-2" style={{ background: "#0F1F3D" }} />}
      <p className="text-[11px] mt-3" style={C.muted}>The green border marks the correct answer (players don&apos;t see it). Choices are shuffled for each player.</p>
    </div>
  );
}

function QuestionEditor({ initial, cats, onClose, onSaved }) {
  const [f, setF] = useState(() => initial ? {
    ...EMPTY_Q, ...initial,
    options: initial.type === "mcq" || initial.type === "picture" ? [...initial.options, "", ""].slice(0, Math.max(4, initial.options.length)) : ["", "", "", ""],
    accepted_answers: (initial.accepted_answers || []).join("\n"),
    time_limit: initial.time_limit ?? "", min_grade: initial.min_grade ?? "", max_grade: initial.max_grade ?? "",
  } : { ...EMPTY_Q, category: cats[0]?.id || "" });
  const [file, setFile] = useState(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [explFile, setExplFile] = useState(null);
  const [removeExpl, setRemoveExpl] = useState(false);
  const explUrl = useMemo(() => explFile ? URL.createObjectURL(explFile) : (!removeExpl && initial?.explanation_image) || null,
    [explFile, removeExpl, initial]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState([]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const imgUrl = useMemo(() => file ? URL.createObjectURL(file) : (!removeImg && initial?.image) || null, [file, removeImg, initial]);

  const save = async (status) => {
    setSaving(true); setErr("");
    const body = {
      category: f.category, type: f.type, difficulty: f.difficulty, is_teaser: f.is_teaser, text: f.text,
      explanation: f.explanation, source: f.source, image_alt: f.image_alt, status: status || f.status,
      time_limit: f.time_limit, min_grade: f.min_grade, max_grade: f.max_grade,
      options: f.options.filter((o) => o.trim()), correct_index: f.correct_index,
      accepted_answers: f.accepted_answers.split(/\n|\|/).map((s) => s.trim()).filter(Boolean),
      remove_image: removeImg, remove_explanation_image: removeExpl,
    };
    try {
      let res;
      const path = initial ? `questions/${initial.id}/` : "questions/";
      const method = initial ? "PATCH" : "POST";
      if (file || explFile) {
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => form.append(k, Array.isArray(v) ? JSON.stringify(v) : v ?? ""));
        if (file) form.append("image", file);
        if (explFile) form.append("explanation_image", explFile);
        res = await api(path, { method, form });
      } else {
        res = await api(path, { method, body });
      }
      if (res.warnings?.length) setWarn(res.warnings);
      onSaved(res, !res.warnings?.some((w) => w.includes("duplicate")));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Keep the correct answer pointing at a real choice when choices are removed.
  const setOption = (i, v) => set("options", f.options.map((o, j) => (j === i ? v : o)));
  const choices = f.type === "mcq" || f.type === "picture";

  return (
    <Modal title={initial ? `Edit question #${initial.id}` : "New trivia question"} onClose={onClose} wide>
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Category">
              <select value={f.category} onChange={(e) => set("category", e.target.value)} className={input} style={C.field}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={f.type} onChange={(e) => { set("type", e.target.value); set("correct_index", null); }} className={input} style={C.field}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)} className={input} style={C.field}>
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Timer (s)" hint="Empty = default">
              <input type="number" min={5} max={120} value={f.time_limit} onChange={(e) => set("time_limit", e.target.value)} className={input} style={C.field} />
            </Field>
          </div>
          <Field label={f.type === "true_false" ? "Statement" : "Question"}>
            <textarea rows={3} value={f.text} onChange={(e) => set("text", e.target.value)} className={input} style={C.field}
              placeholder={f.type === "true_false" ? "e.g. Mount Kenya is the highest mountain in Africa." : "e.g. Which planet has the most confirmed moons?"} />
          </Field>

          <div className="rounded-xl p-3" style={C.card}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Picture {f.type === "picture" ? "(required)" : "(optional)"}</p>
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept="image/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveImg(false); }} className="text-sm" />
              {(initial?.image || file) && !removeImg && (
                <button type="button" onClick={() => { setFile(null); setRemoveImg(true); }} className="text-xs underline" style={{ color: "#F07178" }}>Remove picture</button>
              )}
            </div>
            <input value={f.image_alt} onChange={(e) => set("image_alt", e.target.value)} placeholder="Describe the picture for screen readers (doesn't give away the answer)"
              className={`${input} mt-2`} style={C.field} />
          </div>

          {choices && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Answer choices - tick the correct one</p>
              <div className="space-y-2">
                {f.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={f.correct_index === i} onChange={() => set("correct_index", i)} aria-label={`Choice ${LETTERS[i]} is correct`} className="w-4 h-4" />
                    <span className="w-5 font-bold text-sm">{LETTERS[i]}</span>
                    <input value={o} onChange={(e) => setOption(i, e.target.value)} className={input} style={C.field} />
                    {f.options.length > 2 && (
                      <button type="button" aria-label="Remove choice" onClick={() => {
                        set("options", f.options.filter((_, j) => j !== i));
                        if (f.correct_index === i) set("correct_index", null);
                        else if (f.correct_index > i) set("correct_index", f.correct_index - 1);
                      }} className="p-2" style={C.muted}><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              {f.options.length < 6 && <button type="button" onClick={() => set("options", [...f.options, ""])} className="text-sm mt-2" style={{ color: "#20B8A6" }}>+ Add a choice</button>}
            </div>
          )}
          {f.type === "true_false" && (
            <div className="flex gap-3">
              {["True", "False"].map((t, i) => (
                <button key={t} type="button" onClick={() => set("correct_index", i)} className="flex-1 rounded-xl py-3 font-bold"
                  style={{ background: f.correct_index === i ? (i ? "#F07178" : "#3CCB8B") : "#14243A", color: f.correct_index === i ? "#080F1D" : "#F5F7FA" }}>
                  The statement is {t}
                </button>
              ))}
            </div>
          )}
          {f.type === "short" && (
            <Field label="Accepted answers" hint="One per line. Capitals, punctuation and 'the/a/an' are ignored when marking.">
              <textarea rows={3} value={f.accepted_answers} onChange={(e) => set("accepted_answers", e.target.value)} className={input} style={C.field} placeholder={"piano\na piano"} />
            </Field>
          )}

          <Field label="Explanation / fun fact" hint="Shown after every answer - this is where players learn something.">
            <textarea rows={2} value={f.explanation} onChange={(e) => set("explanation", e.target.value)} className={input} style={C.field} />
          </Field>
          <div className="rounded-xl p-3" style={C.card}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Explanation picture (optional)</p>
            <p className="text-xs mb-2" style={{ color: "#7F93AB" }}>Shown with the explanation after the player answers - a labelled diagram, the map, the landmark. Never shown before they answer.</p>
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept="image/*" onChange={(e) => { setExplFile(e.target.files?.[0] || null); setRemoveExpl(false); }} className="text-sm" aria-label="Explanation picture" />
              {explUrl && (
                <button type="button" onClick={() => { setExplFile(null); setRemoveExpl(true); }} className="text-xs underline" style={{ color: "#F07178" }}>Remove picture</button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Source" className="col-span-2"><input value={f.source} onChange={(e) => set("source", e.target.value)} className={input} style={C.field} placeholder="Where the fact comes from" /></Field>
            <Field label="From grade"><input type="number" value={f.min_grade} onChange={(e) => set("min_grade", e.target.value)} className={input} style={C.field} /></Field>
            <Field label="To grade"><input type="number" value={f.max_grade} onChange={(e) => set("max_grade", e.target.value)} className={input} style={C.field} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.is_teaser} onChange={(e) => set("is_teaser", e.target.checked)} />
            Brain teaser (riddle, logic or pattern - appears in Brain Teasers mode)
          </label>
          <ErrorLine text={err} />
          {warn.length > 0 && <p className="text-sm rounded-xl px-4 py-3" style={{ color: "#F5C76B", background: "rgba(245,199,107,0.10)" }}>{warn.join(" ")}</p>}
          <div className="flex flex-wrap gap-2 justify-end">
            <button disabled={saving} onClick={() => save("draft")} className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={C.card}>Save as draft</button>
            <button disabled={saving} onClick={() => save("published")} className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2" style={{ background: "#20B8A6", color: "#080F1D" }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save &amp; publish
            </button>
          </div>
        </div>
        <Preview f={f} cats={cats} imgUrl={imgUrl} explUrl={explUrl} />
      </div>
    </Modal>
  );
}

const TEMPLATE = [
  "category,type,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation,source,teaser,time_limit,min_grade,max_grade",
  "Geography,mcq,easy,What is the capital city of Uganda?,Kampala,Nairobi,Dodoma,Kigali,A,Kampala has been Uganda's capital since independence in 1962.,,no,,,",
  "Science,true_false,easy,The Sun is a star.,,,,,True,The Sun is a medium-sized star about 150 million km from Earth.,,no,,,",
  "Riddles & Logic,short,medium,What has keys but can't open locks?,,,,,piano|a piano,A piano has 88 keys.,,yes,,,",
].join("\n");

function ImportBox({ onDone }) {
  const [file, setFile] = useState(null);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState("");
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    a.download = "trivia_questions_template.csv";
    a.click();
  };
  const go = async () => {
    setBusy(true); setErr(""); setRep(null);
    const form = new FormData();
    form.append("file", file);
    form.append("publish", publish ? "true" : "false");
    try { setRep(await api("questions/import/", { method: "POST", form })); onDone(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm" style={C.muted}>
        Columns: category (name), type (mcq / true_false / picture / short), difficulty, question, option_a-f, correct
        (a letter, True/False, or accepted answers separated by |), explanation, source, teaser, time_limit, min_grade, max_grade.
        Excel: <i>Save As → CSV UTF-8</i>.
      </p>
      <button onClick={download} className="rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2" style={C.card}><Download className="w-4 h-4" /> Download template</button>
      <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm block" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish straight away (otherwise they arrive as drafts)</label>
      <button disabled={!file || busy} onClick={go} className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-40" style={{ background: "#20B8A6", color: "#080F1D" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
      </button>
      <ErrorLine text={err} />
      {rep && (
        <div className="rounded-xl p-4 text-sm space-y-2" style={C.card}>
          <p className="font-bold" style={{ color: "#3CCB8B" }}>{rep.imported} imported</p>
          {[["Errors (not imported)", rep.errors, "#F07178"], ["Duplicates (skipped)", rep.duplicates, "#F5C76B"], ["Check these", rep.warnings, "#A9B9CC"]]
            .filter(([, xs]) => xs.length).map(([t, xs, c]) => (
              <div key={t}><p className="font-semibold" style={{ color: c }}>{t}: {xs.length}</p>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto" style={C.muted}>{xs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            ))}
        </div>
      )}
    </div>
  );
}

function Questions({ cats }) {
  const [filter, setFilter] = useState({ q: "", category: "", status: "", type: "", difficulty: "", duplicates: "", hard: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(null);         // null | "new" | question
  const [importing, setImporting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) });
    api(`questions/?${p}`).then((d) => { setData(d); setPicked([]); }).catch((e) => setErr(e.message));
  }, [filter, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const bulk = async (action) => {
    if (action === "delete" && !confirm(`Delete ${picked.length} question(s)? Past games keep their own copy.`)) return;
    try {
      const r = await api("questions/bulk/", { method: "POST", body: { ids: picked, action } });
      setNote(r.note || "");
      load();
    } catch (e) { setErr(e.message); }
  };
  const setF = (k, v) => { setFilter((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setEdit("new")} disabled={!cats.length} className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2" style={{ background: "#20B8A6", color: "#080F1D" }}><Plus className="w-4 h-4" /> New question</button>
        <button onClick={() => setImporting(true)} className="rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2" style={C.card}><Upload className="w-4 h-4" /> Import CSV</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
        <label className="col-span-2 flex items-center gap-2 rounded-xl px-3 py-2" style={C.field}>
          <Search className="w-4 h-4" style={C.muted} />
          <input value={filter.q} onChange={(e) => setF("q", e.target.value)} placeholder="Search questions" className="bg-transparent outline-none text-sm flex-1" />
        </label>
        <select value={filter.category} onChange={(e) => setF("category", e.target.value)} className={input} style={C.field}>
          <option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setF("status", e.target.value)} className={input} style={C.field}>
          <option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
        <select value={filter.type} onChange={(e) => setF("type", e.target.value)} className={input} style={C.field}>
          <option value="">Any type</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filter.difficulty} onChange={(e) => setF("difficulty", e.target.value)} className={input} style={C.field}>
          <option value="">Any difficulty</option>{DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!filter.duplicates} onChange={(e) => setF("duplicates", e.target.checked ? "1" : "")} /> Possible duplicates{data?.duplicates ? ` (${data.duplicates})` : ""}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!filter.hard} onChange={(e) => setF("hard", e.target.checked ? "1" : "")} /> Most often answered wrong</label>
      </div>
      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 rounded-xl px-3 py-2" style={C.card}>
          <span className="text-sm font-semibold">{picked.length} selected</span>
          <button onClick={() => bulk("publish")} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>Publish</button>
          <button onClick={() => bulk("draft")} className="rounded-lg px-3 py-1.5 text-sm" style={C.field}>Back to draft</button>
          <button onClick={() => bulk("delete")} className="rounded-lg px-3 py-1.5 text-sm" style={{ color: "#F07178", ...C.field }}>Delete</button>
        </div>
      )}
      {note && <p className="text-sm mb-3" style={{ color: "#F5C76B" }}>{note}</p>}
      <ErrorLine text={err} />
      {!data ? <Loader2 className="w-6 h-6 animate-spin" /> : data.results.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={C.card}>
          <p className="font-semibold">No questions here yet</p>
          <p className="text-sm mt-1" style={C.muted}>Write one with &ldquo;New question&rdquo;, or import a CSV.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={C.card}>
          {data.results.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 px-4 py-3" style={i ? { borderTop: "1px solid #1F3350" } : {}}>
              <input type="checkbox" className="mt-1" checked={picked.includes(q.id)} aria-label={`Select question ${q.id}`}
                onChange={(e) => setPicked((p) => e.target.checked ? [...p, q.id] : p.filter((x) => x !== q.id))} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{q.text}</p>
                <p className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1" style={C.muted}>
                  <span>#{q.id}</span><span>{q.category_name}</span><span>{TYPES[q.type]}</span>
                  <span style={{ color: DIFF_COLOR[q.difficulty] }}>{q.difficulty}</span>
                  {q.is_teaser && <span>🧩 teaser</span>}
                  {q.image && <span>🖼️ picture</span>}
                  <span style={{ color: q.status === "published" ? "#5EE6C1" : "#F5C76B" }}>{q.status}</span>
                  {q.times_answered > 0 && <span>{q.times_answered} answers · {q.correct_rate}% right</span>}
                </p>
                {q.warnings.map((w) => <p key={w} className="text-xs mt-1" style={{ color: "#F5C76B" }}>⚠ {w}</p>)}
              </div>
              <button onClick={() => setEdit(q)} aria-label="Edit" className="p-2 rounded-lg" style={C.field}><Pencil className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg px-3 py-1.5 disabled:opacity-40" style={C.card}>Previous</button>
          <span style={C.muted}>Page {page} of {data.pages} · {data.count} questions</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg px-3 py-1.5 disabled:opacity-40" style={C.card}>Next</button>
        </div>
      )}
      {edit && (
        <QuestionEditor initial={edit === "new" ? null : edit} cats={cats} onClose={() => setEdit(null)}
          onSaved={(_res, close) => { load(); if (close) setEdit(null); }} />
      )}
      {importing && <Modal title="Import questions from CSV" onClose={() => setImporting(false)}><ImportBox onDone={load} /></Modal>}
    </div>
  );
}

/* ───────────────────────── Categories ───────────────────────── */
function Categories({ cats, reload }) {
  const [edit, setEdit] = useState(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setErr("");
    const form = new FormData();
    ["name", "description", "icon", "color", "group", "order"].forEach((k) => form.append(k, edit[k] ?? ""));
    form.append("is_active", edit.is_active ? "true" : "false");
    if (file) form.append("image", file);
    try {
      await api(edit.id ? `categories/${edit.id}/` : "categories/", { method: edit.id ? "PATCH" : "POST", form });
      setEdit(null); setFile(null); reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const remove = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await api(`categories/${c.id}/`, { method: "DELETE" }); reload(); } catch (e) { setErr(e.message); }
  };
  return (
    <div>
      <button onClick={() => setEdit({ name: "", description: "", icon: "", color: "#20B8A6", group: "learn", order: cats.length, is_active: true })}
        className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 mb-3" style={{ background: "#20B8A6", color: "#080F1D" }}><Plus className="w-4 h-4" /> New category</button>
      <ErrorLine text={!edit && err} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cats.map((c) => (
          <div key={c.id} className="rounded-2xl p-4 flex items-start gap-3" style={{ ...C.card, opacity: c.is_active ? 1 : 0.55 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.image ? <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <span className="text-3xl">{c.icon || "❓"}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-bold" style={{ color: c.color }}>{c.name}</p>
              <p className="text-xs" style={C.muted}>{c.published}/{c.questions} published · {c.group === "fun" ? "Just for Fun" : "Learn & Play"} · order {c.order}{c.is_active ? "" : " · OFF"}</p>
              <p className="text-xs mt-1 line-clamp-2" style={C.muted}>{c.description}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setEdit({ ...c }); setErr(""); }} aria-label="Edit" className="p-1.5 rounded-lg" style={C.field}><Pencil className="w-3.5 h-3.5" /></button>
              {c.questions === 0 && <button onClick={() => remove(c)} aria-label="Delete" className="p-1.5 rounded-lg" style={C.field}><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? `Edit ${edit.name}` : "New category"} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Name"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} style={C.field} /></Field>
              <Field label="Emoji"><input value={edit.icon} maxLength={8} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} className={input} style={C.field} /></Field>
            </div>
            <Field label="Description"><input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={input} style={C.field} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Colour"><input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="w-full h-10 rounded-xl" style={C.field} /></Field>
              <Field label="Group">
                <select value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })} className={input} style={C.field}>
                  <option value="learn">Learn &amp; Play</option><option value="fun">Just for Fun</option>
                </select>
              </Field>
              <Field label="Order"><input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: e.target.value })} className={input} style={C.field} /></Field>
            </div>
            <Field label="Image (optional - replaces the emoji)"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Active (shown to players)</label>
            <ErrorLine text={err} />
            <button disabled={saving} onClick={save} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ───────────────────────── Badges ───────────────────────── */
function Badges({ cats }) {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const load = () => api("achievements/").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const save = async () => {
    setErr("");
    try {
      await api(edit.id ? `achievements/${edit.id}/` : "achievements/", { method: edit.id ? "PATCH" : "POST", body: edit });
      setEdit(null); load();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (a) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    try { await api(`achievements/${a.id}/`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };
  return (
    <div>
      <button onClick={() => setEdit({ name: "", description: "", icon: "🏅", condition: "games", threshold: 1, xp_reward: 50, is_active: true, category: null, mode: "", order: rows?.length || 0 })}
        className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 mb-3" style={{ background: "#20B8A6", color: "#080F1D" }}><Plus className="w-4 h-4" /> New badge</button>
      <ErrorLine text={!edit && err} />
      {!rows ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((a) => (
            <div key={a.id} className="rounded-2xl p-4 flex items-start gap-3" style={{ ...C.card, opacity: a.is_active ? 1 : 0.55 }}>
              <span className="text-3xl">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{a.name}</p>
                <p className="text-xs" style={C.muted}>{a.description}</p>
                <p className="text-xs mt-1" style={{ color: "#E8B65B" }}>+{a.xp_reward} XP · earned by {a.earned}{a.is_active ? "" : " · OFF"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setEdit({ ...a }); setErr(""); }} aria-label="Edit" className="p-1.5 rounded-lg" style={C.field}><Pencil className="w-3.5 h-3.5" /></button>
                {!a.earned && <button onClick={() => remove(a)} aria-label="Delete" className="p-1.5 rounded-lg" style={C.field}><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? `Edit ${edit.name}` : "New badge"} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Name"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} style={C.field} /></Field>
              <Field label="Emoji"><input value={edit.icon} maxLength={8} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} className={input} style={C.field} /></Field>
            </div>
            <Field label="Description (what players read)"><input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={input} style={C.field} /></Field>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Earned when">
                <select value={edit.condition} onChange={(e) => setEdit({ ...edit, condition: e.target.value })} className={input} style={C.field}>
                  {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="N"><input type="number" min={1} value={edit.threshold} onChange={(e) => setEdit({ ...edit, threshold: e.target.value })} className={input} style={C.field} /></Field>
            </div>
            {edit.condition === "category" && (
              <Field label="Category">
                <select value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className={input} style={C.field}>
                  <option value="">Choose…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {edit.condition === "mode" && (
              <Field label="Game mode">
                <select value={edit.mode || ""} onChange={(e) => setEdit({ ...edit, mode: e.target.value })} className={input} style={C.field}>
                  <option value="">Choose…</option>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="XP reward"><input type="number" min={0} value={edit.xp_reward} onChange={(e) => setEdit({ ...edit, xp_reward: e.target.value })} className={input} style={C.field} /></Field>
              <Field label="Order"><input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: e.target.value })} className={input} style={C.field} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Active</label>
            <ErrorLine text={err} />
            <button onClick={save} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ───────────────────────── Settings ───────────────────────── */
function NumRow({ label, obj, onChange, suffix }) {
  return (
    <div className="rounded-xl p-3" style={C.card}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {DIFFS.map((d) => (
          <label key={d} className="text-xs" style={{ color: DIFF_COLOR[d] }}>{d}
            <input type="number" min={0} value={obj[d]} onChange={(e) => onChange({ ...obj, [d]: Number(e.target.value) })}
              className="w-full rounded-lg px-2 py-1.5 mt-1 text-sm" style={C.field} />
          </label>
        ))}
      </div>
      {suffix && <p className="text-[11px] mt-1" style={C.muted}>{suffix}</p>}
    </div>
  );
}

const POWER_NAMES = { fifty: "✂️ 50/50", time: "⏳ Extra time", second: "🛡️ Second chance", double: "💎 Double points" };

function PowerUpSettings({ pc, onChange }) {
  const setKind = (k, field, v) => onChange({ ...pc, [k]: { ...pc[k], [field]: v } });
  const num = "w-16 rounded-lg px-2 py-1 text-sm";
  return (
    <div className="rounded-xl p-3" style={C.card}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Power-ups (earned by playing, never bought)</p>
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!pc.enabled} onChange={(e) => onChange({ ...pc, enabled: e.target.checked })} /> Power-ups on</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!pc.in_daily} onChange={(e) => onChange({ ...pc, in_daily: e.target.checked })} /> Allowed in the Daily Challenge</label>
        <label className="flex items-center gap-2" style={C.muted}>Most per game
          <input type="number" min={0} max={20} value={pc.per_game} onChange={(e) => onChange({ ...pc, per_game: Number(e.target.value) })} className={num} style={C.field} /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs" style={C.muted}>
            <th className="py-1 pr-3">Power-up</th><th className="pr-3">On</th><th className="pr-3">New players get</th>
            <th className="pr-3">Most held</th><th className="pr-3">Earn one every N in a row</th><th className="pr-3">Earn from Daily</th><th>Seconds added</th>
          </tr></thead>
          <tbody>
            {Object.entries(POWER_NAMES).map(([k, name]) => (
              <tr key={k} style={{ borderTop: "1px solid #1F3350" }}>
                <td className="py-2 pr-3 font-semibold whitespace-nowrap">{name}</td>
                <td className="pr-3"><input type="checkbox" checked={!!pc[k]?.enabled} onChange={(e) => setKind(k, "enabled", e.target.checked)} aria-label={`${name} on`} /></td>
                <td className="pr-3"><input type="number" min={0} value={pc[k]?.start ?? 0} onChange={(e) => setKind(k, "start", Number(e.target.value))} className={num} style={C.field} aria-label={`${name} starting amount`} /></td>
                <td className="pr-3"><input type="number" min={1} value={pc[k]?.max ?? 3} onChange={(e) => setKind(k, "max", Number(e.target.value))} className={num} style={C.field} aria-label={`${name} most held`} /></td>
                <td className="pr-3"><input type="number" min={0} value={pc[k]?.earn_streak ?? 0} onChange={(e) => setKind(k, "earn_streak", Number(e.target.value))} className={num} style={C.field} aria-label={`${name} streak to earn`} /></td>
                <td className="pr-3"><input type="checkbox" checked={!!pc[k]?.earn_daily} onChange={(e) => setKind(k, "earn_daily", e.target.checked)} aria-label={`${name} earned from Daily`} /></td>
                <td>{k === "time" ? <input type="number" min={3} max={60} value={pc.time?.seconds ?? 10} onChange={(e) => setKind("time", "seconds", Number(e.target.value))} className={num} style={C.field} aria-label="Seconds added" /> : <span style={C.muted}>-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] mt-2" style={C.muted}>&ldquo;New players get&rdquo; applies to players who haven&apos;t used power-ups yet. 0 in &ldquo;every N in a row&rdquo; means streaks don&apos;t earn it.</p>
    </div>
  );
}

function Settings() {
  const [cfg, setCfg] = useState(null);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { api("settings/").then((d) => { setCfg(d.config); setInfo(d); }).catch((e) => setErr(e.message)); }, []);
  if (!cfg) return err ? <ErrorLine text={err} /> : <Loader2 className="w-6 h-6 animate-spin" />;
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const save = async () => {
    setErr(""); setMsg("");
    try { const d = await api("settings/", { method: "PATCH", body: cfg }); setCfg(d.config); setMsg("Saved."); }
    catch (e) { setErr(e.message); }
  };
  const repick = async () => {
    setErr(""); setMsg("");
    try { const d = await api("daily/reset/", { method: "POST" }); setMsg(`Today's challenge re-picked: ${d.questions} questions.`); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl p-3" style={C.card}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Game modes</p>
        {Object.entries(MODES).map(([k, name]) => (
          <div key={k} className="flex flex-wrap items-center gap-3 py-1.5" style={{ borderTop: "1px solid #1F3350" }}>
            <label className="flex items-center gap-2 text-sm w-48"><input type="checkbox" checked={cfg.modes[k]?.enabled !== false}
              onChange={(e) => set("modes", { ...cfg.modes, [k]: { ...cfg.modes[k], enabled: e.target.checked } })} /> {name}</label>
            <label className="text-xs flex items-center gap-2" style={C.muted}>{k === "survival" ? "Longest run" : "Questions"}
              <input type="number" min={3} max={100} value={cfg.modes[k]?.questions || 10}
                onChange={(e) => set("modes", { ...cfg.modes, [k]: { ...cfg.modes[k], questions: Number(e.target.value) } })}
                className="w-20 rounded-lg px-2 py-1 text-sm" style={C.field} />
            </label>
            {k === "daily" && (
              <select value={cfg.modes.daily.difficulty || "mixed"} onChange={(e) => set("modes", { ...cfg.modes, daily: { ...cfg.modes.daily, difficulty: e.target.value } })}
                className="rounded-lg px-2 py-1 text-sm" style={C.field}>
                {["mixed", ...DIFFS].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button onClick={repick} className="rounded-lg px-3 py-1.5 text-sm flex items-center gap-2" style={C.field}><RefreshCw className="w-3.5 h-3.5" /> Re-pick today&apos;s challenge</button>
          <span className="text-xs" style={C.muted}>Only works before anyone has played it. Today ({info?.today}, {cfg.timezone}): {info?.today_challenge ? `${info.today_challenge.questions} questions picked` : "not picked yet"}.</span>
        </div>
      </div>
      <PowerUpSettings pc={cfg.powerups} onChange={(v) => set("powerups", v)} />
      <NumRow label="Timer per question (seconds)" obj={cfg.timers} onChange={(v) => set("timers", v)} suffix="A question's own timer overrides this." />
      <NumRow label="Points for a correct answer" obj={cfg.points} onChange={(v) => set("points", v)} />
      <NumRow label="XP for a correct answer" obj={cfg.xp} onChange={(v) => set("xp", v)} />
      <div className="grid sm:grid-cols-5 gap-3">
        <Field label="Max speed bonus (points)"><input type="number" min={0} value={cfg.speed_bonus_max} onChange={(e) => set("speed_bonus_max", Number(e.target.value))} className={input} style={C.field} /></Field>
        <Field label="Daily Challenge XP bonus"><input type="number" min={0} value={cfg.xp_daily_bonus} onChange={(e) => set("xp_daily_bonus", Number(e.target.value))} className={input} style={C.field} /></Field>
        <Field label="Questions per player per day" hint="Outside the Daily Challenge. 0 = no limit"><input type="number" min={0} value={cfg.daily_questions ?? 50} onChange={(e) => set("daily_questions", Number(e.target.value))} className={input} style={C.field} /></Field>
        <Field label="Daily XP limit per player" hint="Stops farming"><input type="number" min={0} value={cfg.xp_daily_cap} onChange={(e) => set("xp_daily_cap", Number(e.target.value))} className={input} style={C.field} /></Field>
        <Field label="Answer screen (ms)" hint="Minimum time the answer + fact stay up"><input type="number" min={800} value={cfg.feedback_ms} onChange={(e) => set("feedback_ms", Number(e.target.value))} className={input} style={C.field} /></Field>
      </div>
      <div className="rounded-xl p-3" style={C.card}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Leaderboards</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {[["enabled", "Show leaderboards"], ["overall", "All-time XP"], ["weekly", "Weekly"], ["daily", "Daily Challenge"], ["category", "By category"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={cfg.leaderboards[k] !== false}
              onChange={(e) => set("leaderboards", { ...cfg.leaderboards, [k]: e.target.checked })} /> {l}</label>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3" style={C.card}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={C.muted}>Levels</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {cfg.levels.map((lv, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-14" style={C.muted}>Level {i + 1}</span>
              <input value={lv.name} onChange={(e) => set("levels", cfg.levels.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={C.field} />
              <input type="number" min={0} disabled={i === 0} value={lv.xp} onChange={(e) => set("levels", cfg.levels.map((x, j) => j === i ? { ...x, xp: Number(e.target.value) } : x))} className="w-24 rounded-lg px-2 py-1.5 text-sm" style={C.field} aria-label="XP needed" />
            </div>
          ))}
        </div>
      </div>
      <ErrorLine text={err} />
      {msg && <p className="text-sm flex items-center gap-2" style={{ color: "#5EE6C1" }}><Check className="w-4 h-4" /> {msg}</p>}
      <button onClick={save} className="rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>Save settings</button>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */
const TABS = [["overview", "Overview"], ["questions", "Questions"], ["categories", "Categories"], ["badges", "Badges"], ["settings", "Settings"]];

export default function AdminTriviaPage() {
  const [tab, setTab] = useState("overview");
  const [cats, setCats] = useState([]);
  const loadCats = useCallback(() => api("categories/").then(setCats).catch(() => {}), []);
  useEffect(() => { loadCats(); }, [loadCats]);
  const pick = setTab;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: "#F5F7FA" }}>
      <h1 className="font-display text-4xl mb-1">Trivia</h1>
      <p className="text-sm mb-5" style={C.muted}>Questions, categories, badges and game settings for StadiSpace Trivia. Separate from quizzes and marks.</p>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => pick(k)} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: tab === k ? "#20B8A6" : "#14243A", color: tab === k ? "#080F1D" : "#A9B9CC" }}>{l}</button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "questions" && <Questions cats={cats} />}
      {tab === "categories" && <Categories cats={cats} reload={loadCats} />}
      {tab === "badges" && <Badges cats={cats} />}
      {tab === "settings" && <Settings />}
    </div>
  );
}
