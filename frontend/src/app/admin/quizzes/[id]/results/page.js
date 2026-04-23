"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ImprovedFeedbackDisplay from "@/components/ImprovedFeedbackDisplay";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";

const ALLOWED_ROLES = ["teacher", "admin", "superadmin", "school_admin"];

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (
      !authLoading &&
      user &&
      !ALLOWED_ROLES.includes(user.role) &&
      !user.is_staff &&
      !user.is_superuser
    ) {
      router.replace("/dashboard");
      return;
    }
    if (!authLoading && user) loadResults();
  }, [user, authLoading]);

  const loadResults = async () => {
    try {
      // Get the latest attempt for this quiz
      const res = await fetch(`${API}/attempts/?quiz=${params.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await res.json();
      const attempts = Array.isArray(data) ? data : data.results || [];

      if (attempts.length === 0) {
        alert("No attempt found");
        router.push("/dashboard");
        return;
      }

      // Get latest attempt
      const latestAttempt = attempts[0];
      setAttempt(latestAttempt);

      // Load quiz details
      const quizRes = await fetch(`${API}/quizzes/${params.id}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const quizData = await quizRes.json();
      setQuiz(quizData);
    } catch (error) {
      console.error("Failed to load results:", error);
      alert("Failed to load results");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-emerald-900 font-semibold">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p>No results found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <ImprovedFeedbackDisplay attempt={attempt} quiz={quiz} />
    </div>
  );
}
