"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import Pagination from "@/components/ui/Pagination";

/* ── Types ────────────────────────────────────────────────── */

interface ActivityLog {
  _id: string;
  action: string;
  category: "hero" | "medal" | "user" | "scoring" | "auth" | "system";
  description: string;
  userEmail: string;
  userName: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface LogsResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  totalPages: number;
}

/* ── Constants ────────────────────────────────────────────── */

const ITEMS_PER_PAGE = 20;

const CATEGORIES = [
  { value: "all",     label: "All" },
  { value: "hero",    label: "Hero" },
  { value: "medal",   label: "Medal" },
  { value: "user",    label: "User" },
  { value: "auth",    label: "Auth" },
  { value: "scoring", label: "Scoring" },
  { value: "system",  label: "System" },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hero:    { bg: "#d4a84322", text: "#d4a843", border: "#d4a84360" },
  medal:   { bg: "#8b5cf622", text: "#8b5cf6", border: "#8b5cf660" },
  user:    { bg: "#3b82f622", text: "#3b82f6", border: "#3b82f660" },
  auth:    { bg: "#10b98122", text: "#10b981", border: "#10b98160" },
  scoring: { bg: "#f59e0b22", text: "#f59e0b", border: "#f59e0b60" },
  system:  { bg: "#6b728022", text: "#9ca3af", border: "#9ca3af60" },
};

/* ── Action icons (inline SVG) ────────────────────────────── */

function ActionIcon({ action }: { action: string }) {
  const a = action.toLowerCase();

  // Create / add
  if (a.includes("create") || a.includes("add") || a.includes("new")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }

  // Update / edit
  if (a.includes("update") || a.includes("edit") || a.includes("modify") || a.includes("change")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }

  // Delete / remove
  if (a.includes("delete") || a.includes("remove") || a.includes("reject")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    );
  }

  // Login / auth
  if (a.includes("login") || a.includes("signin") || a.includes("authenticate")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    );
  }

  // Logout
  if (a.includes("logout") || a.includes("signout")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }

  // Approve / activate
  if (a.includes("approve") || a.includes("activate") || a.includes("enable")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  // Recalculate / compute
  if (a.includes("recalc") || a.includes("compute") || a.includes("score")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  // Default / generic
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/* ── Relative timestamp ───────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDay / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/* ── Main page ────────────────────────────────────────────── */

export default function AdminLogsPage() {
  const [logs, setLogs]             = useState<ActivityLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [category, setCategory]     = useState("all");
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch logs ─────────────────────────────────────────── */

  const fetchLogs = useCallback(async (p: number, cat: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(ITEMS_PER_PAGE),
      });
      if (cat && cat !== "all") params.set("category", cat);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data: LogsResponse = await res.json();

      setLogs(data.logs);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load + refetch on filter changes */
  useEffect(() => {
    fetchLogs(page, category, search);
  }, [page, category, search, fetchLogs]);

  /* ── Search debounce ────────────────────────────────────── */

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  };

  /* ── Category change ────────────────────────────────────── */

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Track all actions performed across the admin panel.
        </p>
      </div>

      {/* Filters bar */}
      <div className="space-y-4">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[var(--color-gold)] text-[var(--color-badge-text)] shadow-sm"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative max-w-md">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search log descriptions..."
            className="admin-input pl-10"
          />
        </div>
      </div>

      {/* Results summary */}
      {!loading && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {total} log{total !== 1 ? "s" : ""} found
          {category !== "all" && (
            <> in <span className="font-semibold capitalize">{category}</span></>
          )}
          {search && (
            <> matching &ldquo;<span className="font-semibold">{search}</span>&rdquo;</>
          )}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <AdminLoader label="Loading activity logs..." />
      ) : logs.length === 0 ? (
        <div className="hero-card p-12 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="mx-auto mb-4 opacity-40"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm text-[var(--color-text-muted)] font-medium">
            No activity logs found.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">
            {search || category !== "all"
              ? "Try adjusting your filters or search query."
              : "Logs will appear here as actions are performed."}
          </p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="space-y-3">
            {logs.map((log, idx) => {
              const catColor = CATEGORY_COLORS[log.category] || CATEGORY_COLORS.system;
              return (
                <div
                  key={log._id}
                  className="hero-card p-4 flex items-start gap-4 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  {/* Icon column */}
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <ActionIcon action={log.action} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Description */}
                    <p className="text-sm font-medium leading-snug">
                      {log.description}
                    </p>

                    {/* Target name */}
                    {log.targetName && (
                      <p className="text-xs text-[var(--color-gold)] font-medium mt-0.5 truncate">
                        {log.targetName}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Category badge */}
                      <span
                        className="score-badge text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize"
                        style={{
                          backgroundColor: catColor.bg,
                          color: catColor.text,
                          borderColor: catColor.border,
                        }}
                      >
                        {log.category}
                      </span>

                      {/* User email */}
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 truncate">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="shrink-0"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {log.userEmail}
                      </span>

                      {/* Timestamp */}
                      <span
                        className="text-xs text-[var(--color-text-muted)] flex items-center gap-1"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="shrink-0"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {relativeTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            showItemCount
          />
        </>
      )}
    </div>
  );
}
