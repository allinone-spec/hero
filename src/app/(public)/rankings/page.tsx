import { Suspense } from "react";
import dbConnect from "@/lib/mongodb";
import Link from "next/link";
import HeroListClient from "../HeroListClient";
import HeroSlideshow from "@/components/ui/HeroSlideshow";
import AvatarFallback from "@/components/ui/AvatarFallback";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import type { Metadata } from "next";
import { getPublishedHeroesForPublicList } from "@/lib/public-heroes";
import { buildRibbonRackMedals } from "@/lib/rack-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "All-time rankings of decorated U.S. military heroes, objectively scored by the Unified Scoring Matrix (USM-25). From Medal of Honor to Purple Heart recipients.",
  openGraph: {
    title: "Hero Rankings — Medals N Bongs",
    description:
      "All-time rankings of America's most decorated military heroes.",
  },
  keywords: ["military rankings", "hero rankings", "most decorated soldiers", "USM-25 scores", "Medal of Honor recipients"],
};

/* ── Section divider ─────────────────────────────────────── */
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div>
        <h2 className="text-xl font-bold leading-none">{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{sub}</p>}
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div
      className="hero-card p-4 text-center animate-fade-in-up"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className="text-2xl font-bold mb-0.5"
        style={{ color: "var(--color-gold)" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

export default async function RankingsPage() {
  await dbConnect();
  const heroesForClient = await getPublishedHeroesForPublicList();

  const topHero = heroesForClient[0];
  const slideshowHeroes = heroesForClient.slice(0, Math.min(5, heroesForClient.length));

  const topRibbonMedals = topHero
    ? buildRibbonRackMedals(topHero.medals ?? [], {
        serviceBranch: topHero.branch,
        nationalCountryCode: topHero.countryCode,
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

      {/* ── Hero slideshow ───────────────────────────────── */}
      {slideshowHeroes.length > 0 && (
        <section>
          <HeroSlideshow heroes={slideshowHeroes} profileFrom="rankings" />
        </section>
      )}

      {/* ── Quick stats ────────────────────────────────────
      {heroesForClient.length > 0 && (
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="★" value={heroesForClient.length} label="Heroes Archived" />
            <StatCard icon="🎖" value={totalMedalAwards} label="Medal Awards" />
            <StatCard icon="⚔" value={uniqueWars.length} label="Conflicts Covered" />
            <StatCard icon="🏆" value={`${highestScore} pts`} label="Highest Score" />
          </div>
        </section>
      )} */}

      {/* ── Top Hero spotlight ────────────────────────────── */}
      {topHero && (
        <section>
          <SectionTitle title="Top Ranked Hero" sub="Highest USM-25 score in the archive" />

          <Link href={`/heroes/${topHero.slug}?from=rankings`} className="block group">
            <div
              className="hero-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
              style={{
                borderColor: "var(--color-gold)",
                boxShadow: "0 0 0 1px var(--color-gold), 0 8px 32px rgba(192,123,8,0.14)",
              }}
            >
              {/* Gold rank badge */}
              <div className="absolute top-4 right-4 hidden sm:block">
                <span
                  className="score-badge text-xs"
                  style={{ background: "linear-gradient(135deg,var(--color-gold),var(--color-gold-light))" }}
                >
                  ★ #1 Ranked
                </span>
              </div>

              {/* Avatar */}
              <div className="shrink-0">
                {topHero.avatarUrl ? (
                  <img
                    src={topHero.avatarUrl}
                    alt={topHero.name}
                    className="w-32 h-32 rounded-2xl object-cover shadow-xl"
                    style={{ border: "3px solid var(--color-gold)" }}
                  />
                ) : (
                  <div style={{ borderRadius: 16, boxShadow: "0 0 0 3px var(--color-gold)" }}>
                    <AvatarFallback name={topHero.name} size={128} shape="rounded" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "var(--color-gold)" }}
                >
                  All-Time #1 · USM-25 Champion
                </p>
                <h3
                  className="text-2xl sm:text-3xl font-bold mb-1 group-hover:text-[var(--color-gold)] transition-colors"
                >
                  {topHero.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                  {topHero.rank}
                  {topHero.branch ? ` · ${topHero.branch}` : ""}
                  {topHero.wars?.length ? ` · ${(topHero.wars as string[]).join(", ")}` : ""}
                </p>

                {topRibbonMedals.length > 0 ? (
                  <div className="mb-4 flex justify-center sm:justify-start overflow-x-auto">
                    <RibbonRack
                      medals={topRibbonMedals}
                      maxPerRow={Math.max(topRibbonMedals.length, 1)}
                      countryCode={topHero.countryCode}
                      scale={2}
                      disableLinks
                    />
                  </div>
                ) : null}

                {topHero.biography && (
                  <p
                    className="text-sm leading-relaxed line-clamp-2 mb-4"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {topHero.biography}
                  </p>
                )}

                <div className="flex justify-center sm:justify-start">
                  <span className="score-badge">{topHero.score} pts</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── Branch breakdown ────────────────────────────────
      {uniqueBranches.length > 0 && (
        <section>
          <SectionTitle title="Branches Represented" />
          <div className="flex flex-wrap gap-2">
            {uniqueBranches.map((branch) => {
              const count = serialized.filter((h) => h.branch === branch).length;
              return (
                <div
                  key={branch}
                  className="hero-card px-4 py-2.5 flex items-center gap-2 animate-fade-in"
                >
                  <span className="text-sm font-semibold">{branch}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: "var(--color-gold)",
                      color: "var(--color-badge-text)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )} */}

      <section>
        <SectionTitle title="Full archive" sub="Sorted by USM-25 score · filter below" />
        <Suspense>
          <HeroListClient heroes={heroesForClient} profileFrom="rankings" />
        </Suspense>
      </section>
    </div>
  );
}

