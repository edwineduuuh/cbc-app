"use client";

/** Small shared pieces for the facilitator tool forms. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-0fd4.up.railway.app/api";

export const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function Field({ label, optional, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </span>
      {hint && <span className="block text-[11px] text-gray-500 -mt-1 mb-1.5">{hint}</span>}
      {children}
    </label>
  );
}

export function Select({ value, onChange, options, ...rest }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function MoreOptions({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800">
        More options
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

/** Posts the form and opens the result in My Library, where it is built. */
export function useGenerate(url) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (body) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetchWithAuth(`${API}${url}`, { method: "POST", body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
      router.push(`/facilitator/library/${d.id}`);
    } catch (e) {
      setError(/failed to fetch|network/i.test(e.message || "")
        ? "The connection dropped. Check your internet and try again."
        : e.message);
      setBusy(false);
    }
  };
  return { run, busy, error };
}

export function SubmitButton({ busy, disabled, onClick, children, busyText = "Starting..." }) {
  return (
    <button onClick={onClick} disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {busy ? busyText : children}
    </button>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
    </p>
  );
}

/** Saved per browser so a teacher types their school and name once. */
export function useRemembered(key, initial = "") {
  const [v, setV] = useState(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`studio:${key}`);
      if (saved) setV(saved);
    } catch {}
  }, [key]);
  const set = (x) => {
    setV(x);
    try { localStorage.setItem(`studio:${key}`, x); } catch {}
  };
  return [v, set];
}

export const YEAR = String(new Date().getFullYear());
export const WEEKS = Array.from({ length: 16 }, (_, i) => [String(i + 1), `${i + 1} week${i ? "s" : ""}`]);
export const PER_WEEK = Array.from({ length: 10 }, (_, i) => [String(i + 1), `${i + 1} lesson${i ? "s" : ""}`]);
export const TERMS = [["1", "Term 1"], ["2", "Term 2"], ["3", "Term 3"]];
