"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import { isCatalogDescriptionRedundant, splitWikiParagraphs } from "@/lib/medal-wiki-display";

export interface MedalModalData {
  medalId?: string;
  name: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  /** Obverse / full medal art */
  imageUrl?: string;
  /** Ribbon graphic (distinct from obverse when both exist) */
  ribbonImageUrl?: string;
  description?: string;
  wikipediaUrl?: string;
  appearance?: string;
  established?: string;
}

interface Props {
  medal: MedalModalData | null;
  onClose: () => void;
}

function WikiSection({
  title,
  paras,
  muted,
}: {
  title: string;
  paras: string[];
  muted?: boolean;
}) {
  if (paras.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">{title}</h3>
      <div
        className={`space-y-3 text-sm leading-relaxed ${muted ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}
      >
        {paras.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function MedalWikiModal({ medal, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!medal) return null;

  const summaryParas = splitWikiParagraphs(medal.wikiSummary);
  const criteriaParas = splitWikiParagraphs(medal.awardCriteria);
  const historyParas = splitWikiParagraphs(medal.history);
  const appearanceParas = splitWikiParagraphs(medal.appearance);
  const descTrim = medal.description?.trim() ?? "";
  const showCatalogDescription =
    descTrim.length > 0 &&
    !isCatalogDescriptionRedundant(descTrim, medal.wikiSummary?.trim() ?? "");

  const hasProseSections =
    summaryParas.length > 0 ||
    criteriaParas.length > 0 ||
    historyParas.length > 0 ||
    appearanceParas.length > 0 ||
    showCatalogDescription;

  const ribbonOnly =
    medal.ribbonImageUrl &&
    (!medal.imageUrl || medal.ribbonImageUrl === medal.imageUrl);

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-w-2xl max-h-[90vh] overflow-y-auto w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl p-6"
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

        {(medal.established || medal.wikipediaUrl) && (
          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
            {medal.established?.trim() ? (
              <span>
                <span className="font-semibold text-[var(--color-gold)]">Established</span> {medal.established.trim()}
              </span>
            ) : null}
            {medal.wikipediaUrl?.trim() ? (
              <a
                href={medal.wikipediaUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-gold)] hover:underline"
              >
                Wikipedia
              </a>
            ) : null}
          </div>
        )}

        {medal.ribbonImageUrl && !ribbonOnly ? (
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Ribbon</p>
            <div className="flex justify-center rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 p-3">
              <SafeWikimediaImg
                src={medal.ribbonImageUrl}
                alt={`${medal.name} ribbon`}
                className="max-h-28 w-auto max-w-full object-contain"
              />
            </div>
          </div>
        ) : null}

        {medal.imageUrl ? (
          <div className="mb-4">
            {!ribbonOnly && (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {medal.ribbonImageUrl && medal.imageUrl !== medal.ribbonImageUrl ? "Obverse" : "Image"}
              </p>
            )}
            <div className="flex justify-center">
              <SafeWikimediaImg src={medal.imageUrl} alt={medal.name} className="max-h-44 w-auto object-contain" />
            </div>
          </div>
        ) : medal.ribbonImageUrl && ribbonOnly ? (
          <div className="mb-4 flex justify-center">
            <SafeWikimediaImg src={medal.ribbonImageUrl} alt={medal.name} className="max-h-36 w-auto object-contain" />
          </div>
        ) : null}

        <WikiSection title="Summary" paras={summaryParas} />
        <WikiSection title="How it is awarded" paras={criteriaParas} muted />
        <WikiSection title="History" paras={historyParas} muted />
        <WikiSection title="Appearance" paras={appearanceParas} muted />

        {showCatalogDescription ? (
          <WikiSection title="Catalog description" paras={splitWikiParagraphs(descTrim)} muted />
        ) : null}

        {!hasProseSections ? (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            No detailed write-up is stored for this medal yet. Use{" "}
            <span className="text-[var(--color-text)]">Fetch from Wikipedia</span> in admin to import summary, criteria,
            and history.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 justify-end pt-1">
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

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
