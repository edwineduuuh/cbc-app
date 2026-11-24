"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { socialLogin } from "@/lib/api";

// The pop-up lands here with the provider's token in the URL hash and hands it
// back to the page that opened it.
//
// window.opener alone is not enough: Google's sign-in pages can carry a
// Cross-Origin-Opener-Policy that cuts the link between the pop-up and our
// page, and phones often open the "pop-up" as a separate tab. Then
// window.opener is null and sign-in silently failed. So the token also goes
// over a same-site BroadcastChannel, and if no page answers within a moment,
// this window finishes the sign-in itself.
export const OAUTH_CHANNEL = "stadispace-oauth";
export const OAUTH_ROLE_KEY = "ss_oauth_role";

export default function OAuthCallback({ provider, label }) {
  const { completeSignIn } = useAuth();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // dev double-mount: hand the token over once
    started.current = true;

    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");
    const providerError = params.get("error");
    // The token must not stay in the address bar or the history.
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      const msg = providerError === "access_denied"
        ? `You cancelled the ${label} sign-in.`
        : `${label} didn't send a sign-in. Please try again.`;
      Promise.resolve().then(() => setError(msg));
      return;
    }

    const message = { type: `${provider}-oauth-success`, access_token: token };
    let channel = null;
    let handled = false;
    try {
      channel = new BroadcastChannel(OAUTH_CHANNEL);
      channel.onmessage = (e) => {
        if (e.data?.type === "ack" && e.data.provider === provider) {
          handled = true;               // the sign-in page took it
          channel.close();
          window.close();
        }
      };
      channel.postMessage(message);
    } catch {}
    try {
      window.opener?.postMessage(message, window.location.origin);
    } catch {}

    // Nobody answered (no opener, or the sign-in page was closed): finish here.
    // No cleanup on purpose: React's dev double-mount would cancel it, and the
    // started guard would stop it being set again.
    setTimeout(async () => {
      if (handled) return;
      try { channel?.close(); } catch {}
      try {
        let role = "";
        try { role = localStorage.getItem(OAUTH_ROLE_KEY) || ""; } catch {}
        const data = await socialLogin(provider, token, role);
        await completeSignIn(data.tokens || { access: data.access, refresh: data.refresh });
      } catch (e) {
        setError(e.message || "That sign-in didn't finish. Please try again.");
      }
    }, 1500);
  }, [provider, label, completeSignIn]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="mb-5" style={{ color: "var(--text)" }}>{error}</p>
            <a href="/login" className="inline-block rounded-xl px-5 py-3 font-semibold text-white"
              style={{ background: "#0E7490" }}>
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
            <p style={{ color: "var(--text-muted)" }}>Signing you in with {label}…</p>
          </>
        )}
      </div>
    </div>
  );
}
