"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { AdminLoader } from "@/components/ui/AdminLoader";

type MarketplaceStats = {
  heroesPublished: number;
  heroesAvailableToAdopt: number;
  heroesActivelyAdopted: number;
  heroesAdoptionExpiring30d: number;
  ownersWithStripe: number;
  paidTransactionsAllTime: number;
  paidTransactionsLast30d: number;
  revenueCentsAllTime: number;
  revenueCentsLast30d: number;
  subscriptionStatusCounts: Record<string, number>;
  recentPaid: {
    createdAt: string;
    amountCents: number;
    currency: string;
    status: string;
    heroId: string;
    heroName: string;
    heroSlug: string;
    userId: string;
    userName: string;
    userEmail: string;
  }[];
};

function fmtMoney(cents: number, currency = "usd") {
  const sym = currency.toLowerCase() === "usd" ? "$" : `${currency.toUpperCase()} `;
  return `${sym}${(cents / 100).toFixed(2)}`;
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="hero-card p-4">
      <div className="text-2xl font-bold text-(--color-gold)">{value}</div>
      <div className="text-sm font-medium text-(--color-text)">{label}</div>
      {sub ? <div className="text-xs text-(--color-text-muted) mt-1">{sub}</div> : null}
    </div>
  );
}

export default function AdminMarketplacePage() {
  const { can, isSuperAdmin } = usePrivileges();
  const allowed = can("/admin/marketplace", "canView");
  const canSync = can("/admin/marketplace", "canEdit");

  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [yearlyConfigured, setYearlyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setError("");
    const r = await fetch("/api/admin/marketplace", { credentials: "include", cache: "no-store" });
    if (!r.ok) {
      setError(r.status === 403 ? "You don’t have access to Marketplace." : "Could not load marketplace stats.");
      setLoading(false);
      return;
    }
    const data = await r.json();
    setStats(data.stats as MarketplaceStats);
    setYearlyConfigured(Boolean(data.yearlyConfigured));
    setLoading(false);
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch("/api/admin/marketplace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 250 }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSyncResult(data.error || `Sync failed (${r.status})`);
        return;
      }
      setSyncResult(`Synced ${data.synced ?? 0} of ${data.processed ?? 0} owners.`);
      await load();
    } catch {
      setSyncResult("Network error");
    } finally {
      setSyncing(false);
    }
  }

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-(--color-text-muted)">
        You don’t have permission to view Marketplace ops.
      </div>
    );
  }

  if (loading || !stats) {
    return <AdminLoader label="Loading marketplace…" />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--color-text)">Marketplace & subscriptions</h1>
          <p className="text-sm text-(--color-text-muted) mt-1 max-w-xl leading-relaxed">
            Adoption inventory, recorded checkout revenue, and Owner Stripe linkage. Yearly renewals extend adoptions via
            webhooks; use sync after incidents or to reconcile subscription status in bulk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-2 px-3"
          >
            Stripe Dashboard ↗
          </a>
          <Link href="/admin/users" className="btn-secondary text-sm py-2 px-3">
            Owners (Users)
          </Link>
          <Link href="/admin/suggestions?tab=caretaker" className="btn-secondary text-sm py-2 px-3">
            Suggestions
          </Link>
        </div>
      </div>

      {!yearlyConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span className="font-semibold">Yearly subscriptions not configured.</span> Set{" "}
          <code className="text-xs bg-black/20 px-1 rounded">STRIPE_ADOPTION_YEARLY_PRICE_ID</code> for automatic renewals
          and richer subscription metrics in Stripe.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Published heroes" value={stats.heroesPublished} />
        <Stat label="Available to adopt" value={stats.heroesAvailableToAdopt} sub="No active slot" />
        <Stat label="Actively adopted" value={stats.heroesActivelyAdopted} />
        <Stat
          label="Expiring ≤ 30 days"
          value={stats.heroesAdoptionExpiring30d}
          sub="Active adoptions ending soon"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Owners with Stripe" value={stats.ownersWithStripe} />
        <Stat label="Paid checkouts (all time)" value={stats.paidTransactionsAllTime} />
        <Stat label="Paid checkouts (30d)" value={stats.paidTransactionsLast30d} />
        <Stat label="Revenue (30d)" value={fmtMoney(stats.revenueCentsLast30d)} sub={`All time ${fmtMoney(stats.revenueCentsAllTime)}`} />
      </div>

      {Object.keys(stats.subscriptionStatusCounts).length > 0 && (
        <div className="hero-card p-4">
          <h2 className="text-sm font-bold text-(--color-gold) mb-2">Owner subscription / status mix</h2>
          <p className="text-xs text-(--color-text-muted) mb-3">
            From public Owner accounts (<code className="text-[10px]">subscriptionStatus</code> and Stripe-driven updates).
          </p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(stats.subscriptionStatusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <li
                  key={k}
                  className="text-xs px-2 py-1 rounded-full border border-(--color-border) bg-(--color-bg)"
                >
                  <span className="font-medium text-(--color-text)">{k}</span>
                  <span className="text-(--color-text-muted)"> · {n}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {canSync && (
        <div className="hero-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-sm font-bold text-(--color-text)">Reconcile Stripe subscriptions</h2>
            <p className="text-xs text-(--color-text-muted) mt-0.5 max-w-lg">
              Lists subscriptions per Owner customer in Stripe and updates <code className="text-[10px]">subscriptionStatus</code>{" "}
              / <code className="text-[10px]">stripeSubscriptionId</code> in the database (up to 250 accounts per run).
            </p>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void runSync()}
            className="btn-primary text-sm py-2 px-4 shrink-0 disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync from Stripe"}
          </button>
        </div>
      )}
      {syncResult && (
        <p className={`text-sm ${syncResult.includes("fail") || syncResult.includes("error") ? "text-red-300" : "text-emerald-400"}`}>
          {syncResult}
        </p>
      )}

      <div>
        <h2 className="text-base font-bold mb-2">Recent paid adoptions</h2>
        <div className="overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-left text-(--color-text-muted) text-xs uppercase tracking-wide">
                <th className="p-3">When</th>
                <th className="p-3">Amount</th>
                <th className="p-3 min-w-[11rem]">Hero</th>
                <th className="p-3 min-w-[11rem]">Owner</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPaid.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-(--color-text-muted)">
                    No paid adoption transactions yet.
                  </td>
                </tr>
              ) : (
                stats.recentPaid.map((row, i) => {
                  const ownerLabel =
                    row.userName?.trim() || row.userEmail?.trim() || "Unknown owner";
                  const ownerUsersHref = `/admin/users?tab=owners&owner=${encodeURIComponent(row.userId)}`;
                  return (
                  <tr key={`${row.createdAt}-${i}`} className="border-b border-(--color-border)/60 last:border-0">
                    <td className="p-3 whitespace-nowrap text-(--color-text-muted)">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 font-medium">{fmtMoney(row.amountCents, row.currency)}</td>
                    <td className="p-3 min-w-0 max-w-[16rem]">
                      <Link
                        href={`/admin/heroes/${row.heroId}/edit`}
                        className="font-medium text-(--color-gold) hover:underline block truncate"
                        title={row.heroName}
                      >
                        {row.heroName}
                      </Link>
                      {row.heroSlug ? (
                        <Link
                          href={`/heroes/${row.heroSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block text-[11px] text-(--color-text-muted) hover:text-(--color-gold) hover:underline truncate max-w-full"
                        >
                          Public profile ↗
                        </Link>
                      ) : null}
                    </td>
                    <td className="p-3 min-w-0 max-w-[18rem]">
                      {isSuperAdmin && row.userId ? (
                        <Link
                          href={ownerUsersHref}
                          className="group block min-w-0 hover:underline"
                          title="Open in Owners (Users)"
                        >
                          <span className="font-medium text-(--color-text) group-hover:text-(--color-gold) truncate block">
                            {ownerLabel}
                          </span>
                          {row.userEmail && row.userName?.trim() ? (
                            <span className="text-[11px] text-(--color-text-muted) truncate block">
                              {row.userEmail}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        <div className="min-w-0">
                          <span className="font-medium text-(--color-text) truncate block">{ownerLabel}</span>
                          {row.userEmail ? (
                            <span className="text-[11px] text-(--color-text-muted) truncate block">{row.userEmail}</span>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
