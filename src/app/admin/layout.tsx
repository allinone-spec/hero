"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarFallback from "@/components/ui/AvatarFallback";
import ContactModal from "@/components/ui/ContactModal";
import { PrivilegeContext, type MenuPrivilege } from "@/contexts/PrivilegeContext";
import { clearAdminHint } from "@/lib/client-session-hint";

/* ── 3-D ring loader ────────────────────────────────────── */
function Loader3D() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: "var(--color-bg)" }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "var(--color-gold)",
          borderRightColor: "var(--color-gold)",
          animation: "ring3d 1.3s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 14, borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "var(--color-gold-light)",
          borderLeftColor: "var(--color-gold-light)",
          animation: "spin 0.9s linear infinite reverse",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--color-gold)", fontSize: 18, fontWeight: 700,
          animation: "pulse 1.6s ease-in-out infinite",
        }}>★</div>
      </div>
      <p style={{
        color: "var(--color-text-muted)", fontSize: "0.75rem",
        letterSpacing: "0.15em", textTransform: "uppercase",
      }}>Loading Admin…</p>
    </div>
  );
}

/* ── Help Guide Panel ──────────────────────────────────── */
const GUIDE_SECTIONS = [
  {
    page: "Dashboard",
    icon: "📊",
    items: [
      { button: "+ Add Hero", desc: "Create a new hero profile from scratch" },
      { button: "Quick Action Cards", desc: "Shortcuts to Heroes, Medals, Scoring, Users, and the public site" },
      { button: "Recent Heroes", desc: "Click any hero card to jump to their edit form" },
    ],
  },
  {
    page: "Heroes",
    icon: "🎖️",
    items: [
      { button: "+ Add Hero", desc: "Opens the hero creation form with Wikipedia import support" },
      { button: "View", desc: "Read-only profile showing medals, biography, and service record" },
      { button: "Edit", desc: "Open the full edit form to update medals, bio, and scoring fields" },
      { button: "Status Badge", desc: "Click Published/Draft badge to toggle visibility on public site" },
      { button: "Delete", desc: "Permanently remove a hero (requires confirmation)" },
      { button: "Filters", desc: "Search by name, filter by branch/status, sort by score or name" },
    ],
  },
  {
    page: "Medals",
    icon: "🏅",
    items: [
      { button: "+ Add Medal Type", desc: "Create a new medal with ribbon colors, valor points, and tier" },
      { button: "Edit", desc: "Modify medal name, points, ribbon colors, V-device settings" },
      { button: "Design", desc: "Opens the Medal Avatar Designer to create custom medal images" },
      { button: "Valor Points", desc: "Heroism Leaderboard points (0 if 'V' device is required but absent)" },
      { button: "V / VALOR badges", desc: "'V' = requires valor device for points. 'VALOR' = inherently a valor award" },
    ],
  },
  {
    page: "Scoring",
    icon: "⚙️",
    items: [
      { button: "Save Rules", desc: "Save scoring config changes (valor devices, theater bonus, etc.)" },
      { button: "Reset to Defaults", desc: "Revert all scoring rules to USM-25 factory defaults" },
      { button: "Recalculate All", desc: "Re-compute every hero's score using current rules and medals" },
    ],
  },
  {
    page: "Users",
    icon: "👥",
    items: [
      { button: "+ Add User", desc: "Create a new admin account with a role (superadmin/admin/editor)" },
      { button: "Approve / Reject", desc: "Handle pending registration requests from the signup page" },
      { button: "Active Toggle", desc: "Enable or disable a user account without deleting it" },
      { button: "Edit", desc: "Change user name, role, or password" },
    ],
  },
  {
    page: "Wars",
    icon: "🏴",
    items: [
      { button: "+ Add War", desc: "Manually add a war/conflict with year range and theater" },
      { button: "AI Import", desc: "Use Gemini to auto-generate a comprehensive US war list" },
      { button: "Edit", desc: "Update war name, years, theater, or description" },
      { button: "Active Toggle", desc: "Inactive wars won't appear in hero form dropdowns" },
    ],
  },
  {
    page: "Logs",
    icon: "📋",
    items: [
      { button: "Category Pills", desc: "Filter logs by type: Hero, Medal, User, Auth, Scoring, System" },
      { button: "Search", desc: "Search log descriptions to find specific actions" },
    ],
  },
  {
    page: "AI Usage",
    icon: "🤖",
    items: [
      { button: "Budget Bar", desc: "Track spending against $100 budget with color-coded progress" },
      { button: "Cost per User", desc: "See which admin users are consuming the most API credits" },
      { button: "Cost per Action", desc: "Breakdown by action type: descriptions, medals, wars" },
      { button: "Recent Calls", desc: "Detailed log of every AI API request with tokens and cost" },
    ],
  },
];

function HelpGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/40" onClick={onClose} />
      <div
        className="fixed right-4 top-16 z-70 w-85 sm:w-100 max-h-[80vh] overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) shadow-2xl animate-fade-in"
      >
        <div className="sticky top-0 bg-(--color-surface) border-b border-(--color-border) px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-(--color-gold)">Admin Guide</h3>
          <button onClick={onClose} className="text-(--color-text-muted) hover:text-(--color-text) text-lg leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.page}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) mb-2">
                {section.icon} {section.page}
              </h4>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.button} className="flex gap-2 text-xs">
                    <span className="shrink-0 font-semibold text-(--color-gold) min-w-27.5">{item.button}</span>
                    <span className="text-(--color-text-muted)">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-(--color-border) pt-3 mt-3">
            <p className="text-[10px] text-(--color-text-muted) leading-relaxed">
              Scoring uses the Heroism Matrix v2.0. Medals with a &quot;V&quot; requirement score <strong>zero</strong> on
              the leaderboard unless the valor device is present. Inherently-valor medals (MOH, Crosses,
              Silver Star, Purple Heart) always score their full points.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function formatAdminRoleLabel(groupSlug: string): string {
  if (!groupSlug) return "Staff";
  if (groupSlug === "super-admin") return "Super admin";
  return groupSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function AdminAccountChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      style={{ color: "var(--color-text-muted)" }}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Max admin nav items shown as tabs; rest go in "More" (avoids horizontal scroll for super admins). */
const ADMIN_NAV_INLINE_COUNT = 5;

type NavLinkItem = { href: string; label: string };

function navLinkActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

function AdminNavMoreMenu({
  links,
  pathname,
  suggestionCount,
}: {
  links: NavLinkItem[];
  pathname: string;
  suggestionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeInMenu = links.some((l) => navLinkActive(pathname, l.href));
  const suggestionsInMenu = links.some((l) => l.href === "/admin/suggestions");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          activeInMenu
            ? "bg-(--color-gold)/10 text-(--color-gold)"
            : "text-(--color-text-muted) hover:text-(--color-text)"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        More
        <AdminAccountChevron open={open} />
        {suggestionsInMenu && suggestionCount > 0 && (
          <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {suggestionCount > 99 ? "99+" : suggestionCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[12rem] max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl z-[60] py-1 animate-fade-in"
          role="menu"
        >
          {links.map((link) => {
            const active = navLinkActive(pathname, link.href);
            const isSuggestions = link.href === "/admin/suggestions";
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`relative flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-(--color-gold)/10 text-(--color-gold)"
                    : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-hover)"
                }`}
              >
                <span>{link.label}</span>
                {isSuggestions && suggestionCount > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shrink-0">
                    {suggestionCount > 99 ? "99+" : suggestionCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminAccountDropdown({
  userName,
  userEmail,
  groupSlug,
  isSuperAdmin,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  groupSlug: string;
  isSuperAdmin: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-(--color-border) bg-(--color-bg) hover:border-(--color-gold)/50 transition-colors max-w-[220px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <AvatarFallback name={userName} size={28} shape="rounded" />
        <span className="truncate text-xs font-medium max-w-[5.5rem] sm:max-w-[7rem]" style={{ color: "var(--color-text)" }}>
          {userName}
        </span>
        {isSuperAdmin && (
          <span className="hidden sm:inline text-[9px] font-bold px-1 py-0.5 rounded shrink-0 bg-(--color-gold)/15 text-(--color-gold)">
            SA
          </span>
        )}
        <AdminAccountChevron open={open} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl z-[60] py-1 animate-fade-in"
          role="menu"
        >
          <div className="px-3 py-2 space-y-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted)">Staff account</p>
            <p className="text-sm font-medium text-(--color-text) truncate" title={userName}>
              {userName}
            </p>
            <p className="text-xs text-(--color-text-muted) truncate" title={userEmail}>
              {userEmail}
            </p>
            <p className="text-xs text-(--color-text-muted)">
              Role: <span className="font-semibold text-(--color-gold)">{formatAdminRoleLabel(groupSlug)}</span>
            </p>
          </div>
          <div className="border-t border-(--color-border) p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="btn-secondary text-sm w-full py-2"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AccessibleMenu {
  path: string;
  label: string;
  section: string;
  sortOrder: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** Routes that render without an admin session (login / register). */
const PUBLIC_ADMIN_PATHS = ["/admin", "/admin/register"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed]             = useState<boolean | null>(null);
  /** After admin auth succeeds: false = no site-member cookie; true = both sessions (hide "As Site Member"). null = not loaded yet. */
  const [siteMemberLoggedIn, setSiteMemberLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName]         = useState("Admin");
  const [userEmail, setUserEmail]       = useState("");
  const [groupSlug, setGroupSlug]       = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessibleMenus, setAccessibleMenus] = useState<AccessibleMenu[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactCount, setContactCount] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const pathname = usePathname();
  const router   = useRouter();
  const reloadGenRef = useRef(0);

  /** Full staff session sync (mount, tab focus, or after another tab signs in / switches account). */
  const reloadAdminAuth = useCallback(() => {
    const myId = ++reloadGenRef.current;
    const opts: RequestInit = { cache: "no-store", credentials: "include" };

    void fetch("/api/site/me", opts).then(async (r) => {
      if (myId !== reloadGenRef.current) return;
      let member = false;
      if (r.ok) {
        try {
          const j = await r.json();
          member = Boolean(j?.email);
        } catch {
          member = false;
        }
      }
      setSiteMemberLoggedIn(member);
    });

    void fetch("/api/auth/me", opts)
      .then(async (r) => {
        if (myId !== reloadGenRef.current) return;
        if (!r.ok) {
          reloadGenRef.current += 1;
          setAuthed(false);
          setSiteMemberLoggedIn(null);
          return;
        }
        try {
          const data = await r.json();
          setAuthed(true);
          setUserName(data.name || "Admin");
          setUserEmail(String(data.email || ""));
          setGroupSlug(String(data.groupSlug || ""));
          setIsSuperAdmin(data.isSuperAdmin || false);
          setAccessibleMenus(data.accessibleMenus || []);
        } catch {
          reloadGenRef.current += 1;
          setAuthed(false);
          setSiteMemberLoggedIn(null);
        }
      })
      .catch(() => {
        if (myId !== reloadGenRef.current) return;
        reloadGenRef.current += 1;
        setAuthed(false);
        setSiteMemberLoggedIn(null);
      });
  }, []);

  useEffect(() => {
    reloadAdminAuth();
  }, [reloadAdminAuth]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") reloadAdminAuth();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadAdminAuth]);

  // Poll unread suggestion count every 30s
  useEffect(() => {
    if (!authed) return;
    const poll = () => {
      fetch("/api/hero-suggestions/count")
        .then((r) => r.ok ? r.json() : { count: 0 })
        .then((d) => setSuggestionCount(d.count || 0))
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [authed]);

  // Poll unread contact count every 30s (super admins only)
  useEffect(() => {
    if (!authed || !isSuperAdmin) return;
    const poll = () => {
      fetch("/api/contact/count")
        .then((r) => r.ok ? r.json() : { count: 0 })
        .then((d) => setContactCount(d.count || 0))
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [authed, isSuperAdmin]);

  // Reset contact badge when navigating to inbox page
  useEffect(() => {
    if (pathname === "/admin/inbox") {
      setContactCount(0);
    }
  }, [pathname]);

  // Reset badge when navigating to suggestions page
  useEffect(() => {
    if (pathname === "/admin/suggestions") {
      setSuggestionCount(0);
    }
  }, [pathname]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  // Never call router.* during render — redirects unauthenticated users off protected admin routes
  useEffect(() => {
    if (authed !== false) return;
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return;
    router.replace("/admin");
  }, [authed, pathname, router]);

  const refreshSession = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUserName(data.name || "Admin");
        setUserEmail(String(data.email || ""));
        setGroupSlug(String(data.groupSlug || ""));
        setIsSuperAdmin(data.isSuperAdmin || false);
        setAccessibleMenus(data.accessibleMenus || []);
      })
      .catch(() => {});
  }, []);

  const privilegeCtx = useMemo(() => {
    const privileges: MenuPrivilege[] = accessibleMenus.map((m) => ({
      path: m.path,
      canView: m.canView,
      canCreate: m.canCreate,
      canEdit: m.canEdit,
      canDelete: m.canDelete,
    }));
    return {
      isSuperAdmin,
      privileges,
      can: (path: string, action: "canView" | "canCreate" | "canEdit" | "canDelete") => {
        if (isSuperAdmin) return true;
        const p = privileges.find((x) => x.path === path);
        return p ? p[action] : false;
      },
      refreshSession,
    };
  }, [isSuperAdmin, accessibleMenus, refreshSession]);

  const navLinks = useMemo(() => {
    const sorted = [...accessibleMenus].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
    );
    return sorted.map((m) => ({ href: m.path, label: m.label }));
  }, [accessibleMenus]);

  const inlineNavLinks =
    navLinks.length <= ADMIN_NAV_INLINE_COUNT ? navLinks : navLinks.slice(0, ADMIN_NAV_INLINE_COUNT);
  const overflowNavLinks =
    navLinks.length <= ADMIN_NAV_INLINE_COUNT ? [] : navLinks.slice(ADMIN_NAV_INLINE_COUNT);

  /** Show while site session is unknown or absent (hides as soon as site `/me` reports a member). */
  const showAsSiteMemberLink = Boolean(authed) && siteMemberLoggedIn !== true;

  if (authed === null) return <Loader3D />;
  if (!authed) {
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return <>{children}</>;
    // useEffect will router.replace("/admin"); don’t render protected children meanwhile
    return <Loader3D />;
  }

  return (
    <PrivilegeContext.Provider value={privilegeCtx}>
      <div className="min-h-screen">
        <nav
          className="sticky top-0 z-50 border-b border-(--color-border)"
          style={{ backgroundColor: "var(--color-surface)", backdropFilter: "blur(8px)" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left: brand + nav */}
            <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1 md:mr-3">
              <Link href="/admin" className="text-lg font-bold text-(--color-gold) shrink-0">
                ★ Admin
              </Link>

              {/* Desktop nav — inline tabs + More dropdown (no horizontal scroll) */}
              <div className="hidden md:flex items-center gap-0.5 min-w-0 flex-1 justify-start">
                {inlineNavLinks.map((link) => {
                  const active = navLinkActive(pathname, link.href);
                  const isSuggestions = link.href === "/admin/suggestions";
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? "bg-(--color-gold)/10 text-(--color-gold)"
                          : "text-(--color-text-muted) hover:text-(--color-text)"
                      }`}
                    >
                      {link.label}
                      {isSuggestions && suggestionCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                          {suggestionCount > 99 ? "99+" : suggestionCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {overflowNavLinks.length > 0 && (
                  <AdminNavMoreMenu
                    links={overflowNavLinks}
                    pathname={pathname}
                    suggestionCount={suggestionCount}
                  />
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="md:hidden! theme-toggle"
                aria-label="Toggle navigation"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {mobileNav ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Right: user info + actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isSuperAdmin ? (
                <button
                  onClick={() => router.push("/admin/inbox")}
                  className="relative w-7 h-7 rounded-full border border-(--color-border) bg-(--color-bg) text-xs font-bold text-(--color-gold) hover:border-(--color-gold) hover:bg-(--color-gold)/10 transition-colors flex items-center justify-center"
                  title="Inbox"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                  {contactCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full px-0.5">
                      {contactCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowContact(true)}
                  className="relative w-7 h-7 rounded-full border border-(--color-border) bg-(--color-bg) text-xs font-bold text-(--color-gold) hover:border-(--color-gold) hover:bg-(--color-gold)/10 transition-colors flex items-center justify-center"
                  title="Contact"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="relative w-7 h-7 rounded-full border border-(--color-border) bg-(--color-bg) text-xs font-bold text-(--color-gold) hover:border-(--color-gold) hover:bg-(--color-gold)/10 transition-colors flex items-center justify-center"
                title="Admin Guide"
              >
                ?
              </button>
              <ThemeToggle />
              {showAsSiteMemberLink && (
                <Link
                  href="/go/member"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:block text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors px-2"
                >
                  As Site Member
                </Link>
              )}

              <AdminAccountDropdown
                userName={userName}
                userEmail={userEmail}
                groupSlug={groupSlug}
                isSuperAdmin={isSuperAdmin}
                onLogout={async () => {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                  clearAdminHint();
                  router.replace("/");
                }}
              />
            </div>
          </div>

          {/* Mobile nav dropdown */}
          {mobileNav && (
            <div className="md:hidden border-t border-(--color-border) bg-(--color-surface) animate-fade-in">
              <div className="max-w-6xl mx-auto px-4 py-2 space-y-1">
                {navLinks.map((link) => {
                  const active = pathname === link.href ||
                    (link.href !== "/admin" && pathname.startsWith(link.href));
                  const isSuggestions = link.href === "/admin/suggestions";
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-(--color-gold)/10 text-(--color-gold)"
                          : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-hover)"
                      }`}
                    >
                      {link.label}
                      {isSuggestions && suggestionCount > 0 && (
                        <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                          {suggestionCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {showAsSiteMemberLink && (
                  <div className="border-t border-(--color-border) pt-2 mt-2">
                    <Link
                      href="/go/member"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2.5 rounded-lg text-sm text-(--color-text-muted) hover:text-(--color-text)"
                    >
                      As Site Member
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
        <HelpGuide open={showGuide} onClose={() => setShowGuide(false)} />
        <ContactModal open={showContact} onClose={() => setShowContact(false)} />
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">{children}</main>
      </div>
    </PrivilegeContext.Provider>
  );
}
