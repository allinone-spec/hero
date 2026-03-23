"use client";

import { useEffect, useState } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";

interface PagePerm {
  _id: string;
  path: string;
  label: string;
  section: "public" | "admin";
  requiredLevel: number;
  sortOrder: number;
  isSystem: boolean;
}

interface UserPerm {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissionLevel: number;
  active: boolean;
}

const LEVEL_LABELS: Record<number, string> = {
  0: "Public",
  1: "Level 1 (Admin)",
  2: "Level 2",
  3: "Level 3",
  4: "Level 4",
  5: "Level 5 (Subscriber)",
  6: "Level 6",
  7: "Level 7",
  8: "Level 8",
  9: "Level 9",
  10: "Level 10",
};

export default function PermissionsPage() {
  const [pages, setPages] = useState<PagePerm[]>([]);
  const [users, setUsers] = useState<UserPerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPageId, setSavingPageId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add page form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSection, setNewSection] = useState<"public" | "admin">("public");
  const [newLevel, setNewLevel] = useState(0);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/permissions");
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePageLevelChange = async (pageId: string, level: number) => {
    setSavingPageId(pageId);
    try {
      const res = await fetch(`/api/permissions/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredLevel: level }),
      });
      if (res.ok) {
        setPages((prev) => prev.map((p) => (p._id === pageId ? { ...p, requiredLevel: level } : p)));
      }
    } finally {
      setSavingPageId(null);
    }
  };

  const handleUserLevelChange = async (userId: string, level: number) => {
    setSavingUserId(userId);
    try {
      const res = await fetch(`/api/permissions/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionLevel: level }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, permissionLevel: level } : u)));
      }
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Delete this page permission entry?")) return;
    setDeletingId(pageId);
    try {
      const res = await fetch(`/api/permissions/pages/${pageId}`, { method: "DELETE" });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p._id !== pageId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPage = async () => {
    if (!newPath.trim() || !newLabel.trim()) {
      setAddError("Path and label are required");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath.trim(), label: newLabel.trim(), section: newSection, requiredLevel: newLevel }),
      });
      const data = await res.json();
      if (res.ok) {
        setPages((prev) => [...prev, data]);
        setNewPath("");
        setNewLabel("");
        setNewSection("public");
        setNewLevel(0);
        setShowAddForm(false);
      } else {
        setAddError(data.error || "Failed to add page");
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <AdminLoader />;

  const publicPages = pages.filter((p) => p.section === "public");
  const adminPages = pages.filter((p) => p.section === "admin");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Permission Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Configure page visibility and user permission levels. Lower level = more access (1 = admin, 5 = subscriber).
        </p>
      </div>

      {/* Page Permissions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Page Permissions</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-xs py-1.5 px-3">
            {showAddForm ? "Cancel" : "+ Add Page"}
          </button>
        </div>

        {/* Add Page Form */}
        {showAddForm && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Path</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/my-page"
                  className="admin-input text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="My Page"
                  className="admin-input text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value as "public" | "admin")}
                  className="admin-input text-sm"
                >
                  <option value="public">Public</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Required Level</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  className="admin-input text-sm"
                >
                  {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
            <button onClick={handleAddPage} disabled={adding} className="btn-primary text-xs py-1.5 px-4">
              {adding ? "Adding..." : "Add Page"}
            </button>
          </div>
        )}

        {/* Public Pages */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Public Pages</h3>
          <div className="space-y-1">
            {publicPages.map((page) => (
              <PageRow
                key={page._id}
                page={page}
                saving={savingPageId === page._id}
                deleting={deletingId === page._id}
                onLevelChange={handlePageLevelChange}
                onDelete={handleDeletePage}
              />
            ))}
          </div>
        </div>

        {/* Admin Pages */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Admin Pages</h3>
          <div className="space-y-1">
            {adminPages.map((page) => (
              <PageRow
                key={page._id}
                page={page}
                saving={savingPageId === page._id}
                deleting={deletingId === page._id}
                onLevelChange={handlePageLevelChange}
                onDelete={handleDeletePage}
              />
            ))}
          </div>
        </div>
      </div>

      {/* User Permissions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">User Permissions</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Change a user&apos;s permission level to control their access. Level 1 = full admin access.
          </p>
        </div>

        <div className="space-y-1">
          {users.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                    {user.role}
                  </span>
                  {!user.active && (
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={user.permissionLevel}
                  onChange={(e) => handleUserLevelChange(user._id, Number(e.target.value))}
                  disabled={savingUserId === user._id}
                  className="admin-input text-xs py-1.5 px-2 w-auto"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                    <option key={val} value={val}>
                      Level {val}{val === 1 ? " (Admin)" : val === 5 ? " (Subscriber)" : ""}
                    </option>
                  ))}
                </select>
                {savingUserId === user._id && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">No active users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PageRow({
  page,
  saving,
  deleting,
  onLevelChange,
  onDelete,
}: {
  page: PagePerm;
  saving: boolean;
  deleting: boolean;
  onLevelChange: (id: string, level: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{page.label}</span>
          {page.isSystem && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
              System
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">{page.path}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={page.requiredLevel}
          onChange={(e) => onLevelChange(page._id, Number(e.target.value))}
          disabled={saving}
          className="admin-input text-xs py-1.5 px-2 w-auto"
        >
          {Object.entries(LEVEL_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {saving && (
          <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        )}
        {!page.isSystem && (
          <button
            onClick={() => onDelete(page._id)}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
          >
            {deleting ? "..." : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
