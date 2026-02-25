"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FileQuestion,
  ClipboardList,
  Upload,
  BarChart3,
  Users,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin", "superadmin", "school_admin", "teacher"],
  },
  {
    name: "Questions",
    href: "/admin/questions",
    icon: FileQuestion,
    roles: ["admin", "superadmin", "school_admin", "teacher"],
  },
  {
    name: "Quizzes",
    href: "/admin/quizzes",
    icon: ClipboardList,
    roles: ["admin", "superadmin", "school_admin", "teacher"],
  },
  {
    name: "Bulk Upload",
    href: "/admin/bulk-upload",
    icon: Upload,
    roles: ["admin", "superadmin", "school_admin", "teacher"],
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    roles: ["admin", "superadmin", "school_admin"],
  },
  {
    name: "Classrooms",
    href: "/teacher/classrooms",
    icon: Users,
    roles: ["teacher", "school_admin"],
  },
  {
    name: "Quiz Library",
    href: "/admin/quiz-library",
    icon: BookOpen,
    roles: ["admin", "superadmin", "school_admin", "teacher"],
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["admin", "superadmin", "school_admin"],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  const NavLink = ({ item, mobile = false }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={() => mobile && setMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive
            ? "bg-emerald-100 text-emerald-700 font-semibold"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center border border-gray-200"
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 w-72 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">CBC Kenya</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user.username?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink key={item.href} item={item} mobile={true} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block w-72 flex-shrink-0" />
    </>
  );
}
