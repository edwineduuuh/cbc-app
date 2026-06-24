"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import {
  Sparkles,
  GraduationCap,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

/* A small palette so each reel feels distinct, keyed by subject name. */
const GRADIENTS = [
  "from-emerald-500 to-teal-700",
  "from-indigo-500 to-purple-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-sky-500 to-blue-700",
  "from-fuchsia-500 to-violet-700",
];
function gradientFor(text = "") {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 997;
  return GRADIENTS[h % GRADIENTS.length];
}

/* Typeset MathJax inside a node whenever its content changes. */
function useMathJax(deps) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

function ReelCard({ reel }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const contentRef = useMathJax([reel.id, showAnswer]);
  const grad = gradientFor(reel.subject);

  return (
    <section
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden"
      style={{ scrollSnapStop: "always" }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
      <div className="absolute inset-0 bg-black/20" />

      <div
        ref={contentRef}
        className="relative z-10 flex h-full flex-col justify-center gap-5 px-6 py-20 text-white sm:px-10"
      >
        {/* topic chip */}
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          <Sparkles className="h-4 w-4" />
          <span>{reel.subject}</span>
          <span className="opacity-60">•</span>
          <span>{reel.topic}</span>
          <span className="opacity-60">•</span>
          <span>Grade {reel.grade}</span>
        </div>

        {/* the teaching */}
        <h2 className="text-2xl font-bold leading-snug sm:text-3xl">
          {reel.hook}
        </h2>

        {reel.concept && (
          <p className="max-w-2xl text-base leading-relaxed text-white/95 sm:text-lg">
            {reel.concept}
          </p>
        )}

        {/* reveal answer */}
        {reel.answer && (
          <div>
            <button
              onClick={() => setShowAnswer((s) => !s)}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
            >
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? "Hide answer" : "Show answer"}
            </button>
            {showAnswer && (
              <p className="mt-3 rounded-xl bg-white/15 px-4 py-3 text-lg font-semibold backdrop-blur">
                {reel.answer}
              </p>
            )}
          </div>
        )}

        {/* go deeper */}
        <Link
          href={`/tutor?topic=${reel.topic_id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-lg transition hover:scale-105"
        >
          <GraduationCap className="h-4 w-4" />
          Teach me this topic
        </Link>
      </div>

      {/* swipe hint */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/80">
        <ChevronUp className="h-6 w-6" />
        <span className="sr-only">Swipe up for next</span>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API}/reels/?limit=25`);
      if (!res.ok) throw new Error("Failed to load reels");
      const data = await res.json();
      setReels(data.reels || []);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
  }, [authLoading, user, router, load]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center text-white">
        <p className="text-lg">{error}</p>
        <button
          onClick={load}
          className="rounded-full bg-emerald-600 px-6 py-2 font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!reels.length) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-gray-950 px-6 text-center text-white">
        <Sparkles className="h-10 w-10 text-emerald-400" />
        <p className="text-lg font-semibold">No reels yet</p>
        <p className="text-white/70">
          Reels are built from quiz content — check back once more questions are added.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll bg-gray-950">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );
}
