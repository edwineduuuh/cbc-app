"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, ClipboardCheck, CalendarDays, FileText, NotebookPen, Library, Loader2 } from "lucide-react";

/**
 * Facilitators Portal shell.
 *
 * "Facilitator" is the CBC term for the teacher, so the portal uses it
 * throughout rather than "teacher".
 *
 * Tools marked `soon` are listed deliberately: a facilitator deciding whether
 * to keep using this needs to see where it is going, and a hidden roadmap
 * reads as a thinner product than it is.
 */
export const NAV = [
  { href: "/facilitator", label: "Tools", icon: BookOpen, exact: true },
  { href: "/facilitator/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/facilitator/schemes", label: "Schemes of Work", icon: CalendarDays, soon: true },
  { href: "/facilitator/plans", label: "Lesson Plans", icon: FileText, soon: true },
  { href: "/facilitator/records", label: "Records of Work", icon: NotebookPen, soon: true },
  { href: "/facilitator/library", label: "My Library", icon: Library },
];

export default function FacilitatorLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed =
    user &&
    (["teacher", "admin", "superadmin", "school_admin"].includes(user.role) ||
      user.is_staff);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/facilitator");
    else if (!allowed) router.replace("/dashboard");
  }, [loading, user, allowed, router]);

  if (loading || !user || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
