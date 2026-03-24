"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Suggestion {
  _id: string;
  wikipediaUrl: string;
  status: string;
  createdAt: string;
}

export default function SuggestionsPage() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Submit form state
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/hero-suggestions?mine=true");
      if (res.status === 401) {
        setLoggedIn(false);
        return;
      }
      if (res.ok) {
        setLoggedIn(true);
        const data = await res.json();
        setSuggestions(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!trimmed.includes("wikipedia.org/")) {
      setSubmitError("Please enter a valid Wikipedia URL");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const res = await fetch("/api/hero-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wikipediaUrl: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit");
        return;
      }

      setSubmitSuccess(true);
      setUrl("");
      fetchSuggestions();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete suggestion",
      message: "Delete this suggestion?",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/hero-suggestions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s._id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Extract hero name from Wikipedia URL for display
  const getHeroName = (wikiUrl: string) => {
    try {
      const parts = wikiUrl.split("/wiki/");
      if (parts[1]) return decodeURIComponent(parts[1].replace(/_/g, " "));
    } catch { /* ignore */ }
    return wikiUrl;
  };

  const pending = suggestions.filter((s) => s.status === "new");
  const accepted = suggestions.filter((s) => s.status === "reviewed");
  const denied = suggestions.filter((s) => s.status === "denied");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 flex justify-center">
        <LoadingSpinner size="lg" className="text-[var(--color-gold)]" label="Loading" />
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <div className="text-4xl">&#9733;</div>
        <h1 className="text-2xl font-bold">Hero Suggestions</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Sign in to suggest heroes and track your submissions.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/login?role=admin" className="btn-primary text-sm py-2 px-5">
            Sign In
          </Link>
          <Link href="/register?role=admin" className="btn-secondary text-sm py-2 px-5">
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Suggest a Hero</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Submit a Wikipedia link for a hero you&apos;d like added. Admins will review your suggestions.
        </p>
      </div>

      {/* Submit form */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
        <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
          Wikipedia URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/Audie_Murphy"
            className="admin-input text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !url.trim()}
            className="btn-primary text-sm py-2 px-4 shrink-0 flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                Submitting…
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>
        {submitError && (
          <p className="text-xs text-red-400">{submitError}</p>
        )}
        {submitSuccess && (
          <p className="text-xs text-green-400">Suggestion submitted successfully!</p>
        )}
      </div>

      {/* Pending suggestions */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold">Pending</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            {pending.length} suggestion{pending.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-4">
            No pending suggestions. Submit a Wikipedia link above!
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={s.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--color-gold)] hover:underline truncate block"
                  >
                    {getHeroName(s.wikipediaUrl)}
                  </a>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s._id)}
                  disabled={deletingId === s._id}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 shrink-0 min-w-[3.5rem] inline-flex items-center justify-center"
                >
                  {deletingId === s._id ? <LoadingSpinner size="xs" className="text-red-400" label="Deleting" /> : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accepted suggestions */}
      {accepted.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold">Accepted</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              {accepted.length} suggestion{accepted.length !== 1 ? "s" : ""}
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <div className="space-y-2">
            {accepted.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={s.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--color-gold)] hover:underline truncate"
                    >
                      {getHeroName(s.wikipediaUrl)}
                    </a>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 shrink-0">
                      Accepted
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s._id)}
                  disabled={deletingId === s._id}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 shrink-0 min-w-[3.5rem] inline-flex items-center justify-center"
                >
                  {deletingId === s._id ? <LoadingSpinner size="xs" className="text-red-400" label="Deleting" /> : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Denied suggestions */}
      {denied.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold">Denied</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              {denied.length} suggestion{denied.length !== 1 ? "s" : ""}
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <div className="space-y-2">
            {denied.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={s.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--color-text-muted)] hover:underline truncate"
                    >
                      {getHeroName(s.wikipediaUrl)}
                    </a>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">
                      Denied
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s._id)}
                  disabled={deletingId === s._id}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 shrink-0 min-w-[3.5rem] inline-flex items-center justify-center"
                >
                  {deletingId === s._id ? <LoadingSpinner size="xs" className="text-red-400" label="Deleting" /> : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
