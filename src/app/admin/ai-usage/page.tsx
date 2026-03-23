"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import Pagination from "@/components/ui/Pagination";

/* ── Types ────────────────────────────────────────────────── */

interface AILog {
  _id: string;
  userEmail: string;
  action: string;
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  inputPreview: string;
  createdAt: string;
}

interface UsageStats {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
}

interface PerUser {
  _id: string;
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

interface PerAction {
  _id: string;
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

/* ── Constants ────────────────────────────────────────────── */

const ITEMS_PER_PAGE = 30;
const BUDGET_LIMIT = 100; // $100 budget

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  generate_description: { label: "Description", color: "#3b82f6" },
  analyze_hero:         { label: "Analyze Hero", color: "#d4a843" },
  get_medals:           { label: "Medals",      color: "#8b5cf6" },
  get_wars:             { label: "Wars",        color: "#10b981" },
};

/* ── Helpers ──────────────────────────────────────────────── */

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── Main Page ────────────────────────────────────────────── */

export default function AdminAIUsagePage() {
  const [logs, setLogs]             = useState<AILog[]>([]);
  const [stats, setStats]           = useState<UsageStats>({ totalCost: 0, totalTokens: 0, totalCalls: 0 });
  const [perUser, setPerUser]       = useState<PerUser[]>([]);
  const [perAction, setPerAction]   = useState<PerAction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  /* ── Fetch ───────────────────────────────────────────────── */

  const fetchUsage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/usage?page=${p}&limit=${ITEMS_PER_PAGE}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs);
      setStats(data.stats);
      setPerUser(data.perUser);
      setPerAction(data.perAction);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsage(page); }, [page, fetchUsage]);

  /* ── Budget percentage ───────────────────────────────────── */

  const budgetPct = Math.min((stats.totalCost / BUDGET_LIMIT) * 100, 100);
  const budgetColor = budgetPct > 80 ? "#ef4444" : budgetPct > 50 ? "#f59e0b" : "#10b981";

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Usage & Costs</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Monitor Gemini API usage, costs, and rate limits.
        </p>
      </div>

      {loading ? (
        <AdminLoader label="Loading usage data..." />
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Budget */}
            <div className="hero-card p-4">
              <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Budget Used</p>
              <p className="text-xl font-bold" style={{ color: budgetColor }}>
                {formatCost(stats.totalCost)}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${budgetPct}%`, backgroundColor: budgetColor }}
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                of ${BUDGET_LIMIT} limit ({budgetPct.toFixed(1)}%)
              </p>
            </div>

            {/* Total calls */}
            <div className="hero-card p-4">
              <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Total Calls</p>
              <p className="text-xl font-bold text-[var(--color-gold)]">{stats.totalCalls}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">API requests made</p>
            </div>

            {/* Total tokens */}
            <div className="hero-card p-4">
              <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Total Tokens</p>
              <p className="text-xl font-bold">{formatTokens(stats.totalTokens)}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">input + output</p>
            </div>

            {/* Avg cost */}
            <div className="hero-card p-4">
              <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Avg Cost / Call</p>
              <p className="text-xl font-bold">
                {stats.totalCalls > 0 ? formatCost(stats.totalCost / stats.totalCalls) : "$0"}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">per API request</p>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Cost per user */}
            <div className="hero-card p-4">
              <h3 className="text-sm font-bold mb-3">Cost per User</h3>
              {perUser.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {perUser.map((u) => (
                    <div key={u._id} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[60%] text-[var(--color-text-muted)]">{u._id}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--color-text-muted)]">{u.callCount} calls</span>
                        <span className="font-semibold text-[var(--color-gold)]">{formatCost(u.totalCost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost per action */}
            <div className="hero-card p-4">
              <h3 className="text-sm font-bold mb-3">Cost per Action</h3>
              {perAction.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {perAction.map((a) => {
                    const info = ACTION_LABELS[a._id] || { label: a._id, color: "#9ca3af" };
                    return (
                      <div key={a._id} className="flex items-center justify-between text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${info.color}22`,
                            color: info.color,
                            borderColor: `${info.color}60`,
                          }}
                        >
                          {info.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--color-text-muted)]">{a.callCount} calls</span>
                          <span className="text-[var(--color-text-muted)]">{formatTokens(a.totalTokens)} tokens</span>
                          <span className="font-semibold text-[var(--color-gold)]">{formatCost(a.totalCost)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent logs */}
          <div>
            <h3 className="text-sm font-bold mb-3">Recent API Calls</h3>
            {logs.length === 0 ? (
              <div className="hero-card p-8 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-3 opacity-40">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L12 12l-2.83-3.17A4 4 0 0 1 12 2z" />
                  <path d="M12 12l6 6" /><path d="M12 12l-6 6" />
                </svg>
                <p className="text-sm text-[var(--color-text-muted)]">No AI calls recorded yet.</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">
                  Usage will appear here when you use AI features.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log, idx) => {
                    const info = ACTION_LABELS[log.action] || { label: log.action, color: "#9ca3af" };
                    return (
                      <div
                        key={log._id}
                        className="hero-card p-3 flex items-center gap-3 animate-fade-in-up"
                        style={{ animationDelay: `${idx * 0.02}s` }}
                      >
                        {/* Action badge */}
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${info.color}22`,
                            color: info.color,
                            borderColor: `${info.color}60`,
                          }}
                        >
                          {info.label}
                        </span>

                        {/* Preview */}
                        <span className="flex-1 text-xs text-[var(--color-text-muted)] truncate">
                          {log.inputPreview || "—"}
                        </span>

                        {/* Tokens */}
                        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                          {formatTokens(log.totalTokens)}
                        </span>

                        {/* Cost */}
                        <span className="shrink-0 text-xs font-semibold text-[var(--color-gold)] min-w-[60px] text-right">
                          {formatCost(log.estimatedCost)}
                        </span>

                        {/* User */}
                        <span className="hidden sm:block shrink-0 text-[10px] text-[var(--color-text-muted)] max-w-[120px] truncate">
                          {log.userEmail}
                        </span>

                        {/* Time */}
                        <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] min-w-[50px] text-right">
                          {relativeTime(log.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={total}
                    itemsPerPage={ITEMS_PER_PAGE}
                    showItemCount
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
