"use client";

import { useState, type CSSProperties } from "react";
import { medalShortLabelForDisplay } from "@/lib/medal-short-name";
import { getFirstWikiImageUrl } from "@/lib/medal-primary-image-url";
import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";

export interface MedalThumbSources {
  imageUrl?: string;
  ribbonImageUrl?: string;
  wikiImages?: { url?: string }[];
  ribbonColors?: string[];
  shortName: string;
  name: string;
}

/**
 * Medal / ribbon image with sensible fallbacks (used in catalog grids and admin lists).
 * Order: imageUrl → ribbonImageUrl → first wikiImages[].url → multi-stripe ribbonColors → abbreviation tile.
 */
export function MedalDisplayThumb({
  imageUrl,
  ribbonImageUrl,
  wikiImages,
  ribbonColors,
  shortName,
  name,
  borderColor,
  size,
  className = "",
  imgClassName = "object-contain rounded-lg",
}: MedalThumbSources & {
  borderColor: string;
  size: number;
  className?: string;
  imgClassName?: string;
}) {
  const label = medalShortLabelForDisplay(shortName, name);
  const primary = normalizeWikimediaImageUrl((imageUrl || "").trim());
  const ribbonImg = normalizeWikimediaImageUrl((ribbonImageUrl || "").trim());
  const wiki0 = normalizeWikimediaImageUrl(getFirstWikiImageUrl(wikiImages) || "");

  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedRibbon, setFailedRibbon] = useState(false);
  const [failedWiki, setFailedWiki] = useState(false);

  const boxStyle: CSSProperties = {
    height: size,
    width: size,
    border: `3px solid ${borderColor}`,
  };

  if (primary && !failedPrimary) {
    return (
      <img
        src={primary}
        alt={name}
        className={`${imgClassName} ${className}`.trim()}
        style={{ height: size, width: size }}
        onError={() => setFailedPrimary(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (ribbonImg && !failedRibbon) {
    return (
      <img
        src={ribbonImg}
        alt={name}
        className={`${imgClassName} ${className}`.trim()}
        style={{ height: size, width: size }}
        onError={() => setFailedRibbon(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (wiki0 && !failedWiki) {
    return (
      <img
        src={wiki0}
        alt={name}
        className={`${imgClassName} ${className}`.trim()}
        style={{ height: size, width: size }}
        onError={() => setFailedWiki(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  const colors = Array.isArray(ribbonColors) ? ribbonColors.filter(Boolean) : [];
  if (colors.length > 0) {
    return (
      <div
        className={`rounded-lg shrink-0 overflow-hidden shadow-sm ${className ?? ""}`.trim()}
        style={{ ...boxStyle, border: `2px solid ${borderColor}` }}
      >
        <svg width="100%" height="100%" viewBox="0 0 40 40" preserveAspectRatio="none" aria-hidden>
          {colors.map((color, ci) => (
            <rect
              key={ci}
              x={(40 / colors.length) * ci}
              y={0}
              width={40 / colors.length}
              height={40}
              fill={color}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg flex items-center justify-center text-xs font-bold sm:text-sm ${className}`.trim()}
      style={{
        ...boxStyle,
        backgroundColor: "var(--color-surface)",
        color: "var(--color-text-muted)",
      }}
    >
      {label}
    </div>
  );
}

/** Compact row thumbnail (admin list): same source order, smaller box. */
export function MedalDisplayThumbRow(s: MedalThumbSources & { borderColor: string }) {
  const label = medalShortLabelForDisplay(s.shortName, s.name);
  const primary = normalizeWikimediaImageUrl((s.imageUrl || "").trim());
  const ribbonImg = normalizeWikimediaImageUrl((s.ribbonImageUrl || "").trim());
  const wiki0 = normalizeWikimediaImageUrl(getFirstWikiImageUrl(s.wikiImages) || "");

  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedRibbon, setFailedRibbon] = useState(false);
  const [failedWiki, setFailedWiki] = useState(false);

  if (primary && !failedPrimary) {
    return (
      <img
        src={primary}
        alt={s.name}
        className="h-11 w-11 object-contain rounded shrink-0"
        onError={() => setFailedPrimary(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (ribbonImg && !failedRibbon) {
    return (
      <img
        src={ribbonImg}
        alt={s.name}
        className="h-11 w-11 object-contain rounded shrink-0"
        onError={() => setFailedRibbon(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (wiki0 && !failedWiki) {
    return (
      <img
        src={wiki0}
        alt={s.name}
        className="h-11 w-11 object-contain rounded shrink-0"
        onError={() => setFailedWiki(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  const colors = Array.isArray(s.ribbonColors) ? s.ribbonColors.filter(Boolean) : [];
  if (colors.length > 0) {
    return (
      <div
        className="h-11 w-11 rounded shrink-0 overflow-hidden shadow-sm"
        style={{ border: `2px solid ${s.borderColor}` }}
      >
        <svg width="100%" height="100%" viewBox="0 0 40 40" preserveAspectRatio="none" aria-hidden>
          {colors.map((color, ci) => (
            <rect
              key={ci}
              x={(40 / colors.length) * ci}
              y={0}
              width={40 / colors.length}
              height={40}
              fill={color}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="h-11 w-11 rounded shrink-0 flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]"
      style={{
        backgroundColor: "var(--color-surface)",
        border: `2px solid ${s.borderColor}`,
      }}
    >
      {label}
    </div>
  );
}
