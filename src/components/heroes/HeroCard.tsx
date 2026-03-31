"use client";

import Link from "next/link";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import { buildRibbonRackMedals, sortHeroMedalEntries } from "@/lib/rack-engine";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";

interface HeroCardProps {
  rank: number;
  hero: {
    _id: string;
    name: string;
    slug: string;
    rank: string;
    branch: string;
    score: number;
    avatarUrl?: string;
    countryCode?: string;
    memberSupported?: boolean;
    availableForAdoption?: boolean;
    medals: {
      medalType: {
        _id?: string;
        name: string;
        precedenceOrder: number;
        ribbonColors: string[];
        ribbonImageUrl?: string;
        deviceLogic?: string;
        deviceRule?: MedalDeviceRule;
        countryCode?: string;
        inventoryCategory?: string;
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
  const orderedMedals = sortHeroMedalEntries(hero.medals, {
    nationalCountryCode: hero.countryCode,
  });
  const ribbonMedals = buildRibbonRackMedals(orderedMedals, {
    serviceBranch: hero.branch,
    nationalCountryCode: hero.countryCode,
  });

  const to =
    href ||
    `/heroes/${hero.slug}?from=${fromParam}`;
  const hasAdoptionState =
    typeof hero.availableForAdoption === "boolean" || typeof hero.memberSupported === "boolean";
  const availableForAdoption = hero.availableForAdoption ?? !hero.memberSupported;

  return (
    <Link href={to} onClick={onClick}>
      <div
        className="hero-card p-4 grid items-center gap-3 sm:gap-4
          grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_auto]
          sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_11rem_9.5rem]"
      >
        {/* Rank number */}
        <div className="rank-number justify-self-start">#{rank}</div>

        {/* Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 justify-self-start">
          {hero.avatarUrl ? (
            <SafeWikimediaImg
              src={hero.avatarUrl}
              alt={hero.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <AvatarFallback name={hero.name} size={56} />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0">
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

        {/* Ribbon preview — fixed 11rem column; batch centered so midlines line up list-wide */}
        <div
          className="hidden sm:flex sm:w-full sm:min-w-0 sm:min-h-[3.25rem] sm:items-center sm:justify-center"
          aria-hidden={ribbonMedals.length === 0}
        >
          {ribbonMedals.length > 0 ? (
            <RibbonRack
              medals={ribbonMedals}
              rowLayout="rankListPyramid"
              countryCode={hero.countryCode}
              scale={1.5}
              disableLinks
            />
          ) : null}
        </div>

        {/* Score — fixed column; pts top row, “Adopt profile →” second row when shown */}
        <div
          className={`flex w-full shrink-0 flex-col items-end justify-center gap-0.5 sm:gap-1 ${
            hasAdoptionState && availableForAdoption
              ? "min-h-[3.25rem] sm:min-h-[4rem]"
              : "min-h-[2.75rem] sm:min-h-[3.25rem]"
          }`}
        >
          <div className="score-badge whitespace-nowrap">{hero.score} pts</div>
        </div>
      </div>
    </Link>
  );
}
