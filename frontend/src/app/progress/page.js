"use client";

import { useAuth } from "@/contexts/AuthContext";
import GuestProgress from "@/components/GuestProgress";
import FullProgress from "@/components/FullProgress";

export default function ProgressPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Guest → show guest progress
  if (!user) {
    return <GuestProgress />;
  }

  // Authenticated → show full progress
  return <FullProgress />;
}
