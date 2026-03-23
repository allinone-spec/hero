"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(document.cookie.includes("auth-token="));
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/rankings", label: "Heroes" },
    { href: "/medals", label: "Medals" },
    { href: "/scoring", label: "USM-25" },
    ...(signedIn ? [{ href: "/suggestions", label: "Suggestions" }] : []),
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
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => alert("Please sign up or sign in to contact us.")}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Contact
            </button>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-gold)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/admin/register"
              className="px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
              style={{
                background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                color: "var(--color-badge-text)",
              }}
            >
              Sign Up
            </Link>
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
              <button
                onClick={() => { setMobileOpen(false); alert("Please sign up or sign in to contact us."); }}
                className="w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Contact
              </button>
              <div className="flex gap-2">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)]"
              >
                Sign In
              </Link>
              <Link
                href="/admin/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                  color: "var(--color-badge-text)",
                }}
              >
                Sign Up
              </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

