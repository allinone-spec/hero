"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const [siteUserEmail, setSiteUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionOpts: RequestInit = { cache: "no-store", credentials: "include" };
    Promise.all([
      fetch("/api/auth/me", sessionOpts)
        .then((r) => r.ok)
        .catch(() => false),
      fetch("/api/site/me", sessionOpts)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([adminOk, siteData]) => {
      if (cancelled) return;
      setAdminSession(adminOk);
      setSiteUserEmail(siteData?.email ? String(siteData.email) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const showAuthLinks = !siteUserEmail && !adminSession;

  const handleSiteLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setSiteUserEmail(null);
    setAdminSession(false);
    setMobileOpen(false);
    router.replace("/");
    router.refresh();
  }, [router]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/rankings", label: "Heroes" },
    { href: "/medals", label: "Medals" },
    { href: "/scoring", label: "USM-25" },
    ...(adminSession ? [{ href: "/suggestions", label: "Suggestions" }] : []),
  ];

  return (
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
                className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-gold)] hover:underline max-w-[140px] truncate"
                title={siteUserEmail}
              >
                My heroes
              </Link>
            )}
            {adminSession && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-md text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-gold)] transition-colors"
              >
                Dashboard
              </Link>
            )}
            {siteUserEmail && (
              <button
                type="button"
                onClick={() => void handleSiteLogout()}
                className="btn-secondary text-xs sm:text-sm py-1.5 px-3 sm:px-4"
              >
                Logout
              </button>
            )}
            <button
              type="button"
              onClick={() => alert("Please sign up or sign in to contact us.")}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Contact
            </button>
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
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex md:!hidden items-center gap-2">
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
                  className="block text-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-gold)]"
                >
                  My heroes
                </Link>
              )}
              {adminSession && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)]"
                >
                  Dashboard
                </Link>
              )}
              {siteUserEmail && (
                <button
                  type="button"
                  onClick={() => void handleSiteLogout()}
                  className="w-full btn-secondary text-sm py-2.5"
                >
                  Logout
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  alert("Please sign up or sign in to contact us.");
                }}
                className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Contact
              </button>
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
  );
}

