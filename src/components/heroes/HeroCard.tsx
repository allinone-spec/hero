"use client";

import Link from "next/link";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import AvatarFallback from "@/components/ui/AvatarFallback";

interface HeroCardProps {
  rank: number;
  hero: {
    _id: string;
    name: string;
    slug: string;
    rank: string;
    score: number;
    avatarUrl?: string;
    memberSupported?: boolean;
    availableForAdoption?: boolean;
    medals: {
      medalType: {
        _id?: string;
        name: string;
        precedenceOrder: number;
        ribbonColors: string[];
        ribbonImageUrl?: string;
      };
      count: number;
      hasValor: boolean;
      deviceImages?: { url: string; deviceType: string; count: number }[];
    }[];
    ribbonMaxPerRow?: number;
    rackGap?: number;
  };
  href?: string;
  /** Query `from` on profile URL (heroes / rankings / my-heroes) for back navigation */
  fromParam?: "heroes" | "rankings" | "my-heroes" | "adopt";
  onClick?: () => void;
}

export default function HeroCard({ rank, hero, href, fromParam = "heroes", onClick }: HeroCardProps) {
  const ribbonMedals = hero.medals
    .filter((m) => m.medalType)
    .map((m) => ({
      medalId: m.medalType._id,
      name: m.medalType.name,
      count: m.count,
      precedenceOrder: m.medalType.precedenceOrder,
      ribbonColors: m.medalType.ribbonColors?.length > 0 ? m.medalType.ribbonColors : ["#808080"],
      ribbonImageUrl: m.medalType.ribbonImageUrl,
      hasValor: m.hasValor,
      deviceImages: m.deviceImages,
    }))
    .sort((a, b) => a.precedenceOrder - b.precedenceOrder);

  const to =
    href ||
    `/heroes/${hero.slug}?from=${fromParam}`;
  const hasAdoptionState =
    typeof hero.availableForAdoption === "boolean" || typeof hero.memberSupported === "boolean";
  const availableForAdoption = hero.availableForAdoption ?? !hero.memberSupported;

  return (
    <Link href={to} onClick={onClick}>
      <div className="hero-card p-4 flex items-center gap-4">
        {/* Rank number */}
        <div className="rank-number">#{rank}</div>

        {/* Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
          {hero.avatarUrl ? (
            <img
              src={hero.avatarUrl}
              alt={hero.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <AvatarFallback name={hero.name} size={56} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{hero.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-sm text-[var(--color-text-muted)]">{hero.rank}</p>
            {hasAdoptionState && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  availableForAdoption
                    ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {availableForAdoption ? "Available to adopt" : "Already supported"}
              </span>
            )}
          </div>
        </div>

        {/* Ribbon preview */}
        <div className="hidden sm:block shrink-0">
          {ribbonMedals.length > 0 && (
            <RibbonRack medals={ribbonMedals} maxPerRow={3} scale={1.5} disableLinks />
          )}
        </div>

        {/* Score */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="score-badge">{hero.score} pts</div>
          {hasAdoptionState && availableForAdoption && (
            <span className="hidden md:inline text-xs font-medium text-[var(--color-gold)]">
              Adopt profile →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
