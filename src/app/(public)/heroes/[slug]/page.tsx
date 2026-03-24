import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import { calculateScore } from "@/lib/scoring-engine";
import HeroDetailClient from "./HeroDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await dbConnect();
  const { slug } = await params;
  const hero = await Hero.findOne({ slug, published: true })
    .select("name rank score biography")
    .lean();

  if (!hero) return { title: "Hero Not Found" };

  const bioExcerpt = hero.biography?.substring(0, 160)?.replace(/\s+\S*$/, "") || "";

  return {
    title: hero.name,
    description: `${hero.name}, ${hero.rank}. USM-25 Score: ${hero.score} pts. ${bioExcerpt}...`,
    openGraph: {
      title: `${hero.name} — ${hero.score} pts — Medals N Bongs`,
      description: hero.biography?.substring(0, 200) || `Profile of ${hero.name}, ${hero.rank}.`,
    },
    twitter: {
      card: "summary",
      title: `${hero.name} — ${hero.score} pts`,
      description: bioExcerpt || `${hero.name}, ${hero.rank}`,
    },
    keywords: [hero.name, hero.rank, "military hero", "decorated veteran", "USM-25"].filter(Boolean) as string[],
  };
}

export default async function HeroPage({ params, searchParams }: Props) {
  await dbConnect();
  const { slug } = await params;
  const query = await searchParams;
  const fromRaw = query.from;
  const fromOk =
    fromRaw === "my-heroes" || fromRaw === "rankings" || fromRaw === "heroes" ? fromRaw : undefined;
  const profileBack =
    fromOk === "my-heroes"
      ? { href: "/my-heroes" as const, label: "< Back to My Heroes" as const }
      : fromOk === "rankings"
        ? { href: "/rankings" as const, label: "< Back to Rankings" as const }
        : { href: "/rankings" as const, label: "< Back to Heroes" as const };

  // Run hero fetch and rank count in parallel
  const [hero, rankCount] = await Promise.all([
    Hero.findOne({ slug, published: true })
      .populate("medals.medalType")
      .lean(),
    // Count heroes with higher score for rank position (much faster than fetching all)
    Hero.findOne({ slug, published: true }).select("score").lean().then(async (h) => {
      if (!h) return 0;
      const higherCount = await Hero.countDocuments({
        published: true,
        score: { $gt: h.score },
      });
      return higherCount + 1;
    }),
  ]);

  if (!hero) notFound();

  // Calculate full score breakdown
  interface PopulatedMedalType {
    name: string;
    basePoints: number;
    valorPoints?: number;
    requiresValorDevice?: boolean;
    inherentlyValor?: boolean;
  }
  const medalData = hero.medals
    .filter((m: { medalType: PopulatedMedalType | null }) => m.medalType)
    .map((m: { medalType: PopulatedMedalType; count: number; hasValor: boolean; valorDevices: number }) => ({
      name: m.medalType.name,
      basePoints: m.medalType.basePoints,
      valorPoints: m.medalType.valorPoints ?? m.medalType.basePoints,
      requiresValorDevice: m.medalType.requiresValorDevice ?? false,
      inherentlyValor: m.medalType.inherentlyValor ?? false,
      count: m.count,
      hasValor: m.hasValor,
      valorDevices: m.valorDevices,
    }));

  const scoreResult = calculateScore({
    medals: medalData,
    wars: hero.wars,
    combatTours: hero.combatTours,
    hadCombatCommand: hero.hadCombatCommand,
    powHeroism: hero.powHeroism,
    multiServiceOrMultiWar: hero.multiServiceOrMultiWar,
    combatAchievements: hero.combatAchievements || { type: "none" },
  });

  const serialized = JSON.parse(JSON.stringify(hero));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <HeroDetailClient
        hero={serialized}
        scoreBreakdown={scoreResult.breakdown}
        scoreTotal={scoreResult.total}
        rankPosition={rankCount}
        profileBackHref={profileBack.href}
        profileBackLabel={profileBack.label}
      />
    </div>
  );
}
