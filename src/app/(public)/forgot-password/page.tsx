"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ForgotRole = "member" | "admin";

export default function ForgotPasswordPage() {
  const [role, setRole] = useState<ForgotRole>("member");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role");
    if (r === "admin") setRole("admin");
    else if (r === "member") setRole("member");
  }, []);

  const syncRoleToUrl = useCallback((r: ForgotRole) => {
    setRole(r);
    const u = new URL(window.location.href);
    u.searchParams.set("role", r);
    window.history.replaceState({}, "", u.toString());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setDebugUrl(null);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await response.json();

      if (data.debugUrl) setDebugUrl(data.debugUrl);

      if (response.ok) {
        setMessage("If an account with that email exists, a password reset link has been sent.");
      } else {
        setMessage(data.message || "An error occurred");
      }
    } catch {
      setMessage("An error occurred while sending the request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Forgot password</h1>
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
          Admin / staff
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        Choose the account type that matches the email you used to register. We only send a reset for that account.
      </p>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm text-center ${
            message.includes("sent") || message.includes("exists")
              ? "bg-green-500/10 text-green-200 border border-green-500/30"
              : "bg-red-500/10 text-red-200 border border-red-500/30"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          {isLoading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {debugUrl && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">Development: reset link</p>
          <a href={debugUrl} className="text-sm text-[var(--color-gold)] hover:underline break-all" target="_blank" rel="noreferrer">
            {debugUrl}
          </a>
        </div>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href={role === "admin" ? "/login?role=admin" : "/login?role=member"}
          className="text-[var(--color-gold)] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
