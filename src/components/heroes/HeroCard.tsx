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
  onClick?: () => void;
}

export default function HeroCard({ rank, hero, href, onClick }: HeroCardProps) {
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
          {ribbonMedals.length > 0 && (
            <RibbonRack medals={ribbonMedals} maxPerRow={3} scale={1.5} disableLinks />
          )}
        </div>

        {/* Score */}
        <div className="score-badge shrink-0">{hero.score} pts</div>
      </div>
    </Link>
  );
}
