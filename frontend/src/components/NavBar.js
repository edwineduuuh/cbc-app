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
  Video,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMore, setShowMore] = useState(false);        // mobile sheet
  const [showDeskMore, setShowDeskMore] = useState(false); // desktop dropdown

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isStudent = !isTeacher;

  // `primary` items are always visible (inline on desktop, tabs on mobile).
  // The rest live under "More". Live Lessons is a highlighted CTA, handled
  // separately so it stands out as a money-maker rather than a plain link.
  const navLinks = isTeacher
    ? [
        { href: "/teacher", label: "My Classes", icon: Home, primary: true },
        { href: "/teacher?tab=lessons", label: "Lesson Plans", icon: BookOpen, primary: true },
        { href: "/teacher?tab=analytics", label: "Analytics", icon: BarChart3, primary: true },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
        { href: "/explore", label: "Browse", icon: BookOpen, primary: true },
        { href: "/progress", label: "Progress", icon: BarChart3, primary: true },
        { href: "/life-skills", label: "Life Skills", icon: Heart, primary: true },
        { href: "/tutor", label: "Tutor", icon: GraduationCap },
        { href: "/flashcards", label: "Flash Cards", icon: Layers },
      ];

  const liveLink = { href: "/live", label: "Live Lessons", icon: Video };

  const primaryLinks = navLinks.filter((l) => l.primary);
  const moreLinks = navLinks.filter((l) => !l.primary);
  const showMoreTab = moreLinks.length > 0 || isStudent || !user?.has_subscription;

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
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <Link
            href={isTeacher ? "/teacher" : "/dashboard"}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="font-bold text-white text-xl px-3 py-2 rounded-xl bg-slate-800">
              StadiSpace
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {primaryLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
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

            {/* More dropdown */}
            {moreLinks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDeskMore((v) => !v)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    moreActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  More
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showDeskMore ? "rotate-180" : ""}`}
                  />
                </button>
                {showDeskMore && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDeskMore(false)} />
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      {moreLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                          <Link key={link.href} href={link.href} onClick={() => setShowDeskMore(false)}>
                            <div
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                                isActive ? "text-teal-700 bg-teal-50" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Icon className="w-4 h-4 text-gray-400" />
                              {link.label}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Live Lessons - highlighted money-maker */}
            {isStudent && (
              <Link href="/live">
                <button
                  className={`flex items-center gap-2 px-3 py-2 ml-1 rounded-lg text-sm font-bold whitespace-nowrap text-white transition-all shadow-sm hover:shadow-md ${
                    pathname === "/live" ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Live Lessons
                </button>
              </Link>
            )}

            {/* Upgrade */}
            {!user.has_subscription && (
              <Link href="/subscribe">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm hover:shadow-md">
                  <Sparkles className="w-4 h-4" />
                  Upgrade
                </button>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
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
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  {user.has_subscription && (
                    <div className="px-4 py-2 mb-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-400 text-white">
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

      {/* ── "More" sheet (mobile) ── */}
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
                  <Link key={link.href} href={link.href} onClick={() => setShowMore(false)}>
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
              {isStudent && (
                <Link href={liveLink.href} onClick={() => setShowMore(false)}>
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-blue-600 py-4 text-xs font-bold text-white">
                    <Video className="w-6 h-6" />
                    Live Lessons
                  </div>
                </Link>
              )}
              {!user.has_subscription && (
                <Link href="/subscribe" onClick={() => setShowMore(false)}>
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-amber-500 py-4 text-xs font-bold text-white">
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
