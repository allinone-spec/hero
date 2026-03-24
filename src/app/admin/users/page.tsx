"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import SiteMembersAdminPanel from "@/components/admin/SiteMembersAdminPanel";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Group {
  _id: string;
  name: string;
  slug: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "editor";
  group?: { _id: string; name: string; slug: string } | null;
  active: boolean;
  status?: "pending" | "active" | "suspended";
  note?: string;
  lastLogin?: string;
  createdAt: string;
}

/* ── Compact toggle ──────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex flex-col items-center gap-1 focus:outline-none group"
    >
      <div
        aria-hidden="true"
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? "bg-(--color-gold)" : "bg-(--color-border)"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className={`text-[10px] font-medium transition-colors duration-200 ${
        checked ? "text-(--color-gold)" : "text-(--color-text-muted)"
      }`}>
        {checked ? "Active" : "Inactive"}
      </span>
    </button>
  );
}

/* ── Group badge ─────────────────────────────────────────── */
function GroupBadge({ group }: { group?: { name: string; slug: string } | null }) {
  if (!group) return <span className="text-xs opacity-40">No group</span>;
  const isSuperAdmin = group.slug === "super-admin";
  const isDefault = group.slug === "default-group";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
        isSuperAdmin
          ? "bg-[#d4a84322] text-[#d4a843] border-[#d4a84360]"
          : isDefault
          ? "bg-white/5 text-(--color-text-muted) border-white/10"
          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
      }`}
    >
      {group.name}
    </span>
  );
}

/* ── User form modal ─────────────────────────────────────── */
function UserModal({
  title,
  initial,
  groups,
  onSave,
  onClose,
  saving,
  isEdit,
}: {
  title: string;
  initial: { name: string; email: string; groupId: string; password: string };
  groups: Group[];
  onSave: (v: typeof initial) => void;
  onClose: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="theme-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <AvatarFallback name={form.name || "User"} size={64} shape="rounded" />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="admin-input"
              placeholder="e.g. John Smith"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="admin-input"
              placeholder="user@example.com"
              required
              disabled={isEdit}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              Group
            </label>
            <select
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              className="admin-input"
            >
              <option value="">— Default Group —</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="admin-input pr-10"
                placeholder={isEdit ? "Leave blank to keep current" : "Min 6 characters"}
                required={!isEdit}
                minLength={isEdit ? undefined : 6}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-text)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {showPw ? (
                    <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  ) : (
                    <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={() => onSave(form)} className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Approve modal ───────────────────────────────────────── */
function ApproveModal({
  user,
  groups,
  onApprove,
  onClose,
  saving,
}: {
  user: AdminUser;
  groups: Group[];
  onApprove: (groupId: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const defaultGroup = groups.find((g) => g.slug === "default-group");
  const [groupId, setGroupId] = useState(defaultGroup?._id || "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">Approve Registration</h2>
          <button onClick={onClose} className="theme-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
              <AvatarFallback name={user.name} size={48} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-xs text-(--color-text-muted) truncate">{user.email}</p>
            </div>
          </div>

          {user.note && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3">
              <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1">
                Reason for Access
              </p>
              <p className="text-sm leading-relaxed">{user.note}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-1.5 block">
              Assign Group
            </label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="admin-input">
              {groups.map((g) => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={() => onApprove(groupId)}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Approving…
              </>
            ) : (
              "Approve & Activate"
            )}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Main page ───────────────────────────────────────────── */
type UsersMainTab = "staff" | "site";

export default function AdminUsersPage() {
  const { can, isSuperAdmin } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [mainTab, setMainTab] = useState<UsersMainTab>("staff");
  const [users, setUsers]               = useState<AdminUser[]>([]);
  const [pending, setPending]           = useState<AdminUser[]>([]);
  const [groups, setGroups]             = useState<Group[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [showAdd, setShowAdd]           = useState(false);
  const [editUser, setEditUser]         = useState<AdminUser | null>(null);
  const [approveUser, setApproveUser]   = useState<AdminUser | null>(null);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");

  const flash = (msg: string, isErr = false) => {
    isErr ? setError(msg) : setSuccess(msg);
    setTimeout(() => isErr ? setError("") : setSuccess(""), 3500);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin-users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.ok ? r.json() : []),
    ]).then(([usersData, me, groupsData]) => {
      const all: AdminUser[] = Array.isArray(usersData) ? usersData : [];
      setPending(all.filter((u) => u.status === "pending"));
      setUsers(all.filter((u) => u.status !== "pending"));
      setCurrentEmail(me.email || "");
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (form: { name: string; email: string; groupId: string; password: string }) => {
    setSaving(true);
    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, groupId: form.groupId || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setUsers((prev) => [...prev, data]);
      setShowAdd(false);
      flash("User created successfully.");
    } else {
      flash(data.error || "Failed to create user", true);
    }
  };

  const handleUpdate = async (form: { name: string; email: string; groupId: string; password: string }) => {
    if (!editUser) return;
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name, group: form.groupId || null };
    if (form.password) body.password = form.password;
    const res = await fetch(`/api/admin-users/${editUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u._id === editUser._id ? data : u)));
      setEditUser(null);
      flash("User updated.");
    } else {
      flash(data.error || "Failed to update", true);
    }
  };

  const handleApprove = async (groupId: string) => {
    if (!approveUser) return;
    setSaving(true);
    const res = await fetch(`/api/admin-users/${approveUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active", active: true, group: groupId || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setPending((prev) => prev.filter((u) => u._id !== approveUser._id));
      setUsers((prev) => [...prev, data]);
      setApproveUser(null);
      flash(`${approveUser.name} approved and activated.`);
    } else {
      flash(data.error || "Failed to approve", true);
    }
  };

  const handleReject = async (user: AdminUser) => {
    const ok = await confirm({
      title: "Reject registration",
      message: `Reject and delete the registration from ${user.name}?`,
      danger: true,
      confirmLabel: "Reject",
    });
    if (!ok) return;
    setDeleting(user._id);
    const res = await fetch(`/api/admin-users/${user._id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setPending((prev) => prev.filter((u) => u._id !== user._id));
      flash(`Registration from ${user.name} rejected.`);
    } else {
      flash("Failed to reject", true);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const res = await fetch(`/api/admin-users/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, active: !u.active } : u)));
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const ok = await confirm({
      title: "Delete user",
      message: `Delete ${user.name}? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(user._id);
    const res = await fetch(`/api/admin-users/${user._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(null);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      flash("User deleted.");
    } else {
      flash(data.error || "Failed to delete", true);
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

  if (loading) return <AdminLoader label="Loading users…" />;

  return (
    <div className="animate-fade-in-up space-y-8">
      {isSuperAdmin && (
        <div className="flex rounded-lg border border-[var(--color-border)] p-1 bg-[var(--color-bg)] gap-1 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setMainTab("staff")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === "staff"
                ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/35"
                : "text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            Staff (admin)
          </button>
          <button
            type="button"
            onClick={() => setMainTab("site")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === "site"
                ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/35"
                : "text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            Site Members
          </button>
        </div>
      )}

      {mainTab === "site" && isSuperAdmin ? (
        <SiteMembersAdminPanel />
      ) : null}

      {mainTab === "staff" || !isSuperAdmin ? (
        <>
      {/* Flash messages */}
      {success && (
        <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded-lg animate-fade-in">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg animate-fade-in">
          {error}
        </div>
      )}

      {/* ── Pending registrations ────────────────────────────── */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-bold">Pending Registrations</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {pending.length} awaiting
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((user, idx) => (
              <div
                key={user._id}
                className="hero-card p-4 flex items-center gap-4 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.04}s`, borderColor: "rgba(245,158,11,0.25)" }}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                  <AvatarFallback name={user.name} size={44} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{user.name}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-(--color-text-muted) truncate mt-0.5">{user.email}</p>
                  {user.note && (
                    <p className="text-xs text-(--color-text-muted) mt-0.5 line-clamp-1 italic">
                      &ldquo;{user.note}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] text-(--color-text-muted) mt-0.5">
                    Requested {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => setApproveUser(user)}
                    disabled={!can("/admin/users", "canEdit")}
                    className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user)}
                    disabled={deleting === user._id || !can("/admin/users", "canDelete")}
                    className="btn-danger text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting === user._id ? <LoadingSpinner size="xs" label="Rejecting" /> : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active / all users ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Admin Users</h1>
            <p className="text-sm text-(--color-text-muted) mt-0.5">
              {users.length} {users.length === 1 ? "user" : "users"} ·{" "}
              {users.filter((u) => u.active).length} active
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={!can("/admin/users", "canCreate")}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add User
          </button>
        </div>

        <div className="space-y-3">
          {users.map((user, idx) => {
            const isSelf = user.email === currentEmail;
            return (
              <div
                key={user._id}
                className={`hero-card p-4 flex items-center gap-4 animate-fade-in-up ${!user.active ? "opacity-50" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                  <AvatarFallback name={user.name} size={44} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{user.name}</h3>
                    {isSelf && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-(--color-gold)/10 text-(--color-gold) border border-[var(--color-gold)]/30 font-medium">
                        You
                      </span>
                    )}
                    <GroupBadge group={user.group} />
                  </div>
                  <p className="text-xs text-(--color-text-muted) truncate mt-0.5">{user.email}</p>
                  <p className="text-[10px] text-(--color-text-muted) mt-0.5">
                    Last login: {formatDate(user.lastLogin)} · Joined {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <Toggle
                    checked={user.active}
                    onChange={can("/admin/users", "canEdit") ? () => handleToggleActive(user) : () => {}}
                  />
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => setEditUser(user)}
                    disabled={!can("/admin/users", "canEdit")}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={isSelf || deleting === user._id || !can("/admin/users", "canDelete")}
                    title={isSelf ? "Cannot delete your own account" : "Delete user"}
                    className="btn-danger text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting === user._id ? <LoadingSpinner size="xs" label="Deleting" /> : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <UserModal
          title="Add Admin User"
          initial={{ name: "", email: "", groupId: groups.find((g) => g.slug === "default-group")?._id || "", password: "" }}
          groups={groups}
          onSave={handleCreate}
          onClose={() => setShowAdd(false)}
          saving={saving}
          isEdit={false}
        />
      )}
      {editUser && (
        <UserModal
          title={`Edit — ${editUser.name}`}
          initial={{ name: editUser.name, email: editUser.email, groupId: editUser.group?._id || "", password: "" }}
          groups={groups}
          onSave={handleUpdate}
          onClose={() => setEditUser(null)}
          saving={saving}
          isEdit
        />
      )}
      {approveUser && (
        <ApproveModal
          user={approveUser}
          groups={groups}
          onApprove={handleApprove}
          onClose={() => setApproveUser(null)}
          saving={saving}
        />
      )}
        </>
      ) : null}
      {confirmDialog}
    </div>
  );
}
