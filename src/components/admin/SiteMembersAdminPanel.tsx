"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export interface SiteMemberRow {
  _id: string;
  name: string;
  email: string;
  role: "user" | "owner";
  adoptedHeroCount: number;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

function SiteMemberEditModal({
  user,
  onSave,
  onClose,
  saving,
}: {
  user: SiteMemberRow;
  onSave: (v: { name: string; role: "user" | "owner"; password: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState<"user" | "owner">(user.role);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">Site member</h2>
          <button type="button" onClick={onClose} className="theme-toggle" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <AvatarFallback name={name || user.email} size={64} shape="rounded" />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">Email</label>
            <input type="email" value={user.email} disabled className="admin-input opacity-70 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              placeholder="Name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "user" | "owner")} className="admin-input">
              <option value="user">Member (user)</option>
              <option value="owner">Owner (adopter)</option>
            </select>
            <p className="text-[10px] text-(--color-text-muted) mt-1">
              Owner is used for adopted-hero editing; Member is a standard public account.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              New password (optional)
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input pr-10"
                placeholder="Leave blank to keep current"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-text)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {showPw ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button
            type="button"
            onClick={() => onSave({ name, role, password })}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SiteMembersAdminPanel({ embedded }: { embedded?: boolean }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [rows, setRows] = useState<SiteMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<SiteMemberRow | null>(null);

  const flash = useCallback((msg: string, isErr = false) => {
    if (isErr) setError(msg);
    else setSuccess(msg);
    setTimeout(() => (isErr ? setError("") : setSuccess("")), 4000);
  }, []);

  const load = useCallback(
    (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      fetch("/api/admin/site-members", { credentials: "include", cache: "no-store" })
        .then(async (r) => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error || `HTTP ${r.status}`);
          }
          return r.json();
        })
        .then((data: SiteMemberRow[]) => setRows(Array.isArray(data) ? data : []))
        .catch((e: Error) => flash(e.message || "Failed to load", true))
        .finally(() => {
          if (mode === "refresh") setRefreshing(false);
          else setLoading(false);
        });
    },
    [flash]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (form: { name: string; role: "user" | "owner"; password: string }) => {
    if (!editUser) return;
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name.trim(), role: form.role };
    if (form.password.trim()) body.password = form.password.trim();
    const res = await fetch(`/api/admin/site-members/${editUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setRows((prev) => prev.map((u) => (u._id === editUser._id ? { ...u, ...data } : u)));
      setEditUser(null);
      flash("Site member updated.");
    } else {
      flash(data.error || "Update failed", true);
    }
  };

  const handleDelete = async (u: SiteMemberRow) => {
    const extra =
      u.adoptedHeroCount > 0 ? `${u.adoptedHeroCount} adopted hero link(s) will be cleared. ` : "";
    const ok = await confirm({
      title: "Delete site member",
      message: `Delete ${u.email}? ${extra}This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(u._id);
    const res = await fetch(`/api/admin/site-members/${u._id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setDeleting(null);
    if (res.ok) {
      setRows((prev) => prev.filter((x) => x._id !== u._id));
      flash("Site member deleted.");
    } else {
      flash(data.error || "Delete failed", true);
    }
  };

  if (loading) {
    return <AdminLoader label="Loading site members…" />;
  }

  const outerClass = embedded ? "space-y-4" : "animate-fade-in-up space-y-6";

  return (
    <div className={outerClass}>
      {!embedded && (
        <div>
          <h2 className="text-xl font-bold">Site Members</h2>
          <p className="text-sm text-(--color-text-muted) mt-1">
            Public accounts (register / login). Owners can edit adopted hero tributes. Super admin only.
          </p>
        </div>
      )}
      {embedded && (
        <p className="text-sm text-(--color-text-muted)">
          Public accounts — edit role, name, or reset password. Deleting clears <code className="text-xs">ownerUserId</code> on any
          adopted heroes.
        </p>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">{success}</div>
      )}
      {error && <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-(--color-text-muted)">
          {rows.length} {rows.length === 1 ? "account" : "accounts"}
        </p>
        <button
          type="button"
          onClick={() => load("refresh")}
          disabled={refreshing}
          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <LoadingSpinner size="xs" />
              Refreshing…
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-[var(--color-border)] text-(--color-text-muted) text-sm">
            No site members yet.
          </div>
        ) : (
          rows.map((u, idx) => (
            <div
              key={u._id}
              className="hero-card p-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                <AvatarFallback name={u.name || u.email} size={44} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{u.name?.trim() || u.email}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      u.role === "owner"
                        ? "bg-[#d4a84322] text-[#d4a843] border-[#d4a84360]"
                        : "bg-white/5 text-(--color-text-muted) border-white/10"
                    }`}
                  >
                    {u.role === "owner" ? "Owner" : "Member"}
                  </span>
                </div>
                <p className="text-xs text-(--color-text-muted) truncate mt-0.5">{u.email}</p>
                <p className="text-[10px] text-(--color-text-muted) mt-0.5">
                  Adopted heroes: {u.adoptedHeroCount}
                  {u.stripeCustomerId ? " · Stripe linked" : ""}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button type="button" onClick={() => setEditUser(u)} className="btn-secondary text-xs py-1.5 px-3">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u)}
                  disabled={deleting === u._id}
                  className="btn-danger text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {deleting === u._id ? (
                    <LoadingSpinner size="xs" label="Deleting" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editUser && (
        <SiteMemberEditModal user={editUser} onSave={handleSave} onClose={() => setEditUser(null)} saving={saving} />
      )}
      {confirmDialog}
    </div>
  );
}
