"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LifeSkills from "@/components/LifeSkills";

export default function LifeSkillsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === "teacher") {
      router.replace("/teacher");
    }
  }, [user, loading, router]);

  return <LifeSkills />;
}
