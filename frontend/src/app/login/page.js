"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/brand/Logo";
import SocialLoginButtons, { OrDivider } from "@/components/SocialLoginButtons";

const field =
  "w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-[#7F93AB] focus:border-[#20B8A6]";
const fieldStyle = { background: "#0F1F3D", color: "#F5F7FA", border: "1px solid #2B4058" };

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("error") === "oauth_failed") setError("That sign-in didn't finish. Try again.");
  }, [params]);

  // Already signed in → straight to the right home. The token check guards the
  // moment right after logout, when `user` is still briefly set.
  useEffect(() => {
    if (!authLoading && user && localStorage.getItem("accessToken")) {
      if (user.status && user.status !== "active" && !user.is_staff) router.replace("/account-status");
      else if (user.role === "teacher") router.replace("/facilitator");
      else if (user.is_staff || user.is_superuser || ["admin", "superadmin"].includes(user.role))
        router.replace("/admin");
      else router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login({ email: email.trim(), password });
    if (!result.success) {
      setError(
        result.error === "Invalid credentials"
          ? "That email and password don't match an account. Check them, or use Forgot password."
          : result.error,
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: "#081321" }}>
      <div className="w-full max-w-5xl flex items-center justify-between">
        <Link href="/" aria-label="StadiSpace home"><Logo size={22} /></Link>
        <Link href="/register" className="text-sm font-semibold rounded-full px-4 py-2"
          style={{ color: "#F5F7FA", border: "1px solid #2B4058" }}>
          Create account
        </Link>
      </div>

      <div className="w-full max-w-md flex-1 flex flex-col justify-center py-10">
        <h1 className="font-display text-center leading-[1.05] mb-3"
          style={{ color: "#F5F7FA", fontSize: "clamp(2.6rem, 8vw, 3.75rem)" }}>
          Welcome back
        </h1>
        <p className="font-display text-center text-xl mb-9" style={{ color: "#A9B9CC" }}>
          Pick up right where you left off
        </p>

        <div className="rounded-3xl p-6 sm:p-8" style={{ background: "#14243A", border: "1px solid #1F3350" }}>
          <SocialLoginButtons onError={setError} />

          <OrDivider />

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" autoComplete="email" required
              className={field} style={fieldStyle} />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                autoComplete="current-password" required
                className={`${field} pr-12`} style={fieldStyle} />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#A9B9CC" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p role="alert" className="text-sm rounded-xl px-4 py-3"
                style={{ color: "#F7A1A7", background: "rgba(240,113,120,0.10)", border: "1px solid rgba(240,113,120,0.35)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "#F5F7FA", color: "#081321" }}>
              {loading && <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
              {loading ? "Signing in…" : "Continue with email"}
            </button>

            <div className="text-center pt-1">
              <Link href="/forgot-password" className="text-sm" style={{ color: "#20B8A6" }}>
                Forgot password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#A9B9CC" }}>
          New to StadiSpace?{" "}
          <Link href="/register" className="font-semibold" style={{ color: "#20B8A6" }}>Create your free account</Link>
        </p>
        <p className="text-center text-xs mt-3" style={{ color: "#7F93AB" }}>
          By continuing, you agree to StadiSpace's Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
