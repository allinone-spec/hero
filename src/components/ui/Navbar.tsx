"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import ContactModal from "./ContactModal";
import AvatarFallback from "./AvatarFallback";
import {
  clearAdminHint,
  clearSiteMemberHint,
  readAdminHint,
  readSiteMemberHint,
} from "@/lib/client-session-hint";

type AdminMe = {
  email: string;
  name: string;
  groupSlug: string;
  isSuperAdmin: boolean;
};

type SiteMe = {
  email: string;
  role: string;
  /** Display name / username from profile (not email local-part). */
  name: string;
};

const SESSION_FETCH: RequestInit = { cache: "no-store", credentials: "include" };

async function parseSiteMeResponse(res: Response): Promise<SiteMe | null> {
  if (!res.ok) return null;
  try {
    const j = await res.json();
    if (!j?.email) return null;
    const nameRaw = j.name;
    return {
      email: String(j.email),
      role: j.role === "owner" ? "owner" : "user",
      name: typeof nameRaw === "string" ? nameRaw.trim() : "",
    };
  } catch {
    return null;
  }
}

function siteMemberDisplayName(p: SiteMe): string {
  const n = p.name?.trim();
  if (n) return n;
  return p.email || "Account";
}

async function parseAdminMeResponse(res: Response): Promise<AdminMe | null> {
  if (!res.ok) return null;
  try {
    const j = await res.json();
    if (!j?.email) return null;
    return {
      email: String(j.email),
      name: String(j.name || "Admin"),
      groupSlug: String(j.groupSlug || ""),
      isSuperAdmin: Boolean(j.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

function SiteMemberAccountPanelBody({ siteProfile }: { siteProfile: SiteMe }) {
  const roleLabel = siteProfile.role === "owner" ? "Hero owner" : "Owner";
  const username = siteMemberDisplayName(siteProfile);
  return (
    <div className="px-3 py-2 space-y-3 text-left">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)] truncate" title={username}>
          {username}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate" title={siteProfile.email}>
          {siteProfile.email}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Role: <span className="text-[var(--color-gold)] font-semibold">{roleLabel}</span>
        </p>
      </div>
    </div>
  );
}

const SITE_MEMBER_GUIDE_SECTIONS = [
  {
    page: "My Heroes",
    icon: "⭐",
    items: [
      {
        button: "Your list",
        desc: "After adoption checkout, supported heroes show here with renewal dates when applicable.",
      },
      {
        button: "View profile",
        desc: "Open the public hero page from a row.",
      },
      {
        button: "Edit tribute",
        desc: "Hero owners (role on your account) can edit tribute text and media where the site allows it.",
      },
      {
        button: "Nav link",
        desc: "“My Heroes” in the bar when you’re signed in — same destination as this list.",
      },
    ],
  },
  {
    page: "Browse",
    icon: "🎖️",
    items: [
      { button: "Home", desc: "Landing page for the public archive." },
      {
        button: "Heroes",
        desc: "Ranked published profiles (USM-25 scores), filters, and categories — same as /rankings.",
      },
      { button: "Medals", desc: "Decoration catalog, ribbons, and how awards contribute to scores." },
      { button: "USM-25", desc: "Scoring methodology and matrix rules on the public site." },
    ],
  },
  {
    page: "Account & roles",
    icon: "👤",
    items: [
      {
        button: "Avatar menu",
        desc: "Your display name (profile name, not email prefix), email, and Role: Owner (standard) or Hero owner (can edit adopted-hero tributes).",
      },
      {
        button: "Switch role",
        desc: "Goes to /go/admin: opens the Admin console if you’re already signed in as Admin, otherwise Admin sign-in (with return path).",
      },
      {
        button: "Log out",
        desc: "Ends your Owner session in this browser only.",
      },
      {
        button: "Contact",
        desc: "Mail icon in the bar — message the team; form prefers your Owner name/email when signed in.",
      },
      {
        button: "Owner guide",
        desc: "This panel (?): quick reference while browsing as an Owner.",
      },
      {
        button: "Theme",
        desc: "Light/dark toggle next to the bar controls.",
      },
    ],
  },
];

function SiteMemberGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-[70] w-[min(100vw-2rem,24rem)] sm:max-w-md sm:w-96 max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-fade-in">
        <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-gold)]">Owner guide</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-4">
          {SITE_MEMBER_GUIDE_SECTIONS.map((section) => (
            <div key={section.page}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                {section.icon} {section.page}
              </h4>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.button} className="flex gap-2 text-xs">
                    <span className="shrink-0 font-semibold text-[var(--color-gold)] min-w-[7rem] sm:min-w-[8.5rem]">
                      {item.button}
                    </span>
                    <span className="text-[var(--color-text-muted)]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const memberHeaderIconBtn =
  "relative w-7 h-7 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-gold)] hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors flex items-center justify-center shrink-0";

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function StaffAccountPanelBody({ adminProfile }: { adminProfile: AdminMe }) {
  const groupLabel =
    adminProfile.isSuperAdmin ? "Super Admin" : adminProfile.groupSlug || "Admin";
  return (
    <div className="px-3 py-2 space-y-3 text-left">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
          Admin
        </p>
        <p className="text-sm font-medium text-[var(--color-text)] truncate" title={adminProfile.email}>
          {adminProfile.email}
        </p>
        {adminProfile.name && adminProfile.name !== adminProfile.email.split("@")[0] && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate" title={adminProfile.name}>
            {adminProfile.name}
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          <span className="text-[var(--color-gold)] font-semibold">{groupLabel}</span>
        </p>
      </div>
    </div>
  );
}

function PublicStaffAccountDropdown({
  adminProfile,
  onLogout,
  onSwitchRole,
}: {
  adminProfile: AdminMe;
  onLogout: () => void;
  /** Open Owner context (/go/member: my-heroes if signed in, else sign-in). */
  onSwitchRole: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName =
    adminProfile.name?.trim() ||
    adminProfile.email?.split("@")[0] ||
    adminProfile.email ||
    "Admin";

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
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-gold)]/50 transition-colors max-w-[220px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <AvatarFallback name={displayName} size={28} shape="rounded" />
        <span className="truncate text-xs font-medium text-[var(--color-text)] hidden lg:inline max-w-[6.5rem]">
          {displayName}
        </span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-[60] py-1 animate-fade-in"
          role="menu"
        >
          <StaffAccountPanelBody adminProfile={adminProfile} />
          <div className="border-t border-[var(--color-border)] p-2 space-y-2">
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="btn-primary text-sm w-full py-2 text-center block"
            >
              Admin console
            </Link>
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

function PublicAccountDropdown({
  siteProfile,
  onLogout,
  onSwitchRole,
}: {
  siteProfile: SiteMe;
  onLogout: () => void;
  /** Open Admin context (/go/admin: console if signed in, else admin sign-in). */
  onSwitchRole: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = siteMemberDisplayName(siteProfile);

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
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-gold)]/50 transition-colors max-w-[220px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <AvatarFallback name={displayName} size={28} shape="rounded" />
        <span className="truncate text-xs font-medium text-[var(--color-text)] hidden lg:inline max-w-[6.5rem]">
          {displayName}
        </span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-[60] py-1 animate-fade-in"
          role="menu"
        >
          <SiteMemberAccountPanelBody siteProfile={siteProfile} />
          <div className="border-t border-[var(--color-border)] p-2 space-y-2">
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

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminMe | null>(null);
  const [siteProfile, setSiteProfile] = useState<SiteMe | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMemberGuide, setShowMemberGuide] = useState(false);

  const siteUserEmail = siteProfile?.email ?? null;

  /** Site and admin `/me` run independently so "As …" and account UI update as soon as each response arrives. */
  const syncSessionFromNetwork = useCallback((isStale: () => boolean) => {
    void fetch("/api/site/me", SESSION_FETCH).then(async (res) => {
      if (isStale()) return;
      clearSiteMemberHint();
      setSiteProfile(await parseSiteMeResponse(res));
    });

    void fetch("/api/auth/me", SESSION_FETCH).then(async (res) => {
      if (isStale()) return;
      clearAdminHint();
      setAdminProfile(await parseAdminMeResponse(res));
    });
  }, []);

  useLayoutEffect(() => {
    const siteHint = readSiteMemberHint();
    if (siteHint) {
      setSiteProfile({
        email: siteHint.email,
        role: siteHint.role,
        name: typeof siteHint.name === "string" ? siteHint.name.trim() : "",
      });
    }
    const adminHint = readAdminHint();
    if (adminHint) {
      setAdminProfile({
        email: adminHint.email,
        name: adminHint.name,
        groupSlug: adminHint.groupSlug,
        isSuperAdmin: adminHint.isSuperAdmin,
      });
    }

    let cancelled = false;
    syncSessionFromNetwork(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [pathname, syncSessionFromNetwork]);

  useEffect(() => {
    let visGen = 0;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const id = ++visGen;
      syncSessionFromNetwork(() => id !== visGen);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncSessionFromNetwork]);

  /** Hide Owner sign-in/up when an Owner or staff session exists (staff-only still needs header identity). */
  const showAuthLinks = !siteProfile && !adminProfile;
  const showMemberHeaderTools = Boolean(siteProfile);
  const showAccountMenu = Boolean(siteProfile);
  /** On public pages, staff chrome only when not in an Owner session — Owner nav hides staff identity even if both cookies exist. */
  const showStaffAccountMenu = Boolean(adminProfile && !siteProfile);

  const myHeroesActive = pathname === "/my-heroes" || pathname.startsWith("/my-heroes/");

  const switchToStaffContext = useCallback(() => {
    router.push("/go/admin");
  }, [router]);

  const switchToMemberContext = useCallback(() => {
    router.push("/go/member");
  }, [router]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/site/logout", { method: "POST", credentials: "include" });
    clearSiteMemberHint();
    setSiteProfile(null);
    setMobileOpen(false);
    router.replace("/");
    router.refresh();
  }, [router]);

  const handleStaffLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearAdminHint();
    setAdminProfile(null);
    setMobileOpen(false);
    router.refresh();
  }, [router]);

  /** Public chrome only — no staff nav (Suggestions lives under /admin in the staff tab). */
  const links = [
    { href: "/", label: "Home" },
    { href: "/rankings", label: "Heroes" },
    { href: "/medals", label: "Medals" },
    { href: "/scoring", label: "USM-25" },
  ];

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-[var(--color-gold)]">★</span>
          <span className="text-lg font-bold hidden sm:block">Medals <span style={{ color: "#3b82f6" }}>N</span> Bongs</span>
          <span className="text-lg font-bold sm:hidden">M<span style={{ color: "#3b82f6" }}>N</span>B</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 ml-4 flex-wrap justify-end">
            {siteUserEmail && (
              <Link
                href="/my-heroes"
                title={siteUserEmail}
                className={`max-w-[140px] truncate px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  myHeroesActive
                    ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                My Heroes
              </Link>
            )}
            {showMemberHeaderTools && (
              <>
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className={memberHeaderIconBtn}
                  title="Contact"
                >
                  <MailIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMemberGuide(true)}
                  className={memberHeaderIconBtn}
                  title="Owner guide"
                >
                  ?
                </button>
              </>
            )}
            {!showMemberHeaderTools && (
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Contact
              </button>
            )}
            {showAuthLinks && (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                  style={{
                    background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                    color: "var(--color-badge-text)",
                  }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <ThemeToggle />
            {showAccountMenu && siteProfile && (
              <PublicAccountDropdown
                siteProfile={siteProfile}
                onLogout={() => void handleLogout()}
                onSwitchRole={switchToStaffContext}
              />
            )}
            {showStaffAccountMenu && adminProfile && (
              <PublicStaffAccountDropdown
                adminProfile={adminProfile}
                onLogout={() => void handleStaffLogout()}
                onSwitchRole={switchToMemberContext}
              />
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex md:!hidden items-center gap-2">
          {showMemberHeaderTools && (
            <>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className={memberHeaderIconBtn}
                title="Contact"
              >
                <MailIcon />
              </button>
              <button
                type="button"
                onClick={() => setShowMemberGuide(true)}
                className={memberHeaderIconBtn}
                title="Owner guide"
              >
                ?
              </button>
            </>
          )}
          {showAccountMenu && siteProfile && (
            <PublicAccountDropdown
              siteProfile={siteProfile}
              onLogout={() => void handleLogout()}
              onSwitchRole={switchToStaffContext}
            />
          )}
          {showStaffAccountMenu && adminProfile && (
            <PublicStaffAccountDropdown
              adminProfile={adminProfile}
              onLogout={() => void handleStaffLogout()}
              onSwitchRole={switchToMemberContext}
            />
          )}
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="theme-toggle"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
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
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 py-2 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[var(--color-border)] pt-2 mt-2 space-y-2">
              {siteUserEmail && (
                <Link
                  href="/my-heroes"
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-center text-sm font-medium transition-colors ${
                    myHeroesActive
                      ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  My Heroes
                </Link>
              )}
              {showStaffAccountMenu && adminProfile && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center px-3 py-2.5 rounded-lg text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                      color: "var(--color-badge-text)",
                    }}
                  >
                    Admin console
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      switchToMemberContext();
                    }}
                    className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    Switch role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void handleStaffLogout();
                    }}
                    className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    Log out
                  </button>
                </>
              )}
              {showAccountMenu && siteProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    switchToStaffContext();
                  }}
                  className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Switch role
                </button>
              )}
              {!showMemberHeaderTools && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setShowContactModal(true);
                  }}
                  className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Contact
                </button>
              )}
              {showAuthLinks && (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                      color: "var(--color-badge-text)",
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Outside nav: same stacking as admin layout — fixed overlays must not sit under sticky/backdrop-blur */}
    <SiteMemberGuide open={showMemberGuide} onClose={() => setShowMemberGuide(false)} />
    <ContactModal open={showContactModal} onClose={() => setShowContactModal(false)} />
    </>
  );
}

