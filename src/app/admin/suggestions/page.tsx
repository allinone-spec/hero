"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminLoader } from "@/components/ui/AdminLoader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface Suggestion {
  _id: string;
  wikipediaUrl: string;
  submittedBy: string;
  status: string;
  createdAt: string;
}

interface QueueItem {
  id: string;
  batchId: string | null;
  heroName: string;
  status: string;
  sourceType: string;
  sourceUrl: string;
  error: string;
  createdHeroId: string | null;
  importResult: {
    name?: string;
    rank?: string;
    branch?: string;
    countryCode?: string;
    metadataTags?: string[];
    aiMedals?: unknown[];
  } | null;
  unmatchedMedals: Array<{ rawName?: string; count?: number }>;
}

const QUEUE_FILTERS = ["needs_review", "processing", "queued", "approved", "failed", "dismissed", "all"] as const;

export default function SuggestionsPage() {
  const params = useSearchParams();
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<"suggestions" | "caretaker">(
    params.get("tab") === "caretaker" ? "caretaker" : "suggestions"
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [queueWorkingId, setQueueWorkingId] = useState<string | null>(null);
  const [queueDeletingId, setQueueDeletingId] = useState<string | null>(null);
  const [sSearch, setSSearch] = useState("");
  const [statusOnly, setStatusOnly] = useState<"all" | "new" | "reviewed" | "denied">("all");
  const [sSort, setSSort] = useState<"date-desc" | "date-asc" | "url" | "submitter">("date-desc");
  const [queueStatus, setQueueStatus] = useState<(typeof QUEUE_FILTERS)[number]>("needs_review");
  const [queueBatchId, setQueueBatchId] = useState(params.get("batchId") || "");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueCounts, setQueueCounts] = useState<{ counts: Record<string, number>; all: number }>({
    counts: {},
    all: 0,
  });
  const [error, setError] = useState("");

  const fetchSuggestions = async () => {
    const res = await fetch("/api/hero-suggestions");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch suggestions");
    setSuggestions(Array.isArray(data) ? data : []);
  };

  const fetchQueue = async () => {
    const qs = new URLSearchParams();
    qs.set("status", queueStatus);
    if (queueBatchId.trim()) qs.set("batchId", queueBatchId.trim());
    const res = await fetch(`/api/admin/caretaker-queue?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load queue");
    setQueueItems(Array.isArray(data) ? data : []);
  };

  const fetchQueueCounts = async () => {
    const qs = new URLSearchParams();
    if (queueBatchId.trim()) qs.set("batchId", queueBatchId.trim());
    const res = await fetch(`/api/admin/caretaker-queue/counts?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) return;
    setQueueCounts({
      counts: (data.counts as Record<string, number>) || {},
      all: typeof data.all === "number" ? data.all : 0,
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        setError("");
        await Promise.all([fetchSuggestions(), fetchQueue(), fetchQueueCounts()]);
        fetch("/api/hero-suggestions/mark-read", { method: "POST" }).catch(() => {});
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load inbox");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setActiveTab(params.get("tab") === "caretaker" ? "caretaker" : "suggestions");
    setQueueBatchId(params.get("batchId") || "");
  }, [params]);

  useEffect(() => {
    if (loading) return;
    void fetchQueue().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    });
    void fetchQueueCounts().catch(() => undefined);
  }, [queueStatus, queueBatchId]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setInterval(() => {
      void fetchSuggestions().catch(() => undefined);
      void fetchQueue().catch(() => undefined);
      void fetchQueueCounts().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loading, queueStatus, queueBatchId]);

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

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/hero-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status } : s))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQueueSuggestion = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/hero-suggestions/${id}/queue`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to queue suggestion");
      setSuggestions((prev) =>
        prev.map((s) => (s._id === id ? { ...s, status: "reviewed" } : s))
      );
      await Promise.all([fetchQueue(), fetchQueueCounts()]);
      setActiveTab("caretaker");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to queue suggestion");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveQueue = async (id: string) => {
    setQueueWorkingId(id);
    try {
      const res = await fetch(`/api/admin/caretaker-queue/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      await Promise.all([fetchQueue(), fetchQueueCounts()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setQueueWorkingId(null);
    }
  };

  const handleDismissQueue = async (id: string) => {
    const ok = await confirm({
      title: "Dismiss caretaker item",
      message: "Dismiss this caretaker queue item?",
      danger: true,
      confirmLabel: "Dismiss",
    });
    if (!ok) return;
    setQueueWorkingId(id);
    try {
      const res = await fetch(`/api/admin/caretaker-queue/${id}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dismiss failed");
      await Promise.all([fetchQueue(), fetchQueueCounts()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Dismiss failed");
    } finally {
      setQueueWorkingId(null);
    }
  };

  const handleDeleteApprovedQueue = async (id: string) => {
    const ok = await confirm({
      title: "Delete approved queue entry",
      message:
        "Remove this row from the caretaker queue? The draft hero is not deleted — delete it from Heroes if you no longer need it.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setQueueDeletingId(id);
    try {
      const res = await fetch(`/api/admin/caretaker-queue/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await Promise.all([fetchQueue(), fetchQueueCounts()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setQueueDeletingId(null);
    }
  };

  const filteredSuggestions = useMemo(() => {
    let r = suggestions;
    if (sSearch.trim()) {
      const q = sSearch.toLowerCase();
      r = r.filter(
        (s) =>
          s.wikipediaUrl.toLowerCase().includes(q) ||
          s.submittedBy.toLowerCase().includes(q)
      );
    }
    if (statusOnly !== "all") {
      r = r.filter((s) => s.status === statusOnly);
    }
    return [...r].sort((a, b) => {
      switch (sSort) {
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "url":
          return a.wikipediaUrl.localeCompare(b.wikipediaUrl);
        case "submitter":
          return a.submittedBy.localeCompare(b.submittedBy);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [suggestions, sSearch, statusOnly, sSort]);

  const filteredQueueItems = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return queueItems;
    return queueItems.filter((item) => {
      const name = (item.importResult?.name || item.heroName || "").toLowerCase();
      const url = (item.sourceUrl || "").toLowerCase();
      const tags = Array.isArray(item.importResult?.metadataTags)
        ? item.importResult?.metadataTags.join(" ").toLowerCase()
        : "";
      return name.includes(q) || url.includes(q) || tags.includes(q);
    });
  }, [queueItems, queueSearch]);

  if (loading) return <AdminLoader />;

  const statusBadge = (status: string) => {
    if (status === "reviewed") {
      return (
        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
          Accepted
        </span>
      );
    }
    if (status === "denied") {
      return (
        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
          Denied
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
        New
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hero Intake</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Public suggestions and caretaker review in one place.
          </p>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">
          {activeTab === "suggestions"
            ? `${filteredSuggestions.length}${filteredSuggestions.length !== suggestions.length ? ` / ${suggestions.length}` : ""} suggestion${filteredSuggestions.length !== 1 ? "s" : ""}`
            : `${filteredQueueItems.length}${filteredQueueItems.length !== queueItems.length ? ` / ${queueItems.length}` : ""} caretaker item${filteredQueueItems.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("suggestions")}
          className={`rounded-full px-3 py-1.5 text-sm border ${activeTab === "suggestions" ? "border-[var(--color-gold)] text-[var(--color-gold)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
        >
          Suggestions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("caretaker")}
          className={`rounded-full px-3 py-1.5 text-sm border ${activeTab === "caretaker" ? "border-[var(--color-gold)] text-[var(--color-gold)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
        >
          Caretaker Queue
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {activeTab === "suggestions" ? (
        <>
          {suggestions.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                value={sSearch}
                onChange={(e) => setSSearch(e.target.value)}
                placeholder="Search URL or submitter…"
                className="admin-input text-sm lg:col-span-2"
              />
              <select
                value={statusOnly}
                onChange={(e) => setStatusOnly(e.target.value as typeof statusOnly)}
                className="admin-input text-sm"
              >
                <option value="all">All statuses</option>
                <option value="new">New only</option>
                <option value="reviewed">Queued / accepted</option>
                <option value="denied">Denied</option>
              </select>
              <select
                value={sSort}
                onChange={(e) => setSSort(e.target.value as typeof sSort)}
                className="admin-input text-sm"
              >
                <option value="date-desc">Sort: Newest first</option>
                <option value="date-asc">Sort: Oldest first</option>
                <option value="url">Sort: URL A–Z</option>
                <option value="submitter">Sort: Submitter A–Z</option>
              </select>
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)]">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">No suggestions yet.</p>
              <p className="text-xs mt-1">Visitors can submit hero suggestions from the Suggestions page.</p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
              No suggestions match your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSuggestions.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={s.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[var(--color-gold)] hover:underline break-all"
                      >
                        {s.wikipediaUrl}
                      </a>
                      {statusBadge(s.status)}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      by <span className="font-medium text-[var(--color-text)]">{s.submittedBy}</span>
                      {" · "}
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "new" && (
                      <>
                        {can("/admin/suggestions", "canEdit") ? (
                          <button
                            type="button"
                            onClick={() => void handleQueueSuggestion(s._id)}
                            className="btn-primary text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5"
                            disabled={updatingId === s._id}
                          >
                            {updatingId === s._id ? <LoadingSpinner size="xs" label="Queueing" /> : "Queue"}
                          </button>
                        ) : (
                          <span className="btn-primary text-xs py-1.5 px-3 opacity-40 cursor-not-allowed">
                            Queue
                          </span>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(s._id, "denied")}
                          disabled={updatingId === s._id || !can("/admin/suggestions", "canEdit")}
                          className="btn-secondary text-xs py-1.5 px-3 min-w-[4rem] inline-flex items-center justify-center gap-1.5 text-yellow-400 hover:text-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {updatingId === s._id ? <LoadingSpinner size="xs" label="Denying" /> : "Deny"}
                        </button>
                      </>
                    )}
                    {s.status === "reviewed" && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("caretaker")}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        View queue
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s._id)}
                      disabled={deletingId === s._id || !can("/admin/suggestions", "canDelete")}
                      className="btn-secondary text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === s._id ? <LoadingSpinner size="xs" label="Deleting" /> : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUEUE_FILTERS.map((filter) => {
                const n =
                  filter === "all" ? queueCounts.all : (queueCounts.counts[filter] ?? 0);
                const label = filter.toUpperCase();
                const active = queueStatus === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQueueStatus(filter)}
                    aria-label={n > 0 ? `${label}, ${n} items` : label}
                    aria-pressed={active}
                    className={`relative rounded-full border px-3 py-1.5 pr-3.5 text-sm font-semibold tracking-wide transition-colors ${
                      active
                        ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {label}
                    {n > 0 ? (
                      <span
                        className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
                        aria-hidden
                      >
                        {n > 99 ? "99+" : n}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <input
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search hero, URL, or tags…"
                className="admin-input text-sm lg:col-span-2"
              />
              <input
                value={queueBatchId}
                onChange={(e) => setQueueBatchId(e.target.value)}
                placeholder="Optional batch id filter"
                className="admin-input text-sm"
              />
            </div>
          </div>

          {queueItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] p-8 text-sm text-[var(--color-text-muted)]">
              No caretaker items for this filter.
            </div>
          ) : filteredQueueItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
              No caretaker items match your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueueItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--color-border)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.importResult?.name || item.heroName || "Unnamed hero"}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {item.importResult?.rank || "Unknown rank"} · {item.importResult?.branch || "Unknown branch"} · {item.importResult?.countryCode || "US"}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-1">{item.sourceUrl || "No source URL"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.status}</p>
                      {item.createdHeroId && (
                        <Link href={`/admin/heroes/${item.createdHeroId}/edit`} className="text-sm text-[var(--color-gold)] hover:underline">
                          Open draft
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 text-sm">
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <p className="font-medium mb-2">AI medals</p>
                      <p className="text-[var(--color-text-muted)]">
                        {Array.isArray(item.importResult?.aiMedals) ? item.importResult?.aiMedals.length : 0} matched medal entries
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <p className="font-medium mb-2">Metadata tags</p>
                      <p className="text-[var(--color-text-muted)]">
                        {Array.isArray(item.importResult?.metadataTags) && item.importResult?.metadataTags.length > 0
                          ? item.importResult?.metadataTags.join(", ")
                          : "None detected"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <p className="font-medium mb-2">Unmatched medals</p>
                      <p className="text-[var(--color-text-muted)]">
                        {item.unmatchedMedals.length > 0
                          ? item.unmatchedMedals.map((m) => `${m.rawName || "Unknown"}${m.count && m.count > 1 ? ` x${m.count}` : ""}`).join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>

                  {item.error && <p className="mt-3 text-sm text-red-300">{item.error}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        queueWorkingId === item.id ||
                        queueDeletingId === item.id ||
                        item.status !== "needs_review" ||
                        !can("/admin/heroes", "canCreate")
                      }
                      onClick={() => void handleApproveQueue(item.id)}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-badge-text)] disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))" }}
                    >
                      {queueWorkingId === item.id ? "Working..." : "Approve to draft"}
                    </button>
                    <button
                      type="button"
                      disabled={
                        queueWorkingId === item.id ||
                        queueDeletingId === item.id ||
                        item.status === "approved" ||
                        item.status === "dismissed" ||
                        !can("/admin/heroes", "canEdit")
                      }
                      onClick={() => void handleDismissQueue(item.id)}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    {item.status === "approved" ? (
                      <button
                        type="button"
                        disabled={
                          queueWorkingId === item.id ||
                          queueDeletingId === item.id ||
                          !can("/admin/heroes", "canDelete")
                        }
                        onClick={() => void handleDeleteApprovedQueue(item.id)}
                        className="btn-secondary text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {queueDeletingId === item.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <LoadingSpinner size="xs" label="Deleting" />
                            Deleting…
                          </span>
                        ) : (
                          "Delete from queue"
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {confirmDialog}
    </div>
  );
}
