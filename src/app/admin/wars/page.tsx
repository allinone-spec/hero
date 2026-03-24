"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { useAlert, useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePrivileges } from "@/contexts/PrivilegeContext";

/* ── Types ────────────────────────────────────────────────── */

interface War {
  _id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  theater: string;
  description: string;
  active: boolean;
}

const emptyForm = {
  name: "",
  startYear: 1776,
  endYear: null as number | null,
  theater: "",
  description: "",
  active: true,
};

/* ── Main Page ────────────────────────────────────────────── */

export default function AdminWarsPage() {
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { alertWith, dialog: alertDialog } = useAlert();
  const [wars, setWars]           = useState<War[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [showForm, setShowForm]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]         = useState("");
  const [warSearch, setWarSearch] = useState("");
  const [theaterFilter, setTheaterFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortWars, setSortWars] = useState<"start-desc" | "start-asc" | "name" | "theater" | "end-desc">("start-desc");

  /* ── Fetch wars ──────────────────────────────────────────── */

  const fetchWars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wars");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWars(data);
    } catch {
      setWars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWars(); }, [fetchWars]);

  const theatersInUse = useMemo(() => {
    const s = new Set<string>();
    wars.forEach((w) => {
      const t = (w.theater || "").trim();
      if (t) s.add(t);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [wars]);

  const filteredWars = useMemo(() => {
    let r = wars;
    if (warSearch.trim()) {
      const q = warSearch.toLowerCase();
      r = r.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.theater || "").toLowerCase().includes(q) ||
          (w.description || "").toLowerCase().includes(q) ||
          String(w.startYear).includes(q)
      );
    }
    if (theaterFilter !== "all") {
      r = r.filter((w) => (w.theater || "").trim() === theaterFilter);
    }
    if (activeFilter === "active") r = r.filter((w) => w.active);
    if (activeFilter === "inactive") r = r.filter((w) => !w.active);
    return [...r].sort((a, b) => {
      switch (sortWars) {
        case "start-asc":
          return a.startYear - b.startYear;
        case "name":
          return a.name.localeCompare(b.name);
        case "theater":
          return (a.theater || "").localeCompare(b.theater || "");
        case "end-desc": {
          const ae = a.endYear ?? 9999;
          const be = b.endYear ?? 9999;
          return be - ae;
        }
        default:
          return b.startYear - a.startYear;
      }
    });
  }, [wars, warSearch, theaterFilter, activeFilter, sortWars]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  /* ── Save (create / update) ──────────────────────────────── */

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editId ? `/api/wars/${editId}` : "/api/wars";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      fetchWars();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      message: `Delete "${name}"? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await fetch(`/api/wars/${id}`, { method: "DELETE" });
      fetchWars();
    } catch { /* ignore */ }
  };

  /* ── Edit ────────────────────────────────────────────────── */

  const startEdit = (war: War) => {
    setEditId(war._id);
    setForm({
      name: war.name,
      startYear: war.startYear,
      endYear: war.endYear,
      theater: war.theater,
      description: war.description,
      active: war.active,
    });
    setShowForm(true);
    setError("");
  };

  /* ── AI-powered war list import ──────────────────────────── */

  const handleAIImport = async () => {
    const ok = await confirm({
      message: "Fetch a war list from AI? This will NOT overwrite existing wars.",
      confirmLabel: "Fetch",
    });
    if (!ok) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/get-wars", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "AI request failed");
      }
      const data = await res.json();
      if (!Array.isArray(data.wars)) throw new Error("Invalid AI response");

      // Import each war (skip duplicates via server-side unique constraint)
      let imported = 0;
      for (const w of data.wars) {
        try {
          const r = await fetch("/api/wars", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: w.name,
              startYear: w.startYear,
              endYear: w.endYear,
              theater: w.theater || "",
              description: w.description || "",
              active: true,
            }),
          });
          if (r.ok) imported++;
        } catch { /* skip duplicates */ }
      }

      fetchWars();
      await alertWith({
        title: "Import complete",
        message: `Imported ${imported} new war(s). Cost: $${data.cost?.toFixed(6) || "0"}`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI import failed");
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <>
      {confirmDialog}
      {alertDialog}
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Wars & Conflicts</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Manage the list of wars used for hero profiles and scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAIImport}
            disabled={aiLoading || !can("/admin/wars", "canCreate")}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Working…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L12 12l-2.83-3.17A4 4 0 0 1 12 2z" />
                  <path d="M12 12l6 6" /><path d="M12 12l-6 6" />
                </svg>
                AI Import
              </>
            )}
          </button>
          <button
            onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); setError(""); }}
            disabled={!can("/admin/wars", "canCreate")}
            className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add War
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && wars.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={warSearch}
            onChange={(e) => setWarSearch(e.target.value)}
            placeholder="Search name, theater, year, description…"
            className="admin-input text-sm lg:col-span-2"
          />
          <select
            value={theaterFilter}
            onChange={(e) => setTheaterFilter(e.target.value)}
            className="admin-input text-sm"
          >
            <option value="all">All theaters</option>
            {theatersInUse.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
            className="admin-input text-sm"
          >
            <option value="all">Active + inactive</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select
            value={sortWars}
            onChange={(e) => setSortWars(e.target.value as typeof sortWars)}
            className="admin-input text-sm"
          >
            <option value="start-desc">Sort: Start year (newest)</option>
            <option value="start-asc">Sort: Start year (oldest)</option>
            <option value="end-desc">Sort: End year</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="theater">Sort: Theater A–Z</option>
          </select>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-fade-in p-6 space-y-4">
            <h3 className="text-lg font-bold">{editId ? "Edit War" : "Add War"}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="admin-input"
                  placeholder="e.g. World War II"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Start Year *</label>
                  <input
                    type="number"
                    value={form.startYear}
                    onChange={(e) => setForm({ ...form, startYear: parseInt(e.target.value) || 0 })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">End Year</label>
                  <input
                    type="number"
                    value={form.endYear ?? ""}
                    onChange={(e) => setForm({ ...form, endYear: e.target.value ? parseInt(e.target.value) : null })}
                    className="admin-input"
                    placeholder="Leave blank if ongoing"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Theater</label>
                <input
                  type="text"
                  value={form.theater}
                  onChange={(e) => setForm({ ...form, theater: e.target.value })}
                  className="admin-input"
                  placeholder="e.g. European, Pacific, Middle East"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="admin-input min-h-[80px]"
                  placeholder="Brief description of the conflict..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded accent-[var(--color-gold)]"
                />
                <span className="text-sm">Active (visible in hero forms)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2 px-4">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm py-2 px-4 inline-flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving…
                  </>
                ) : editId ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Wars list */}
      {loading ? (
        <AdminLoader label="Loading wars..." />
      ) : wars.length === 0 ? (
        <div className="hero-card p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-4 opacity-40">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <p className="text-sm text-[var(--color-text-muted)] font-medium">No wars added yet.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">
            Click &ldquo;+ Add War&rdquo; or use &ldquo;AI Import&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWars.length === 0 && wars.length > 0 && (
            <p className="text-center text-sm text-[var(--color-text-muted)] py-8">
              No wars match your filters.
            </p>
          )}
          {filteredWars.map((war, idx) => (
            <div
              key={war._id}
              className="hero-card p-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              {/* Year badge */}
              <div className="shrink-0 w-20 text-center">
                <span className="text-sm font-bold text-[var(--color-gold)]">
                  {war.startYear}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {war.endYear ? ` – ${war.endYear}` : " – present"}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{war.name}</h3>
                  {!war.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                {war.theater && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{war.theater}</p>
                )}
                {war.description && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 opacity-70">{war.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => startEdit(war)}
                  disabled={!can("/admin/wars", "canEdit")}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(war._id, war.name)}
                  disabled={!can("/admin/wars", "canDelete")}
                  className="text-xs py-1.5 px-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && wars.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Showing {filteredWars.length} of {wars.length} war{wars.length !== 1 ? "s" : ""}
          {" "}&middot; {wars.filter((w) => w.active).length} active total
        </p>
      )}
    </div>
    </>
  );
}
