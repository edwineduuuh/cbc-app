"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, FileText, PlusCircle } from "lucide-react";

export default function AdminNavigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Upload Exams", href: "/admin/bulk-upload", icon: Upload },
    { name: "Create Exam", href: "/admin/exams/create", icon: FileText },
    { name: "Add Question", href: "/admin/questions/create", icon: PlusCircle },
  ];

  return (
    <nav className="bg-white border-b-2 border-emerald-100 shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
