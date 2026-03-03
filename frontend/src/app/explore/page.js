"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import PremiumExplore from "@/components/PremiumExplore";
import FreeExplore from "@/components/FreeExplore"; // Your current explore component
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";


export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

const router = useRouter();
  useEffect(() => {
    checkPremiumStatus();
  }, [user]);

  const checkPremiumStatus = async () => {
  if (!user) {
    setIsPremium(false);
    setLoading(false);
    return;
  }

  // Redirect admins to admin panel - they don't use student pages
  if (user.role === "super_admin" || user.role === "admin" || user.role === "teacher") {
    router.push("/admin");
    return;
  }

  // For students only
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API}/credits/status/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      setIsPremium(
        data.has_subscription === true || data.quiz_credits === "unlimited"
      );
    } else {
      setIsPremium(false);
    }
  } catch (error) {
    console.error("Failed to check premium status:", error);
    setIsPremium(false);
  } finally {
    setLoading(false);
  }
};

  // Route to appropriate UI
  return isPremium ? <PremiumExplore /> : <FreeExplore />;
}
