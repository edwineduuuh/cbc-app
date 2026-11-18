"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, CheckCircle2, XCircle, Ban, RotateCcw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";

const ROLES = [
  { value: "", label: "Everyone" },
  { value: "student", label: "Learners" },
  { value: "teacher", label: "Facilitators" },
];
const STATUSES = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];
const STATUS_STYLE = {
  active: { color: "#5EE6C1", background: "rgba(32,184,166,0.12)" },
  pending: { color: "#F5C76B", background: "rgba(245,199,107,0.12)" },
  suspended: { color: "#F7A1A7", background: "rgba(240,113,120,0.12)" },
  rejected: { color: "#A9B9CC", background: "rgba(169,185,204,0.12)" },
};
// Which buttons each status offers - mirrors TRANSITIONS on the backend.
const ACTIONS = {
  pending: [["approve", "Approve", CheckCircle2], ["reject", "Reject", XCircle], ["suspend", "Suspend", Ban]],
  active: [["suspend", "Suspend", Ban]],
  suspended: [["reinstate", "Reinstate", RotateCcw]],
  rejected: [["reinstate", "Reinstate", RotateCcw]],
};

export default function AdminAccountsPage() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    try {
      const r = await fetchWithAuth(`${API}/auth/admin/accounts/?${params}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setRows(data.results || []);
    } catch {
      setError("Couldn't load accounts. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [role, status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const act = async (row, action) => {
    let reason = "";
    if (action === "suspend" || action === "reject") {
      reason = window.prompt(`Why ${action} ${row.name}? (kept in the account history)`, "");
      if (reason === null) return;
    }
    setBusyId(row.id);
    try {
      const r = await fetchWithAuth(`${API}/auth/admin/accounts/${row.id}/action/`, {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || data.error || "That didn't work.");
      setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, status: data.status || x.status } : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const chip = (active) => ({
    background: active ? "#20B8A6" : "#14243A",
    color: active ? "#080F1D" : "#A9B9CC",
    border: `1px solid ${active ? "#20B8A6" : "#24384F"}`,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: "#F5F7FA" }}>
      <h1 className="font-display text-4xl mb-1">Accounts</h1>
      <p className="text-sm mb-6" style={{ color: "#A9B9CC" }}>
        People get in by verifying their email. Use this page to suspend someone, or to reinstate them.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {ROLES.map((r) => (
          <button key={r.value} onClick={() => setRole(r.value)} className="rounded-full px-3.5 py-1.5 text-sm font-medium" style={chip(role === r.value)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setStatus(s.value)} className="rounded-full px-3 py-1 text-xs font-medium" style={chip(status === s.value)}>
            {s.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 w-full sm:w-72" style={{ background: "#14243A", border: "1px solid #24384F" }}>
          <Search className="w-4 h-4" style={{ color: "#A9B9CC" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or username"
            className="bg-transparent outline-none text-sm flex-1" style={{ color: "#F5F7FA" }} />
        </label>
      </div>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 mb-4" style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)" }}>{error}</p>}

      <div className="rounded-2xl overflow-hidden" style={{ background: "#14243A", border: "1px solid #1F3350" }}>
        {loading ? (
          <p className="p-6 text-sm" style={{ color: "#A9B9CC" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "#A9B9CC" }}>No accounts match.</p>
        ) : (
          <ul>
            {rows.map((row, i) => (
              <li key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4"
                style={{ borderTop: i ? "1px solid #1F3350" : "none" }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{row.name}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5" style={STATUS_STYLE[row.status]}>
                      {row.status}
                    </span>
                    <span className="text-xs" style={{ color: "#A9B9CC" }}>{row.role === "teacher" ? "Facilitator" : "Learner"}</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: "#A9B9CC" }}>
                    {row.email || row.username}
                    {row.email && !row.email_verified && " · email not verified"}
                    {row.providers?.length ? ` · ${row.providers.join(", ")}` : ""}
                    {row.school_name ? ` · ${row.school_name}` : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#7F93AB" }}>
                    Joined {new Date(row.date_joined).toLocaleDateString()}
                    {row.last_login ? ` · last seen ${new Date(row.last_login).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(ACTIONS[row.status] || []).map(([action, label, Icon]) => (
                    <button key={action} onClick={() => act(row, action)} disabled={busyId === row.id}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      style={action === "approve" || action === "reinstate"
                        ? { background: "#0E7490", color: "#fff" }
                        : { background: "#1B2C43", color: "#F5F7FA", border: "1px solid #24384F" }}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
