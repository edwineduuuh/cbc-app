"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import SubstrandPicker from "@/components/SubstrandPicker";
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const TYPE_LABEL = {
  concept: "Concept",
  application: "Apply it",
  recall: "Recall",
  why: "Why?",
};

function useMathJax(ref, deps) {
  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── The flip-card deck ──────────────────────────────────────── */
function Deck({ selection, onBack }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const faceRef = useRef(null);
  useMathJax(faceRef, [i, flipped, cards]);

  useEffect(() => {
    let active = true;
    const q = selection.substrandIds.length
      ? `&substrands=${selection.substrandIds.join(",")}`
      : "";
    fetchWithAuth(`${API}/flashcards/?topic=${selection.topicId}${q}`)
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
  }, [selection]);

  const go = useCallback(
    (dir) => {
      setFlipped(false);
      setI((prev) => Math.max(0, Math.min(cards.length - 1, prev + dir)));
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
        <p>Building your deck…</p>
      </div>
    );
  }

  if (error || !cards.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="mb-4 text-gray-700 dark:text-gray-200">
          {error || "No flash cards for this selection yet."}
        </p>
        <button onClick={onBack} className="rounded-full bg-indigo-600 px-6 py-2 font-semibold text-white">
          Back
        </button>
      </div>
    );
  }

  const card = cards[i];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Change selection
      </button>

      <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
        <span className="truncate pr-2">{selection.title}</span>
        <span className="shrink-0 font-semibold">{i + 1} / {cards.length}</span>
      </div>

      <div className="relative h-80 w-full cursor-pointer [perspective:1200px]" onClick={() => setFlipped((f) => !f)}>
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-lg [backface-visibility:hidden] dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40">
                {TYPE_LABEL[card.type] || "Card"}
              </span>
              {card.substrand && (
                <span className="truncate text-xs text-gray-400">{card.substrand}</span>
              )}
            </div>
            <div
              ref={!flipped ? faceRef : null}
              className="flex flex-1 items-center justify-center overflow-auto text-center text-xl font-medium text-gray-900 dark:text-white"
            >
              {card.front}
            </div>
            <span className="mt-2 text-center text-xs text-gray-400">Tap to flip</span>
          </div>

          {/* Back */}
          <div className="absolute inset-0 flex flex-col rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-indigo-900 dark:bg-indigo-950/40">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Answer</span>
            <div ref={flipped ? faceRef : null} className="flex-1 overflow-auto">
              <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">{card.back}</p>
              {card.why && (
                <p className="mt-3 border-t border-indigo-200/60 pt-3 text-sm leading-relaxed text-gray-600 dark:border-indigo-900 dark:text-gray-300">
                  💡 {card.why}
                </p>
              )}
            </div>
            <span className="mt-2 text-center text-xs text-gray-400">Tap to flip back</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => go(-1)} disabled={i === 0} className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button onClick={() => setFlipped((f) => !f)} className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 font-semibold text-white">
          <RotateCcw className="h-4 w-4" /> Flip
        </button>
        <button onClick={() => go(1)} disabled={i === cards.length - 1} className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

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
          <Deck key="deck" selection={selection} onBack={() => setSelection(null)} />
        ) : (
          <div key="picker" className="mx-auto max-w-2xl px-4 py-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2 dark:bg-indigo-900/40">
                <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flash Cards</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pick a strand and sub-strands to revise.
                </p>
              </div>
            </div>
            <SubstrandPicker accent="indigo" startLabel="Start revising" onStart={setSelection} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
