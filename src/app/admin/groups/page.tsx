"use client";

import { useState, useEffect, useMemo } from "react";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { AdminLoader } from "@/components/ui/AdminLoader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Group {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}

interface GroupModalProps {
  group?: Group | null;
  onClose: () => void;
  onSave: () => void;
}

function GroupModal({ group, onClose, onSave }: GroupModalProps) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/groups/${group._id}` : "/api/groups", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save group");
        return;
      }
      onSave();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Group" : "New Group"}</h2>
          <button onClick={onClose} disabled={loading} className="theme-toggle">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Group Name *</label>
            <input
              className="admin-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Editors"
              required
            />
            {!isEdit && name && (
              <p className="mt-1 text-xs opacity-50">Slug: <code>{slug}</code></p>
            )}
            {isEdit && (
              <p className="mt-1 text-xs opacity-50">Slug: <code>{group.slug}</code> (immutable)</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Description</label>
            <textarea
              className="admin-input w-full min-h-[80px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary inline-flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const { can } = usePrivileges();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
  }, [groups, search]);

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        loadGroups();
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-sm opacity-60 mt-1">Manage user groups and their access permissions</p>
        </div>
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!can("/admin/groups", "canCreate")}
          onClick={() => { setEditGroup(null); setShowModal(true); }}
        >
          + New Group
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="admin-input w-full max-w-sm"
          placeholder="Search groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <AdminLoader label="Loading groups…" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          {search ? "No groups match your search" : "No groups found"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((group, i) => (
            <div
              key={group._id}
              className="hero-card flex items-center justify-between gap-4 p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center text-[var(--color-gold)] font-bold text-sm flex-shrink-0">
                  {group.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{group.name}</span>
                    <code className="text-xs opacity-50 bg-white/5 px-1.5 py-0.5 rounded">
                      {group.slug}
                    </code>
                    {group.isSystem && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
                        SYSTEM
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm opacity-60 mt-0.5 truncate">{group.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm opacity-60 whitespace-nowrap">
                  {group.userCount} user{group.userCount !== 1 ? "s" : ""}
                </span>
                <button
                  className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!can("/admin/groups", "canEdit")}
                  onClick={() => { setEditGroup(group); setShowModal(true); }}
                >
                  Edit
                </button>
                {!group.isSystem && (
                  <button
                    className="btn-danger text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!can("/admin/groups", "canDelete")}
                    onClick={() => setDeleteId(group._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <GroupModal
          group={editGroup}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadGroups(); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !deleteLoading && setDeleteId(null)}
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[var(--color-surface)] shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Delete Group?</h3>
            <p className="text-sm opacity-70 mb-5">
              All users in this group will be moved to the Default Group. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancel
              </button>
              <button
                className="btn-danger inline-flex items-center justify-center gap-2"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
