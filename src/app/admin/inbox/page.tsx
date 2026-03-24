"use client";

import { useEffect, useState } from "react";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function InboxPage() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contact");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Mark all as read after a short delay so the user sees the highlights first
  useEffect(() => {
    if (loading || contacts.length === 0) return;
    const hasUnread = contacts.some((c) => !c.read);
    if (!hasUnread) return;
    const timer = setTimeout(() => {
      fetch("/api/contact/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading, contacts]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c._id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      message: `Delete ${selected.size} message${selected.size !== 1 ? "s" : ""}?`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => !selected.has(c._id)));
        setSelected(new Set());
        setExpandedId(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AdminLoader />;

  return (
    <>
      {confirmDialog}
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Contact messages from users
          </p>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">
          {contacts.length} message{contacts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Toolbar */}
      {contacts.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === contacts.length && contacts.length > 0}
              onChange={toggleSelectAll}
              className="accent-[var(--color-gold)]"
            />
            Select all
          </label>
          {selected.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-secondary text-xs py-1.5 px-4 text-red-400 border-red-400/30 hover:bg-red-400/10 flex items-center gap-1.5"
            >
              {deleting ? (
                <>
                  <LoadingSpinner size="xs" />
                  Deleting…
                </>
              ) : (
                <>Delete ({selected.size})</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && (
        <div className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
          <div className="text-4xl mb-3">&#9993;</div>
          <p className="text-sm text-[var(--color-text-muted)]">No messages yet</p>
        </div>
      )}

      {/* Messages list */}
      <div className="space-y-3">
        {contacts.map((contact) => {
          const isExpanded = expandedId === contact._id;
          const isSelected = selected.has(contact._id);
          const date = new Date(contact.createdAt);
          return (
            <div
              key={contact._id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                isSelected
                  ? "border-red-400/40 bg-red-400/5"
                  : contact.read
                    ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                    : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5"
              }`}
            >
              {/* Row header */}
              <div className="flex items-center">
                <label
                  className="flex items-center pl-4 py-3 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(contact._id)}
                    className="accent-[var(--color-gold)]"
                  />
                </label>
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : contact._id);
                    if (!contact.read) {
                      setContacts((prev) =>
                        prev.map((c) => c._id === contact._id ? { ...c, read: true } : c)
                      );
                      fetch("/api/contact/mark-read", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: contact._id }),
                      }).catch(() => {});
                    }
                  }}
                  className="flex-1 text-left px-3 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {!contact.read && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {contact.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate">
                        &lt;{contact.email}&gt;
                      </span>
                      {!contact.read && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--color-gold)]/15 text-[var(--color-gold)] shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                        {contact.message}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0 whitespace-nowrap">
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                    })}{" "}
                    {date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Expanded message */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)]">
                  <div className="flex gap-4 text-xs text-[var(--color-text-muted)] mb-3">
                    <span>
                      <strong className="text-[var(--color-text)]">From:</strong>{" "}
                      {contact.name} &lt;{contact.email}&gt;
                    </span>
                    <span>
                      <strong className="text-[var(--color-text)]">Date:</strong>{" "}
                      {date.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed bg-[var(--color-bg)] rounded-lg p-4 border border-[var(--color-border)]">
                    {contact.message}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
