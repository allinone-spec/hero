"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const CONTACT_EMAIL = "ablanchard@cogeco.ca";

export default function ContactPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const opts: RequestInit = { cache: "no-store", credentials: "include" };
    Promise.all([
      fetch("/api/site/me", opts).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/me", opts).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([site, admin]) => {
        const siteEmail = site?.email != null ? String(site.email) : "";
        const adminEmail = admin?.email != null ? String(admin.email) : "";
        if (siteEmail || adminEmail) {
          setLoggedIn(true);
          if (siteEmail) {
            setEmail(siteEmail);
            const siteName = site?.name != null ? String(site.name).trim() : "";
            setName(siteName || siteEmail.split("@")[0] || "");
          } else {
            setEmail(adminEmail);
            if (admin?.name) setName(String(admin.name));
          }
        } else {
          setLoggedIn(false);
        }
      })
      .catch(() => setLoggedIn(false));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("All fields are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message.");
        return;
      }

      setMessage("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loggedIn === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex justify-center">
        <LoadingSpinner size="lg" className="text-[var(--color-gold)]" label="Loading" />
      </div>
    );
  }

  // Not signed in
  if (loggedIn === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-4xl">&#9993;</div>
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Sign in to send us a message or report an issue.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/login?role=admin" className="btn-primary text-sm py-2 px-5">
            Sign In
          </Link>
          <Link href="/register?role=admin" className="btn-secondary text-sm py-2 px-5">
            Sign Up
          </Link>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] pt-4">
          Or email us directly at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[var(--color-gold)] hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    );
  }

  // Signed in — show contact form
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Have a question, correction, or feedback? Send us a message below.
        </p>
      </div>

      {/* Email link */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-3">
        <span className="text-xl">&#9993;</span>
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            You can also reach us directly at
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm font-semibold text-[var(--color-gold)] hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      {/* Contact form */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="admin-input text-sm w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="admin-input text-sm w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            rows={6}
            maxLength={5000}
            className="admin-input text-sm w-full resize-y"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">
            {message.length}/5000
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
          className="btn-primary text-sm py-2.5 px-6 w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" />
              Sending…
            </>
          ) : (
            "Send Message"
          )}
        </button>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
