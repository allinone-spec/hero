"use client";

import { useState, useEffect, useMemo } from "react";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Menu {
  _id: string;
  name: string;
  path: string;
  label: string;
  icon: string;
  section: string;
  sortOrder: number;
  createdAt: string;
}

const SECTIONS = ["Content", "System", "Reports", "Other"];

interface MenuModalProps {
  menu?: Menu | null;
  onClose: () => void;
  onSave: () => void;
}

function MenuModal({ menu, onClose, onSave }: MenuModalProps) {
  const isEdit = !!menu;
  const [label, setLabel] = useState(menu?.label || "");
  const [name, setName] = useState(menu?.name || "");
  const [path, setPath] = useState(menu?.path || "");
  const [icon, setIcon] = useState(menu?.icon || "");
  const [section, setSection] = useState(menu?.section || "Content");
  const [sortOrder, setSortOrder] = useState(menu?.sortOrder ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = isEdit
        ? { label, icon, section, sortOrder }
        : { name, path, label, icon, section, sortOrder };

      const res = await fetch(isEdit ? `/api/menus/${menu._id}` : "/api/menus", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save menu");
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
          <h2 className="text-lg font-bold">{isEdit ? "Edit Menu" : "New Menu"}</h2>
          <button onClick={onClose} disabled={loading} className="theme-toggle">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Machine Name *</label>
                <input
                  className="admin-input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. heroes"
                  required
                />
                <p className="mt-1 text-xs opacity-50">Unique identifier, cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Path *</label>
                <input
                  className="admin-input w-full"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. /admin/heroes"
                  required
                />
                <p className="mt-1 text-xs opacity-50">URL path, cannot be changed after creation</p>
              </div>
            </>
          )}
          {isEdit && (
            <div>
              <p className="text-sm opacity-50">
                Path: <code className="bg-white/5 px-1 rounded">{menu.path}</code> (immutable)
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Display Label *</label>
            <input
              className="admin-input w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Heroes"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Section *</label>
              <select
                className="admin-input w-full"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Sort Order</label>
              <input
                type="number"
                className="admin-input w-full"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Icon (emoji)</label>
            <input
              className="admin-input w-full"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🎖️"
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
                "Create Menu"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MenusPage() {
  const { can } = usePrivileges();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editMenu, setEditMenu] = useState<Menu | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadMenus() {
    setLoading(true);
    try {
      const res = await fetch("/api/menus");
      if (res.ok) setMenus(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMenus(); }, []);

  const sections = useMemo(() => {
    const s = new Set(menus.map((m) => m.section));
    return ["all", ...Array.from(s)];
  }, [menus]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return menus.filter((m) => {
      const matchSearch =
        m.label.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q);
      const matchSection = filterSection === "all" || m.section === filterSection;
      return matchSearch && matchSection;
    });
  }, [menus, search, filterSection]);

  const grouped = useMemo(() => {
    const map = new Map<string, Menu[]>();
    for (const m of filtered) {
      if (!map.has(m.section)) map.set(m.section, []);
      map.get(m.section)!.push(m);
    }
    return map;
  }, [filtered]);

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      if (res.ok) { setDeleteId(null); loadMenus(); }
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menus</h1>
          <p className="text-sm opacity-60 mt-1">
            Define admin navigation items and assign them to groups via Group Privileges
          </p>
        </div>
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!can("/admin/menus", "canCreate")}
          onClick={() => { setEditMenu(null); setShowModal(true); }}
        >
          + New Menu
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="admin-input flex-1 min-w-[200px]"
          placeholder="Search menus…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-input"
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Sections" : s}</option>
          ))}
        </select>
      </div>

      {/* Grouped list */}
      {loading ? (
        <div className="text-center py-16 opacity-50">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 opacity-50">No menus found</div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([section, items]) => (
            <div key={section}>
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
                {section}
              </h3>
              <div className="space-y-2">
                {items.map((menu, i) => (
                  <div
                    key={menu._id}
                    className="hero-card flex items-center justify-between gap-4 p-4 animate-fade-in-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {menu.icon && (
                        <span className="text-xl flex-shrink-0">{menu.icon}</span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{menu.label}</span>
                          <code className="text-xs opacity-50 bg-white/5 px-1.5 py-0.5 rounded">
                            {menu.path}
                          </code>
                        </div>
                        <p className="text-xs opacity-40 mt-0.5">name: {menu.name} · order: {menu.sortOrder}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!can("/admin/menus", "canEdit")}
                        onClick={() => { setEditMenu(menu); setShowModal(true); }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!can("/admin/menus", "canDelete")}
                        onClick={() => setDeleteId(menu._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MenuModal
          menu={editMenu}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadMenus(); }}
        />
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !deleteLoading && setDeleteId(null)}
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[var(--color-surface)] shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Delete Menu?</h3>
            <p className="text-sm opacity-70 mb-5">
              All group privileges for this menu will also be deleted. This cannot be undone.
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
