"use client";

import { useEffect, useState } from "react";

const CONTACT_EMAIL = "ablanchard@cogeco.ca";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill name/email from session
  useEffect(() => {
    if (open && !loaded) {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.email) setEmail(data.email);
          if (data?.name) setName(data.name);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded]);

  // Lock body scroll when open
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccess(false);
    setMessage("");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-gold)]">
              Contact Us
            </h2>
            <button
              onClick={handleClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Email link */}
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3">
              <span className="text-lg">&#9993;</span>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
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

            {/* Form */}
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
                rows={5}
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
                  <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </button>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green-400 text-center">Success!!!</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
