"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

/* Typeset MathJax inside a node whenever deps change. */
function useMathJax(ref, deps) {
  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── Drill-down picker: Grade → Learning area → Strand ───────── */
function Picker({ onStart }) {
  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${API}/subjects/`)
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  const loadTopics = (sub, gr) => {
    if (!sub || !gr) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    fetchWithAuth(`${API}/topics/?subject=${sub}&grade=${gr}`)
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : d.results || []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  };

  const subjectName = subjects.find((s) => String(s.id) === String(subject))?.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 dark:bg-indigo-900/40">
          <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Flash Cards
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick a grade, learning area and strand to start revising.
          </p>
        </div>
      </div>

      {/* Step 1: grade + learning area */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={grade}
          onChange={(e) => {
            const v = e.target.value;
            setGrade(v);
            loadTopics(subject, v);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Grade</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select
          value={subject}
          onChange={(e) => {
            const v = e.target.value;
            setSubject(v);
            loadTopics(v, grade);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Learning area</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: strand list */}
      <div className="mt-5">
        {grade && subject && (
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Choose a strand
            </h2>
            <button
              onClick={() =>
                onStart({
                  params: `subject=${subject}&grade=${grade}`,
                  title: `${subjectName} • Grade ${grade} • All strands`,
                })
              }
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              All strands →
            </button>
          </div>
        )}

        <div className="space-y-2">
          {loadingTopics && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading strands…
            </div>
          )}
          {!loadingTopics &&
            topics.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  onStart({
                    params: `topic=${t.id}`,
                    title: `${subjectName} • Grade ${grade} • ${t.name}`,
                  })
                }
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left font-medium text-gray-800 shadow-sm transition hover:border-indigo-400 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <span>{t.name}</span>
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </button>
            ))}
          {!loadingTopics && grade && subject && !topics.length && (
            <p className="text-sm text-gray-500">No strands found for that selection.</p>
          )}
          {(!grade || !subject) && (
            <p className="text-sm text-gray-400">
              Select a grade and learning area to see strands.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── The flip card deck ──────────────────────────────────────── */
function Deck({ selection, onBack }) {
  // Deck remounts per selection (keyed below), so loading starts true.
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const faceRef = useRef(null);
  useMathJax(faceRef, [i, flipped, cards]);

  useEffect(() => {
    let active = true;
    fetchWithAuth(`${API}/flashcards/?${selection.params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Could not load cards");
        return r.json();
      })
      .then((d) => active && setCards(d.cards || []))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selection.params]);

  const go = useCallback(
    (dir) => {
      setFlipped(false);
      setI((prev) => {
        const n = prev + dir;
        if (n < 0) return 0;
        if (n > cards.length - 1) return cards.length - 1;
        return n;
      });
    },
    [cards.length]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p>Loading cards…</p>
      </div>
    );
  }

  if (error || !cards.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="mb-4 text-gray-700 dark:text-gray-200">
          {error || "No flash cards for this selection yet."}
        </p>
        <button
          onClick={onBack}
          className="rounded-full bg-indigo-600 px-6 py-2 font-semibold text-white"
        >
          Back
        </button>
      </div>
    );
  }

  const card = cards[i];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Change selection
      </button>

      <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
        <span className="truncate pr-2">{selection.title}</span>
        <span className="shrink-0 font-semibold">
          {i + 1} / {cards.length}
        </span>
      </div>

      {/* Card */}
      <div
        className="relative h-80 w-full cursor-pointer [perspective:1200px]"
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-lg [backface-visibility:hidden] dark:border-gray-700 dark:bg-gray-800">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-500">
              Question
            </span>
            <div
              ref={!flipped ? faceRef : null}
              className="flex flex-1 items-center justify-center overflow-auto text-center text-xl font-medium text-gray-900 dark:text-white"
            >
              {card.front}
            </div>
            <span className="mt-2 text-center text-xs text-gray-400">
              Tap to flip
            </span>
          </div>

          {/* Back */}
          <div className="absolute inset-0 flex flex-col rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-indigo-900 dark:bg-indigo-950/40">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
              Answer
            </span>
            <div
              ref={flipped ? faceRef : null}
              className="flex-1 overflow-auto"
            >
              <p className="text-center text-xl font-semibold text-gray-900 dark:text-white">
                {card.answer}
              </p>
              {card.explanation && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {card.explanation}
                </p>
              )}
            </div>
            <span className="mt-2 text-center text-xs text-gray-400">
              Tap to flip back
            </span>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 font-semibold text-white"
        >
          <RotateCcw className="h-4 w-4" /> Flip
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === cards.length - 1}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Page shell ──────────────────────────────────────────────── */
export default function FlashcardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AnimatePresence mode="wait">
        {selection ? (
          <Deck
            key={selection.params}
            selection={selection}
            onBack={() => setSelection(null)}
          />
        ) : (
          <Picker key="picker" onStart={setSelection} />
        )}
      </AnimatePresence>
    </div>
  );
}
