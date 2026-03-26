"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** false = must verify email; true/undefined = can sign in (legacy treated as verified). */
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type VerifyFilter = "all" | "pending" | "verified";
type RoleFilter = "all" | "owner" | "member";
type AdoptionFilter = "all" | "has" | "none";
type StripeFilter = "all" | "linked" | "none";
type SortOption =
  | "name_asc"
  | "name_desc"
  | "email_asc"
  | "email_desc"
  | "joined_desc"
  | "joined_asc"
  | "adoptions_desc"
  | "adoptions_asc"
  | "role_owner_first"
  | "updated_desc";

function isPendingVerification(u: SiteMemberRow): boolean {
  return u.emailVerified === false;
}

function isVerifiedAccount(u: SiteMemberRow): boolean {
  return u.emailVerified !== false;
}

function atDayStart(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseDateInput(ymd: string): number | null {
  if (!ymd.trim()) return null;
  const [y, m, day] = ymd.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day).getTime();
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
        active
          ? "border-[var(--color-gold)]/70 bg-gradient-to-b from-[var(--color-gold)]/[0.18] to-[var(--color-gold)]/[0.08] text-[var(--color-gold)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.06)]"
          : "border-[var(--color-border)]/90 bg-[var(--color-bg)]/30 text-(--color-text-muted) hover:border-[var(--color-gold)]/35 hover:bg-[var(--color-gold)]/[0.06] hover:text-(--color-text)"
      }`}
    >
      {label}
    </button>
  );
}

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="h-px flex-1 max-w-[3.5rem] rounded-full opacity-90"
        style={{
          background: "linear-gradient(90deg, transparent, var(--color-border))",
        }}
      />
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-gold)] shrink-0">
        <span
          className="h-1 w-1 rounded-full bg-[var(--color-gold)] opacity-80 shadow-[0_0_6px_var(--color-gold)]"
          aria-hidden
        />
        {title}
      </span>
      <div
        className="h-px flex-1 rounded-full opacity-90"
        style={{
          background: "linear-gradient(90deg, var(--color-border), transparent)",
        }}
      />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)]/80 bg-gradient-to-br from-[var(--color-bg)]/70 via-[var(--color-surface)]/30 to-[var(--color-bg)]/50 p-3.5 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_2px_8px_-2px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-[var(--color-gold)]/20 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_16px_-4px_rgba(0,0,0,0.15)]">
      <div
        className="pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-[var(--color-gold)]/50 via-[var(--color-gold)]/25 to-[var(--color-gold)]/50 opacity-70"
        aria-hidden
      />
      <p className="pl-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) mb-2.5">
        {title}
      </p>
      <div className="pl-2.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
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
          <h2 className="text-lg font-bold">Owner</h2>
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
              <option value="user">Owner (standard)</option>
              <option value="owner">Hero owner (adopter)</option>
            </select>
            <p className="text-[10px] text-(--color-text-muted) mt-1">
              Hero owner can edit adopted-hero tributes; standard Owner is the default public account.
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

export default function SiteMembersAdminPanel({
  embedded,
  focusOwnerId,
}: {
  embedded?: boolean;
  /** When set (e.g. from `/admin/users?tab=owners&owner=…`), narrow search and scroll to that row. */
  focusOwnerId?: string | null;
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [rows, setRows] = useState<SiteMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<SiteMemberRow | null>(null);
  const appliedFocusOwner = useRef<string | null>(null);

  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [adoptionFilter, setAdoptionFilter] = useState<AdoptionFilter>("all");
  const [stripeFilter, setStripeFilter] = useState<StripeFilter>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortOption>("name_asc");

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

  useEffect(() => {
    appliedFocusOwner.current = null;
  }, [focusOwnerId]);

  useEffect(() => {
    if (!focusOwnerId?.trim() || loading || rows.length === 0) return;
    if (appliedFocusOwner.current === focusOwnerId) return;
    const u = rows.find((r) => r._id === focusOwnerId);
    if (!u) {
      appliedFocusOwner.current = focusOwnerId;
      return;
    }
    appliedFocusOwner.current = focusOwnerId;
    const q = (u.email || u.name || "").trim();
    if (q) setSearch(q);
  }, [focusOwnerId, loading, rows]);

  const subscriptionStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r.subscriptionStatus || "").trim();
      set.add(v || "(none)");
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const fromTs = dateFrom ? parseDateInput(dateFrom) : null;
  const toTs = dateTo ? parseDateInput(dateTo) : null;

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((u) => {
      if (verifyFilter === "pending" && !isPendingVerification(u)) return false;
      if (verifyFilter === "verified" && !isVerifiedAccount(u)) return false;
      if (roleFilter === "owner" && u.role !== "owner") return false;
      if (roleFilter === "member" && u.role !== "user") return false;
      if (adoptionFilter === "has" && u.adoptedHeroCount <= 0) return false;
      if (adoptionFilter === "none" && u.adoptedHeroCount > 0) return false;
      if (stripeFilter === "linked" && !u.stripeCustomerId) return false;
      if (stripeFilter === "none" && u.stripeCustomerId) return false;
      if (subscriptionFilter !== "all") {
        const v = (u.subscriptionStatus || "").trim() || "(none)";
        if (v !== subscriptionFilter) return false;
      }
      if (q) {
        const name = (u.name || "").toLowerCase();
        const mail = (u.email || "").toLowerCase();
        if (!name.includes(q) && !mail.includes(q)) return false;
      }
      if (fromTs !== null) {
        const t = atDayStart(u.createdAt);
        if (t === null || t < fromTs) return false;
      }
      if (toTs !== null) {
        const t = atDayStart(u.createdAt);
        if (t === null || t > toTs) return false;
      }
      return true;
    });

    const byName = (a: SiteMemberRow, b: SiteMemberRow) =>
      (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: "base" });
    const byEmail = (a: SiteMemberRow, b: SiteMemberRow) =>
      a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
    const joined = (a: SiteMemberRow, b: SiteMemberRow) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    };
    const adopt = (a: SiteMemberRow, b: SiteMemberRow) => a.adoptedHeroCount - b.adoptedHeroCount;

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name_desc":
          return byName(b, a);
        case "email_asc":
          return byEmail(a, b);
        case "email_desc":
          return byEmail(b, a);
        case "joined_desc":
          return joined(b, a);
        case "joined_asc":
          return joined(a, b);
        case "adoptions_desc":
          return adopt(b, a);
        case "adoptions_asc":
          return adopt(a, b);
        case "role_owner_first": {
          if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
          return byName(a, b);
        }
        case "updated_desc": {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        }
        case "name_asc":
        default:
          return byName(a, b);
      }
    });

    return list;
  }, [
    rows,
    verifyFilter,
    roleFilter,
    adoptionFilter,
    stripeFilter,
    subscriptionFilter,
    search,
    fromTs,
    toTs,
    sort,
  ]);

  const ownerRowVisible = useMemo(() => {
    if (!focusOwnerId) return false;
    return visibleRows.some((r) => r._id === focusOwnerId);
  }, [focusOwnerId, visibleRows]);

  useEffect(() => {
    if (!focusOwnerId || !ownerRowVisible || loading) return;
    const t = requestAnimationFrame(() => {
      const el = document.getElementById(`site-owner-${focusOwnerId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[var(--color-gold)]/45", "rounded-xl");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-[var(--color-gold)]/45", "rounded-xl");
      }, 2600);
    });
    return () => cancelAnimationFrame(t);
  }, [focusOwnerId, ownerRowVisible, loading]);

  const filtersActive =
    verifyFilter !== "all" ||
    roleFilter !== "all" ||
    adoptionFilter !== "all" ||
    stripeFilter !== "all" ||
    subscriptionFilter !== "all" ||
    search.trim().length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0 ||
    sort !== "name_asc";

  const clearFilters = () => {
    setVerifyFilter("all");
    setRoleFilter("all");
    setAdoptionFilter("all");
    setStripeFilter("all");
    setSubscriptionFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSort("name_asc");
  };

  const formatJoined = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

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
      flash("Owner updated.");
    } else {
      flash(data.error || "Update failed", true);
    }
  };

  const handleDelete = async (u: SiteMemberRow) => {
    const extra =
      u.adoptedHeroCount > 0 ? `${u.adoptedHeroCount} adopted hero link(s) will be cleared. ` : "";
    const ok = await confirm({
      title: "Delete Owner account",
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
      flash("Owner account deleted.");
    } else {
      flash(data.error || "Delete failed", true);
    }
  };

  if (loading) {
    return <AdminLoader label="Loading owners…" />;
  }

  const outerClass = embedded ? "space-y-4" : "animate-fade-in-up space-y-6";

  return (
    <div className={outerClass}>
      {!embedded && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/80 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)]/40 px-5 py-4 sm:px-6 sm:py-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--color-gold)]/[0.08] blur-2xl"
            aria-hidden
          />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-(--color-text)">Owners</h2>
          <p className="text-sm text-(--color-text-muted) mt-1.5 max-w-2xl leading-relaxed">
            Public Owner accounts (register / login). Hero owners can edit adopted-hero tributes. Super Admin only.
          </p>
        </div>
      )}
      {embedded && (
        <p className="text-sm text-(--color-text-muted) leading-relaxed rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)]/40 px-4 py-3">
          Owner accounts — edit role, name, or reset password. Deleting clears{" "}
          <code className="text-[11px] px-1.5 py-0.5 rounded-md bg-[var(--color-border)]/40 font-mono">ownerUserId</code> on any
          adopted heroes.
        </p>
      )}

      {success && (
        <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/[0.09] border border-emerald-500/25 px-4 py-3 rounded-xl shadow-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 dark:text-red-400 bg-red-500/[0.09] border border-red-500/25 px-4 py-3 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)]/80 bg-[var(--color-bg)]/50 px-3 py-1.5 text-sm text-(--color-text) shadow-sm">
            <span className="font-semibold tabular-nums">{rows.length}</span>
            <span className="text-(--color-text-muted) font-normal">{rows.length === 1 ? "account" : "accounts"}</span>
          </span>
          {filtersActive && rows.length > 0 ? (
            <span className="inline-flex items-center rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.08] px-3 py-1.5 text-xs font-semibold text-[var(--color-gold)]">
              Showing {visibleRows.length}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => load("refresh")}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start sm:self-auto rounded-xl border border-[var(--color-border)]/90 bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-(--color-text) shadow-sm transition-all hover:border-[var(--color-gold)]/35 hover:bg-[var(--color-gold)]/[0.06] disabled:opacity-50 disabled:pointer-events-none"
        >
          {refreshing ? (
            <>
              <LoadingSpinner size="xs" />
              Refreshing…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)]/90 bg-[var(--color-surface)] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_12px_40px_-12px_rgba(0,0,0,0.35)] overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
          <div className="relative overflow-hidden px-4 py-4 sm:px-6 sm:py-4 border-b border-[var(--color-border)]/80 bg-gradient-to-r from-[var(--color-gold)]/[0.1] via-[var(--color-gold)]/[0.05] to-transparent">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[var(--color-gold)]/[0.06] to-transparent"
              aria-hidden
            />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15 text-[var(--color-gold)] shadow-sm ring-1 ring-[var(--color-gold)]/20"
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 4h18v4H3V4zm0 6h18v4H3v-4zm0 6h18v4H3v-4z" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-(--color-text) tracking-tight">Owner filters</h3>
                  <p className="text-xs text-(--color-text-muted) mt-0.5 leading-relaxed max-w-lg">
                    Choose categories, search, date range, then pick how results are ordered.
                  </p>
                </div>
              </div>
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 text-xs font-semibold px-4 py-2 rounded-xl border border-[var(--color-border)]/90 bg-[var(--color-bg)]/50 text-(--color-text-muted) hover:border-[var(--color-gold)]/45 hover:text-[var(--color-gold)] hover:bg-[var(--color-gold)]/[0.08] transition-all shadow-sm"
                >
                  Reset all
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-8 bg-[var(--color-bg)]/[0.2]">
            <section aria-label="Filter categories">
              <SectionRule title="Categories" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                <FilterGroup title="Verification">
                  <FilterPill label="All" active={verifyFilter === "all"} onClick={() => setVerifyFilter("all")} />
                  <FilterPill label="Pending" active={verifyFilter === "pending"} onClick={() => setVerifyFilter("pending")} />
                  <FilterPill label="Verified" active={verifyFilter === "verified"} onClick={() => setVerifyFilter("verified")} />
                </FilterGroup>
                <FilterGroup title="Role">
                  <FilterPill label="All" active={roleFilter === "all"} onClick={() => setRoleFilter("all")} />
                  <FilterPill label="Hero owner" active={roleFilter === "owner"} onClick={() => setRoleFilter("owner")} />
                  <FilterPill label="Owner" active={roleFilter === "member"} onClick={() => setRoleFilter("member")} />
                </FilterGroup>
                <FilterGroup title="Adoptions">
                  <FilterPill label="All" active={adoptionFilter === "all"} onClick={() => setAdoptionFilter("all")} />
                  <FilterPill label="Has heroes" active={adoptionFilter === "has"} onClick={() => setAdoptionFilter("has")} />
                  <FilterPill label="None" active={adoptionFilter === "none"} onClick={() => setAdoptionFilter("none")} />
                </FilterGroup>
                <FilterGroup title="Stripe">
                  <FilterPill label="All" active={stripeFilter === "all"} onClick={() => setStripeFilter("all")} />
                  <FilterPill label="Linked" active={stripeFilter === "linked"} onClick={() => setStripeFilter("linked")} />
                  <FilterPill label="Not linked" active={stripeFilter === "none"} onClick={() => setStripeFilter("none")} />
                </FilterGroup>
                {subscriptionStatuses.length > 1 && (
                  <div className="relative overflow-hidden sm:col-span-2 xl:col-span-1 rounded-xl border border-[var(--color-border)]/80 bg-gradient-to-br from-[var(--color-bg)]/70 to-[var(--color-surface)]/30 p-3.5 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                    <div
                      className="pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-[var(--color-gold)]/50 via-[var(--color-gold)]/25 to-[var(--color-gold)]/50 opacity-70"
                      aria-hidden
                    />
                    <p className="pl-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) mb-2.5">
                      Subscription status
                    </p>
                    <div className="pl-2.5">
                      <select
                        value={subscriptionFilter}
                        onChange={(e) => setSubscriptionFilter(e.target.value)}
                        className="admin-input text-sm w-full py-2.5 rounded-xl"
                      >
                        {subscriptionStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s === "all" ? "All statuses" : s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section
              aria-label="Search, dates and sort"
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              <SectionRule title="Search · dates · sort" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
                <div className="lg:col-span-5">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) block mb-2">
                    Name or email
                  </label>
                  <div className="relative group">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted) pointer-events-none opacity-60 group-focus-within:opacity-90 group-focus-within:text-[var(--color-gold)] transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="admin-input text-sm w-full !pl-10 py-2.5 rounded-xl transition-shadow focus-visible:shadow-[0_0_0_3px_var(--color-gold)]/15"
                    />
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) block mb-2">
                    Joined date range
                  </label>
                  <div className="rounded-xl border border-[var(--color-border)]/80 bg-gradient-to-br from-[var(--color-bg)]/50 to-[var(--color-surface)]/20 px-3 py-3 sm:px-4 sm:py-3.5 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-(--color-text-muted) block mb-1">From</span>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="admin-input text-sm w-full py-2 rounded-lg"
                        />
                      </div>
                      <div
                        className="hidden sm:flex items-center justify-center pb-2 text-(--color-text-muted) text-xs font-medium shrink-0"
                        aria-hidden
                      >
                        →
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-(--color-text-muted) block mb-1">To</span>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="admin-input text-sm w-full py-2 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) block mb-2">
                    Sort by
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="admin-input text-sm w-full py-2.5 rounded-xl cursor-pointer transition-shadow focus-visible:shadow-[0_0_0_3px_var(--color-gold)]/15"
                  >
                    <option value="name_asc">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                    <option value="email_asc">Email A–Z</option>
                    <option value="email_desc">Email Z–A</option>
                    <option value="joined_desc">Joined · Newest first</option>
                    <option value="joined_asc">Joined · Oldest first</option>
                    <option value="updated_desc">Last updated · Newest first</option>
                    <option value="adoptions_desc">Adopted heroes · Most first</option>
                    <option value="adoptions_asc">Adopted heroes · Fewest first</option>
                    <option value="role_owner_first">Role · Hero owners first, then name</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="relative overflow-hidden text-center py-14 px-6 rounded-2xl border border-[var(--color-border)]/80 bg-gradient-to-b from-[var(--color-surface)]/80 to-[var(--color-bg)]/30">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/20"
              aria-hidden
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-(--color-text)">No owners yet</p>
            <p className="text-xs text-(--color-text-muted) mt-1.5 max-w-xs mx-auto leading-relaxed">
              Accounts will appear here after users register on the public site.
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="relative overflow-hidden text-center py-14 px-6 rounded-2xl border border-dashed border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.04]">
            <p className="text-sm font-semibold text-(--color-text)">No matches</p>
            <p className="text-xs text-(--color-text-muted) mt-1.5 max-w-sm mx-auto leading-relaxed">
              Try clearing filters or broadening your search — no accounts fit the current criteria.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-xs font-semibold text-[var(--color-gold)] hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          visibleRows.map((u, idx) => (
            <div
              key={u._id}
              id={`site-owner-${u._id}`}
              className="hero-card p-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                <AvatarFallback name={u.name || u.email} size={44} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{u.name?.trim() || u.email}</h3>
                  {isPendingVerification(u) && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium">
                      Pending verify
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      u.role === "owner"
                        ? "bg-[#d4a84322] text-[#d4a843] border-[#d4a84360]"
                        : "bg-white/5 text-(--color-text-muted) border-white/10"
                    }`}
                  >
                    {u.role === "owner" ? "Hero owner" : "Owner"}
                  </span>
                </div>
                <p className="text-xs text-(--color-text-muted) truncate mt-0.5">{u.email}</p>
                <p className="text-[10px] text-(--color-text-muted) mt-0.5">
                  Adopted heroes: {u.adoptedHeroCount}
                  {u.stripeCustomerId ? " · Stripe linked" : ""}
                  {(u.subscriptionStatus || "").trim()
                    ? ` · Sub: ${(u.subscriptionStatus || "").trim()}`
                    : ""}
                  {" · "}
                  Joined {formatJoined(u.createdAt)}
                  {u.updatedAt ? ` · Updated ${formatJoined(u.updatedAt)}` : ""}
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
