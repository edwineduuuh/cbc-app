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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-6">
        {/* Nav: a sidebar on desktop, a scrolling strip on a phone. Most
            Kenyan teachers will open this on a phone. */}
        <nav className="lg:w-56 lg:shrink-0 mb-5 lg:mb-0">
          <p className="hidden lg:block px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Facilitator
          </p>
          <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 -mx-1 px-1">
            {NAV.map(({ href, label, icon: Icon, exact, soon }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const cls = active
                ? "bg-emerald-600 text-white"
                : soon
                ? "text-gray-400"
                : "text-gray-700 hover:bg-gray-100";
              const content = (
                <span className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${cls}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {soon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Soon
                    </span>
                  )}
                </span>
              );
              return (
                <li key={href}>
                  {soon ? (
                    <span className="block cursor-default" aria-disabled="true">{content}</span>
                  ) : (
                    <Link href={href} className="block">{content}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
