"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import {
  Video, Calendar, Clock, GraduationCap, Loader2, CheckCircle2,
  AlertCircle, Phone, X,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleString("en-KE", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_UI = {
  requested: { label: "Waiting for approval", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  approved: { label: "Approved — pay to confirm", cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300" },
  payment_submitted: { label: "Payment sent — confirming…", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  rejected: { label: "Not available", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" },
  completed: { label: "Completed", cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300" },
};

export default function LiveLessonsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null); // slot being booked
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
      const [s, b] = await Promise.all([
        fetchWithAuth(`${API}/live/slots/`).then((r) => r.json()),
        fetchWithAuth(`${API}/live/bookings/`).then((r) => r.json()),
      ]);
      setSlots(s.slots || []);
      setBookings(b.bookings || []);
    } catch {
      /* ignore — page still renders */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Clean up any polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  const openBooking = (slot) => {
    setBooking(slot);
    setPhone(user?.phone || "");
    setNote("");
  };

  const submitBooking = async () => {
    if (!phone.trim()) return flash("Please enter your phone number.", "err");
    setBusy(true);
    try {
      const res = await fetchWithAuth(`${API}/live/bookings/create/`, {
        method: "POST",
        body: JSON.stringify({ slot_id: booking.id, phone: phone.trim(), note: note.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not book that slot.");
      setBooking(null);
      flash("Requested! We'll approve it shortly, then you can pay.");
      load();
    } catch (e) {
      flash(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  // Poll for confirmation for ~2 min after paying
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-600 p-6 sm:p-8 text-white mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Live Zoom Tuition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">Book a 1-on-1 live lesson</h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl">
            Pick a time with a real teacher on Zoom. Request a slot, we approve it,
            you pay by M-Pesa, and your private link appears here.
          </p>
        </div>

        {/* My lessons */}
        {bookings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">My lessons</h2>
            <div className="space-y-3">
              {bookings.map((b) => {
                const ui = STATUS_UI[b.status] || STATUS_UI.requested;
                return (
                  <div key={b.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{b.slot.subject}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3.5 w-3.5" /> {fmtWhen(b.slot.starts_at)}
                          <span className="mx-1">·</span> KES {b.amount_kes}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ui.cls}`}>{ui.label}</span>
                    </div>

                    {b.status === "approved" && (
                      <button
                        onClick={() => pay(b)}
                        disabled={busy}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Phone className="h-4 w-4" /> Pay KES {b.amount_kes} via M-Pesa
                      </button>
                    )}
                    {b.status === "payment_submitted" && (
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Waiting for M-Pesa confirmation… you can leave this page.
                      </p>
                    )}
                    {b.status === "confirmed" && b.zoom_link && (
                      <a
                        href={b.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        <Video className="h-4 w-4" /> Join your Zoom lesson
                      </a>
                    )}
                    {b.status === "confirmed" && !b.zoom_link && (
                      <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
                        Paid ✓ — your teacher will add the Zoom link here shortly.
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

        {/* Available slots */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Available times</h2>
          {slots.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 p-8 text-center text-gray-500 dark:text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No open slots right now. New times are added regularly — check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 shadow-sm flex flex-col">
                  <p className="font-bold text-gray-900 dark:text-white">{s.subject}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                    <Calendar className="h-3.5 w-3.5" /> {fmtWhen(s.starts_at)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min
                    {s.grade && (<><span className="mx-1">·</span><GraduationCap className="h-3.5 w-3.5" /> {s.grade}</>)}
                  </p>
                  {s.teacher_name && <p className="text-xs text-gray-400 mt-1">with {s.teacher_name}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-black text-gray-900 dark:text-white">KES {s.price_kes}</span>
                    <button
                      onClick={() => openBooking(s)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Booking modal */}
      {booking && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBooking(null)} />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <button onClick={() => setBooking(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Request this lesson</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {booking.subject} · {fmtWhen(booking.starts_at)} · KES {booking.price_kes}
            </p>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">M-Pesa phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">What do you need help with? (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Fractions and decimals — I keep getting them wrong"
              className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
            <button
              onClick={submitBooking}
              disabled={busy}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Request lesson
            </button>
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              You'll only pay once we've approved your slot.
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
