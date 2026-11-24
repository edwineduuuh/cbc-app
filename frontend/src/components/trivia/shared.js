"use client";

import { motion } from "framer-motion";
import { fetchWithAuth } from "@/lib/api";

export const API =
  process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";

/** fetch + JSON, throwing the server's plain-English error. */
export async function triviaApi(path, { method = "GET", body } = {}) {
  const r = await fetchWithAuth(`${API}/trivia/${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(d.error || d.detail || "Something went wrong. Please try again.");
    e.status = r.status;
    throw e;
  }
  return d;
}

export const DIFF = {
  easy: { label: "Easy", color: "#3CCB8B" },
  medium: { label: "Medium", color: "#E8B65B" },
  hard: { label: "Hard", color: "#FF9F5A" },
  expert: { label: "Expert", color: "#F07178" },
  mixed: { label: "Mixed", color: "#A9B9CC" },
};

export const OPTION_COLORS = ["#4D8DDA", "#B48EF5", "#E8B65B", "#20B8A6", "#FF9F5A", "#F07178"];

/* ── Sound: tiny tones made in the browser (no audio files, nothing licensed).
   Only ever played in response to a tap; the player can switch it off
   (remembered on this device). */
const SOUND_KEY = "ss_trivia_sound";
let ctx = null;

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
export function setSound(on) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch {}
}

function tone(freq, start, dur, type = "sine", gain = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

const SOUNDS = {
  correct: () => { tone(660, 0, 0.12, "triangle"); tone(990, 0.09, 0.2, "triangle"); },
  wrong: () => { tone(220, 0, 0.18, "sawtooth", 0.04); tone(165, 0.12, 0.25, "sawtooth", 0.04); },
  tick: () => tone(1200, 0, 0.04, "square", 0.025),
  xp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.06)),
  badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.22, "sine", 0.07)),
  levelup: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.25, "triangle", 0.07)),
  start: () => { tone(440, 0, 0.1, "triangle"); tone(880, 0.1, 0.15, "triangle"); },
};

/** Only ever called from a tap or from something a tap started. */
export function play(name) {
  if (!soundOn()) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    SOUNDS[name]?.();
  } catch {}
}

/** Round level badge with the XP progress drawn around it. */
export function LevelRing({ level, size = 76 }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const p = level?.progress ?? 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth="6" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="url(#lvl)" strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 1.1, ease: "easeOut" }} />
        <defs>
          <linearGradient id="lvl" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#20B8A6" /><stop offset="1" stopColor="#E8B65B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#A9B9CC" }}>Level</span>
        <span className="text-2xl font-extrabold" style={{ color: "#F5F7FA" }}>{level?.level ?? 1}</span>
      </div>
    </div>
  );
}

export function XPBar({ level }) {
  if (!level) return null;
  const toNext = level.next_xp != null ? level.next_xp - level.xp : 0;
  return (
    <div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#20B8A6,#E8B65B)" }}
          initial={{ width: 0 }} animate={{ width: `${Math.round((level.progress || 0) * 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }} />
      </div>
      <p className="text-xs mt-1.5" style={{ color: "#A9B9CC" }}>
        {level.next_xp != null
          ? <>{toNext.toLocaleString()} XP to <b style={{ color: "#F5F7FA" }}>{level.next_name}</b></>
          : "Top level reached - you're a Legend!"}
      </p>
    </div>
  );
}

export const card = { background: "#14243A", border: "1px solid #1F3350" };
export const muted = { color: "#A9B9CC" };
