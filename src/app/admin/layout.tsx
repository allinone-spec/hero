"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarFallback from "@/components/ui/AvatarFallback";
import ContactModal from "@/components/ui/ContactModal";
import { PrivilegeContext, type MenuPrivilege } from "@/contexts/PrivilegeContext";
import { clearAdminHint } from "@/lib/client-session-hint";
import { AdminLoader } from "@/components/ui/AdminLoader";

/* ── Help Guide Panel ──────────────────────────────────── */
const GUIDE_SECTIONS = [
  {
    page: "Top bar & nav",
    icon: "🧭",
    items: [
      {
        button: "Tabs",
        desc: "Menu items come from your group’s permissions. Active section is highlighted; extra items are under “More” on desktop.",
      },
      {
        button: "Suggestions",
        desc: "Red badge on the tab when there are items to review (if you can access Suggestions).",
      },
      {
        button: "Inbox / Contact",
        desc: "Super Admin: envelope opens the inbox. Other Admins: opens Contact to message the team.",
      },
      { button: "Theme", desc: "Sun/moon control next to the guide — toggles light or dark UI." },
      {
        button: "Account menu",
        desc: "Avatar: your name, email, and Role (Super Admin, group name, or Admin). Switch role → public Owner flow; Log out ends this Admin session.",
      },
    ],
  },
  {
    page: "Dashboard",
    icon: "📊",
    items: [
      {
        button: "Who sees it",
        desc: "Super Admins land here with stats, recent heroes, and quick actions. Other Admins are sent to Submit Hero instead.",
      },
      { button: "Stat cards", desc: "Totals for heroes (published/drafts), medal types, and Admin user count." },
      { button: "Recent heroes", desc: "Click a row to open that hero’s edit form." },
      {
        button: "Quick actions",
        desc: "Shortcuts: Add New Hero, Medal Types, Scoring Rules, Manage Users — no separate “public site” card.",
      },
    ],
  },
  {
    page: "Submit Hero",
    icon: "📤",
    items: [
      {
        button: "Default home",
        desc: "Non–Super Admin default landing: propose or submit hero updates according to your group’s access.",
      },
    ],
  },
  {
    page: "Heroes",
    icon: "🎖️",
    items: [
      { button: "+ Add Hero", desc: "Hero creation form (e.g. Wikipedia import) when your group can create." },
      { button: "View", desc: "Read-only profile: medals, biography, service record." },
      { button: "Edit", desc: "Full editor for medals, bio, scoring fields, publishing — if permitted." },
      { button: "Published / Draft", desc: "Toggle visibility on the public Heroes list when you can edit." },
      { button: "Delete", desc: "Permanent removal with confirmation when delete is allowed." },
      { button: "Filters", desc: "Search, branch/status filters, sort by score or name." },
    ],
  },
  {
    page: "Rankings",
    icon: "📈",
    items: [
      {
        button: "Admin preview",
        desc: "Published heroes in leaderboard order (scores, order override), ribbon rack, and slideshow-style preview for QA.",
      },
    ],
  },
  {
    page: "Suggestions",
    icon: "💡",
    items: [
      {
        button: "Queue",
        desc: "Public suggestions about heroes or data; review and resolve from here when the menu is enabled for your group.",
      },
    ],
  },
  {
    page: "Medals",
    icon: "🏅",
    items: [
      { button: "+ Add Medal Type", desc: "New medal: ribbon colors, valor points, tier, V-device rules." },
      { button: "Edit", desc: "Change name, points, ribbons, valor / V requirements." },
      { button: "Medal (gallery)", desc: "Separate screen for medal artwork / designer flows linked from the console." },
      { button: "Valor & V", desc: "Points are 0 if a “V” device is required but missing on the hero; VALOR-type awards score fully when earned." },
    ],
  },
  {
    page: "USM-25 & Scoring",
    icon: "⚙️",
    items: [
      { button: "USM-25", desc: "In-console reference to methodology and matrix rules." },
      { button: "Scoring", desc: "Save rules, reset to defaults, recalculate all hero scores from current medals and config." },
    ],
  },
  {
    page: "Wars",
    icon: "🏴",
    items: [
      { button: "+ Add War", desc: "Manual war/conflict with years and theater." },
      { button: "AI Import", desc: "Optional Gemini-assisted US war list generation." },
      { button: "Edit / Active", desc: "Update metadata; inactive wars hide from hero form dropdowns." },
    ],
  },
  {
    page: "Users",
    icon: "👥",
    items: [
      {
        button: "Admin tab",
        desc: "Staff Admin accounts: pending signup approvals, active toggle, roles (superadmin/admin/editor), edit and passwords.",
      },
      {
        button: "Owners tab",
        desc: "Super Admin only: public Owner accounts — filters, adoptions, Stripe, roles Owner vs Hero owner, edit/delete.",
      },
    ],
  },
  {
    page: "Access control",
    icon: "🔐",
    items: [
      { button: "Groups", desc: "Define admin groups (e.g. Super Admin, Default)." },
      { button: "Menus", desc: "System menu registry paths and labels used for privileges." },
      { button: "Group Privileges", desc: "Which groups can view/create/edit/delete each admin screen." },
    ],
  },
  {
    page: "Logs",
    icon: "📋",
    items: [
      { button: "Categories", desc: "Filter by Hero, Medal, User, Auth, Scoring, System, etc." },
      { button: "Search", desc: "Find actions by description text." },
    ],
  },
  {
    page: "AI Usage",
    icon: "🤖",
    items: [
      { button: "Budget", desc: "Track usage against the configured AI budget." },
      { button: "By user / action", desc: "See which Admins and which action types consume the most." },
      { button: "Recent calls", desc: "Per-request tokens and cost where logged." },
    ],
  },
  {
    page: "Marketplace",
    icon: "💳",
    items: [
      {
        button: "Ops metrics",
        desc: "Published vs adoptable inventory, active adoptions, expiring windows, checkout counts and revenue from AdoptionTransaction.",
      },
      {
        button: "Stripe sync",
        desc: "Reconcile Owner subscription status from Stripe when webhooks were missed (requires can edit on this menu).",
      },
      {
        button: "Customer portal",
        desc: "Owners open billing from My Heroes when they have a Stripe customer on file (configure the portal in Stripe Dashboard).",
      },
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
              Scoring uses the catalog (USM-25.2). Medals with a &quot;V&quot; requirement score <strong>zero</strong> on
              the leaderboard unless the valor device is present. Inherently-valor medals (MOH, Crosses, Silver Star,
              etc.) score per catalog; Purple Heart is wounded-in-action only — <strong>0</strong> heroic points (rack
              display).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function formatAdminRoleLabel(groupSlug: string): string {
  if (!groupSlug) return "Admin";
  if (groupSlug === "super-admin") return "Super Admin";
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
  onSwitchRole,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  groupSlug: string;
  isSuperAdmin: boolean;
  onSwitchRole: () => void;
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
          <div className="border-t border-(--color-border) p-2 space-y-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSwitchRole();
              }}
              className="btn-secondary text-sm w-full py-2"
            >
              Switch role
            </button>
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

    void fetch("/api/auth/me", opts)
      .then(async (r) => {
        if (myId !== reloadGenRef.current) return;
        if (!r.ok) {
          reloadGenRef.current += 1;
          setAuthed(false);
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
        }
      })
      .catch(() => {
        if (myId !== reloadGenRef.current) return;
        reloadGenRef.current += 1;
        setAuthed(false);
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

  if (authed === null) return <AdminLoader fullscreen label="Loading Admin…" />;
  if (!authed) {
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return <>{children}</>;
    // useEffect will router.replace("/admin"); don’t render protected children meanwhile
    return <AdminLoader fullscreen label="Loading Admin…" />;
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

              <AdminAccountDropdown
                userName={userName}
                userEmail={userEmail}
                groupSlug={groupSlug}
                isSuperAdmin={isSuperAdmin}
                onSwitchRole={() => router.push("/go/member")}
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
              </div>
            </div>
          )}
        </nav>
        <HelpGuide open={showGuide} onClose={() => setShowGuide(false)} />
        <ContactModal open={showContact} onClose={() => setShowContact(false)} />
        <main className="mx-auto min-h-[calc(100svh-5rem)] max-w-6xl px-3 py-6 sm:px-4 sm:py-8">{children}</main>
      </div>
    </PrivilegeContext.Provider>
  );
}
