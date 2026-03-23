"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LoginRole = "member" | "admin";

function safeMemberNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/my-heroes";
  return raw;
}

function safeAdminNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (!raw.startsWith("/admin")) return null;
  return raw;
}

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberNext, setMemberNext] = useState("/my-heroes");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "admin") setRole("admin");
    else if (r === "member") setRole("member");
    setMemberNext(safeMemberNext(params.get("next")));
  }, []);

  const syncRoleToUrl = useCallback((r: LoginRole) => {
    setRole(r);
    const u = new URL(window.location.href);
    u.searchParams.set("role", r);
    window.history.replaceState({}, "", u.toString());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (role === "member") {
        const res = await fetch("/api/site/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Login failed");
          return;
        }
        router.push(memberNext);
        router.refresh();
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      const fromQuery = safeAdminNext(new URLSearchParams(window.location.search).get("next"));
      const dest = fromQuery ?? (data.isSuperAdmin ? "/admin" : "/admin/submit");
      window.location.href = dest;
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full text-[var(--color-badge-text)] text-2xl font-bold"
          style={{
            width: 64,
            height: 64,
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            boxShadow: "0 4px 20px rgba(192,123,8,0.35)",
          }}
        >
          ★
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Sign in</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Medals N Bongs</p>
      </div>

      <div className="flex rounded-lg border border-[var(--color-border)] p-1 gap-1 mb-6">
        <button
          type="button"
          onClick={() => syncRoleToUrl("member")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            role === "member"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Site member
        </button>
        <button
          type="button"
          onClick={() => syncRoleToUrl("admin")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            role === "admin"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Admin / Staff
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mb-4 leading-relaxed">
        {role === "member"
          ? "For supporters and adopted-hero editing. Same email/password as your member account only — not your admin request."
          : "For approved archive editors. Use the email and password from your admin account."}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 pr-10 text-[var(--color-text)]"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPw ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <Link
          href={role === "admin" ? "/forgot-password?role=admin" : "/forgot-password?role=member"}
          className="text-sm text-[var(--color-gold)] hover:underline block text-center"
        >
          Forgot password?
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Need an account?{" "}
        <Link
          href={role === "admin" ? "/register?role=admin" : "/register?role=member"}
          className="text-[var(--color-gold)] hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
