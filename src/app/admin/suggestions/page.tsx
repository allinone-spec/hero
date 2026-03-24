"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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

export default function SuggestionsPage() {
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sSearch, setSSearch] = useState("");
  const [statusOnly, setStatusOnly] = useState<"all" | "new" | "reviewed" | "denied">("all");
  const [sSort, setSSort] = useState<"date-desc" | "date-asc" | "url" | "submitter">("date-desc");

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/hero-suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // Mark all suggestions as read by admin
    fetch("/api/hero-suggestions/mark-read", { method: "POST" }).catch(() => {});
  }, []);

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

  if (loading) return <AdminLoader />;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hero Suggestions</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Wikipedia URLs submitted by visitors
          </p>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">
          {filteredSuggestions.length}
          {filteredSuggestions.length !== suggestions.length
            ? ` / ${suggestions.length}`
            : ""}{" "}
          suggestion{filteredSuggestions.length !== 1 ? "s" : ""}
        </span>
      </div>

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
            <option value="reviewed">Accepted</option>
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

      {/* List */}
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
                      <Link
                        href={`/admin/heroes/new?wikiUrl=${encodeURIComponent(s.wikipediaUrl)}`}
                        onClick={() => handleUpdateStatus(s._id, "reviewed")}
                        className="btn-primary text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5"
                      >
                        {updatingId === s._id ? <LoadingSpinner size="xs" label="Accepting" /> : "Accept"}
                      </Link>
                    ) : (
                      <span className="btn-primary text-xs py-1.5 px-3 opacity-40 cursor-not-allowed">
                        Accept
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
      {confirmDialog}
    </div>
  );
}
