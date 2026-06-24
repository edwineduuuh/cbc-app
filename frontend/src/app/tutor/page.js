"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import Markdown from "@/components/Markdown";
import SubstrandPicker from "@/components/SubstrandPicker";
import {
  GraduationCap,
  Send,
  Loader2,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  Plus,
  X,
  FileText,
  ArrowLeft,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const MAX_UPLOAD_MB = 6;
const ACCEPTED_UPLOAD = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function useMathJax(ref, deps) {
  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── One lesson's body ───────────────────────────────────────── */
function LessonBody({ lesson }) {
  const ref = useRef(null);
  useMathJax(ref, [lesson]);
  return (
    <article ref={ref} className="space-y-6">
      {lesson.intro && (
        <Markdown className="text-lg text-gray-600 dark:text-gray-300">{lesson.intro}</Markdown>
      )}

      {(lesson.sections || []).map((s, i) => (
        <section key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            {s.title}
          </h3>
          <Markdown className="text-gray-700 dark:text-gray-200">{s.body}</Markdown>
          {s.example && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-gray-800 dark:bg-emerald-900/20 dark:text-gray-100">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-emerald-600">Example</span>
              <Markdown>{s.example}</Markdown>
            </div>
          )}
        </section>
      ))}

      {(lesson.key_terms || []).length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Lightbulb className="h-5 w-5 text-amber-500" /> Key terms
          </h3>
          <dl className="space-y-2">
            {lesson.key_terms.map((kt, i) => (
              <div key={i}>
                <dt className="font-semibold text-gray-900 dark:text-white">{kt.term}</dt>
                <dd className="text-gray-600 dark:text-gray-300">{kt.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(lesson.summary_points || []).length > 0 && (
        <section className="rounded-2xl bg-emerald-600 p-5 text-white">
          <h3 className="mb-3 text-lg font-semibold">In a nutshell</h3>
          <ul className="space-y-2">
            {lesson.summary_points.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/* ── Lesson series + chat ────────────────────────────────────── */
function LessonSeries({ selection, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  // chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  useMathJax(chatRef, [messages, sending]);

  useEffect(() => {
    let act = true;
    const q = selection.substrandIds.length
      ? `?substrands=${selection.substrandIds.join(",")}`
      : "";
    fetchWithAuth(`${API}/tutor/topics/${selection.topicId}/lesson/${q}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Could not load lesson");
        return r.json();
      })
      .then((d) => act && setData(d))
      .catch((e) => act && setError(e.message))
      .finally(() => act && setLoading(false));
    return () => {
      act = false;
    };
  }, [selection]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      alert(`File too large — max ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && !file) || sending) return;
    const pending = file;
    const userMsg = {
      role: "user",
      content: text || (pending ? `(sent ${pending.name})` : ""),
      ...(pending ? { attachment: pending.name } : {}),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    try {
      let attachment = null;
      if (pending) {
        attachment = { name: pending.name, media_type: pending.type, data: await fileToBase64(pending) };
      }
      const apiMessages = next.map(({ role, content }) => ({ role, content }));
      const res = await fetchWithAuth(`${API}/tutor/chat/`, {
        method: "POST",
        body: JSON.stringify({ topic_id: selection.topicId, messages: apiMessages, attachment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Tutor unavailable");
      setMessages((m) => [...m, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally {
      setSending(false);
    }
  }, [input, messages, sending, file, selection.topicId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p>Preparing your lesson…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="mb-4 text-gray-700 dark:text-gray-200">{error}</p>
        <button onClick={onBack} className="rounded-full bg-emerald-600 px-6 py-2 font-semibold text-white">Back</button>
      </div>
    );
  }

  const topic = data?.topic || {};
  const lessons = data?.lessons || [];
  const current = lessons[active]?.lesson || {};

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Change selection
      </button>

      <div className="mb-1 text-sm font-medium text-emerald-600">
        {topic.subject} • Grade {topic.grade} • {topic.name}
      </div>
      <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
        {current.heading || topic.name}
      </h1>

      {/* Series tabs (only when more than one lesson) */}
      {lessons.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {lessons.map((l, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                idx === active
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {l.substrand?.name || "Whole strand"}
            </button>
          ))}
        </div>
      )}

      <LessonBody lesson={current} />

      {/* Chat */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Still stuck? Ask me anything about {topic.name}
        </h2>

        <div ref={chatRef} className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                m.role === "user" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
              }`}>
                {m.attachment && (
                  <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-black/10 px-2 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate">{m.attachment}</span>
                  </div>
                )}
                {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : <span className="whitespace-pre-line">{m.content}</span>}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-gray-500 dark:bg-gray-800">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span className="max-w-[200px] truncate">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="mt-3 flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden" onChange={onPickFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach an image or PDF"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Plus className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Type your question…  (Shift+Enter for a new line)"
            className="max-h-40 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={send}
            disabled={sending || (!input.trim() && !file)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TutorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {selection ? (
        <LessonSeries key={JSON.stringify(selection)} selection={selection} onBack={() => setSelection(null)} />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <GraduationCap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Tutor</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pick a strand and sub-strands — I’ll teach them before your quiz.
              </p>
            </div>
          </div>
          <SubstrandPicker accent="emerald" startLabel="Teach me" onStart={setSelection} />
        </div>
      )}
    </div>
  );
}
