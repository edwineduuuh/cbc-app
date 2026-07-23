"use client";

/**
 * AdminGradingPanel
 * Shows AI grading health (model phase-out alert) and lets an admin measure the
 * real KES cost of grading. Drop into the admin dashboard: <AdminGradingPanel />
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Coins,
  Loader2,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const token = () => localStorage.getItem("accessToken");

export default function AdminGradingPanel() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [clearing, setClearing] = useState(false);

  const [cost, setCost] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const [perMonth, setPerMonth] = useState(20);
  const [costError, setCostError] = useState("");

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const r = await fetch(`${API}/admin/grading-health/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setHealth(await r.json());
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const clearAlert = async () => {
    setClearing(true);
    try {
      await fetch(`${API}/admin/grading-health/clear/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      await loadHealth();
    } finally {
      setClearing(false);
    }
  };

  const measure = async () => {
    setMeasuring(true);
    setCostError("");
    setCost(null);
    try {
      const r = await fetch(`${API}/admin/grading-cost/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quizzes_per_month: Number(perMonth) || 20 }),
      });
      const d = await r.json();
      if (!r.ok) {
        setCostError(d?.error || "Estimate failed.");
      } else {
        setCost(d);
      }
    } catch (e) {
      setCostError("Request failed. Check your connection.");
    } finally {
      setMeasuring(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">AI Grading</h3>
      </div>

      {/* ── Health ── */}
      <div className="mb-6">
        {loadingHealth ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking grading models…
          </div>
        ) : health?.healthy ? (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                All grading models healthy
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Grading: {health.grading_model} · Kiswahili:{" "}
                {health.kiswahili_model}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Model “{health?.dead_model}” was unavailable
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Grading auto-fell-back to keep working. Update{" "}
                <code>CLAUDE_MODEL</code> in <code>ai_grading.py</code>, redeploy,
                then clear this alert.
              </p>
              <button
                onClick={clearAlert}
                disabled={clearing}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-100 disabled:opacity-60"
              >
                {clearing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Clear alert
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scheme pre-match (cost saver) ── */}
      {health?.prematch_mode && health.prematch_mode !== "off" && (
        <div className="border-t border-gray-100 pt-5 mb-5">
          <h4 className="text-sm font-bold text-gray-900 mb-1">
            Scheme pre-match{" "}
            <span
              className={`ml-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                health.prematch_mode === "live"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {health.prematch_mode}
            </span>
          </h4>
          {(() => {
            const a = health.prematch_agree || 0;
            const d = health.prematch_disagree || 0;
            const total = a + d;
            const pct = total ? Math.round((a / total) * 100) : null;
            return (
              <p className="text-xs text-gray-500">
                {health.prematch_mode === "shadow" ? (
                  total === 0 ? (
                    "Watching… grade some list-type questions to gather agreement data before going live."
                  ) : (
                    <>
                      Agreed with the AI on <strong>{pct}%</strong> of {total}{" "}
                      full-mark cases ({a} agree / {d} disagree). Set{" "}
                      <code>SCHEME_PREMATCH_MODE=live</code> once you're happy to
                      start skipping those AI calls.
                    </>
                  )
                ) : (
                  <>
                    Live — skipping AI on clearly-full-mark answers. Lifetime
                    shadow agreement: {pct == null ? "n/a" : `${pct}%`}.
                  </>
                )}
              </p>
            );
          })()}
        </div>
      )}

      {/* ── Cost ── */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-amber-600" />
          <h4 className="text-sm font-bold text-gray-900">Grading cost</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Estimates what a quiz costs using free token counting — spends{" "}
          <strong>no credits</strong>, works even at a zero balance.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <label className="text-xs text-gray-600">Quizzes/student/month:</label>
          <input
            type="number"
            min={1}
            value={perMonth}
            onChange={(e) => setPerMonth(e.target.value)}
            className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1"
          />
          <button
            onClick={measure}
            disabled={measuring}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg px-3.5 py-1.5 hover:bg-indigo-700 disabled:opacity-60"
          >
            {measuring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Measuring…
              </>
            ) : (
              "Measure cost"
            )}
          </button>
        </div>

        {costError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
            {costError}
          </p>
        )}

        {cost && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2"
          >
            <Stat label="Est. cost / quiz" value={`KES ${cost.est_cost_per_quiz_kes}`} />
            <Stat label={`Monthly (${cost.quizzes_per_month} quizzes)`} value={`KES ${cost.est_monthly_kes}`} />
            <Stat label="% of KES " suffix={cost.sub_price} value={`${cost.pct_of_revenue}%`} />
            <Stat label="Margin / student" value={`KES ${cost.margin_kes}`} good={cost.margin_kes > 0} />
            <p className="col-span-2 md:col-span-4 text-[11px] text-gray-400 mt-1">
              Estimated from a {cost.sample_size}-question sample ·{" "}
              {cost.ai_graded_questions} AI-graded of {cost.total_questions} questions
              (MCQs are free) · real cost is lower thanks to caching.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, good }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
      <p className="text-[11px] text-gray-500 leading-tight">
        {label}
        {suffix != null ? suffix : ""}
      </p>
      <p
        className={`text-base font-black mt-0.5 ${
          good === false ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
