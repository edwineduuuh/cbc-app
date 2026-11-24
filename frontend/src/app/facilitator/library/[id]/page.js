"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import MathText from "@/components/MathText.js";
import StudioDocument from "@/components/studio/StudioDocument";

const STUDIO = {
  scheme_of_work: { making: "Laying out the term from the KICD design and planning each lesson...",
                    wait: "Usually under a minute", again: "/facilitator/schemes", noun: "scheme of work" },
  lesson_plan: { making: "Writing the lesson plan from the sub-strand's curriculum design...",
                 wait: "Usually under a minute", again: "/facilitator/plans", noun: "lesson plan" },
  record_of_work: { again: "/facilitator/records", noun: "record of work" },
};
import {
  ArrowLeft, Bookmark, Check, Copy, Loader2, Pencil, Printer, AlertTriangle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

const TYPE_LABEL = { mcq: "Multiple choice", structured: "Structured" };

// Paper tidying done here as well as on the server, so papers made before
// the server fix print correctly too.
const marksLabel = (n) => `${n} ${Number(n) === 1 ? "mark" : "marks"}`;
const stripMarks = (t) => String(t || "").replace(/\s*\(\s*\d+\s*marks?\s*\)\s*$/i, "");
const FIGURE_ABOVE = /\b(the|this)\s+(sketch map|map|diagram|figure|graph|table|picture|chart|illustration|photograph)\s+above\b/gi;
const stemText = (q) => {
  let t = q.question_text || "";
  if (q.diagram || q.plot) t = t.replace(FIGURE_ABOVE, "$1 $2 below");
  return (q.parts || []).length ? t : stripMarks(t);
};
const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
function instructionsFor(questions) {
  const n = questions.length;
  if (!n) return "";
  const count = n < NUM_WORDS.length ? `${NUM_WORDS[n]} (${n})` : String(n);
  const kinds = new Set(questions.map((q) => (q.type || "").toLowerCase()));
  const out = [`Answer all ${count} questions.`];
  if (kinds.has("mcq")) out.push("For multiple-choice questions, write the letter of the best answer.");
  if ([...kinds].some((k) => k !== "mcq")) out.push("For structured questions, write your answers in the spaces provided.");
  return out.join(" ");
}

// The backend hands back a root-relative path ("/api/diagrams/<key>.png").
// Rendered here that resolves against the *frontend's* origin, where nothing
// is served - which is exactly why diagrams showed as broken images. Point it
// back at the API.
const ORIGIN = API.replace(/\/api\/?$/, "");
const imgSrc = (u) =>
  !u ? "" : /^(https?:|data:)/i.test(u) ? u : `${ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;

/** The picture a question is built around. If it cannot be loaded, show what
 *  it was meant to show - a question that says "the diagram above" must not
 *  sit above an empty space. */
function Diagram({ diagram }) {
  const [failed, setFailed] = useState(false);
  if (!diagram) return null;

  // Still being drawn. The paper is already readable, so show what the
  // picture will be rather than holding the whole paper back for it.
  if (diagram.pending) {
    return (
      <figure className="mt-3 mb-1 max-w-sm rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 print:hidden">
        <figcaption className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          Drawing the image...
        </figcaption>
        {diagram.alt && (
          <p className="mt-1.5 text-xs text-gray-500">{diagram.alt}</p>
        )}
      </figure>
    );
  }

  const src = imgSrc(diagram.url);
  if (src && !failed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={diagram.alt || "Diagram for this question"}
        onError={() => setFailed(true)}
        className="mx-auto mt-4 mb-2 block w-full max-w-md bg-white"
      />
    );
  }
  if (!diagram.alt) return null;
  return (
    <figure className="mt-3 mb-1 max-w-sm rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 print:border-gray-400 print:bg-white">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Diagram
      </figcaption>
      <p className="mt-1 text-sm italic text-gray-600">{diagram.alt}</p>
    </figure>
  );
}

/** Faint StadiSpace logo + name tiled across the paper. Fixed when printing,
 *  so every printed page carries it. */
function Watermark() {
  return (
    <div aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden print:fixed print:inset-0 z-0">
      <div className="absolute -inset-[30%] grid grid-cols-3 content-around justify-items-center gap-y-40"
        style={{ transform: "rotate(-30deg)" }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 opacity-[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/symbol.svg" alt="" className="h-14 w-14" />
            <span className="text-4xl font-extrabold tracking-tight text-gray-900">StadiSpace</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Footer on every printed page: who made it, what learners get, how to reach us. */
function PaperFooter() {
  return (
    <footer className="relative z-10 mt-10 flex items-center gap-4 border-t border-gray-300 pt-3 text-[10.5px] leading-snug text-gray-600
                       print:fixed print:bottom-0 print:left-0 print:right-0 print:mt-0 print:bg-white print:px-[12mm] print:pb-[6mm]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/symbol.svg" alt="" className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">
          StadiSpace · <span className="text-emerald-700">stadispace.co.ke</span>
        </p>
        <p>
          For learners: CBE practice quizzes marked instantly · Interactive lessons · Trivia &amp; flash cards · Books &amp; videos
        </p>
        <p>Grades 4 - 11 · Call or WhatsApp 0704 699683 / 0717 946 924</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-right text-[10px] font-semibold text-gray-700">Scan to<br />practise</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/qr-stadispace.svg" alt="QR code to stadispace.co.ke" className="h-14 w-14" />
      </div>
    </footer>
  );
}

/** A table the question refers to, printed as a table. */
function QuestionTable({ table }) {
  if (!table || !(table.rows || []).length) return null;
  return (
    <table className="mt-3 mb-1 border-collapse text-sm text-gray-900">
      {(table.headers || []).length > 0 && (
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="border border-gray-500 bg-gray-50 px-3 py-1.5 text-left font-semibold">
                <MathText>{String(h)}</MathText>
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {table.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((c, ci) => (
              <td key={ci} className="border border-gray-500 px-3 py-1.5">
                <MathText>{String(c)}</MathText>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Ruled lines a learner writes on. Roughly two per mark, with a floor so a
 *  1-mark part is still usable, because a printed paper with nowhere to write
 *  is not a paper. */
function AnswerLines({ marks, blank = false }) {
  // Maths is worked, not written: clean space to work in, no ruled lines.
  if (blank) {
    const h = Math.max(4, Math.min(Number(marks) || 2, 10) * 2.2);
    return <div className="mt-2" style={{ height: `${h}rem` }} aria-hidden="true" />;
  }
  const n = Math.max(3, Math.min(Number(marks) || 2, 10) * 2);
  return (
    <div className="mt-2 space-y-5" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border-b border-gray-300 print:border-gray-400" />
      ))}
    </div>
  );
}

export default function LibraryItemPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("assessment");   // assessment | scheme
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [waited, setWaited] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/${id}/`);
      if (r.status === 404) { router.replace("/facilitator/library"); return; }
      const d = await r.json();
      setItem(d);
      return d.status;
    } catch {
      setError("Could not open this item.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // While the paper is still being written, ask again every few seconds. The
  // work happens on the server, so this page can be closed and reopened and
  // the paper is still coming.
  // Keep asking while the paper is being written, and afterwards while any
  // picture is still being drawn - the paper is readable in the meantime.
  const pendingDiagrams = item?.payload?.diagrams_pending || 0;
  useEffect(() => {
    if (item?.status !== "running" && !pendingDiagrams) return;
    const t = setInterval(() => { load(); setWaited((s) => s + 4); }, 4000);
    return () => clearInterval(t);
  }, [item?.status, pendingDiagrams, load]);

  const patch = async (body) => {
    setSaving(true); setError("");
    try {
      const r = await fetchWithAuth(`${API}/facilitator/library/${id}/`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      setItem(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  // Edits stay local until an explicit save: autosaving each keystroke is one
  // request per character on a 3G connection.
  const editQuestion = (idx, patchObj) => {
    setItem((it) => {
      const questions = it.payload.questions.map((q, i) =>
        i === idx ? { ...q, ...patchObj } : q);
      return {
        ...it,
        payload: {
          ...it.payload,
          questions,
          total_marks: questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
        },
      };
    });
  };

  const copy = async (what) => {
    const p = item.payload || {};
    const qs = p.questions || [];
    let text;
    if (what === "assessment") {
      text = [
        item.title,
        `${qs.length} questions · ${p.total_marks} marks`,
        p.covers ? `Covers: ${p.covers}` : "",
        "", instructionsFor(qs), "",
        ...qs.map((q) => {
          const head = `${q.number}. ${stemText(q)}  (${marksLabel(q.marks)})` +
            (q.table ? "\n" + [q.table.headers || [], ...(q.table.rows || [])]
              .filter((r) => r.length).map((r) => `   ${r.join(" | ")}`).join("\n") : "");
          const opts = q.options
            ? Object.entries(q.options).map(([k, v]) => `   ${k}) ${v}`) : [];
          const parts = (q.parts || []).map(
            (pt) => `   (${pt.label}) ${stripMarks(pt.question_text)}${pt.marks ? `  (${marksLabel(pt.marks)})` : ""}`);
          return [head, ...opts, ...parts].join("\n");
        }),
      ].filter(Boolean).join("\n");
    } else {
      text = [`${item.title} - Marking scheme`, "",
        ...qs.map((q) => {
          const head = `${q.number}. ${q.marks} ${q.marks === 1 ? "mark" : "marks"} · ${TYPE_LABEL[q.type] || q.type}`;
          if (q.type === "mcq") {
            return `${head}\n   ${q.correct_answer}) ${q.options?.[q.correct_answer] || ""}`;
          }
          const body = (q.marking_scheme || []).map((g) => {
            const label = [g.part ? `(${g.part})` : "", g.award].filter(Boolean).join(" ");
            return [label ? `   ${label}` : "",
              ...(g.points || []).map((pt) => `      - ${pt}`)].filter(Boolean).join("\n");
          });
          return [head, ...body].join("\n");
        })].join("\n\n");
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>;
  }
  if (!item) return <p className="text-sm text-red-600">{error || "Not found."}</p>;

  // Still being written. The server is doing it, not this page, so there is
  // nothing to lose by navigating away.
  const studio = STUDIO[item.tool];
  if (item.status === "running") {
    const stage = studio ? studio.making :
      waited < 80 ? "Writing the questions and their marking schemes..."
      : waited < 110 ? "Checking every question against the sub-strand..."
      : waited < 140 ? "Replacing any question that failed the check..."
      : "Drawing the diagram...";
    return (
      <div className="max-w-3xl">
        <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> My Library
        </Link>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-4 text-sm font-medium text-gray-800">{stage}</p>
          <p className="mt-1 text-xs text-gray-500">
            {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
            {item.covers ? ` · ${item.covers}` : ""}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            {studio ? studio.wait : "About two minutes in total"}. You can close this page - it is being
            built on the server and will be waiting in My Library.
          </p>
        </div>
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className="max-w-3xl">
        <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> My Library
        </Link>
        <div className="bg-white rounded-2xl border border-red-200 p-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="w-4 h-4" /> This {studio ? studio.noun : "paper"} could not be generated
          </p>
          {item.error && (
            <p className="mt-2 text-xs text-gray-600 font-mono break-words">{item.error}</p>
          )}
          <Link href={studio ? studio.again : "/facilitator/assessments"}
                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  if (studio) return <StudioDocument item={item} setItem={setItem} />;

  const p = item.payload || {};
  const questions = p.questions || [];
  const showScheme = tab === "scheme";
  const isMaths = /math/i.test(item.subject || "");

  return (
    <div className="max-w-3xl">
      {/* Toolbar - hidden on print so a printed paper is just the paper */}
      <div className="print:hidden mb-5">
        <Link href="/facilitator/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> My Library
        </Link>

        <p className="text-xs font-semibold text-emerald-700">
          {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
        </p>

        <div className="flex flex-wrap items-start gap-2 mt-1">
          <input
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
            onBlur={(e) => e.target.value !== "" && patch({ title: e.target.value })}
            className="flex-1 min-w-[220px] rounded-xl border border-transparent hover:border-gray-200 focus:border-emerald-500 bg-transparent px-2 py-1.5 text-2xl font-bold text-gray-900 focus:outline-none"
          />
          <button onClick={() => patch({ bookmarked: !item.bookmarked })}
                  className="p-2 rounded-lg hover:bg-gray-100" aria-label="Save">
            <Bookmark className={`w-4 h-4 ${item.bookmarked ? "fill-emerald-600 text-emerald-600" : "text-gray-400"}`} />
          </button>
          <button onClick={() => setEditing((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                    editing ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            <Pencil className="w-3.5 h-3.5" /> {editing ? "Done" : "Edit"}
          </button>
          <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-1 px-2">
          {questions.length} questions · {p.total_marks} marks
        </p>
        {p.covers && <p className="text-xs text-gray-500 px-2">Covers: {p.covers}</p>}

        {/* Tabs, so a blank paper can be printed without the answers on it */}
        <div className="flex items-center justify-between gap-3 mt-4 border-b border-gray-200">
          <div className="flex gap-1">
            {[["assessment", "Assessment"], ["scheme", "Marking scheme"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                        tab === k ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => copy(showScheme ? "scheme" : "assessment")}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 mb-1">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : `Copy ${showScheme ? "marking scheme" : "assessment"}`}
          </button>
        </div>

        {editing && (
          <button onClick={() => patch({ payload: item.payload })} disabled={saving}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-gray-300">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save changes
          </button>
        )}
        {saved && <p className="mt-2 text-xs text-emerald-700">Saved.</p>}
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
        {(p.warnings || []).length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold text-amber-800">Check these before printing</p>
            <ul className="mt-1 space-y-0.5">
              {p.warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <article className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 print:overflow-visible print:border-0 print:p-0">
        <Watermark />
        {/* A table footer repeats on every printed page and reserves its space,
            so the fixed StadiSpace footer never prints over a question. */}
        <table className="relative z-10 w-full border-collapse">
          <tfoot className="hidden print:table-footer-group">
            <tr><td><div style={{ height: "30mm" }} /></td></tr>
          </tfoot>
          <tbody><tr><td className="p-0 align-top">
        <header className="mb-6">
          <h1 className="text-center text-xl font-bold uppercase tracking-wide text-gray-900">
            {item.title}{showScheme ? " - Marking scheme" : ""}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-600">
            {item.grade ? `Grade ${item.grade} · ` : ""}{item.subject}
            {` · ${questions.length} questions · ${p.total_marks} marks`}
          </p>
          {/* Which sub-strands it covers is for the teacher, not the learner. */}
          {p.covers && <p className="mt-1 text-center text-xs text-gray-400 print:hidden">Covers: {p.covers}</p>}
          {!showScheme && (
            <div className="mt-6 space-y-4 text-sm font-semibold text-gray-900">
              <div className="flex items-end gap-2">
                <span>Name:</span><span className="flex-1 border-b border-dashed border-gray-500" />
              </div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                {[["Adm. No.:", "w-24"], ["Class:", "w-28"], ["Date:", "w-28"]].map(([label, w]) => (
                  <div key={label} className="flex items-end gap-2">
                    <span>{label}</span><span className={`${w} border-b border-dashed border-gray-500`} />
                  </div>
                ))}
                <div className="flex items-end gap-2">
                  <span>Score:</span><span className="w-16 border-b border-dashed border-gray-500" />
                  <span className="font-normal">/ {p.total_marks}</span>
                </div>
              </div>
            </div>
          )}
          {!showScheme && questions.length > 0 && (
            <div className="mt-5 border-y border-gray-800 py-3">
              <p className="text-sm font-bold text-gray-900">Instructions</p>
              <p className="text-sm text-gray-800">{instructionsFor(questions)}</p>
            </div>
          )}
        </header>

        <ol className="space-y-7">
          {questions.map((q, idx) => (
            <li key={idx} className="break-inside-avoid">
              <div className="flex gap-2">
                <span className="font-semibold text-gray-900 shrink-0">{q.number ?? idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  {editing && !showScheme ? (
                    <textarea value={q.question_text} rows={3}
                      onChange={(e) => editQuestion(idx, { question_text: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                  ) : (
                    <p className="text-sm text-gray-900"><MathText>{stemText(q)}</MathText></p>
                  )}

                  {!showScheme && (
                    <>
                      <QuestionTable table={q.table} />
                      <Diagram diagram={q.diagram} />

                      {q.type === "mcq" && q.options && (
                        <ul className="mt-2 space-y-1">
                          {Object.entries(q.options).map(([k, v]) => (
                            <li key={k} className="text-sm text-gray-700">{k}) <MathText>{v}</MathText></li>
                          ))}
                        </ul>
                      )}

                      {(q.parts || []).length > 0 ? (
                        <ul className="mt-2 space-y-3">
                          {q.parts.map((part, pi) => (
                            <li key={pi} className="text-sm text-gray-800">
                              ({part.label}) <MathText>{stripMarks(part.question_text)}</MathText>
                              {part.marks ? <span className="text-gray-500"> ({marksLabel(part.marks)})</span> : null}
                              <AnswerLines marks={part.marks} blank={isMaths} />
                            </li>
                          ))}
                        </ul>
                      ) : q.type === "structured" ? (
                        <AnswerLines marks={q.marks} blank={isMaths} />
                      ) : null}

                      {!editing && (
                        <p className="mt-2 text-right text-sm font-bold text-gray-900">
                          ({marksLabel(q.marks)})
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400 print:hidden">
                        {TYPE_LABEL[q.type] || q.type}
                        {/* Which part of the design this one came from. On a
                            paper spanning several sub-strands that differs per
                            question, so the item's own label will not do. */}
                        {q.substrand || item.substrand
                          ? ` · ${q.substrand || item.substrand}`
                          : ""}
                      </p>
                    </>
                  )}

                  {showScheme && (
                    <div className="mt-2">
                      <p className="text-[11px] text-gray-400 mb-1">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"} · {TYPE_LABEL[q.type] || q.type}
                      </p>
                      {q.type === "mcq" ? (
                        <p className="text-sm font-semibold text-emerald-700">
                          {q.correct_answer}) <MathText>{q.options?.[q.correct_answer]}</MathText>
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(q.marking_scheme || []).map((g, gi) => (
                            <div key={gi}>
                              <p className="text-sm text-gray-900">
                                {g.part && <span className="font-semibold">({g.part}) </span>}
                                <MathText>{g.award || `${g.marks} ${g.marks === 1 ? "mark" : "marks"}`}</MathText>
                              </p>
                              <ul className="mt-1 ml-4 space-y-0.5 list-disc">
                                {(g.points || []).map((pt, pi) => (
                                  <li key={pi} className="text-sm text-gray-700"><MathText>{pt}</MathText></li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {editing && !showScheme && (
                  <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">
                    <input type="number" min={0} value={q.marks}
                      onChange={(e) => editQuestion(idx, { marks: Number(e.target.value) })}
                      className="w-14 rounded border border-gray-200 px-1 py-0.5 text-right" />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
          </td></tr></tbody>
        </table>
        <PaperFooter />
      </article>
    </div>
  );
}
