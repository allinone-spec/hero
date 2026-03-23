"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "form" | "success";

export default function RegisterPage() {
  const [step, setStep]       = useState<Step>("form");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote]       = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 700, color: "#1a1a2e",
            margin: "0 auto 16px",
            boxShadow: "0 4px 20px rgba(192,123,8,0.35)",
          }}>
            ★
          </div>
          <h1 className="text-2xl font-bold">Request Access</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Medals N Bongs · Admin Panel
          </p>
        </div>

        {step === "success" ? (
          /* ── Success state ─────────────────────────────────── */
          <div className="text-center space-y-5">
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)",
              border: "2px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto",
            }}>
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-500">Request Submitted!</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
                Your account request is pending admin approval.
                You'll be able to log in once an administrator approves your account.
              </p>
            </div>
            <Link
              href="/admin"
              className="btn-secondary w-full block text-center"
            >
              ← Back to Login
            </Link>
          </div>
        ) : (
          /* ── Registration form ─────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="admin-input"
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
                className="admin-input"
                placeholder="you@example.com"
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
                  className="admin-input pr-10"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showPw ? (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    ) : (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Reason for Access
                <span className="ml-1 opacity-60 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="admin-input min-h-[72px] resize-none"
                placeholder="Briefly describe your role or why you need access…"
                rows={3}
              />
            </div>

            {/* Terms status indicator */}
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
              <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading || !agreed}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting…
                </span>
              ) : "Submit Request"}
            </button>

            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Already have an account?{" "}
              <Link href="/admin" className="text-[var(--color-gold)] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>

      {/* ── Terms of Engagement Modal ──────────────────── */}
      {showTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTerms(false); }}
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-lg font-bold">Project Disclosure &amp; Terms of Engagement</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 py-4 text-sm text-[var(--color-text-muted)] leading-relaxed space-y-4">
              <div>
                <p className="font-semibold text-[var(--color-text)]">1. Mission Statement &amp; Funding</p>
                <p>The All Time Military Hero project is a private, non-commercial endeavor created solely &quot;out of the goodness of our hearts&quot; to honor the legacy of those who have demonstrated extraordinary valor across all branches of the U.S. Armed Forces (Army, Navy, Marine Corps, Air Force, and Coast Guard). This platform is 100% self-funded by a private individual. We do not receive government grants, taxpayer funding, or corporate sponsorship. We are not a 501(c)(3) nonprofit; we are simply citizens who believe these stories deserve a modern spotlight.</p>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">2. Not an Official Government Record</p>
                <p>This website is not affiliated with, endorsed by, or operated by the U.S. Department of Defense (DoD) or any specific branch of the military. The data presented here is aggregated from public historical archives, Wikipedia, and declassified citations. While we strive for &quot;military-grade&quot; accuracy, we are not the official repository of service records.</p>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">3. The Scoring Matrix Rationale</p>
                <p>The &quot;Heroism Score&quot; is a proprietary analytical tool (Matrix 2.0) developed for this project. It uses a weighted formula based on the historical rarity and official precedence of valor awards.</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>Purpose:</strong> The score is meant to provide a historical perspective on the level of gallantry recognized by the military.</li>
                  <li><strong>Respect for Service:</strong> A score is not a measurement of a human being&apos;s worth or the value of their sacrifice. Every service member&apos;s contribution is invaluable; this matrix is simply a way to categorize and rank public decorations for historical comparison.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">4. Stolen Valor &amp; Verification</p>
                <p>We hold the sanctity of military service in the highest regard.</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>Zero Tolerance:</strong> Any attempt to submit fraudulent data or &quot;Stolen Valor&quot; claims will result in a permanent ban from this platform.</li>
                  <li><strong>Verification:</strong> We rely on primary source documents (DD-214s, official citations, and National Archive records). If a profile is listed here, it is because there is a public or verified record of the award.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">5. Data Accuracy &amp; &quot;The Human Factor&quot;</p>
                <p>Military record-keeping—especially from WWII, Korea, and Vietnam—is famously complex and occasionally contradictory. We recognize that errors in citation text, medal counts, or rank may occur.</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>Our Commitment:</strong> If you see something wrong, we want to fix it. We are dedicated to the truth.</li>
                  <li><strong>The Correction Process:</strong> If you have documented proof of a discrepancy, please submit it via our contact portal. We review all credible feedback.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">6. Feedback Policy (Strictly Enforced)</p>
                <p>We welcome constructive corrections from historians, veterans, and family members who share our goal of honoring these heroes. However, because this is a privately funded volunteer project, we implement a Common Sense Clause:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>Zero Tolerance for Hostility:</strong> Pedantic, aggressive, or &quot;troll-like&quot; communications will be deleted without response.</li>
                  <li><strong>No Entitlement:</strong> Using this site is a privilege, not a right. We reserve the right to ban users or ignore feedback that is not presented with the respect that a tribute to valor demands.</li>
                  <li><strong>Legal Safe Harbor:</strong> By using this site, you acknowledge that all information is provided &quot;as-is.&quot; We are not liable for emotional distress, perceived inaccuracies, or historical debates.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-[var(--color-text)]">7. Intellectual Property</p>
                <p>The scoring matrix (Matrix 2.0) and the specific editorial presentation of these heroes are the intellectual property of this project.</p>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="font-semibold text-[var(--color-text)]">Final Word</p>
                <p>We are doing our best with the resources we have. If you have a correction, bring us the facts and we will work with you to ensure the hero&apos;s legacy is accurate.</p>
              </div>
            </div>

            {/* Footer with checkbox + button */}
            <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[var(--color-gold)] shrink-0"
                />
                <span className="text-xs text-[var(--color-text-muted)] leading-snug">
                  I have read and agree to the Project Disclosure &amp; Terms of Engagement
                </span>
              </label>
              <button
                onClick={() => setShowTerms(false)}
                className="btn-primary w-full"
                disabled={!agreed}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
