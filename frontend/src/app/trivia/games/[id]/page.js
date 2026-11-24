"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { Loader2 } from "lucide-react";
import Results from "@/components/trivia/Results";
import { triviaApi } from "@/components/trivia/shared";

export default function GameReview() {
  const { id } = useParams();
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { triviaApi(`games/${id}/`).then(setRes).catch((e) => setError(e.message)); }, [id]);
  if (error) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-lg font-semibold mb-6">{error}</p>
      <Link href="/trivia" className="rounded-2xl px-6 py-3 font-bold" style={{ background: "#20B8A6", color: "#080F1D" }}>Back to Trivia</Link>
    </div>
  );
  if (!res) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#20B8A6" }} /></div>;
  return <MotionConfig reducedMotion="user"><Results res={res} /></MotionConfig>;
}
