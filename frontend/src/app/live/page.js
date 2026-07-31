"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import {
  Video, Calendar, Clock, Loader2, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, X, Sparkles, Users,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const dateKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const fmtDay = (k) =>
  new Date(k + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
const fmtDate = (k) =>
  new Date(k + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });

const STATUS_UI = {
  requested: { label: "Waiting for approval", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  approved: { label: "Approved - pay to confirm", cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300" },
  payment_submitted: { label: "Payment sent - confirming…", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  rejected: { label: "Not available", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" },
  completed: { label: "Completed", cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" },
};

export default function LiveLessonsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [defaultPrice, setDefaultPrice] = useState(1500);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  // Booking modal
  const [active, setActive] = useState(null); // {date, window_key, window_label, price_kes}
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState([]);
  const [strand, setStrand] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const flash = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetchWithAuth(`${API}/live/availability/`).then((r) => r.json()),
        fetchWithAuth(`${API}/live/bookings/`).then((r) => r.json()),
      ]);
      setSessions(a.sessions || []);
      if (a.default_price) setDefaultPrice(a.default_price);
      setBookings(b.bookings || []);
    } catch {
      /* still renders */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => () => clearInterval(pollRef.current), []);

  useEffect(() => {
    if (!user) return;
    const grade = user.grade ? `?grade=${user.grade}` : "";
    fetchWithAuth(`${API}/subjects/${grade}`)
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : []))
      .catch(() => setSubjects([]));
  }, [user]);

  useEffect(() => {
    if (!subjectId) { setTopics([]); setStrand(""); return; }
    const grade = user?.grade ? `&grade=${user.grade}` : "";
    fetchWithAuth(`${API}/topics/?subject=${subjectId}${grade}`)
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]));
    setStrand("");
  }, [subjectId, user]);

  // Group sessions by date
  const byDate = useMemo(() => {
    const m = {};
    for (const s of sessions) (m[s.date] = m[s.date] || []).push(s);
    return m;
  }, [sessions]);

  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const todayKey = dateKey(new Date());
  const canGoPrev = month > new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const openBooking = (s) => {
    setActive(s);
    setSubjectId("");
    setStrand("");
    setNote("");
    setPhone(user?.phone || "");
  };

  const submitBooking = async () => {
    if (!phone.trim()) return flash("Please enter your phone number.", "err");
    const subject = subjects.find((s) => String(s.id) === String(subjectId));
    setBusy(true);
    try {
      const res = await fetchWithAuth(`${API}/live/bookings/create/`, {
        method: "POST",
        body: JSON.stringify({
          session_date: active.date,
          window_key: active.window_key,
          phone: phone.trim(),
          learning_area: subject ? subject.name : "General",
          strand: strand || (subject ? "General" : ""),
          note: note.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not book that session.");
      setActive(null);
      flash("Requested! We'll confirm a teacher, then you can pay.");
      load();
    } catch (e) {
      flash(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const startPolling = () => {
    clearInterval(pollRef.current);
    let n = 0;
    pollRef.current = setInterval(async () => {
      n += 1;
      await load();
      if (n >= 20) clearInterval(pollRef.current);
    }, 6000);
  };

  const pay = async (b) => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`${API}/live/bookings/${b.id}/pay/`, {
        method: "POST",
        body: JSON.stringify({ phone: b.phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not start payment.");
      flash("Check your phone for the M-Pesa prompt and enter your PIN.");
      load();
      startPolling();
    } catch (e) {
      flash(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (b) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      const res = await fetchWithAuth(`${API}/live/bookings/${b.id}/cancel/`, { method: "POST" });
      if (res.ok) { flash("Booking cancelled."); load(); }
    } catch { /* ignore */ }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p>Loading live lessons…</p>
      </div>
    );
  }
  if (!user) return null;

  const daySessions = selectedDate ? byDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Hero + price */}
        <div className="rounded-3xl bg-indigo-600 p-6 sm:p-8 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Live Zoom Classes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">Join a live lesson</h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl mb-4">
            Real teachers, live on Zoom. Pick a day and a time, choose your subject.
          </p>
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur px-5 py-3">
            <div>
              <p className="text-2xl font-black">KES {Number(defaultPrice).toLocaleString()}</p>
              <p className="text-xs opacity-90">per session</p>
            </div>
            <div className="h-8 w-px bg-white/25" />
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4" /> Group class
            </div>
          </div>
        </div>

        {/* My lessons */}
        {bookings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">My lessons</h2>
            <div className="space-y-3">
              {bookings.map((b) => {
                const ui = STATUS_UI[b.status] || STATUS_UI.requested;
                return (
                  <div key={b.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {b.learning_area}{b.strand && b.strand !== "General" ? ` · ${b.strand}` : ""}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3.5 w-3.5" /> {fmtDate(b.session_date)} · {b.window_label}
                          <span className="mx-1">·</span> KES {b.amount_kes.toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ui.cls}`}>{ui.label}</span>
                    </div>

                    {b.status === "approved" && (
                      <button onClick={() => pay(b)} disabled={busy}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                        Pay KES {b.amount_kes.toLocaleString()} via M-Pesa
                      </button>
                    )}
                    {b.status === "payment_submitted" && (
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Waiting for M-Pesa confirmation… you can leave this page.
                      </p>
                    )}
                    {b.status === "confirmed" && b.zoom_link && (
                      <a href={b.zoom_link} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                        <Video className="h-4 w-4" /> Join your Zoom lesson
                      </a>
                    )}
                    {b.status === "confirmed" && !b.zoom_link && (
                      <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
                        Paid ✓ - your Zoom link will appear here shortly.
                      </p>
                    )}
                    {b.status === "rejected" && b.rejection_reason && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400">{b.rejection_reason}</p>
                    )}
                    {["requested", "approved"].includes(b.status) && (
                      <button onClick={() => cancel(b)} className="mt-2 ml-3 text-xs text-gray-400 hover:text-red-500">
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Calendar */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Pick a day</h2>
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => canGoPrev && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                disabled={!canGoPrev}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="font-bold text-gray-900 dark:text-white">
                {month.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </p>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[11px] font-semibold text-gray-400 py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                const k = dateKey(d);
                const inMonth = d.getMonth() === month.getMonth();
                const has = !!byDate[k];
                const isPast = k < todayKey;
                const isSel = k === selectedDate;
                return (
                  <button
                    key={i}
                    disabled={!has || isPast}
                    onClick={() => setSelectedDate(k)}
                    className={`aspect-square rounded-xl text-sm font-semibold flex flex-col items-center justify-center transition-colors ${
                      isSel
                        ? "bg-indigo-600 text-white"
                        : has && !isPast
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300"
                          : inMonth
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-300 dark:text-gray-700"
                    }`}
                  >
                    {d.getDate()}
                    {has && !isPast && !isSel && <span className="mt-0.5 h-1 w-1 rounded-full bg-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Windows for the chosen day */}
          {selectedDate && (
            <div className="mt-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{fmtDay(selectedDate)}</h3>
              {daySessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions on this day.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {daySessions.map((s) => (
                    <button key={s.window_key} onClick={() => openBooking(s)}
                      className="rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-500/30 px-4 py-3 text-left hover:border-indigo-500 flex items-center justify-between">
                      <span className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                        <Clock className="h-4 w-4" /> {s.window_label}
                      </span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">KES {s.price_kes.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {sessions.length === 0 && (
            <div className="mt-5 rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 p-8 text-center text-gray-500 dark:text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sessions scheduled yet - new ones are added regularly. Check back soon.</p>
            </div>
          )}
        </section>
      </div>

      {/* Booking modal */}
      {active && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActive(null)} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button onClick={() => setActive(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Book this session</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {fmtDate(active.date)} · {active.window_label} · KES {active.price_kes.toLocaleString()}
            </p>

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Learning area</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
              className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none">
              <option value="">General / any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {subjectId && (
              <>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Strand of interest</label>
                <select value={strand} onChange={(e) => setStrand(e.target.value)}
                  className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none">
                  <option value="">General / not sure yet</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </>
            )}

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">M-Pesa phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX"
              className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none" />

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Anything specific? (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="e.g. I keep getting fractions wrong"
              className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none resize-none" />

            <button onClick={submitBooking} disabled={busy}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Request session - KES {active.price_kes.toLocaleString()}
            </button>
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              You only pay once we've confirmed a teacher for your session.
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${toast.kind === "err" ? "bg-red-600" : "bg-emerald-600"}`}>
          {toast.kind === "err" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
