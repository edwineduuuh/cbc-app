"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { socialLogin } from "@/lib/api";
import { OAUTH_CHANNEL, OAUTH_ROLE_KEY } from "@/components/OAuthCallback";

// Provider pop-ups. Each returns an access token to /auth/<provider>/callback,
// which posts it back to this window; the backend swaps it for our own tokens.
const PROVIDERS = {
  google: {
    label: "Google",
    message: "google-oauth-success",
    url: (origin) =>
      `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        redirect_uri: `${origin}/auth/google/callback`,
        response_type: "token",
        scope: "openid email profile",
        prompt: "select_account",
      })}`,
  },
  microsoft: {
    label: "Microsoft",
    message: "microsoft-oauth-success",
    url: (origin) =>
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "",
        redirect_uri: `${origin}/auth/microsoft/callback`,
        response_type: "token",
        scope: "openid email profile User.Read",
        prompt: "select_account",
      })}`,
  },
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export const socialButtonCls =
  "w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const socialButtonStyle = { background: "#1B2C43", color: "#F5F7FA", border: "1px solid #24384F" };

/**
 * role: "student" | "teacher" - sent on sign-up so a new account gets the
 * right role. Leave empty on the sign-in page (existing accounts keep theirs;
 * a brand-new one defaults to learner).
 */
export default function SocialLoginButtons({ role = "", onError }) {
  const { completeSignIn } = useAuth();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const fail = (msg) => {
    setError(msg);
    onError?.(msg);
    setBusy("");
  };

  const start = (key) => {
    const p = PROVIDERS[key];
    setError("");
    setBusy(key);

    const w = 500, h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      p.url(window.location.origin),
      `${key}-signin`,
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) return fail("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
    // For the pop-up, in case it has to finish the sign-in on its own.
    try { localStorage.setItem(OAUTH_ROLE_KEY, role || ""); } catch {}

    // The token arrives by postMessage (window.opener) or, when Google's
    // isolation cut that link, by BroadcastChannel - see OAuthCallback.
    let done = false;
    let channel = null;
    const cleanup = () => {
      done = true;
      window.removeEventListener("message", onMessage);
      try { channel?.close(); } catch {}
      clearInterval(watch);
      clearTimeout(giveUp);
    };
    const receive = async (msg) => {
      if (done || msg?.type !== p.message || !msg.access_token) return;
      try { channel?.postMessage({ type: "ack", provider: key }); } catch {}
      cleanup();
      try { popup.close(); } catch {}
      try {
        const data = await socialLogin(key, msg.access_token, role);
        await completeSignIn(data.tokens || { access: data.access, refresh: data.refresh });
      } catch (e) {
        fail(e.message);
      }
    };
    const onMessage = (event) => {
      if (event.origin === window.location.origin) receive(event.data);
    };
    try {
      channel = new BroadcastChannel(OAUTH_CHANNEL);
      channel.onmessage = (e) => receive(e.data);
    } catch {}
    window.addEventListener("message", onMessage);
    // A cut opener link also makes the pop-up *look* closed, so a closed
    // pop-up only stops the spinner - we keep listening for its token.
    const watch = setInterval(() => {
      if (!done && popup.closed) setBusy("");
    }, 600);
    const giveUp = setTimeout(cleanup, 5 * 60 * 1000);
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => start("google")} disabled={!!busy}
        className={socialButtonCls} style={socialButtonStyle}>
        {busy === "google" ? <Spinner /> : <GoogleMark />} Continue with Google
      </button>
      <button type="button" onClick={() => start("microsoft")} disabled={!!busy}
        className={socialButtonCls} style={socialButtonStyle}>
        {busy === "microsoft" ? <Spinner /> : <MicrosoftMark />} Continue with Microsoft
      </button>
      {error && !onError && (
        <p role="alert" className="text-sm rounded-xl px-4 py-3"
          style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)", border: "1px solid rgba(240,113,120,0.35)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

export function OrDivider({ label = "OR" }) {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <span className="flex-1 h-px" style={{ background: "#24384F" }} />
      <span className="text-xs tracking-widest" style={{ color: "#A9B9CC" }}>{label}</span>
      <span className="flex-1 h-px" style={{ background: "#24384F" }} />
    </div>
  );
}
