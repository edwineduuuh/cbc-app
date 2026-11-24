"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { card, muted, triviaApi } from "@/components/trivia/shared";

export default function BadgesPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { triviaApi("achievements/").then(setRows).catch((e) => setError(e.message)); }, []);
  const earned = rows ? rows.filter((r) => r.earned).length : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6" style={{ color: "#F5F7FA" }}>
        <Link href="/trivia" className="inline-flex items-center gap-1.5 text-sm mb-4" style={muted}><ArrowLeft className="w-4 h-4" /> Trivia</Link>
        <h1 className="text-3xl font-extrabold mb-1">🏅 Badges</h1>
        <p className="text-sm mb-6" style={muted}>{rows ? `${earned} of ${rows.length} unlocked` : "Earned by playing - never bought."}</p>
        {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(240,113,120,0.1)", color: "#F7A1A7" }}>{error}</p>}
        {!rows && !error && <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#20B8A6" }} /></div>}
        {rows && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {rows.map((b, i) => (
              <motion.div key={b.code} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                className="rounded-3xl p-4 text-center relative"
                style={b.earned ? { background: "linear-gradient(160deg, rgba(180,142,245,0.22), #14243A 70%)", border: "1px solid rgba(180,142,245,0.45)" } : card}>
                <div className="text-5xl mb-2" style={{ filter: b.earned ? "none" : "grayscale(1) opacity(0.35)" }}>{b.icon}</div>
                {!b.earned && <Lock className="w-4 h-4 absolute top-3 right-3" style={muted} />}
                <p className="font-extrabold">{b.name}</p>
                <p className="text-xs mt-1" style={muted}>{b.description}</p>
                <p className="text-xs font-bold mt-2" style={{ color: b.earned ? "#B48EF5" : "#E8B65B" }}>
                  {b.earned ? `Unlocked ${new Date(b.earned_at).toLocaleDateString()}` : `+${b.xp} XP`}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
