"use client";

/**
 * AdminPaymentsPanel
 *
 * Drop this into your Admin page as a new tab/section.
 * Shows all pending M-Pesa payment requests for verification.
 *
 * Usage:
 *   import AdminPaymentsPanel from "@/components/AdminPaymentsPanel";
 *   // Add to your admin tabs: { label: "Payments", icon: CreditCard, id: "payments" }
 *   // Then render: {activeTab === "payments" && <AdminPaymentsPanel />}
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  X,
  Clock,
  Phone,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Eye,
  Filter,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-76im.onrender.com/api";

const STATUS_STYLES = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Pending",
  },
  verified: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "Verified",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Rejected",
  },
};

export default function AdminPaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModal, setRejectModal] = useState(null); // payment to reject
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    revenue: 0,
  });

  const getToken = () => localStorage.getItem("accessToken");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/payments/?status=${filter}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/admin/payments/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const all = await res.json();
        if (Array.isArray(all)) {
          setStats({
            pending: all.filter((p) => p.status === "pending").length,
            verified: all.filter((p) => p.status === "verified").length,
            rejected: all.filter((p) => p.status === "rejected").length,
            revenue: all
              .filter((p) => p.status === "verified")
              .reduce((sum, p) => sum + (p.amount_paid || 0), 0),
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleVerify = async (payment) => {
    setActionLoading((prev) => ({ ...prev, [payment.id]: "verifying" }));
    try {
      const res = await fetch(`${API}/admin/payments/${payment.id}/verify/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        showToast(
          `✓ ${payment.username}'s payment verified. Subscription activated!`,
        );
        fetchPayments();
        fetchStats();
      } else {
        const err = await res.json();
        showToast(err.error || "Verification failed", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [payment.id]: null }));
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading((prev) => ({ ...prev, [rejectModal.id]: "rejecting" }));
    try {
      const res = await fetch(
        `${API}/admin/payments/${rejectModal.id}/reject/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectReason }),
        },
      );
      if (res.ok) {
        showToast(`Payment rejected. Student will be notified.`, "warning");
        setRejectModal(null);
        setRejectReason("");
        fetchPayments();
        fetchStats();
      }
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [rejectModal?.id]: null }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
              toast.type === "error"
                ? "bg-red-600 text-white"
                : toast.type === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-green-600 text-white"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Pending",
            value: stats.pending,
            color: "bg-amber-50 text-amber-700 border-amber-200",
            icon: Clock,
          },
          {
            label: "Verified",
            value: stats.verified,
            color: "bg-green-50 text-green-700 border-green-200",
            icon: CheckCircle,
          },
          {
            label: "Rejected",
            value: stats.rejected,
            color: "bg-red-50 text-red-700 border-red-200",
            icon: X,
          },
          {
            label: "Revenue (KES)",
            value: stats.revenue.toLocaleString(),
            color: "bg-indigo-50 text-indigo-700 border-indigo-200",
            icon: CreditCard,
          },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-4 ${s.color}`}>
            <s.icon className="w-5 h-5 mb-2 opacity-70" />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-sm opacity-75">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {["pending", "verified", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
              {f === "pending" && stats.pending > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            fetchPayments();
            fetchStats();
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {filter} payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Payment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-bold text-gray-900">
                      {payment.username}
                    </span>
                    <span className="text-sm text-gray-500">
                      {payment.email}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[payment.status]?.bg} ${STATUS_STYLES[payment.status]?.text} ${STATUS_STYLES[payment.status]?.border}`}
                    >
                      {STATUS_STYLES[payment.status]?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                        Plan
                      </p>
                      <p className="font-semibold text-gray-800">
                        {payment.plan_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                        M-Pesa Code
                      </p>
                      <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {payment.mpesa_code}
                      </code>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                        Amount
                      </p>
                      <p
                        className={`font-bold ${
                          payment.amount_paid === payment.plan_price
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        KES {payment.amount_paid?.toLocaleString()}
                        {payment.amount_paid !== payment.plan_price && (
                          <span className="text-xs ml-1">
                            (expected {payment.plan_price})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                        Submitted
                      </p>
                      <p className="text-gray-700">
                        {new Date(payment.submitted_at).toLocaleString(
                          "en-KE",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {payment.status === "rejected" &&
                    payment.rejection_reason && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        Rejection reason: {payment.rejection_reason}
                      </div>
                    )}
                </div>

                {/* Actions — only for pending */}
                {payment.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleVerify(payment)}
                      disabled={!!actionLoading[payment.id]}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all"
                    >
                      {actionLoading[payment.id] === "verifying" ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Verify
                    </button>
                    <button
                      onClick={() => {
                        setRejectModal(payment);
                        setRejectReason("");
                      }}
                      disabled={!!actionLoading[payment.id]}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-200 disabled:opacity-50 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject Confirmation Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Reject Payment?
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Rejecting <strong>{rejectModal.username}</strong>'s payment of
                KES {rejectModal.amount_paid} (code:{" "}
                <code className="font-mono">{rejectModal.mpesa_code}</code>).
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g. Code not found, wrong amount, duplicate...)"
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:border-red-400 outline-none mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal(null)}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 transition-all"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
