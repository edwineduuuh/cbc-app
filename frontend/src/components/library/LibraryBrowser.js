"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Lock, FileText, BookText, PlayCircle, X, Download, Crown } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";

const CATEGORIES = {
  pdf: [
    ["revision_notes", "Revision Notes"],
    ["worksheets", "Worksheets"],
    ["practice_papers", "Practice Papers"],
    ["exam_prep", "Exam Prep"],
    ["marking_schemes", "Marking Schemes"],
    ["study_guides", "Study Guides"],
    ["practical_guides", "Practical Guides"],
  ],
  book: [
    ["textbook", "Textbooks"],
    ["reference", "Reference"],
    ["revision_book", "Revision"],
    ["supplementary", "Supplementary"],
    ["other_book", "Other"],
  ],
  video: [
    ["topic_lesson", "Topic Lessons"],
    ["worked_example", "Worked Examples"],
    ["practical_demo", "Practicals"],
    ["topic_revision", "Revision"],
    ["exam_prep_video", "Exam Prep"],
  ],
};
const ICON = { pdf: FileText, book: BookText, video: PlayCircle };
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const C = {
  card: { background: "#14243A", border: "1px solid #1F3350" },
  field: { background: "#0F1F3D", color: "#F5F7FA", border: "1px solid #2B4058" },
  muted: { color: "#A9B9CC" },
};

function youtubeEmbed(url) {
  const m = url && url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

/**
 * kind      "pdf" | "book" | "video"
 * portal    "student" (default) or "facilitator" - facilitators only ever
 *           reach Revision Notes, via their own endpoint.
 */
export default function LibraryBrowser({ kind = "pdf", portal = "student", title, intro }) {
  const facilitator = portal === "facilitator";
  const listUrl = facilitator ? `${API}/facilitator/revision-notes/` : `${API}/library/`;
  const openBase = facilitator ? `${API}/facilitator/revision-notes` : `${API}/library`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [q, setQ] = useState("");
  const [viewer, setViewer] = useState(null);   // {item, url, kind}
  const [upgrade, setUpgrade] = useState(null); // item
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    fetch(`${API}/subjects/`).then((r) => r.json()).then((d) => Array.isArray(d) && setSubjects(d)).catch(() => {});
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (!facilitator) p.set("kind", kind);
    if (category) p.set("category", category);
    if (grade) p.set("grade", grade);
    if (subject) p.set("subject", subject);
    if (q.trim()) p.set("q", q.trim());
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetchWithAuth(`${listUrl}?${p}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        setRows(d.results || []);
        setError("");
      } catch {
        setError("Couldn't load the library. Refresh to try again.");
      } finally {
        setLoading(false);
      }
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [kind, category, grade, subject, q, listUrl, facilitator]);

  // Revoke blob URLs when the viewer closes.
  useEffect(() => () => { if (viewer?.blob) URL.revokeObjectURL(viewer.url); }, [viewer]);

  const open = async (item) => {
    if (item.locked) return setUpgrade(item);
    setOpening(item.id);
    try {
      const r = await fetchWithAuth(`${openBase}/${item.id}/open/`);
      if (r.status === 402) return setUpgrade(item);
      if (!r.ok) throw new Error();
      if (item.kind === "video") {
        const d = await r.json();
        setViewer({ item, url: d.url, kind: "video" });
      } else {
        const blob = await r.blob();
        setViewer({ item, url: URL.createObjectURL(blob), kind: "pdf", blob: true,
          canDownload: r.headers.get("X-Allow-Download") !== "0" });
      }
    } catch {
      setError("That resource couldn't be opened. Try again.");
    } finally {
      setOpening(null);
    }
  };

  const cats = facilitator ? [] : CATEGORIES[kind] || [];
  const Icon = ICON[kind] || FileText;
  const freeCount = useMemo(() => rows.filter((r) => !r.locked).length, [rows]);

  const chip = (active) => ({
    background: active ? "#20B8A6" : "#14243A",
    color: active ? "#080F1D" : "#A9B9CC",
    border: `1px solid ${active ? "#20B8A6" : "#24384F"}`,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: "#F5F7FA" }}>
      <h1 className="font-display text-4xl mb-1">{title}</h1>
      {intro && <p className="text-sm mb-6" style={C.muted}>{intro}</p>}

      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
          {[["", "All"], ...cats].map(([v, l]) => (
            <button key={v} onClick={() => setCategory(v)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium" style={chip(category === v)}>{l}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_2fr] gap-2 mb-6">
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm" style={C.field}>
          <option value="">All grades</option>
          {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm" style={C.field}>
          <option value="">All learning areas</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="col-span-2 sm:col-span-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={C.field}>
          <Search className="w-4 h-4" style={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles"
            className="bg-transparent outline-none text-sm flex-1" style={{ color: "#F5F7FA" }} />
        </label>
      </div>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 mb-4" style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)" }}>{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={C.card} />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={C.card}>
          <Icon className="w-8 h-8 mx-auto mb-3" style={{ color: "#20B8A6" }} />
          <p className="font-semibold mb-1">Nothing here yet</p>
          <p className="text-sm" style={C.muted}>New resources are added regularly. Try another filter or check back soon.</p>
        </div>
      ) : (
        <>
          {!facilitator && rows.some((r) => r.locked) && (
            <p className="text-xs mb-3" style={C.muted}>{freeCount} free · {rows.length - freeCount} Premium</p>
          )}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((item) => {
              const ItemIcon = ICON[item.kind] || FileText;
              return (
                <li key={item.id}>
                  <button onClick={() => open(item)} disabled={opening === item.id}
                    className="w-full text-left rounded-2xl overflow-hidden transition-colors hover:border-[#2E6E78] disabled:opacity-60" style={C.card}>
                    <div className="h-28 relative grid place-items-center" style={{ background: "#0F1F3D" }}>
                      {item.thumbnail
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                        : <ItemIcon className="w-10 h-10" style={{ color: "#2E6E78" }} />}
                      <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
                        style={item.access === "premium"
                          ? { background: "rgba(245,199,107,0.15)", color: "#F5C76B" }
                          : { background: "rgba(32,184,166,0.15)", color: "#5EE6C1" }}>
                        {item.locked ? <Lock className="w-3 h-3" /> : item.access === "premium" ? <Crown className="w-3 h-3" /> : null}
                        {item.access === "premium" ? "Premium" : "Free"}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] uppercase tracking-wide font-semibold mb-1" style={{ color: "#20B8A6" }}>
                        {item.category_label}
                      </p>
                      <p className="font-semibold leading-snug mb-1.5 line-clamp-2">{item.title}</p>
                      <p className="text-xs" style={C.muted}>
                        {[item.grade && `Grade ${item.grade}`, item.subject?.name, item.topic?.name].filter(Boolean).join(" · ")}
                        {item.page_count ? ` · ${item.page_count} page${item.page_count > 1 ? "s" : ""}` : ""}
                      </p>
                      {opening === item.id && <p className="text-xs mt-2" style={{ color: "#20B8A6" }}>Opening…</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Viewer */}
      {viewer && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "rgba(4,10,20,0.92)" }} role="dialog" aria-modal="true">
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#0F1F3D" }}>
            <p className="flex-1 font-semibold truncate">{viewer.item.title}</p>
            {viewer.kind === "pdf" && viewer.canDownload && (
              <a href={viewer.url} download={`${viewer.item.title}.pdf`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: "#0E7490", color: "#fff" }}>
                <Download className="w-4 h-4" /> Download
              </a>
            )}
            <button onClick={() => setViewer(null)} aria-label="Close" className="p-1.5 rounded-lg" style={{ background: "#1B2C43" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 p-2 sm:p-4">
            {viewer.kind === "pdf" ? (
              <iframe src={`${viewer.url}#toolbar=${viewer.canDownload ? 1 : 0}`} title={viewer.item.title}
                className="w-full h-full rounded-xl" style={{ background: "#fff" }} />
            ) : youtubeEmbed(viewer.url) ? (
              <iframe src={youtubeEmbed(viewer.url)} title={viewer.item.title} allowFullScreen
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                className="w-full h-full rounded-xl" />
            ) : (
              <video src={viewer.url} controls controlsList="nodownload" className="w-full h-full rounded-xl" style={{ background: "#000" }} />
            )}
          </div>
        </div>
      )}

      {/* Upgrade */}
      {upgrade && (
        <div className="fixed inset-0 z-[80] grid place-items-center px-4" style={{ background: "rgba(4,10,20,0.8)" }}
          role="dialog" aria-modal="true" onClick={() => setUpgrade(null)}>
          <div className="w-full max-w-sm rounded-3xl p-7 text-center" style={C.card} onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-2xl" style={{ background: "rgba(245,199,107,0.15)", color: "#F5C76B" }}>
              <Crown className="w-6 h-6" />
            </span>
            <h2 className="font-display text-3xl mb-2">Premium resource</h2>
            <p className="text-sm mb-1 font-semibold">{upgrade.title}</p>
            <p className="text-sm mb-6" style={C.muted}>
              Upgrade to Premium to open every PDF, book and video, plus unlimited quizzes. Pay with M-Pesa.
            </p>
            <Link href="/subscribe" className="block w-full rounded-xl py-3 font-semibold mb-2" style={{ background: "#F5F7FA", color: "#081321" }}>
              See Premium plans
            </Link>
            <button onClick={() => setUpgrade(null)} className="w-full py-2.5 text-sm" style={C.muted}>Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}
