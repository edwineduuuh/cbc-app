"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { card, muted, triviaApi } from "@/components/trivia/shared";

const BOARDS = [
  ["overall", "All-time XP"],
  ["weekly", "This week"],
  ["daily", "Today's challenge"],
  ["category", "By category"],
];
const MEDAL = ["🥇", "🥈", "🥉"];

function Board() {
  const params = useSearchParams();
  const [home, setHome] = useState(null);
  const [board, setBoard] = useState(params.get("board") || "overall");
  const [cat, setCat] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    triviaApi("home/").then((h) => {
      setHome(h);
      setVisible(h.player.show_on_leaderboard);
      const firstCat = h.categories.find((c) => c.questions > 0);
      if (firstCat) setCat(String(firstCat.id));
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (board === "category" && !cat) return;
    triviaApi(`leaderboard/?board=${board}${board === "category" ? `&category=${cat}` : ""}`)
      .then((d) => { setError(""); setData(d); }).catch((e) => setError(e.message));
  }, [board, cat]);
  const pickBoard = (k) => { if (k !== board) { setData(null); setBoard(k); } };
  const pickCat = (c) => { if (c !== cat) { setData(null); setCat(c); } };

  const toggleVisible = async () => {
    const r = await triviaApi("profile/", { method: "POST", body: { show_on_leaderboard: !visible } });
    setVisible(r.show_on_leaderboard);
  };

  const lb = home?.leaderboards || {};
  const boards = BOARDS.filter(([k]) => lb[k] !== false);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6" style={{ color: "#F5F7FA" }}>
      <Link href="/trivia" className="inline-flex items-center gap-1.5 text-sm mb-4" style={muted}><ArrowLeft className="w-4 h-4" /> Trivia</Link>
      <h1 className="text-3xl font-extrabold mb-1">🏆 Leaderboards</h1>
      <p className="text-sm mb-5" style={muted}>Only first names and first initials are shown. Trivia points never affect school marks.</p>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {boards.map(([k, label]) => (
          <button key={k} onClick={() => pickBoard(k)} className="shrink-0 rounded-full px-4 py-2 text-sm font-bold"
            style={{ background: board === k ? "#20B8A6" : "#14243A", color: board === k ? "#080F1D" : "#A9B9CC" }}>{label}</button>
        ))}
      </div>
      {board === "category" && home && (
        <select value={cat} onChange={(e) => pickCat(e.target.value)} aria-label="Category"
          className="w-full rounded-xl px-3 py-2.5 mb-4 text-sm" style={{ background: "#0F1F3D", border: "1px solid #2B4058" }}>
          {home.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      )}

      {error && <p className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "rgba(240,113,120,0.1)", color: "#F7A1A7" }}>{error}</p>}
      {!data && !error && <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#20B8A6" }} /></div>}

      {data && (
        <>
          {data.you && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: "rgba(32,184,166,0.12)", border: "1px solid rgba(32,184,166,0.4)" }}>
              <p className="font-bold">Your rank: <span className="text-2xl font-extrabold">#{data.you.rank}</span></p>
              <p className="font-extrabold" style={{ color: "#E8B65B" }}>{data.you.value.toLocaleString()} {data.unit}</p>
            </div>
          )}
          {data.rows.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={card}>
              <p className="text-4xl mb-2">🌱</p>
              <p className="font-semibold">No one on this board yet</p>
              <p className="text-sm" style={muted}>Play a game and claim the top spot!</p>
            </div>
          ) : (
            <ol className="rounded-2xl overflow-hidden" style={card}>
              {data.rows.map((r, i) => (
                <motion.li key={r.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i ? "1px solid #1F3350" : "none", background: r.you ? "rgba(32,184,166,0.10)" : "transparent" }}>
                  <span className="w-9 text-center font-extrabold text-lg">{r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}</span>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm"
                    style={{ background: `hsl(${(r.name.charCodeAt(0) * 37) % 360} 45% 30%)` }}>{r.name.charAt(0).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{r.name}{r.you && <span className="ml-2 text-xs font-extrabold" style={{ color: "#20B8A6" }}>YOU</span>}</p>
                    {r.grade && <p className="text-xs" style={muted}>Grade {r.grade}</p>}
                  </div>
                  <span className="font-extrabold">{r.value.toLocaleString()} <span className="text-xs font-semibold" style={muted}>{data.unit}</span></span>
                </motion.li>
              ))}
            </ol>
          )}
        </>
      )}

      {home && (
        <button onClick={toggleVisible} className="mt-6 w-full rounded-2xl p-4 flex items-center gap-3 text-left" style={card}>
          {visible ? <Eye className="w-5 h-5" style={{ color: "#20B8A6" }} /> : <EyeOff className="w-5 h-5" style={muted} />}
          <span className="flex-1">
            <b className="block">{visible ? "You're shown on leaderboards" : "You're hidden from leaderboards"}</b>
            <span className="text-sm" style={muted}>{visible ? "Tap to hide - you'll still see your own rank." : "Tap to show your first name and rank to other players."}</span>
          </span>
        </button>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}><Board /></Suspense>
    </MotionConfig>
  );
}
