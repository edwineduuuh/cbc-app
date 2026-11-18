"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Upload, X, Archive, Send, Pencil, Trash2, ListChecks } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const KIND_LABEL = { pdf: "PDF", book: "Book", video: "Video" };
const STATUS_STYLE = {
  published: { color: "#5EE6C1", background: "rgba(32,184,166,0.12)" },
  draft: { color: "#F5C76B", background: "rgba(245,199,107,0.12)" },
  archived: { color: "#A9B9CC", background: "rgba(169,185,204,0.12)" },
};
const C = {
  card: { background: "#14243A", border: "1px solid #1F3350" },
  field: { background: "#0F1F3D", color: "#F5F7FA", border: "1px solid #2B4058" },
  muted: { color: "#A9B9CC" },
};
const EMPTY = {
  kind: "pdf", category: "", title: "", description: "", grade: "", subject: "", topic: "",
  substrand: "", access: "", allow_download: true, extraction_eligible: false, video_url: "",
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={C.muted}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: "#7F93AB" }}>{hint}</span>}
    </label>
  );
}

export default function AdminLibraryPage() {
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ kind: "", status: "", q: "" });
  const [form, setForm] = useState(null);       // null = closed; {...EMPTY, id?}
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [substrands, setSubstrands] = useState([]);

  useEffect(() => {
    fetchWithAuth(`${API}/admin/library/meta/`).then((r) => r.json()).then(setMeta).catch(() => {});
    fetch(`${API}/subjects/`).then((r) => r.json()).then((d) => Array.isArray(d) && setSubjects(d)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    try {
      const r = await fetchWithAuth(`${API}/admin/library/?${p}`);
      if (!r.ok) throw new Error();
      setRows((await r.json()).results || []);
      setError("");
    } catch {
      setError("Couldn't load resources.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { const t = setTimeout(load, filter.q ? 300 : 0); return () => clearTimeout(t); }, [load, filter.q]);

  // Strands for the chosen learning area + grade, then sub-strands of the strand.
  useEffect(() => {
    if (!form?.subject) return setTopics([]);
    const p = new URLSearchParams({ subject: form.subject });
    if (form.grade) p.set("grade", form.grade);
    fetch(`${API}/topics/?${p}`).then((r) => r.json()).then((d) => setTopics(Array.isArray(d) ? d : [])).catch(() => {});
  }, [form?.subject, form?.grade]);
  useEffect(() => {
    if (!form?.topic) return setSubstrands([]);
    fetch(`${API}/substrands/?topic=${form.topic}`).then((r) => r.json())
      .then((d) => setSubstrands(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, [form?.topic]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === "kind" ? { category: "", extraction_eligible: false } : {}),
    ...(k === "subject" ? { topic: "", substrand: "" } : {}), ...(k === "topic" ? { substrand: "" } : {}) }));

  const edit = (r) => {
    setFiles({});
    setForm({
      ...EMPTY, id: r.id, kind: r.kind, category: r.category, title: r.title, description: r.description || "",
      grade: r.grade || "", subject: r.subject?.id || "", topic: r.topic?.id || "", substrand: r.substrand?.id || "",
      access: r.access, allow_download: r.allow_download, extraction_eligible: r.extraction_eligible,
      video_url: r.video_url || "", status: r.status, has_file: r.has_file, has_video: r.has_video,
    });
  };

  const save = async (publish) => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      for (const k of Object.keys(EMPTY)) fd.append(k, form[k] ?? "");
      for (const [k, f] of Object.entries(files)) if (f) fd.append(k, f);
      const r = await fetchWithAuth(form.id ? `${API}/admin/library/${form.id}/` : `${API}/admin/library/`,
        { method: form.id ? "PATCH" : "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed.");
      if (publish && d.status !== "published") {
        const p = await fetchWithAuth(`${API}/admin/library/${d.id}/publish/`, { method: "POST" });
        const pd = await p.json();
        if (!p.ok) throw new Error(`Saved as draft. ${pd.error || ""}`);
      }
      setForm(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (r, action) => {
    if (action === "delete" && !window.confirm(`Delete draft "${r.title}"?`)) return;
    const res = await fetchWithAuth(
      action === "delete" ? `${API}/admin/library/${r.id}/` : `${API}/admin/library/${r.id}/${action}/`,
      { method: action === "delete" ? "DELETE" : "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "That didn't work.");
    }
    load();
  };

  const cats = meta?.categories?.[form?.kind] || [];
  const extractable = form && form.kind === "pdf" && meta?.extractable?.includes(form.category);
  const chip = (active) => ({
    background: active ? "#20B8A6" : "#14243A", color: active ? "#080F1D" : "#A9B9CC",
    border: `1px solid ${active ? "#20B8A6" : "#24384F"}`,
  });
  const input = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: "#F5F7FA" }}>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-4xl mb-1">Library</h1>
          <p className="text-sm" style={C.muted}>PDFs, books and videos for learners. Revision Notes also appear in the facilitator portal.</p>
        </div>
        <button onClick={() => { setFiles({}); setForm({ ...EMPTY }); }}
          className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#0E7490", color: "#fff" }}>
          <Plus className="w-4 h-4" /> Add resource
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[["", "All"], ["pdf", "PDFs"], ["book", "Books"], ["video", "Videos"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter((f) => ({ ...f, kind: v }))} className="rounded-full px-3.5 py-1.5 text-sm" style={chip(filter.kind === v)}>{l}</button>
        ))}
        <span className="w-px h-6 mx-1" style={{ background: "#24384F" }} />
        {[["", "Any status"], ["draft", "Drafts"], ["published", "Published"], ["archived", "Archived"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter((f) => ({ ...f, status: v }))} className="rounded-full px-3 py-1 text-xs" style={chip(filter.status === v)}>{l}</button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 w-full sm:w-64" style={C.field}>
          <Search className="w-4 h-4" style={C.muted} />
          <input value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} placeholder="Search titles"
            className="bg-transparent outline-none text-sm flex-1" />
        </label>
      </div>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 mb-4" style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)" }}>{error}</p>}

      <div className="rounded-2xl overflow-hidden" style={C.card}>
        {loading ? <p className="p-6 text-sm" style={C.muted}>Loading…</p>
          : rows.length === 0 ? <p className="p-6 text-sm" style={C.muted}>No resources yet. Click <b>Add resource</b> to upload the first one.</p>
          : (
            <ul>
              {rows.map((r, i) => (
                <li key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4" style={{ borderTop: i ? "1px solid #1F3350" : "none" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{r.title}</span>
                      <span className="text-[11px] font-semibold uppercase rounded-full px-2 py-0.5" style={STATUS_STYLE[r.status]}>{r.status}</span>
                      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                        style={r.access === "premium" ? { color: "#F5C76B", background: "rgba(245,199,107,0.12)" }
                          : r.access === "free" ? { color: "#5EE6C1", background: "rgba(32,184,166,0.12)" }
                          : { color: "#F7A1A7", background: "rgba(240,113,120,0.12)" }}>
                        {r.access === "premium" ? "Premium" : r.access === "free" ? "Free" : "Not classified"}
                      </span>
                      {r.extraction_eligible && <span className="text-[11px] rounded-full px-2 py-0.5" style={{ color: "#9DB8FF", background: "rgba(120,150,255,0.12)" }}>Generator source</span>}
                    </div>
                    <p className="text-sm truncate" style={C.muted}>
                      {KIND_LABEL[r.kind]} · {r.category_label}
                      {[r.grade && ` · Grade ${r.grade}`, r.subject && ` · ${r.subject.name}`, r.topic && ` · ${r.topic.name}`].filter(Boolean).join("")}
                      {r.page_count ? ` · ${r.page_count} pp` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.kind === "pdf" && r.has_file && (
                      <Link href={`/admin/library/${r.id}/review`} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
                        <ListChecks className="w-3.5 h-3.5" /> Questions
                      </Link>
                    )}
                    <button onClick={() => edit(r)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1B2C43", border: "1px solid #24384F" }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    {r.status !== "published" && <button onClick={() => act(r, "publish")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#0E7490", color: "#fff" }}><Send className="w-3.5 h-3.5" /> Publish</button>}
                    {r.status === "published" && <button onClick={() => act(r, "archive")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1B2C43", border: "1px solid #24384F" }}><Archive className="w-3.5 h-3.5" /> Archive</button>}
                    {r.status !== "published" && <button onClick={() => act(r, "delete")} aria-label="Delete" className="rounded-lg px-2.5 py-1.5" style={{ background: "#1B2C43", border: "1px solid #24384F", color: "#F7A1A7" }}><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>

      {form && (
        <div className="fixed inset-0 z-[80] flex justify-end" style={{ background: "rgba(4,10,20,0.75)" }} role="dialog" aria-modal="true">
          <div className="w-full max-w-xl h-full overflow-y-auto p-6" style={{ background: "#0F1F3D" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-3xl">{form.id ? "Edit resource" : "Add resource"}</h2>
              <button onClick={() => setForm(null)} aria-label="Close" className="p-1.5 rounded-lg" style={{ background: "#1B2C43" }}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <Field label="Type">
                <div className="grid grid-cols-3 gap-2">
                  {["pdf", "book", "video"].map((k) => (
                    <button key={k} type="button" onClick={() => set("kind", k)} disabled={!!form.id}
                      className="rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60" style={chip(form.kind === k)}>{KIND_LABEL[k]}</button>
                  ))}
                </div>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={input} style={C.field}>
                  <option value="">Choose…</option>
                  {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Title"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={input} style={C.field} /></Field>
              <Field label="Description"><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={input} style={C.field} /></Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Grade">
                  <select value={form.grade} onChange={(e) => set("grade", e.target.value)} className={input} style={C.field}>
                    <option value="">Any</option>{GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </Field>
                <Field label="Learning area">
                  <select value={form.subject} onChange={(e) => set("subject", e.target.value)} className={input} style={C.field}>
                    <option value="">Any</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Strand">
                  <select value={form.topic} onChange={(e) => set("topic", e.target.value)} disabled={!form.subject} className={input} style={C.field}>
                    <option value="">Any</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}{!form.grade ? ` (G${t.grade})` : ""}</option>)}
                  </select>
                </Field>
                <Field label="Sub-strand">
                  <select value={form.substrand} onChange={(e) => set("substrand", e.target.value)} disabled={!form.topic} className={input} style={C.field}>
                    <option value="">Any</option>{substrands.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              </div>

              {form.kind === "video" ? (
                <>
                  <Field label="Video link" hint="Unlisted YouTube or another authorised link - or upload a file below.">
                    <input value={form.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://…" className={input} style={C.field} />
                  </Field>
                  <Field label={form.has_video ? "Replace video file" : "Video file"}>
                    <input type="file" accept="video/*" onChange={(e) => setFiles((f) => ({ ...f, video_file: e.target.files[0] }))} className="text-sm" />
                  </Field>
                </>
              ) : (
                <Field label={form.has_file ? "Replace PDF" : "PDF file"} hint={form.kind === "pdf"
                  ? "The original is kept untouched; learners get a copy with the StadiSpace footer. After upload, AI finds the questions and suggests where each fits in the curriculum for you to review."
                  : "The original is kept untouched; learners get a copy with the StadiSpace footer on every page."}>
                  <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFiles((f) => ({ ...f, file: e.target.files[0] }))} className="text-sm" />
                </Field>
              )}
              <Field label="Cover / thumbnail (optional)">
                <input type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, thumbnail: e.target.files[0] }))} className="text-sm" />
              </Field>

              <Field label="Access for learners" hint="Required before publishing - nothing is published as Free by default.">
                <div className="grid grid-cols-2 gap-2">
                  {[["free", "Free"], ["premium", "Premium"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set("access", v)} className="rounded-xl py-2.5 text-sm font-semibold" style={chip(form.access === v)}>{l}</button>
                  ))}
                </div>
              </Field>

              {form.kind !== "video" && (
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={form.allow_download} onChange={(e) => set("allow_download", e.target.checked)} />
                  Allow download (otherwise view only)
                </label>
              )}
              {extractable && (
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={form.extraction_eligible} onChange={(e) => set("extraction_eligible", e.target.checked)} />
                  <span>Use as a source for the Assessment Generator
                    <span className="block text-xs" style={{ color: "#7F93AB" }}>Facilitators never see this file - only questions drawn from it.</span>
                  </span>
                </label>
              )}
            </div>

            <div className="flex gap-2 mt-7">
              <button disabled={saving} onClick={() => save(false)} className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-60" style={{ background: "#1B2C43", border: "1px solid #24384F" }}>
                {form.id ? "Save changes" : "Save draft"}
              </button>
              {form.status !== "published" && (
                <button disabled={saving} onClick={() => save(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold disabled:opacity-60" style={{ background: "#F5F7FA", color: "#081321" }}>
                  <Upload className="w-4 h-4" /> {saving ? "Saving…" : "Save & publish"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
