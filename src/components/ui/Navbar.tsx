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
};

const SESSION_FETCH: RequestInit = { cache: "no-store", credentials: "include" };

async function parseSiteMeResponse(res: Response): Promise<SiteMe | null> {
  if (!res.ok) return null;
  try {
    const j = await res.json();
    if (!j?.email) return null;
    return {
      email: String(j.email),
      role: j.role === "owner" ? "owner" : "user",
    };
  } catch {
    return null;
  }
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
  const roleLabel = siteProfile.role === "owner" ? "Owner" : "Member";
  return (
    <div className="px-3 py-2 space-y-3 text-left">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
          Site member
        </p>
        <p className="text-sm font-medium text-[var(--color-text)] truncate" title={siteProfile.email}>
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
    page: "My heroes",
    icon: "⭐",
    items: [
      { button: "Adopted heroes", desc: "Profiles you support appear here after checkout." },
      { button: "View profile", desc: "Open the public hero page from your list." },
      { button: "Edit tribute", desc: "Update your tribute text where editing is enabled." },
    ],
  },
  {
    page: "Browse the site",
    icon: "🎖️",
    items: [
      { button: "Heroes", desc: "Ranked archive of decorated service members (USM-25 scores)." },
      { button: "Medals", desc: "Decoration catalog, ribbons, and how awards count toward scores." },
      { button: "USM-25", desc: "Scoring methodology and matrix rules." },
    ],
  },
  {
    page: "Account",
    icon: "👤",
    items: [
      { button: "Log out", desc: "Account menu (avatar) — ends your session on this device." },
      { button: "Contact", desc: "Mail icon — send a message to the team." },
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
          <h3 className="text-sm font-bold text-[var(--color-gold)]">Member Guide</h3>
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

function PublicAccountDropdown({
  siteProfile,
  onLogout,
}: {
  siteProfile: SiteMe;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = siteProfile.email?.split("@")[0] || siteProfile.email || "Account";

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
          <div className="border-t border-[var(--color-border)] p-2">
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
      setSiteProfile({ email: siteHint.email, role: siteHint.role });
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

  /** Member sign-in/up: this chrome is site-member context; staff uses "As Admin/Staff" in another tab. */
  const showAuthLinks = !siteProfile;
  const showMemberHeaderTools = Boolean(siteProfile);
  const showAccountMenu = Boolean(siteProfile);
  /** Open staff area only when logged in as site member but not as admin/staff in this browser. */
  const showAsAdminStaffLink = Boolean(siteProfile && !adminProfile);

  const myHeroesActive = pathname === "/my-heroes" || pathname.startsWith("/my-heroes/");

  const handleLogout = useCallback(async () => {
    await fetch("/api/site/logout", { method: "POST", credentials: "include" });
    clearSiteMemberHint();
    setSiteProfile(null);
    setMobileOpen(false);
    router.replace("/");
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
                  title="Member guide"
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
            {showAsAdminStaffLink && (
              <a
                href="/go/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 whitespace-nowrap"
              >
                As Admin/Staff
              </a>
            )}
            {showAccountMenu && siteProfile && (
              <PublicAccountDropdown siteProfile={siteProfile} onLogout={() => void handleLogout()} />
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
                title="Member guide"
              >
                ?
              </button>
            </>
          )}
          {showAccountMenu && siteProfile && (
            <PublicAccountDropdown siteProfile={siteProfile} onLogout={() => void handleLogout()} />
          )}
          {showAsAdminStaffLink && (
            <a
              href="/go/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1 max-w-[4.25rem] leading-tight text-center"
              title="As Admin/Staff (new tab)"
            >
              Admin
            </a>
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
              {showAsAdminStaffLink && (
                <a
                  href="/go/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  As Admin/Staff
                </a>
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

