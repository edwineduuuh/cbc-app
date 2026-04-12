"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  BarChart3,
  Home,
  Settings,
  LogOut,
  ChevronDown,
  Crown,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/explore", label: "Browse", icon: BookOpen },
    { href: "/progress", label: "Progress", icon: BarChart3 },
  ];

  if (
    !user ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/quizzes/") ||
    pathname.startsWith("/student/quiz/")
  ) {
    return null;
  }

  //

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="font-bold text-white text-xl px-3 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-teal-700">
              StadiSpace
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </button>
                </Link>
              );
            })}
            {!user.has_subscription && (
              <Link href="/subscribe">
                <button className="flex items-center gap-2 px-4 py-2 ml-1 rounded-lg text-sm font-bold bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md">
                  <Sparkles className="w-4 h-4" />
                  Upgrade
                </button>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-gray-900">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500">
                  Grade {user.grade || 9}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  {/* Premium Badge (if subscribed) */}
                  {user.has_subscription && (
                    <div className="px-4 py-2 mb-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                        <Crown className="w-4 h-4" />
                        <span className="text-xs font-bold">
                          Premium Member
                        </span>
                      </div>
                    </div>
                  )}

                  <Link href="/settings">
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Settings
                    </button>
                  </Link>

                  <div className="border-t border-gray-100 my-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-gray-100">
        <div className="flex items-center justify-around py-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="flex-1">
                <button
                  className={`w-full flex flex-col items-center gap-1 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "text-teal-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </button>
              </Link>
            );
          })}
          {!user.has_subscription && (
            <Link href="/subscribe" className="flex-1">
              <button className="w-full flex flex-col items-center gap-1 py-2 text-xs font-bold text-amber-600">
                <Sparkles className="w-5 h-5" />
                Upgrade
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
