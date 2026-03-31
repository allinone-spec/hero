"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AvatarFallback from "./AvatarFallback";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import { buildRibbonRackMedals, sortHeroMedalEntries } from "@/lib/rack-engine";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";

interface SlideshowHero {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  score: number;
  avatarUrl?: string;
  countryCode?: string;
  wars: string[];
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
}

export default function HeroSlideshow({
  heroes,
  profileFrom = "heroes",
}: {
  heroes: SlideshowHero[];
  /** Matches navbar "Heroes" list context vs spotlight "rankings" */
  profileFrom?: "heroes" | "rankings";
}) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (idx === current) return;
      setFading(true);
      setTimeout(() => {
        setCurrent(idx);
        setFading(false);
      }, 220);
    },
    [current]
  );

  const prev = () => goTo((current - 1 + heroes.length) % heroes.length);
  const next = () => goTo((current + 1) % heroes.length);

  useEffect(() => {
    if (heroes.length <= 1 || paused) return;
    const t = setInterval(() => {
      goTo((current + 1) % heroes.length);
    }, 5500);
    return () => clearInterval(t);
  }, [current, heroes.length, paused, goTo]);

  const hero = heroes[current];

  const orderedMedals = sortHeroMedalEntries(hero.medals, {
    nationalCountryCode: hero.countryCode,
  });
  const ribbonMedals = buildRibbonRackMedals(orderedMedals, {
    serviceBranch: hero.branch,
    nationalCountryCode: hero.countryCode,
  });

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-hover) 100%)",
        border: "1px solid var(--color-border)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Gold accent bar */}
      <div
        style={{
          height: 3,
          background:
            "linear-gradient(90deg, var(--color-gold), var(--color-gold-light), var(--color-gold))",
        }}
      />

      {/* Slide content */}
      <div
        className="p-6 sm:p-8 lg:p-10"
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 0.22s ease",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 lg:gap-10">
          {/* Avatar */}
          <div style={{ animation: "float 4s ease-in-out infinite" }} className="shrink-0">
            {hero.avatarUrl ? (
              <SafeWikimediaImg
                src={hero.avatarUrl}
                alt={hero.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover shadow-2xl"
                style={{ border: "3px solid var(--color-gold)" }}
              />
            ) : (
              <div style={{ borderRadius: 16, boxShadow: "0 0 0 3px var(--color-gold)" }}>
                <AvatarFallback name={hero.name} size={160} shape="rounded" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {/* Rank badge */}
            <div
              className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{
                backgroundColor: "var(--color-gold)",
                color: "var(--color-badge-text)",
              }}
            >
              <span>★</span>
              <span>Rank #{current + 1} of {heroes.length}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 leading-tight">
              {hero.name}
            </h2>
            <p className="text-sm sm:text-base mb-4" style={{ color: "var(--color-text-muted)" }}>
              {hero.rank}
              {hero.branch ? ` · ${hero.branch}` : ""}
              {hero.wars?.length ? ` · ${hero.wars.slice(0, 2).join(", ")}` : ""}
            </p>

            {/* Ribbon rack */}
            {ribbonMedals.length > 0 ? (
              <div className="mb-5 flex justify-center sm:justify-start overflow-x-auto">
                <RibbonRack
                  medals={ribbonMedals}
                  maxPerRow={Math.max(ribbonMedals.length, 1)}
                  countryCode={hero.countryCode}
                  scale={2}
                  disableLinks
                />
              </div>
            ) : null}

            {/* CTA row */}
            <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
              <span className="score-badge text-sm">{hero.score} pts</span>
              <Link
                href={`/heroes/${hero.slug}?from=${profileFrom}`}
                className="btn-secondary text-sm"
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      {heroes.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-50 hover:opacity-100"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-label="Previous"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-50 hover:opacity-100"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-label="Next"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Navigation dots */}
      {heroes.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-5">
          {heroes.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                borderRadius: 999,
                height: 6,
                width: i === current ? 24 : 6,
                backgroundColor:
                  i === current
                    ? "var(--color-gold)"
                    : "var(--color-border)",
                transition: "all 0.3s ease",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
