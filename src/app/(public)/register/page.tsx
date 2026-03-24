"use client";

import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import TermsOfEngagementModal from "@/components/auth/TermsOfEngagementModal";

type RegRole = "member" | "admin";

export default function UnifiedRegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegRole>("member");
  const [step, setStep] = useState<"form" | "verifyEmail" | "success">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState<boolean | null>(null);
  const [debugVerifyUrl, setDebugVerifyUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "admin") setRole("admin");
    else if (r === "member") setRole("member");
  }, []);

  const syncRoleToUrl = useCallback((r: RegRole) => {
    setRole(r);
    setStep("form");
    setError("");
    const u = new URL(window.location.href);
    u.searchParams.set("role", r);
    window.history.replaceState({}, "", u.toString());
  }, []);

  async function onSubmitMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms of Engagement");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setDebugVerifyUrl(null);
    try {
      const res = await fetch("/api/site/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
          agreedToTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      if (data.pendingVerification) {
        setVerifyEmailSent(Boolean(data.emailSent));
        setDebugVerifyUrl(typeof data.debugVerifyUrl === "string" ? data.debugVerifyUrl : null);
        setStep("verifyEmail");
        return;
      }
      router.push("/login?role=member");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, note, agreedToTerms: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("success");
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
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
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Create account</h1>
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
          Owner
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
          Admin
        </button>
      </div>

      {role === "member" ? (
        <p className="text-xs text-[var(--color-text-muted)] mb-4 leading-relaxed">
          For supporters and hero adoption. We&apos;ll email you a link to verify your address; clicking it signs you in
          automatically. Password at least 8 characters.
        </p>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] mb-4 leading-relaxed">
          Request access to the archive admin panel. An administrator must approve your account before you can sign in.
        </p>
      )}

      {role === "member" && step === "verifyEmail" && (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Check your email</h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            We sent a verification link to <span className="text-[var(--color-gold)] font-medium">{email}</span>. Open
            the email, open the link, then click <strong>Verify email and sign in</strong> on our site — you won&apos;t need
            to enter your password again. After that you can adopt a hero and renew support from{" "}
            <Link href="/adopt" className="text-[var(--color-gold)] hover:underline">
              Adopt a Hero
            </Link>
            .
          </p>
          {verifyEmailSent === false && (
            <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              Email could not be sent (check server email settings). Use &quot;Resend&quot; below or contact support.
            </p>
          )}
          {debugVerifyUrl && (
            <p className="text-xs text-[var(--color-text-muted)] break-all">
              Dev only:{" "}
              <a href={debugVerifyUrl} className="text-[var(--color-gold)] underline">
                verification link
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const res = await fetch("/api/site/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  const d = await res.json();
                  setVerifyEmailSent(Boolean(d.emailSent));
                  if (typeof d.debugVerifyUrl === "string") setDebugVerifyUrl(d.debugVerifyUrl);
                } catch {
                  setError("Could not resend");
                } finally {
                  setLoading(false);
                }
              }}
              className="btn-secondary text-sm"
            >
              Resend verification email
            </button>
            <Link href="/login?role=member" className="btn-secondary text-sm inline-flex items-center">
              Back to sign in
            </Link>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {role === "member" && step === "form" && (
        <form onSubmit={onSubmitMember} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              placeholder="e.g. John Smith"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Password * <span className="opacity-60 normal-case font-normal">(min. 8 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 pr-10 text-[var(--color-text)]"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
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

          {agreed && (
            <p className="text-xs text-green-500 flex items-center gap-1.5">
              <span>✓</span> You have agreed to the Project Disclosure &amp; Terms of Engagement
            </p>
          )}
          {!agreed && (
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-xs text-[var(--color-gold)] hover:underline font-semibold"
            >
              Read &amp; agree to the Project Disclosure &amp; Terms of Engagement *
            </button>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full rounded-lg py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Creating…
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>
      )}

      {role === "admin" && step === "form" && (
        <form onSubmit={onSubmitAdmin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              placeholder="e.g. John Smith"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 pr-10 text-[var(--color-text)]"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
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
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Reason for access <span className="opacity-60 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] min-h-[72px] resize-none"
              rows={3}
            />
          </div>

          {agreed && (
            <p className="text-xs text-green-500 flex items-center gap-1.5">
              <span>✓</span> You have agreed to the Project Disclosure &amp; Terms of Engagement
            </p>
          )}
          {!agreed && (
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-xs text-[var(--color-gold)] hover:underline font-semibold"
            >
              Read &amp; agree to the Project Disclosure &amp; Terms of Engagement *
            </button>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full rounded-lg py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Submitting…
              </>
            ) : (
              "Submit request"
            )}
          </button>
        </form>
      )}

      {role === "admin" && step === "success" && (
        <div className="text-center space-y-5">
          <div
            className="mx-auto flex items-center justify-center rounded-full text-3xl"
            style={{
              width: 72,
              height: 72,
              background: "rgba(16,185,129,0.15)",
              border: "2px solid rgba(16,185,129,0.4)",
            }}
          >
            ✓
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-500">Request submitted</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
              Your account request is pending admin approval. You will be able to sign in under &quot;Admin&quot; once an
              administrator activates your account.
            </p>
          </div>
          <Link
            href="/login?role=admin"
            className="inline-block w-full text-center rounded-lg border border-[var(--color-border)] py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            Back to sign in
          </Link>
        </div>
      )}

      {step === "form" && (
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link
            href={role === "admin" ? "/login?role=admin" : "/login?role=member"}
            className="text-[var(--color-gold)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}

      <TermsOfEngagementModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        agreed={agreed}
        onAgreedChange={setAgreed}
      />
    </div>
  );
}
