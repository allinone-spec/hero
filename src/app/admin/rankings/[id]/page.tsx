import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import { calculateScore } from "@/lib/scoring-engine";
import HeroDetailClient from "./HeroDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminRankingsHeroPage({ params }: Props) {
  await dbConnect();
  const { id } = await params;

  const [hero, rankCount] = await Promise.all([
    Hero.findById(id)
      .populate("medals.medalType")
      .lean(),
    Hero.findById(id).select("score").lean().then(async (h) => {
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
    category?: "valor" | "service" | "foreign" | "other";
    countryCode?: string;
    tier?: number;
  }
  const medalData = hero.medals
    .filter((m: { medalType: PopulatedMedalType | null }) => m.medalType)
    .map((m: { medalType: PopulatedMedalType; count: number; hasValor: boolean; valorDevices: number }) => ({
      name: m.medalType.name,
      category: m.medalType.category,
      countryCode: m.medalType.countryCode,
      basePoints: m.medalType.basePoints,
      valorPoints: m.medalType.valorPoints ?? m.medalType.basePoints,
      requiresValorDevice: m.medalType.requiresValorDevice ?? false,
      inherentlyValor: m.medalType.inherentlyValor ?? false,
      valorTier: m.medalType.tier,
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
    submarineCommandEligible: hero.submarineCommandEligible !== false,
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
      />
    </div>
  );
}
