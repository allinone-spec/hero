"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Group {
  _id: string;
  name: string;
  slug: string;
  isSystem: boolean;
}

interface Menu {
  _id: string;
  name: string;
  path: string;
  label: string;
  section: string;
  sortOrder: number;
}

interface Privilege {
  _id: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface MatrixRow {
  menu: Menu;
  privilege: Privilege | null;
}

type PrivFlag = "canView" | "canCreate" | "canEdit" | "canDelete";

const FLAGS: { key: PrivFlag; label: string }[] = [
  { key: "canView",   label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit",   label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

export default function GroupPrivilegesPage() {
  const router = useRouter();
  const { can, refreshSession } = usePrivileges();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setGroups(data);
        // Pre-select the first non-super-admin group
        const first = data.find((g: Group) => g.slug !== "super-admin");
        if (first) setSelectedGroupId(String(first._id));
      })
      .finally(() => setLoadingGroups(false));
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingMatrix(true);
    fetch(`/api/group-privileges?groupId=${selectedGroupId}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setMatrix)
      .finally(() => setLoadingMatrix(false));
  }, [selectedGroupId]);

  const grouped = useMemo(() => {
    const map = new Map<string, MatrixRow[]>();
    for (const row of matrix) {
      const s = row.menu.section;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(row);
    }
    return map;
  }, [matrix]);

  const selectedGroupIdStr = selectedGroupId ? String(selectedGroupId) : "";
  const selectedGroup = selectedGroupIdStr
    ? groups.find((g) => String(g._id) === selectedGroupIdStr)
    : undefined;
  const isSuperAdminGroup = selectedGroup?.slug === "super-admin";

  const resyncAfterSuperAdminSave = useCallback(async () => {
    if (!isSuperAdminGroup || !selectedGroupIdStr) return;
    refreshSession();
    router.refresh();
    try {
      const r = await fetch(
        `/api/group-privileges?groupId=${encodeURIComponent(selectedGroupIdStr)}`,
        { cache: "no-store" }
      );
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) setMatrix(data);
      }
    } catch {
      /* ignore */
    }
  }, [isSuperAdminGroup, selectedGroupIdStr, refreshSession, router]);

  const handleToggle = useCallback(
    async (row: MatrixRow, flag: PrivFlag) => {
      const newValue = !(row.privilege?.[flag] ?? false);
      setSavingRow(row.menu._id);

      try {
        if (row.privilege) {
          const res = await fetch(`/api/group-privileges/${row.privilege._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [flag]: newValue }),
          });
          if (res.ok) {
            const updated = await res.json();
            setMatrix((prev) =>
              prev.map((r) => r.menu._id === row.menu._id ? { ...r, privilege: updated } : r)
            );
            await resyncAfterSuperAdminSave();
          }
        } else {
          const body: Record<string, unknown> = {
            groupId: selectedGroupId,
            menuId: row.menu._id,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          };
          body[flag] = newValue;
          const res = await fetch("/api/group-privileges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const created = await res.json();
            setMatrix((prev) =>
              prev.map((r) => r.menu._id === row.menu._id ? { ...r, privilege: created } : r)
            );
            await resyncAfterSuperAdminSave();
          }
        }
      } finally {
        setSavingRow(null);
      }
    },
    [selectedGroupId, router, resyncAfterSuperAdminSave]
  );

  const handleGrantAll = useCallback(
    async (row: MatrixRow) => {
      setSavingRow(row.menu._id);
      const allTrue = { canView: true, canCreate: true, canEdit: true, canDelete: true };
      try {
        if (row.privilege) {
          const res = await fetch(`/api/group-privileges/${row.privilege._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(allTrue),
          });
          if (res.ok) {
            const updated = await res.json();
            setMatrix((prev) =>
              prev.map((r) => r.menu._id === row.menu._id ? { ...r, privilege: updated } : r)
            );
            await resyncAfterSuperAdminSave();
          }
        } else {
          const res = await fetch("/api/group-privileges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: selectedGroupId, menuId: row.menu._id, ...allTrue }),
          });
          if (res.ok) {
            const created = await res.json();
            setMatrix((prev) =>
              prev.map((r) => r.menu._id === row.menu._id ? { ...r, privilege: created } : r)
            );
            await resyncAfterSuperAdminSave();
          }
        }
      } finally {
        setSavingRow(null);
      }
    },
    [selectedGroupId, router, resyncAfterSuperAdminSave]
  );

  const handleRevokeAll = useCallback(
    async (row: MatrixRow) => {
      if (!row.privilege) return;
      setSavingRow(row.menu._id);
      const allFalse = { canView: false, canCreate: false, canEdit: false, canDelete: false };
      try {
        const res = await fetch(`/api/group-privileges/${row.privilege._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(allFalse),
        });
        if (res.ok) {
          const updated = await res.json();
          setMatrix((prev) =>
            prev.map((r) => r.menu._id === row.menu._id ? { ...r, privilege: updated } : r)
          );
          await resyncAfterSuperAdminSave();
        }
      } finally {
        setSavingRow(null);
      }
    },
    [selectedGroupId, router, resyncAfterSuperAdminSave]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Group Privileges</h1>
        <p className="text-sm opacity-60 mt-1">
          Assign menu access permissions to groups. Changes are saved automatically.
        </p>
      </div>

      {/* Group Selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium opacity-70 whitespace-nowrap">Select Group:</label>
        {loadingGroups ? (
          <div className="admin-input w-48 opacity-50">Loading…</div>
        ) : (
          <select
            className="admin-input w-64"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">— Select a group —</option>
            {groups.map((g) => (
              <option key={String(g._id)} value={String(g._id)}>
                {g.name}{g.isSystem ? " (System)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Super Admin Note */}
      {isSuperAdminGroup && (
        <div className="rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 px-6 py-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-bold text-[var(--color-gold)]">Super Admin</p>
              <p className="text-sm opacity-70 mt-0.5">
                Manage which menus are accessible. Super Admins also have implicit full access in code.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Matrix */}
      {!selectedGroupId ? (
        <div className="text-center py-16 opacity-50">Select a group to manage its privileges</div>
      ) : loadingMatrix ? (
        <div className="text-center py-16 opacity-50">Loading permissions…</div>
      ) : matrix.length === 0 ? (
        <div className="text-center py-16 opacity-50">No menus available</div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([section, rows]) => (
            <div key={section}>
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
                {section}
              </h3>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* Table Header */}
                <div className="grid bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide opacity-60"
                  style={{ gridTemplateColumns: "1fr repeat(4, 80px) 120px" }}
                >
                  <span>Menu</span>
                  {FLAGS.map((f) => (
                    <span key={f.key} className="text-center">{f.label}</span>
                  ))}
                  <span className="text-center">Actions</span>
                </div>

                {/* Table Rows */}
                {rows.map((row, i) => {
                  const isSaving = savingRow === row.menu._id;
                  return (
                    <div
                      key={row.menu._id}
                      className={`grid items-center px-4 py-3 border-t border-white/5 transition-colors ${i % 2 === 0 ? "" : "bg-white/2"}`}
                      style={{ gridTemplateColumns: "1fr repeat(4, 80px) 120px" }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{row.menu.label}</p>
                        <p className="text-xs opacity-40">{row.menu.path}</p>
                      </div>

                      {FLAGS.map((f) => {
                        const checked = row.privilege?.[f.key] ?? false;
                        const canEdit = can("/admin/group-privileges", "canEdit");
                        return (
                          <div key={f.key} className="flex justify-center">
                            {isSaving ? (
                              <LoadingSpinner size="md" className="text-(--color-gold)" label="Saving" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggle(row, f.key)}
                                disabled={!canEdit}
                                className="w-4 h-4 cursor-pointer accent-(--color-gold) disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            )}
                          </div>
                        );
                      })}

                      <div className="flex justify-center gap-1">
                        <button
                          className="text-xs px-2 py-1 rounded bg-(--color-gold)/15 text-(--color-gold) hover:bg-(--color-gold)/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => handleGrantAll(row)}
                          disabled={isSaving || !can("/admin/group-privileges", "canEdit")}
                          title="Grant all permissions"
                        >
                          All
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => handleRevokeAll(row)}
                          disabled={isSaving || !row.privilege || !can("/admin/group-privileges", "canEdit")}
                          title="Revoke all permissions"
                        >
                          None
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
