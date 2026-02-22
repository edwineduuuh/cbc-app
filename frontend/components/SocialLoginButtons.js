"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft } from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

export default function SocialLoginButtons() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Open Google OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          redirect_uri: `${window.location.origin}/auth/google/callback`,
          response_type: "token",
          scope: "openid email profile",
        })}`,
        "Google Login",
        `width=${width},height=${height},top=${top},left=${left}`,
      );

      // Listen for OAuth callback
      window.addEventListener("message", async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "google-oauth-success") {
          const { access_token } = event.data;
          popup?.close();

          // Send token to backend
          const response = await fetch(`${API}/auth/google/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token }),
          });

          const data = await response.json();

          if (response.ok) {
            // Store tokens
            localStorage.setItem("accessToken", data.access);
            localStorage.setItem("refreshToken", data.refresh);

            // Login user
            login(data.user);

            // Redirect based on role
            if (data.user.role === "student") {
              router.push("/dashboard");
            } else {
              router.push("/admin");
            }
          } else {
            setError(data.error || "Google login failed");
          }
        }
      });
    } catch (err) {
      console.error("Google login error:", err);
      setError("Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams(
          {
            client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
            redirect_uri: `${window.location.origin}/auth/microsoft/callback`,
            response_type: "token",
            scope: "openid email profile User.Read",
          },
        )}`,
        "Microsoft Login",
        `width=${width},height=${height},top=${top},left=${left}`,
      );

      window.addEventListener("message", async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "microsoft-oauth-success") {
          const { access_token } = event.data;
          popup?.close();

          const response = await fetch(`${API}/auth/microsoft/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token }),
          });

          const data = await response.json();

          if (response.ok) {
            localStorage.setItem("accessToken", data.access);
            localStorage.setItem("refreshToken", data.refresh);
            login(data.user);

            if (data.user.role === "student") {
              router.push("/dashboard");
            } else {
              router.push("/admin");
            }
          } else {
            setError(data.error || "Microsoft login failed");
          }
        }
      });
    } catch (err) {
      console.error("Microsoft login error:", err);
      setError("Failed to login with Microsoft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FcGoogle className="w-5 h-5" />
        <span className="font-medium text-gray-700">Continue with Google</span>
      </button>

      <button
        onClick={handleMicrosoftLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaMicrosoft className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-gray-700">
          Continue with Microsoft
        </span>
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">
            Or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}
