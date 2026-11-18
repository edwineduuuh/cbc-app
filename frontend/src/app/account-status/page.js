"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MailCheck, Hourglass, ShieldAlert, RefreshCw } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentUser } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-production-0fd4.up.railway.app/api";

// What a signed-in but not-yet-active account sees. The backend refuses such an
// account everywhere except its own profile, so this page is where it lands.
function reasonFor(u) {
  if (!u) return null;
  if (u.status === "suspended" || u.status === "rejected") return u.status;
  if (u.status === "pending") return u.email_verified ? "awaiting_approval" : "awaiting_verification";
  return "active";
}

const COPY = {
  awaiting_verification: {
    icon: MailCheck,
    title: "Check your email",
    body: (u) => `We sent a link to ${u?.email || "your email"}. Click it to switch on your account - it takes one tap.`,
  },
  awaiting_approval: {
    icon: Hourglass,
    title: "Almost there",
    body: () => "Your facilitator account is being reviewed. You'll get an email the moment it's ready.",
  },
  suspended: {
    icon: ShieldAlert,
    title: "Account suspended",
    body: () => "This account can't be used right now. If you think this is a mistake, call or WhatsApp 0704 699683.",
  },
  rejected: {
    icon: ShieldAlert,
    title: "Account not approved",
    body: () => "This account wasn't approved. For help, call or WhatsApp 0704 699683.",
  },
};

function AccountStatus() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState(user);
  const [sent, setSent] = useState("");
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.replace("/login"); return; }
    setChecking(true);
    try {
      const fresh = await getCurrentUser(token);
      setMe(fresh);
      localStorage.setItem("user", JSON.stringify({ ...(user || {}), ...fresh }));
      if (fresh.status === "active") {
        // Hard navigation so every context reloads with the active account.
        window.location.href = fresh.role === "teacher" ? "/facilitator" : fresh.grade ? "/dashboard" : "/welcome";
      }
    } catch {
      /* keep showing what we have */
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reason = reasonFor(me) || params.get("reason") || "awaiting_verification";
  const copy = COPY[reason] || COPY.awaiting_verification;
  const Icon = copy.icon;

  const resend = async () => {
    setSent("sending");
    try {
      const r = await fetch(`${API}/auth/resend-verification/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setSent(r.ok ? "sent" : "failed");
    } catch {
      setSent("failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: "#081321" }}>
      <div className="w-full max-w-5xl"><Link href="/" aria-label="StadiSpace home"><Logo size={22} /></Link></div>
      <div className="w-full max-w-md flex-1 flex flex-col justify-center py-10 text-center">
        <span className="mx-auto mb-6 grid place-items-center w-14 h-14 rounded-2xl" style={{ background: "#14243A", color: "#20B8A6" }}>
          <Icon className="w-7 h-7" />
        </span>
        <h1 className="font-display leading-tight mb-3" style={{ color: "#F5F7FA", fontSize: "clamp(2.2rem, 7vw, 3rem)" }}>
          {copy.title}
        </h1>
        <p className="text-[15px] leading-relaxed mb-8" style={{ color: "#A9B9CC" }}>{copy.body(me)}</p>

        <div className="space-y-3">
          {reason === "awaiting_verification" && (
            <>
              <button onClick={refresh} disabled={checking}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold disabled:opacity-60"
                style={{ background: "#F5F7FA", color: "#081321" }}>
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} /> I've verified - continue
              </button>
              <button onClick={resend} disabled={sent === "sending" || sent === "sent"}
                className="w-full rounded-xl py-3.5 text-[15px] font-medium disabled:opacity-60"
                style={{ background: "#1B2C43", color: "#F5F7FA", border: "1px solid #24384F" }}>
                {sent === "sent" ? "Sent - check your inbox and spam" : sent === "sending" ? "Sending…" : "Resend the email"}
              </button>
              {sent === "failed" && <p className="text-sm" style={{ color: "#F7A1A7" }}>Couldn't send just now. Try again in a minute.</p>}
            </>
          )}
          {reason === "awaiting_approval" && (
            <button onClick={refresh} disabled={checking}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold disabled:opacity-60"
              style={{ background: "#F5F7FA", color: "#081321" }}>
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} /> Check again
            </button>
          )}
          <button onClick={logout} className="w-full py-3 text-sm" style={{ color: "#A9B9CC" }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountStatusPage() {
  return (
    <Suspense fallback={null}>
      <AccountStatus />
    </Suspense>
  );
}
