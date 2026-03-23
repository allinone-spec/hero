import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import ScoringConfig from "@/lib/models/ScoringConfig";
import { getSession } from "@/lib/auth";
import { calculateScore, DEFAULT_SCORING_CONFIG, ScoringConfig as IScoringConfig } from "@/lib/scoring-engine";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const rawConfig = await ScoringConfig.findOne({ key: "default" }).lean();
  const config: IScoringConfig = rawConfig
    ? {
        valorDevicePoints: rawConfig.valorDevicePoints,
        theaterBonusPerWar: rawConfig.theaterBonusPerWar,
        combatLeadershipBonus: rawConfig.combatLeadershipBonus,
        powHeroismBonus: rawConfig.powHeroismBonus,
        woundsBonusPerHeart: rawConfig.woundsBonusPerHeart,
        aviationKillThreshold: rawConfig.aviationKillThreshold,
        aviationKillPtsPerKill: rawConfig.aviationKillPtsPerKill,
        aviationMissionPts: rawConfig.aviationMissionPts,
        submarineShipThreshold: rawConfig.submarineShipThreshold,
        submarineShipPtsPerShip: rawConfig.submarineShipPtsPerShip,
        submarineMissionPts: rawConfig.submarineMissionPts,
        surfaceEngagementPts: rawConfig.surfaceEngagementPts,
        surfaceMissionPts: rawConfig.surfaceMissionPts,
        multiServiceBonusPct: rawConfig.multiServiceBonusPct,
        roundingBase: rawConfig.roundingBase,
      }
    : DEFAULT_SCORING_CONFIG;

  const heroes = await Hero.find({}).populate("medals.medalType");
  let count = 0;

  for (const hero of heroes) {
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

    const result = calculateScore(
      {
        medals: medalData,
        wars: hero.wars,
        combatTours: hero.combatTours,
        hadCombatCommand: hero.hadCombatCommand,
        powHeroism: hero.powHeroism,
        multiServiceOrMultiWar: hero.multiServiceOrMultiWar,
        combatAchievements: hero.combatAchievements,
      },
      config
    );

    await Hero.findByIdAndUpdate(hero._id, { score: result.total });
    count++;
  }

  return NextResponse.json({ recalculated: count });
}
