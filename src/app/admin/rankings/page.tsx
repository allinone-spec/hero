import { Suspense } from "react";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import Link from "next/link";
import HeroListClient from "./HeroListClient";
import HeroSlideshow from "@/components/ui/HeroSlideshow";
import AvatarFallback from "@/components/ui/AvatarFallback";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import WikiRibbonRackDisplay from "@/components/ribbon-rack/WikiRibbonRackDisplay";

export const dynamic = "force-dynamic";

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

export default async function AdminRankingsPage() {
  await dbConnect();

  const heroes = await Hero.find({ published: true })
    .populate("medals.medalType")
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = (heroes as any[]).sort((a, b) => {
    if (a.orderOverride != null && b.orderOverride != null)
      return a.orderOverride - b.orderOverride;
    if (a.orderOverride != null) return -1;
    if (b.orderOverride != null) return 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized: any[] = JSON.parse(JSON.stringify(sorted));

  const topHero = serialized[0];
  const slideshowHeroes = serialized.slice(0, Math.min(5, serialized.length));

  /* Top hero ribbon medals */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topRibbons = topHero
    ? (topHero.medals ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => m.medalType)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({
          name: m.medalType.name,
          count: m.count,
          precedenceOrder: m.medalType.precedenceOrder,
          ribbonColors: m.medalType.ribbonColors?.length > 0 ? m.medalType.ribbonColors : ["#808080"],
          ribbonImageUrl: m.medalType.ribbonImageUrl,
          hasValor: m.hasValor,
          deviceImages: m.deviceImages,
        }))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

      {/* ── Hero slideshow ───────────────────────────────── */}
      {slideshowHeroes.length > 0 && (
        <section>
          <HeroSlideshow heroes={slideshowHeroes} />
        </section>
      )}

      {/* ── Top Hero spotlight ────────────────────────────── */}
      {topHero && (
        <section>
          <SectionTitle title="Top Ranked Hero" sub="Highest USM-25 score in the archive" />

          <Link href={`/admin/rankings/${topHero._id}`} className="block group">
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

                {topHero.wikiRibbonRack?.length > 0 ? (
                  <div className="mb-4 flex justify-center sm:justify-start">
                    <WikiRibbonRackDisplay
                      cells={topHero.wikiRibbonRack}
                      maxPerRow={topHero.ribbonMaxPerRow || 4}
                      ribbonScale={0.85}
                      rackGap={topHero.rackGap ?? 6}
                    />
                  </div>
                ) : topRibbons.length > 0 ? (
                  <div className="mb-4 flex justify-center sm:justify-start">
                    <RibbonRack medals={topRibbons} maxPerRow={8} scale={2} />
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

                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <span className="score-badge">{topHero.score} pts</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    View full profile →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── Full rankings ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div>
              <h2 className="text-xl font-bold leading-none">Category</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Full archive · sorted by USM-25 score</p>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          </div>
        </div>
        <Suspense>
          <HeroListClient heroes={serialized} />
        </Suspense>
      </section>
    </div>
  );
}
