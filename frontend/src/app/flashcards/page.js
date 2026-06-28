"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import SubstrandPicker from "@/components/SubstrandPicker";
import Markdown from "@/components/Markdown";
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

const STAFF_ROLES = ["admin", "superadmin", "teacher", "school_admin"];

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const TYPE_LABEL = {
  concept: "Concept",
  application: "Apply it",
  recall: "Recall",
  why: "Why?",
};

/* ── The flip-card deck ──────────────────────────────────────── */
function Deck({ selection, onBack }) {
  const { user } = useAuth();
  const router = useRouter();
  const isStaff = STAFF_ROLES.includes(user?.role) || user?.is_staff;

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paywalled, setPaywalled] = useState(false);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const fetchCards = useCallback((force) => {
    const params = [`topic=${selection.topicId}`];
    if (selection.substrandIds.length) params.push(`substrands=${selection.substrandIds.join(",")}`);
    if (force) params.push("refresh=1");
    return fetchWithAuth(`${API}/flashcards/?${params.join("&")}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          const err = new Error(body.error || "Could not load cards");
          err.paywall = r.status === 402 || body.paywall;
          throw err;
        }
        return r.json();
      })
      .then((d) => {
        if (!mounted.current) return;
        setCards(d.cards || []);
        setI(0);
        setFlipped(false);
      })
      .catch((e) => {
        if (!mounted.current) return;
        setError(e.message);
        setPaywalled(!!e.paywall);
      })
      .finally(() => mounted.current && setLoading(false));
  }, [selection]);

  useEffect(() => {
    fetchCards(false);
  }, [fetchCards]);

  const regenerate = () => {
    setRegenerating(true);
    setError("");
    fetchCards(true).finally(() => mounted.current && setRegenerating(false));
  };

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

  if (paywalled) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
          <Layers className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Unlock the Tutor &amp; Flash Cards
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {error || "These are part of a StadiSpace plan. Subscribe to start revising."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => router.push("/subscribe")} className="rounded-full bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Subscribe now
          </button>
          <button onClick={onBack} className="rounded-full border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            Back
          </button>
        </div>
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
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Change selection
        </button>
        {isStaff && (
          <button
            onClick={regenerate}
            disabled={regenerating}
            title="Regenerate this deck on the current model (admin only)"
            className="flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Regenerating…" : "Regenerate (admin)"}
          </button>
        )}
      </div>

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
            <div className="flex flex-1 items-center justify-center overflow-auto text-center text-xl font-medium text-gray-900 dark:text-white">
              <Markdown>{card.front}</Markdown>
            </div>
            <span className="mt-2 text-center text-xs text-gray-400">Tap to flip</span>
          </div>

          {/* Back */}
          <div className="absolute inset-0 flex flex-col rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-indigo-900 dark:bg-indigo-950/40">
            <span className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Answer</span>
            <div className="flex-1 overflow-auto">
              <div className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                <Markdown>{card.back}</Markdown>
              </div>
              {card.why && (
                <div className="mt-3 border-t border-indigo-200/60 pt-3 text-sm leading-relaxed text-gray-600 dark:border-indigo-900 dark:text-gray-300">
                  <Markdown>{`💡 ${card.why}`}</Markdown>
                </div>
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
