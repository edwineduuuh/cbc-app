"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { Suspense } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    fetch(`${API}/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message === "Email verified successfully") {
          setStatus("success");
          // Update cached user so banner disappears without a full reload
          try {
            const cached = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...cached, email_verified: true }));
          } catch (_) {}
          setTimeout(() => router.replace("/dashboard"), 2500);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #f0f4f8 60%, #e8f4f8 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center"
        >
          {status === "loading" && (
            <>
              <Loader className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-6" />
              <h1 className="font-display text-3xl text-gray-900 mb-2">Verifying…</h1>
              <p className="text-gray-500 text-sm">Just a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="font-display text-3xl text-gray-900 mb-2">Email verified!</h1>
              <p className="text-gray-500 text-sm mb-6">
                Your account is fully set up. Taking you to your dashboard…
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-9 h-9 text-red-500" />
              </div>
              <h1 className="font-display text-3xl text-gray-900 mb-2">Link invalid</h1>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link href="/dashboard">
                <button
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, #0e7490, #0f1f3d)" }}
                >
                  Go to Dashboard
                </button>
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}

export default function VerifyEmailPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    }>
      <VerifyEmailPage />
    </Suspense>
  );
}
