import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { getSession } from "@/lib/auth";
import { calculateComparisonScore, calculateScore } from "@/lib/scoring-engine";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const heroes = await Hero.find({}).populate("medals.medalType");
  let count = 0;

  for (const hero of heroes) {
    interface PopulatedMedalType {
      name: string;
      category?: "valor" | "service" | "foreign" | "other";
      countryCode?: string;
      basePoints: number;
      valorPoints?: number;
      requiresValorDevice?: boolean;
      inherentlyValor?: boolean;
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

    const result = calculateScore({
      medals: medalData,
      wars: hero.wars,
      combatTours: hero.combatTours,
      hadCombatCommand: hero.hadCombatCommand,
      powHeroism: hero.powHeroism,
      multiServiceOrMultiWar: hero.multiServiceOrMultiWar,
      submarineCommandEligible: hero.submarineCommandEligible !== false,
      combatAchievements: hero.combatAchievements,
    });

    const comparisonScore = calculateComparisonScore(
      result.total,
      medalData.map((m: { count: number; hasValor: boolean }) => ({ count: m.count, hasValor: m.hasValor })),
      hero.wars?.length ?? 0,
      Boolean(hero.multiServiceOrMultiWar)
    );
    await Hero.findByIdAndUpdate(hero._id, { score: result.total, comparisonScore });
    count++;
  }

  return NextResponse.json({ recalculated: count });
}
