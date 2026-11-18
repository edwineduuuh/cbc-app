"use client";

/**
 * App shell navigation - one component, three portals (agreed Nov 2026):
 *
 *   Student      left sidebar on desktop, bottom bar (max 5) on phones
 *   Facilitator  left sidebar on desktop, drawer on phones
 *   Admin        left sidebar on desktop, drawer on phones
 *
 * Each role sees only its own destinations, and only pages that exist:
 * Library and Play join the student menu when they ship.
 *
 * The sidebar is fixed; page content is pushed right by body classes
 * (has-sidebar / sidebar-collapsed / has-bottom-nav, see globals.css) so
 * existing pages need no wrapper. Collapsed state is remembered per device.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Logo, { BrandSymbol } from "@/components/brand/Logo";
import {
  Home, BookOpen, BarChart3, Settings, LogOut, Sparkles, Heart,
  GraduationCap, Layers, Video, Menu, X, ClipboardCheck, Library,
  CalendarDays, FileText, NotebookPen, Users, LayoutDashboard,
  FileQuestion, ListChecks, ScrollText, BookText, Network, Upload,
  Quote, PanelLeftClose, PanelLeftOpen, UserCircle,
} from "lucide-react";

const ADMIN_ROLES = ["admin", "superadmin"];

function portalFor(user) {
  if (!user) return null;
  if (user.is_staff || user.is_superuser || ADMIN_ROLES.includes(user.role)) return "admin";
  if (user.role === "teacher") return "facilitator";
  return "student";
}

const NAV = {
  student: {
    home: "/dashboard",
    groups: [
      { items: [
        { href: "/dashboard", label: "Home", icon: Home, mobile: true },
        { href: "/explore", label: "Learn", icon: BookOpen, mobile: true, match: ["/explore", "/student/quizzes", "/attempts"] },
        { href: "/tutor", label: "Tutor", icon: GraduationCap, mobile: true },
        { href: "/flashcards", label: "Flash cards", icon: Layers },
        { href: "/progress", label: "My progress", icon: BarChart3, mobile: true },
      ]},
      { title: "More", items: [
        { href: "/live", label: "Live lessons", icon: Video },
        { href: "/life-skills", label: "Life skills", icon: Heart },
      ]},
    ],
  },
  facilitator: {
    home: "/facilitator",
    groups: [
      { title: "Studio", items: [
        { href: "/facilitator", label: "Studio home", icon: LayoutDashboard, exact: true },
        { href: "/facilitator/assessments", label: "Assessments", icon: ClipboardCheck },
        { href: "/facilitator/library", label: "My library", icon: Library },
        { label: "Schemes of work", icon: CalendarDays, soon: true },
        { label: "Lesson plans", icon: FileText, soon: true },
        { label: "Records of work", icon: NotebookPen, soon: true },
      ]},
      { title: "Classes", items: [
        { href: "/teacher", label: "My classes", icon: Users, exact: true },
      ]},
    ],
  },
  admin: {
    home: "/admin",
    groups: [
      { items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      ]},
      { title: "Question bank", items: [
        { href: "/admin/questions", label: "Questions", icon: FileQuestion },
        { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
        { href: "/admin/exams", label: "Exams", icon: ScrollText },
        { href: "/admin/passages", label: "Passages", icon: BookText },
        { href: "/admin/bulk-upload", label: "Bulk upload", icon: Upload },
      ]},
      { title: "Platform", items: [
        { href: "/admin/topics", label: "Curriculum", icon: Network },
        { href: "/admin/motivational", label: "Motivational", icon: Quote },
      ]},
    ],
  },
};

// Pages with their own full-screen chrome: public pages, auth, onboarding
// and the quiz player (a focused, distraction-free screen).
function isChromeless(pathname) {
  return (
    pathname === "/" ||
    ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/welcome", "/join"]
      .some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/quizzes/") ||
    pathname.startsWith("/student/quiz/")
  );
}

function isActive(item, pathname) {
  if (!item.href) return false;
  const base = item.href.split("?")[0];
  if (item.exact) return pathname === base;
  const roots = [base, ...(item.match || [])];
  return roots.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";
  // Safe to read on first render: the shell renders nothing until the
  // signed-in user has loaded on the client, so there is no server markup
  // for this to disagree with.
  const [collapsed, setCollapsed] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("sidebarCollapsed") === "1"; }
    catch { return false; }
  });
  const [drawer, setDrawer] = useState(false);

  const portal = portalFor(user);
  const hide = !portal || isChromeless(pathname);
  const nav = portal ? NAV[portal] : null;

  // Push page content clear of the fixed chrome.
  useEffect(() => {
    const b = document.body.classList;
    if (hide) return;
    b.add("has-sidebar");
    if (portal === "student") b.add("has-bottom-nav");
    else b.add("has-top-bar");
    return () => b.remove("has-sidebar", "has-bottom-nav", "has-top-bar", "sidebar-collapsed");
  }, [hide, portal]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed && !hide);
  }, [collapsed, hide]);

  if (hide) return null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebarCollapsed", next ? "1" : "0"); } catch {}
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const roleLabel =
    portal === "admin" ? "Administrator"
    : portal === "facilitator" ? "Facilitator"
    : user.grade ? `Grade ${user.grade}` : "Student";
  const initial = (user.first_name || user.username || "?").charAt(0).toUpperCase();
  const showUpgrade = portal !== "admin" && !user.has_subscription;

  const allItems = nav.groups.flatMap((g) => g.items);
  const footerProps = { pathname, showUpgrade, onLogout: handleLogout, user, initial, roleLabel };
  const mobileItems = allItems.filter((i) => i.mobile).slice(0, 4);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="ss-sidebar hidden lg:flex" data-collapsed={collapsed || undefined}>
        <div className={`flex items-center h-16 px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link href={nav.home} aria-label="StadiSpace home">
            {collapsed ? <BrandSymbol size={30} /> : <Logo size={21} />}
          </Link>
          {!collapsed && (
            <button type="button" onClick={toggleCollapsed} className="ss-icon-btn" aria-label="Collapse sidebar">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={toggleCollapsed} className="ss-icon-btn mx-auto mb-2" aria-label="Expand sidebar">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        <NavGroups nav={nav} pathname={pathname} compact={collapsed} />
        <ShellFooter {...footerProps} compact={collapsed} />
      </aside>

      {/* ── Phone/tablet top bar ── */}
      <header className="ss-topbar lg:hidden">
        {portal !== "student" && (
          <button type="button" onClick={() => setDrawer(true)} className="ss-icon-btn" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link href={nav.home} aria-label="StadiSpace home">
          <Logo size={20} />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {showUpgrade && (
            <Link href="/subscribe" className="ss-upgrade-chip">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Upgrade
            </Link>
          )}
          {portal === "student" && (
            <button type="button" onClick={() => setDrawer(true)} className="ss-avatar" aria-label="Account and more">
              {initial}
            </button>
          )}
        </div>
      </header>

      {/* ── Student bottom bar (phones/tablets) ── */}
      {portal === "student" && (
        <nav aria-label="Main" className="ss-bottombar lg:hidden">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname);
            return (
              <Link key={item.href} href={item.href} className="ss-tab" data-active={active || undefined}
                aria-current={active ? "page" : undefined}>
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label === "My progress" ? "Progress" : item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setDrawer(true)} className="ss-tab" data-active={drawer || undefined}>
            <UserCircle className="w-5 h-5" aria-hidden="true" />
            <span>Me</span>
          </button>
        </nav>
      )}

      {/* ── Drawer: full menu for facilitator/admin, "Me" sheet for students ── */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 w-full h-full ss-scrim" aria-label="Close menu"
            onClick={() => setDrawer(false)} />
          <div className={portal === "student" ? "ss-sheet" : "ss-drawer"}>
            <div className="flex items-center justify-between h-14 px-4">
              <Logo size={19} />
              <button type="button" onClick={() => setDrawer(false)} className="ss-icon-btn" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            {portal === "student" ? (
              <nav aria-label="More" className="px-3 pb-2 flex flex-col gap-0.5">
                {allItems.filter((i) => !i.mobile).map((item) => (
                  <NavRow key={item.label} item={item} pathname={pathname} onNavigate={() => setDrawer(false)} />
                ))}
              </nav>
            ) : (
              <NavGroups nav={nav} pathname={pathname} onNavigate={() => setDrawer(false)} />
            )}
            <ShellFooter {...footerProps} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── one nav row, shared by sidebar and drawer ── */
function NavRow({ item, pathname, compact, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(item, pathname);
  const body = (
    <span
      className="ss-nav-row"
      data-active={active || undefined}
      data-soon={item.soon || undefined}
      title={compact ? item.label : undefined}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
      {!compact && <span className="truncate">{item.label}</span>}
      {!compact && item.soon && <span className="ss-soon">Soon</span>}
    </span>
  );
  if (item.soon) return <div aria-disabled="true">{body}</div>;
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}>
      {body}
    </Link>
  );
}

function NavGroups({ nav, pathname, compact, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
      {nav.groups.map((g, gi) => (
        <div key={gi} className={gi ? "mt-5" : ""}>
          {g.title && !compact && <p className="ss-nav-title">{g.title}</p>}
          {g.title && compact && gi > 0 && <div className="ss-divider mx-2 mb-3" />}
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => (
              <NavRow key={item.label} item={item} pathname={pathname} compact={compact} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ShellFooter({ pathname, showUpgrade, onLogout, user, initial, roleLabel, compact, onNavigate }) {
  return (
    <div className="px-3 pb-4 pt-3 ss-footer">
      {showUpgrade && !compact && (
        <Link href="/subscribe" onClick={onNavigate} className="ss-upgrade">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>Upgrade to Premium</span>
        </Link>
      )}
      <NavRow item={{ href: "/settings", label: "Settings", icon: Settings }} pathname={pathname}
        compact={compact} onNavigate={onNavigate} />
      <button type="button" onClick={onLogout} className="w-full text-left">
        <span className="ss-nav-row" title={compact ? "Log out" : undefined}>
          <LogOut className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
          {!compact && <span>Log out</span>}
        </span>
      </button>
      <div className={`ss-user mt-3 ${compact ? "justify-center" : ""}`}>
        <span className="ss-avatar" aria-hidden="true">{initial}</span>
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
              {user.first_name || user.username}
            </span>
            <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
              {roleLabel}{user.has_subscription ? " · Premium" : ""}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
