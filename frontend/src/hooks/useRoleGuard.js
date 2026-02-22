"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard hook - redirects users who shouldn't be on this page
 *
 * Usage:
 * useRoleGuard(['admin', 'superadmin']); // Only admins allowed
 * useRoleGuard(['student']); // Only students allowed
 * useRoleGuard(['teacher', 'school_admin']); // Only teachers allowed
 */
export function useRoleGuard(allowedRoles) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // Not logged in - redirect to login
      router.push("/login");
      return;
    }

    // Check if user's role is allowed
    const isAllowed =
      allowedRoles.includes(user.role) ||
      (allowedRoles.includes("admin") && (user.is_staff || user.is_superuser));

    if (!isAllowed) {
      // Wrong role - redirect to their correct dashboard
      if (
        user.is_superuser ||
        user.is_staff ||
        ["admin", "superadmin", "school_admin"].includes(user.role)
      ) {
        router.push("/admin");
      } else if (user.role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading };
}
