"use client";

import { useState } from "react";
import Link from "next/link";
import AvatarFallback, { medalTextColor } from "@/components/ui/AvatarFallback";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import { medalShortLabelForDisplay } from "@/lib/medal-short-name";
import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";

/* ── Types ──────────────────────────────────────────────────── */

interface WikiImage {
  url: string;
  caption: string;
  sourceUrl?: string;
}

interface MedalType {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  tier: number;
  branch: string;
  precedenceOrder: number;
  ribbonColors: string[];
  description: string;
  imageUrl: string;
  ribbonImageUrl: string;
  /* Wiki content */
  wikipediaUrl?: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  appearance?: string;
  established?: string;
  wikiImages?: WikiImage[];
}

interface HeroEntry {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  avatarUrl?: string;
  score: number;
  medalCount: number;
  hasValor: boolean;
}

/* ── Category accent system ─────────────────────────────────── */

const CATEGORY_ACCENT: Record<
  string,
  { bg: string; text: string; border: string; glow: string; gradient: string }
> = {
  valor: {
    bg: "#d4a84322",
    text: "#d4a843",
    border: "#d4a84360",
    glow: "rgba(212,168,67,0.15)",
    gradient: "linear-gradient(135deg, #1a1400 0%, #2a1f00 40%, #0a0f1a 100%)",
  },
  service: {
    bg: "#3b82f622",
    text: "#3b82f6",
    border: "#3b82f660",
    glow: "rgba(59,130,246,0.15)",
    gradient: "linear-gradient(135deg, #001233 0%, #001845 40%, #0a0f1a 100%)",
  },
  foreign: {
    bg: "#10b98122",
    text: "#10b981",
    border: "#10b98160",
    glow: "rgba(16,185,129,0.15)",
    gradient: "linear-gradient(135deg, #001a12 0%, #002a1a 40%, #0a0f1a 100%)",
  },
  other: {
    bg: "#9ca3af22",
    text: "#9ca3af",
    border: "#9ca3af60",
    glow: "rgba(156,163,175,0.12)",
    gradient: "linear-gradient(135deg, #111827 0%, #1f2937 40%, #0a0f1a 100%)",
  },
};

/* ── Component ──────────────────────────────────────────────── */

export default function MedalDetailView({
  medal,
  heroes,
}: {
  medal: MedalType;
  heroes: HeroEntry[];
}) {
  const cc = CATEGORY_ACCENT[medal.category] ?? CATEGORY_ACCENT.other;
  const shortLabel = medalShortLabelForDisplay(medal.shortName, medal.name);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Identify front image — fall back to ribbon image if no medal image
  const rawFront = medal.imageUrl || medal.ribbonImageUrl || null;
  const frontUrl = rawFront ? normalizeWikimediaImageUrl(rawFront) || rawFront : null;

  // Remaining gallery images (exclude front)
  const galleryImages: { url: string; caption: string }[] = [];
  if (medal.wikiImages?.length) {
    for (const img of medal.wikiImages) {
      const u = normalizeWikimediaImageUrl(img.url) || img.url;
      if (u === frontUrl) continue;
      galleryImages.push({ url: u, caption: img.caption });
    }
  }

  // Split summary into paragraphs
  const summaryParas = medal.wikiSummary
    ? medal.wikiSummary.split(/\n\n+/).filter((p) => p.trim())
    : [];

  // Split history into paragraphs
  const historyParas = medal.history
    ? medal.history.split(/\n\n+/).filter((p) => p.trim())
    : [];

  // Split criteria into paragraphs
  const criteriaParas = medal.awardCriteria
    ? medal.awardCriteria.split(/\n\n+/).filter((p) => p.trim())
    : [];

  // Split appearance into paragraphs
  const appearanceParas = medal.appearance
    ? medal.appearance.split(/\n\n+/).filter((p) => p.trim())
    : [];

  const hasWikiContent =
    summaryParas.length > 0 ||
    historyParas.length > 0 ||
    criteriaParas.length > 0 ||
    appearanceParas.length > 0;

  return (
    <div className="animate-fade-in-up">
      {/* ── Lightbox overlay ────────────────────────────────── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <SafeWikimediaImg
            src={lightboxImg}
            alt="Medal enlarged"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl font-light"
            onClick={() => setLightboxImg(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div
        className="medal-showcase-banner rounded-2xl overflow-hidden border"
        style={{
          background: cc.gradient,
          borderColor: cc.border,
        }}
      >
        <div className="relative px-6 sm:px-10 py-10 sm:py-14 text-center">
          {/* Subtle glow behind medal */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center 40%, ${cc.glow} 0%, transparent 70%)`,
            }}
          />

          {/* Category + established badges */}
          <div className="relative flex items-center justify-center gap-3 mb-6">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
              style={{
                backgroundColor: cc.bg,
                color: cc.text,
                border: `1px solid ${cc.border}`,
              }}
            >
              {medal.category}
            </span>
            {medal.established && (
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{
                  backgroundColor: cc.bg,
                  color: cc.text,
                  border: `1px solid ${cc.border}`,
                }}
              >
                Est. {medal.established}
              </span>
            )}
          </div>

          {/* Medal image (front only) */}
          <div className="relative flex justify-center mb-6">
            <div className="flex flex-col items-center">
              {frontUrl ? (
                <SafeWikimediaImg
                  src={frontUrl}
                  alt={medal.name}
                  className="h-44 sm:h-60 w-auto object-contain drop-shadow-2xl cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setLightboxImg(frontUrl)}
                />
              ) : medal.ribbonColors?.length > 0 ? (
                <div
                  className="h-44 sm:h-60 w-32 sm:w-40 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: medal.ribbonColors[0],
                    color: medalTextColor(medal.ribbonColors[0]),
                    border: `4px solid ${cc.border}`,
                    boxShadow: `0 8px 40px ${cc.glow}`,
                  }}
                >
                  {shortLabel}
                </div>
              ) : (
                <div
                  className="h-44 sm:h-60 w-32 sm:w-40 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-muted)",
                    border: `4px solid ${cc.border}`,
                  }}
                >
                  {shortLabel}
                </div>
              )}
            </div>
          </div>

          {/* Ribbon image */}
          {medal.ribbonImageUrl && (
            <div className="flex justify-center mb-5">
              <SafeWikimediaImg
                src={medal.ribbonImageUrl}
                alt={`${medal.name} ribbon`}
                className="h-8 w-auto object-contain rounded-sm shadow-lg"
                style={{ border: `2px solid ${cc.border}` }}
              />
            </div>
          )}

          {/* Name */}
          <h1
            className="medal-showcase-name text-3xl sm:text-4xl font-bold uppercase tracking-wider leading-tight mb-2"
            style={{ color: cc.text }}
          >
            {medal.name}
          </h1>
          <p className="text-sm font-mono text-[var(--color-text-muted)] mb-4">
            {shortLabel}
            {medal.branch !== "All" && ` — ${medal.branch}`}
          </p>

          {/* Valor / device badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {medal.inherentlyValor && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                INHERENTLY VALOR
              </span>
            )}
            {medal.requiresValorDevice && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                REQUIRES &quot;V&quot; DEVICE
              </span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 divide-x"
          style={{ borderTop: `1px solid ${cc.border}` }}
        >
          <StatCell label="Base Points" value={`${medal.basePoints}`} accent={cc.text} bold />
          <StatCell label="Valor Points" value={`${medal.valorPoints}`} accent={cc.text} />
          <StatCell label="Precedence" value={`#${medal.precedenceOrder}`} accent={cc.text} />
          <StatCell label="Tier" value={`${medal.tier}`} accent={cc.text} />
        </div>
      </div>

      {/* ── Image Gallery ───────────────────────────────────── */}
      {galleryImages.length > 0 && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>Medal Gallery</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleryImages.map((img, i) => (
              <div
                key={i}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden cursor-pointer group transition-all hover:border-[var(--color-gold)] hover:shadow-lg"
                onClick={() => setLightboxImg(img.url)}
              >
                <div className="aspect-square flex items-center justify-center p-4 bg-[var(--color-bg)]">
                  <SafeWikimediaImg
                    src={img.url}
                    alt={img.caption}
                    className="max-h-full max-w-full object-contain transition-transform group-hover:scale-110"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-2 line-clamp-2 leading-snug">
                  {img.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── About / Summary ─────────────────────────────────── */}
      {(summaryParas.length > 0 || medal.description) && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>About This Medal</SectionHeading>
          <ContentCard borderColor={cc.border}>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)]">
              {summaryParas.length > 0
                ? summaryParas.map((p, i) => <p key={i}>{p.trim()}</p>)
                : medal.description && <p>{medal.description}</p>}
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── How It Was Awarded ──────────────────────────────── */}
      {criteriaParas.length > 0 && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>How It Is Awarded</SectionHeading>
          <ContentCard borderColor={cc.border}>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)]">
              {criteriaParas.map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── History & Changes Over Time ─────────────────────── */}
      {historyParas.length > 0 && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>History & Changes Over Time</SectionHeading>
          <ContentCard borderColor={cc.border}>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)]">
              {historyParas.map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── Appearance & Design ─────────────────────────────── */}
      {appearanceParas.length > 0 && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>Appearance & Design</SectionHeading>
          <ContentCard borderColor={cc.border}>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)]">
              {appearanceParas.map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── Wikipedia link ──────────────────────────────────── */}
      {medal.wikipediaUrl && (
        <div className="mt-6 text-center">
          <a
            href={medal.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Read more on Wikipedia
          </a>
        </div>
      )}

      {/* ── Heroes who earned this medal ────────────────────── */}
      {heroes.length > 0 && (
        <div className="mt-8">
          <SectionHeading accent={cc.text}>
            Heroes with this Medal ({heroes.length})
          </SectionHeading>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              {heroes.map((hero) => (
                <Link
                  key={hero._id}
                  href={`/heroes/${hero.slug}`}
                  className="flex items-center gap-3 py-3 px-4 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                    {hero.avatarUrl ? (
                      <SafeWikimediaImg
                        src={hero.avatarUrl}
                        alt={hero.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback name={hero.name} size={40} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{hero.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{hero.rank}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hero.medalCount > 1 && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--color-gold)]/10 text-[var(--color-gold)] rounded-full">
                        x{hero.medalCount}
                      </span>
                    )}
                    {hero.hasValor && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        V
                      </span>
                    )}
                    <span className="score-badge text-xs">{hero.score} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No wiki content notice */}
      {!hasWikiContent && !medal.description && (
        <div className="mt-8 text-center py-8 text-sm text-[var(--color-text-muted)]">
          No detailed information available yet for this medal.
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function SectionHeading({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
      style={{ color: accent }}
    >
      {children}
    </h2>
  );
}

function ContentCard({
  borderColor,
  children,
}: {
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-[var(--color-surface)] rounded-xl p-5 sm:p-6"
      style={{ border: `1px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent: string;
  bold?: boolean;
}) {
  return (
    <div className="py-3 sm:py-4 px-4 text-center">
      <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mb-0.5">{label}</p>
      <p
        className={`text-sm sm:text-base font-bold`}
        style={bold ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
