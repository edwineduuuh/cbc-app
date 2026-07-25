"use client";

import { useState, useEffect } from "react";
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
  Heart,
  GraduationCap,
  Layers,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  // `primary` items sit directly in the mobile bottom tab bar; the rest go
  // behind the "More" tab so the bar never overflows on small screens.
  const navLinks = isTeacher
    ? [
        { href: "/teacher", label: "My Classes", icon: Home, primary: true },
        { href: "/teacher?tab=lessons", label: "Lesson Plans", icon: BookOpen, primary: true },
        { href: "/teacher?tab=analytics", label: "Analytics", icon: BarChart3, primary: true },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
        { href: "/explore", label: "Browse", icon: BookOpen, primary: true },
        { href: "/tutor", label: "Tutor", icon: GraduationCap, primary: true },
        { href: "/progress", label: "Progress", icon: BarChart3, primary: true },
        { href: "/flashcards", label: "Flash Cards", icon: Layers },
        { href: "/life-skills", label: "Life Skills", icon: Heart },
      ];

  const primaryLinks = navLinks.filter((l) => l.primary);
  const moreLinks = navLinks.filter((l) => !l.primary);
  const showMoreTab = moreLinks.length > 0 || !user?.has_subscription;

  const hide =
    !user ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/quizzes/") ||
    pathname.startsWith("/student/quiz/");

  // Reserve space for the fixed mobile bottom bar only while it is shown.
  useEffect(() => {
    if (hide) return;
    document.body.classList.add("has-bottom-nav");
    return () => document.body.classList.remove("has-bottom-nav");
  }, [hide]);

  if (hide) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const moreActive = moreLinks.some((l) => l.href === pathname);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={isTeacher ? "/teacher" : "/dashboard"}
            className="flex items-center gap-2"
          >
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
                  {isTeacher ? "Teacher" : `Grade ${user.grade || 9}`}
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

      {/* ── Mobile bottom tab bar (app-style) ── */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {primaryLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="flex-1">
                <span
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold leading-tight transition-colors ${
                    isActive ? "text-teal-600" : "text-gray-500"
                  }`}
                >
                  <Icon className="w-5.5 h-5.5" />
                  <span className="text-center">{link.label}</span>
                </span>
              </Link>
            );
          })}
          {showMoreTab && (
            <button
              onClick={() => setShowMore(true)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold leading-tight transition-colors ${
                moreActive || showMore ? "text-teal-600" : "text-gray-500"
              }`}
            >
              <Menu className="w-5.5 h-5.5" />
              <span>More</span>
            </button>
          )}
        </div>
      </div>

      {/* ── "More" sheet ── */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-60">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMore(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 shadow-2xl"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
              <button
                onClick={() => setShowMore(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {moreLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMore(false)}
                  >
                    <div
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border py-4 text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-teal-200 bg-teal-50 text-teal-700"
                          : "border-gray-100 bg-gray-50 text-gray-600"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      {link.label}
                    </div>
                  </Link>
                );
              })}
              {!user.has_subscription && (
                <Link href="/subscribe" onClick={() => setShowMore(false)}>
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 py-4 text-xs font-bold text-white">
                    <Sparkles className="w-6 h-6" />
                    Upgrade
                  </div>
                </Link>
              )}
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
              <Link href="/settings" onClick={() => setShowMore(false)}>
                <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Settings className="w-5 h-5 text-gray-400" />
                  Settings
                </div>
              </Link>
              <button
                onClick={() => {
                  setShowMore(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
