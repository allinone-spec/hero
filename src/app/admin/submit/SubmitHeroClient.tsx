"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { AdminLoader } from "@/components/ui/AdminLoader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Suggestion {
  _id: string;
  wikipediaUrl: string;
  status: string;
  createdAt: string;
}

export default function SubmitHeroClient() {
  const searchParams = useSearchParams();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Coffee balance
  const [coffeeBalance, setCoffeeBalance] = useState(0);
  const [buyingCoffee, setBuyingCoffee] = useState(false);

  // Submit form state
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Show purchase result from Stripe redirect
  const coffeeParam = searchParams.get("coffee");

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/coffee/balance");
      if (res.ok) {
        const data = await res.json();
        setCoffeeBalance(data.balance);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/hero-suggestions?mine=true");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
    fetchBalance();
  }, [fetchSuggestions, fetchBalance]);

  const handleBuyCoffee = async () => {
    setBuyingCoffee(true);
    try {
      const res = await fetch("/api/coffee/purchase", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setSubmitError(data.error || "Failed to start purchase");
        setBuyingCoffee(false);
      }
    } catch {
      setSubmitError("Network error. Please try again.");
      setBuyingCoffee(false);
    }
  };

  const handleSubmitClick = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.includes("wikipedia.org/wiki/")) {
      setSubmitError("Please enter a valid Wikipedia URL (e.g. https://en.wikipedia.org/wiki/Audie_Murphy)");
      return;
    }
    setSubmitError("");
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    const trimmed = url.trim();

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    // Optimistic balance update
    setCoffeeBalance((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/hero-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wikipediaUrl: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Revert optimistic update
        setCoffeeBalance((prev) => prev + 1);

        if (data.error === "already_published") {
          setSubmitError(`This hero (${data.heroName || "unknown"}) has already been published!`);
        } else if (data.error === "no_coffee") {
          setSubmitError("You need coffee to submit. Buy some below!");
        } else {
          setSubmitError(data.error || "Failed to submit");
        }
        return;
      }

      // Use server balance if available
      if (typeof data.balance === "number") {
        setCoffeeBalance(data.balance);
      }

      setSubmitSuccess(true);
      setUrl("");
      fetchSuggestions();
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch {
      setCoffeeBalance((prev) => prev + 1);
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getHeroName = (wikiUrl: string) => {
    try {
      const parts = wikiUrl.split("/wiki/");
      if (parts[1]) return decodeURIComponent(parts[1].replace(/_/g, " "));
    } catch { /* ignore */ }
    return wikiUrl;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <AdminLoader label="Loading…" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-5xl">&#9733;</div>
        <h1 className="text-3xl sm:text-4xl font-bold">Submit a Hero</h1>
        <p className="text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
          Know a decorated military hero who deserves recognition?
          Add them to the leaderboard in three simple steps.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StepCard number={1} title="Find their Wikipedia page">
          Search Wikipedia for the hero&apos;s name. Any US military service member
          with a Wikipedia article can be submitted.
        </StepCard>
        <StepCard number={2} title="Paste the link below">
          Copy the Wikipedia URL and paste it into the box below.
          Our AI reads the page and extracts their full service record.
        </StepCard>
        <StepCard number={3} title="They get scored & ranked">
          The USM-25 scoring system calculates their score based on
          medals, valor, combat tours, and more. They appear on the leaderboard.
        </StepCard>
      </div>

      {/* Purchase result notification */}
      {coffeeParam === "purchased" && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
          Purchase successful! 2 coffee added to your balance.
        </div>
      )}
      {coffeeParam === "failed" && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          Payment was not completed. Please try again.
        </div>
      )}

      {/* Coffee balance + buy button */}
      <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#9749;</span>
          <div>
            <p className="text-sm font-semibold">
              {coffeeBalance} coffee{coffeeBalance !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Each submission uses 1 coffee
            </p>
          </div>
        </div>
        <button
          onClick={handleBuyCoffee}
          disabled={buyingCoffee}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
        >
          {buyingCoffee ? (
            <>
              <LoadingSpinner size="sm" />
              Redirecting…
            </>
          ) : (
            "Buy 2 Coffees \u2014 $5"
          )}
        </button>
      </div>

      {/* Submit form */}
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-gold)]/30 rounded-2xl p-6 sm:p-8 space-y-4">
        <label className="text-sm font-bold text-[var(--color-gold)] uppercase tracking-wider block">
          Wikipedia URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setSubmitError(""); }}
            placeholder="https://en.wikipedia.org/wiki/Audie_Murphy"
            className="admin-input text-base flex-1 py-3"
            onKeyDown={(e) => e.key === "Enter" && coffeeBalance > 0 && handleSubmitClick()}
          />
          <button
            onClick={handleSubmitClick}
            disabled={submitting || !url.trim() || coffeeBalance === 0}
            className="btn-primary text-base py-3 px-6 shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={coffeeBalance === 0 ? "You need coffee to submit" : ""}
          >
            {submitting ? (
              <>
                <LoadingSpinner size="md" />
                Submitting…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Submit
              </>
            )}
          </button>
        </div>

        {coffeeBalance === 0 && (
          <p className="text-sm text-yellow-400 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            You need coffee to submit. Buy some above!
          </p>
        )}
        {submitError && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {submitError}
          </p>
        )}
        {submitSuccess && (
          <p className="text-sm text-green-400 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Hero submitted! 1 coffee used. An admin will review and score them shortly.
          </p>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Use 1 Coffee?"
        message={`This will use 1 coffee to submit your suggestion. You have ${coffeeBalance} coffee${coffeeBalance !== 1 ? "s" : ""} remaining.`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />

      {/* My submissions */}
      {suggestions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Your Submissions</h2>
          <div className="space-y-2">
            {suggestions.map((s) => (
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
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Sub-components ------------------------------------------------ */

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 text-center space-y-2">
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold"
        style={{
          background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          color: "var(--color-badge-text)",
        }}
      >
        {number}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Pending" },
    reviewed: { bg: "bg-green-500/10", text: "text-green-400", label: "Accepted" },
    denied: { bg: "bg-red-500/10", text: "text-red-400", label: "Denied" },
  };
  const s = styles[status] ?? styles.new;
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${s.bg} ${s.text} shrink-0`}>
      {s.label}
    </span>
  );
}
