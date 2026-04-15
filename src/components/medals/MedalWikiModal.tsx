"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  /** Single-line heroic catalog caption (matches scoring engine rules for display). */
  heroicScoreCaption?: string;
}

interface Props {
  medal: MedalModalData | null;
  onClose: () => void;
}

function mergeProseParagraphs(medal: MedalModalData): string[] {
  const summaryParas = splitWikiParagraphs(medal.wikiSummary);
  const criteriaParas = splitWikiParagraphs(medal.awardCriteria);
  const historyParas = splitWikiParagraphs(medal.history);
  const appearanceParas = splitWikiParagraphs(medal.appearance);
  const descTrim = medal.description?.trim() ?? "";
  const showCatalogDescription =
    descTrim.length > 0 &&
    !isCatalogDescriptionRedundant(descTrim, medal.wikiSummary?.trim() ?? "");
  const catalogParas = showCatalogDescription ? splitWikiParagraphs(descTrim) : [];
  return [...summaryParas, ...criteriaParas, ...historyParas, ...appearanceParas, ...catalogParas];
}

export default function MedalWikiModal({ medal, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mergedParas = useMemo(() => (medal ? mergeProseParagraphs(medal) : []), [medal]);

  if (!medal) return null;

  const hasProseSections = mergedParas.length > 0;

  const ribbonOnly =
    medal.ribbonImageUrl &&
    (!medal.imageUrl || medal.ribbonImageUrl === medal.imageUrl);

  const scoreLine = medal.heroicScoreCaption?.trim() || "";

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-w-2xl max-h-[90vh] overflow-y-auto w-full rounded-xl border border-neutral-600 bg-neutral-950 shadow-2xl p-5 sm:p-6 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 mb-4">
          <h2 id="medal-modal-title" className="text-lg sm:text-xl font-bold leading-snug pr-2 break-words">
            <span className="text-white">{medal.name}</span>
            {scoreLine ? <span className="text-amber-300">{" — "}{scoreLine}</span> : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {(medal.established || medal.wikipediaUrl) && (
          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-300">
            {medal.established?.trim() ? (
              <span>
                <span className="font-semibold text-amber-300">Established</span> {medal.established.trim()}
              </span>
            ) : null}
            {medal.wikipediaUrl?.trim() ? (
              <a
                href={medal.wikipediaUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300 hover:underline font-medium"
              >
                Wikipedia
              </a>
            ) : null}
          </div>
        )}

        {medal.ribbonImageUrl && !ribbonOnly ? (
          <div className="mb-3">
            <div className="flex justify-center rounded-lg border border-neutral-700 bg-neutral-900/80 p-3">
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
            <div className="flex justify-center rounded-lg border border-neutral-700 bg-neutral-900/60 p-2">
              <SafeWikimediaImg src={medal.imageUrl} alt={medal.name} className="max-h-44 w-auto object-contain" />
            </div>
          </div>
        ) : medal.ribbonImageUrl && ribbonOnly ? (
          <div className="mb-4 flex justify-center rounded-lg border border-neutral-700 bg-neutral-900/60 p-2">
            <SafeWikimediaImg src={medal.ribbonImageUrl} alt={medal.name} className="max-h-36 w-auto object-contain" />
          </div>
        ) : null}

        {hasProseSections ? (
          <div className="mb-4 space-y-3 text-base sm:text-[17px] leading-relaxed text-white">
            {mergedParas.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-200 mb-4 leading-relaxed">
            No detailed write-up is stored for this medal yet. Use{" "}
            <span className="text-white font-medium">Fetch from Wikipedia</span> in admin to import summary, criteria,
            and history.
          </p>
        )}

        <p className="text-xs text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2 mb-4 leading-relaxed">
          Ribbon text here is a shortened catalog excerpt when available. Full Wikipedia-derived ribbon narratives are
          planned as a follow-on import.
        </p>

        <div className="flex flex-wrap gap-3 justify-end pt-1">
          {medal.medalId && (
            <Link
              href={`/medals/${medal.medalId}`}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300"
              onClick={onClose}
            >
              Full medal page
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-600 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
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
