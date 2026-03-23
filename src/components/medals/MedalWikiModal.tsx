"use client";

import Link from "next/link";

export interface MedalModalData {
  medalId?: string;
  name: string;
  wikiSummary?: string;
}

interface Props {
  medal: MedalModalData | null;
  onClose: () => void;
}

export default function MedalWikiModal({ medal, onClose }: Props) {
  if (!medal) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-w-lg w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 mb-3">
          <h2 id="medal-modal-title" className="text-lg font-bold text-[var(--color-text)] pr-2">
            {medal.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {medal.wikiSummary ? (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap mb-5">
            {medal.wikiSummary}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] mb-5">No summary is stored for this medal yet.</p>
        )}
        <div className="flex flex-wrap gap-3 justify-end">
          {medal.medalId && (
            <Link
              href={`/medals/${medal.medalId}`}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-badge-text)]"
              style={{
                background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
              }}
              onClick={onClose}
            >
              Full medal page
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
