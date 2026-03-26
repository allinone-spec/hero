"use client";

import Link from "next/link";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import ScoreBreakdown from "@/components/scoring/ScoreBreakdown";
import RankInsignia from "@/components/heroes/RankInsignia";
import { describeMedalDevices, type MedalDeviceRule } from "@/lib/medal-device-rules";
import { buildRibbonRackMedals } from "@/lib/rack-engine";
import { ScoreBreakdownItem } from "@/types";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface HeroDetail {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  avatarUrl?: string;
  score: number;
  published: boolean;
  biography: string;
  wars: string[];
  combatTours: number;
  medals: {
    medalType: {
      _id: string;
      name: string;
      shortName: string;
      precedenceOrder: number;
      ribbonColors: string[];
      basePoints: number;
      imageUrl?: string;
      ribbonImageUrl?: string;
      deviceLogic?: string;
      deviceRule?: MedalDeviceRule;
      countryCode?: string;
      inventoryCategory?: string;
    };
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads?: number;
    deviceImages?: { url: string; deviceType: string; count: number }[];
    wikiRibbonUrl?: string;
    wikiDeviceText?: string;
  }[];
  ribbonMaxPerRow?: number;
  rackGap?: number;
  countryCode?: string;
}

interface Props {
  hero: HeroDetail;
  scoreBreakdown: ScoreBreakdownItem[];
  scoreTotal: number;
  rankPosition: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

/** Check if medal is a unit citation (gets gold frame on ribbon) */
function isUnitCitation(name: string): boolean {
  return /\bunit\b/i.test(name) || /\bpresidential.*citation\b/i.test(name);
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function HeroDetailClient({
  hero,
  scoreBreakdown,
  scoreTotal,
  rankPosition,
}: Props) {
  const sortedMedals = [...hero.medals]
    .filter((m) => m.medalType)
    .sort((a, b) => a.medalType.precedenceOrder - b.medalType.precedenceOrder);

  const ribbonMedals = buildRibbonRackMedals(
    sortedMedals.map((m) => ({
      ...m,
      wikiRibbonUrl: m.wikiRibbonUrl || m.medalType.ribbonImageUrl,
    })),
    { serviceBranch: hero.branch, nationalCountryCode: hero.countryCode },
  ).map((m) => ({
    ...m,
    isUnitCitation: isUnitCitation(m.name),
  }));

  // Split biography into paragraphs
  const bioParas = hero.biography
    ? hero.biography.split(/\n\n+/).filter((p) => p.trim())
    : [];

  return (
    <div className="animate-fade-in-up">
      {/* Navigation — hidden in print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/admin/rankings"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Rankings
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/heroes/${hero._id}/edit`}
            className="btn-primary text-sm py-1.5 px-4"
          >
            Edit Hero
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Profile
          </button>
        </div>
      </div>

      {/* ── Print-Ready Profile ─────────────────────────────────────────────── */}
      <div className="hero-profile-page bg-white text-black border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Profile Header */}
        <div className="relative text-center px-6 pt-8 pb-6 border-b border-[var(--color-border)]">
          {/* Rank insignia — top right */}
          <div className="absolute top-4 right-4">
            <RankInsignia rank={hero.rank} branch={hero.branch} size={52} />
          </div>

          {/* Score + Rank + Published/Draft — top left */}
          <div className="absolute top-4 left-4 no-print flex flex-col items-start gap-1.5">
            <span className="score-badge text-sm">{hero.score} pts</span>
            <span className="text-xs font-semibold text-[var(--color-gold)]">Ranked #{rankPosition}</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                hero.published
                  ? "bg-green-500/15 text-green-600 border-green-500/30"
                  : "bg-amber-500/15 text-amber-600 border-amber-500/30"
              }`}
            >
              {hero.published ? "Published" : "Draft"}
            </span>
          </div>

          {/* Portrait */}
          <div className="inline-block mb-3">
            <div
              className="w-28 h-36 sm:w-32 sm:h-40 rounded overflow-hidden mx-auto"
              style={{ border: "3px solid var(--color-gold)" }}
            >
              {hero.avatarUrl ? (
                <SafeWikimediaImg
                  src={hero.avatarUrl}
                  alt={hero.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-[var(--color-bg)] flex items-center justify-center text-4xl font-bold text-[var(--color-text-muted)]">
                  {hero.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Name & Rank */}
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider profile-name">
            {hero.name}
          </h1>
          <p className="text-base text-[var(--color-text-muted)] mt-1 tracking-wide">
            {hero.rank}, {hero.branch}
          </p>


          {/* Wars */}
          {hero.wars.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {hero.wars.map((war) => (
                <span
                  key={war}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full"
                >
                  {war}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Two-Column Body ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
          {/* Left Column — Awards & Decorations (1/3) */}
          <div className="md:col-span-1 px-5 py-5 md:border-r border-[var(--color-border)]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-4">
              Awards & Decorations
            </h2>
            <ol className="space-y-1.5 text-sm list-none">
              {sortedMedals.map((m, idx) => {
                const devices = m.wikiDeviceText
                  || describeMedalDevices({
                    count: m.count,
                    hasValor: m.hasValor,
                    arrowheads: m.arrowheads,
                    deviceRule: m.medalType.deviceRule ?? m.medalType.deviceLogic,
                    serviceBranch: hero.branch,
                  });
                return (
                  <li key={idx} className="py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
                    <Link
                      href={`/medals/${m.medalType._id}`}
                      className="font-medium hover:text-[var(--color-gold)] transition-colors print-link"
                    >
                      {m.medalType.name}
                      {m.count > 1 && !devices ? ` (${m.count})` : ""}
                    </Link>
                    {devices && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5 italic leading-snug">
                        {devices}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Right Column — Ribbon Rack + Biography (2/3) */}
          <div className="md:col-span-2 px-5 py-5">
            {/* Ribbon Rack */}
            {ribbonMedals.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-3">
                  Ribbon Rack
                </h2>
                <div className="flex justify-center">
                  <RibbonRack
                    medals={ribbonMedals}
                    rowLayout="rankListPyramid"
                    countryCode={hero.countryCode}
                    scale={3}
                  />
                </div>
              </div>
            )}

            {/* Biography */}
            {bioParas.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-3">
                  Biography
                </h2>
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)] profile-bio">
                  {bioParas.map((para, idx) => (
                    <p key={idx}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Score Breakdown (web only) ──────────────────────────────────────── */}
      <div className="no-print mt-8">
        <ScoreBreakdown breakdown={scoreBreakdown} total={scoreTotal} />
      </div>
    </div>
  );
}
