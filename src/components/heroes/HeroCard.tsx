"use client";

import Link from "next/link";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import WikiRibbonRackDisplay, { WikiRibbonCell } from "@/components/ribbon-rack/WikiRibbonRackDisplay";
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
    medals: {
      medalType: {
        name: string;
        precedenceOrder: number;
        ribbonColors: string[];
        ribbonImageUrl?: string;
      };
      count: number;
      hasValor: boolean;
      deviceImages?: { url: string; deviceType: string; count: number }[];
    }[];
    wikiRibbonRack?: WikiRibbonCell[];
    ribbonMaxPerRow?: number;
    rackGap?: number;
  };
  href?: string;
  onClick?: () => void;
}

export default function HeroCard({ rank, hero, href, onClick }: HeroCardProps) {
  const hasWikiRack = hero.wikiRibbonRack && hero.wikiRibbonRack.length > 0;

  const ribbonMedals = hasWikiRack
    ? []
    : hero.medals
        .filter((m) => m.medalType)
        .map((m) => ({
          name: m.medalType.name,
          count: m.count,
          precedenceOrder: m.medalType.precedenceOrder,
          ribbonColors: m.medalType.ribbonColors?.length > 0 ? m.medalType.ribbonColors : ["#808080"],
          ribbonImageUrl: m.medalType.ribbonImageUrl,
          hasValor: m.hasValor,
          deviceImages: m.deviceImages,
        }));

  // For card view, use a compact scale (0.55x of detail page's 1.15)
  const cardRibbonScale = 0.65;
  const cardMaxPerRow = hero.ribbonMaxPerRow || 4;

  return (
    <Link href={href || `/heroes/${hero.slug}`} onClick={onClick}>
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
          <p className="text-sm text-[var(--color-text-muted)]">{hero.rank}</p>
        </div>

        {/* Ribbon preview */}
        <div className="hidden sm:block shrink-0">
          {hasWikiRack ? (
            <WikiRibbonRackDisplay
              cells={hero.wikiRibbonRack!}
              maxPerRow={cardMaxPerRow}
              ribbonScale={cardRibbonScale}
              rackGap={hero.rackGap ?? 4}
            />
          ) : (
            <RibbonRack medals={ribbonMedals} maxPerRow={3} scale={1.5} />
          )}
        </div>

        {/* Score */}
        <div className="score-badge shrink-0">{hero.score} pts</div>
      </div>
    </Link>
  );
}
