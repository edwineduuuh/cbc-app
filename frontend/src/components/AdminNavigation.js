"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Upload,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Users,
} from "lucide-react";

export default function AdminNavigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Questions", href: "/admin/questions", icon: FileQuestion },
    { name: "Quizzes", href: "/admin/quizzes", icon: ClipboardList },
    { name: "Bulk Upload", href: "/admin/bulk-upload", icon: Upload },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Classrooms", href: "/teacher/classrooms", icon: Users },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-[9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2 -mb-px scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
