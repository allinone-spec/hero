import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import Hero from "@/lib/models/Hero";
import { calculateScore } from "@/lib/scoring-engine";
import { DEFAULT_RIBBON_COLORS } from "@/components/ribbon-rack/ribbon-data";

const MEDAL_TYPES = [
  { name: "Medal of Honor", shortName: "MOH", category: "valor", basePoints: 100, precedenceOrder: 1 },
  { name: "Distinguished Service Cross", shortName: "DSC", category: "valor", basePoints: 60, precedenceOrder: 2 },
  { name: "Navy Cross", shortName: "NC", category: "valor", basePoints: 60, precedenceOrder: 3 },
  { name: "Air Force Cross", shortName: "AFC", category: "valor", basePoints: 60, precedenceOrder: 4 },
  { name: "Distinguished Service Medal", shortName: "DSM", category: "service", basePoints: 30, precedenceOrder: 5 },
  { name: "Silver Star", shortName: "SS", category: "valor", basePoints: 35, precedenceOrder: 6 },
  { name: "Legion of Merit", shortName: "LM", category: "service", basePoints: 20, precedenceOrder: 7 },
  { name: "Distinguished Flying Cross", shortName: "DFC", category: "valor", basePoints: 25, precedenceOrder: 8 },
  { name: "Bronze Star", shortName: "BSM", category: "valor", basePoints: 15, precedenceOrder: 9 },
  { name: "Purple Heart", shortName: "PH", category: "valor", basePoints: 8, precedenceOrder: 10 },
  { name: "Air Medal", shortName: "AM", category: "valor", basePoints: 10, precedenceOrder: 11 },
  { name: "Croix de Guerre", shortName: "CdG", category: "foreign", basePoints: 20, precedenceOrder: 12 },
  { name: "Foreign Valor Medal", shortName: "FVM", category: "foreign", basePoints: 20, precedenceOrder: 13 },
];

export async function POST() {
  try {
    await dbConnect();

    // Seed medal types
    const medalTypeMap: Record<string, string> = {};
    for (const mt of MEDAL_TYPES) {
      const existing = await MedalType.findOne({ name: mt.name });
      if (existing) {
        medalTypeMap[mt.shortName] = existing._id.toString();
        continue;
      }
      const created = await MedalType.create({
        ...mt,
        ribbonColors: DEFAULT_RIBBON_COLORS[mt.name] || ["#808080", "#C0C0C0", "#808080"],
        description: "",
      });
      medalTypeMap[mt.shortName] = created._id.toString();
    }

    // Top 10 heroes data
    const heroesData = [
      {
        name: "Audie Murphy",
        rank: "Second Lieutenant",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["MOH"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["LM"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["BSM"], count: 2, hasValor: true, valorDevices: 2 },
          { medalType: medalTypeMap["PH"], count: 3, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["CdG"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["FVM"], count: 1, hasValor: false, valorDevices: 0 },
        ],
        biography: "Audie Leon Murphy was one of the most decorated American combat soldiers of World War II. He received every military combat award for valor available from the U.S. Army, as well as French and Belgian awards for heroism. Murphy received the Medal of Honor for valor demonstrated at the Colmar Pocket in France in January 1945.",
        wars: ["World War II"],
        combatTours: 3,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: false,
      },
      {
        name: "John J. Pershing",
        rank: "General of the Armies",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSM"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["FVM"], count: 3, hasValor: false, valorDevices: 0 },
        ],
        biography: "John Joseph Pershing was a senior United States Army officer best known as the commander of the American Expeditionary Forces on the Western Front during World War I. He is the only person to be promoted in his own lifetime to the highest rank ever held in the U.S. Army — General of the Armies.",
        wars: ["Spanish-American War", "Philippine-American War", "World War I"],
        combatTours: 4,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: true,
      },
      {
        name: "Alvin C. York",
        rank: "Sergeant",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["MOH"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["CdG"], count: 1, hasValor: false, valorDevices: 0 },
        ],
        biography: "Alvin Cullum York was one of the most decorated United States Army soldiers of World War I. He received the Medal of Honor for leading an attack on a German machine gun nest, taking at least one machine gun, killing at least 25 enemy soldiers and capturing 132.",
        wars: ["World War I"],
        combatTours: 1,
        hadCombatCommand: false,
        powHeroism: false,
        multiServiceOrMultiWar: false,
      },
      {
        name: "Douglas MacArthur",
        rank: "General of the Army",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["MOH"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSM"], count: 3, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 7, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["PH"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["FVM"], count: 2, hasValor: false, valorDevices: 0 },
        ],
        biography: "Douglas MacArthur was an American military leader who served as General of the Army for the United States, as well as a field marshal to the Philippine Army. He played a prominent role in the Pacific theater during World War II and led the United Nations Command in the Korean War.",
        wars: ["World War I", "World War II", "Korean War"],
        combatTours: 5,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: true,
      },
      {
        name: "George S. Patton",
        rank: "General",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSM"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["LM"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["PH"], count: 1, hasValor: false, valorDevices: 0 },
        ],
        biography: "George Smith Patton Jr. was a general in the United States Army who commanded the U.S. Seventh Army in the Mediterranean theater and the U.S. Third Army in France and Germany after the Allied invasion of Normandy in June 1944.",
        wars: ["World War I", "World War II"],
        combatTours: 3,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: true,
      },
      {
        name: "Matthew Ridgway",
        rank: "General",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["DSC"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSM"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 2, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["PH"], count: 1, hasValor: false, valorDevices: 0 },
        ],
        biography: "Matthew Bunker Ridgway was a senior United States Army officer who held several major commands and was known for his role in the Korean War, where he revitalized the United Nations Command and turned the tide of the war.",
        wars: ["World War II", "Korean War"],
        combatTours: 3,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: true,
      },
      {
        name: "William C. Westmoreland",
        rank: "General",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSM"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["SS"], count: 3, hasValor: false, valorDevices: 0 },
        ],
        biography: "William Childs Westmoreland was a United States Army general who commanded military operations in the Vietnam War. He served as commander of the Military Assistance Command Vietnam from 1964 to 1968.",
        wars: ["World War II", "Korean War", "Vietnam War"],
        combatTours: 3,
        hadCombatCommand: true,
        powHeroism: false,
        multiServiceOrMultiWar: true,
      },
      {
        name: "Roy P. Benavidez",
        rank: "Master Sergeant",
        branch: "U.S. Army",
        medals: [
          { medalType: medalTypeMap["MOH"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["DSC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["PH"], count: 5, hasValor: false, valorDevices: 0 },
        ],
        biography: "Raul Perez \"Roy\" Benavidez was a member of the United States Army Special Forces. He was awarded the Medal of Honor for his valorous actions in a six-hour battle near Loc Ninh, Vietnam, where despite severe wounds he saved the lives of at least eight men.",
        wars: ["Vietnam War"],
        combatTours: 2,
        hadCombatCommand: false,
        powHeroism: false,
        multiServiceOrMultiWar: false,
      },
      {
        name: "John Basilone",
        rank: "Gunnery Sergeant",
        branch: "U.S. Marine Corps",
        medals: [
          { medalType: medalTypeMap["MOH"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["NC"], count: 1, hasValor: false, valorDevices: 0 },
          { medalType: medalTypeMap["PH"], count: 1, hasValor: false, valorDevices: 0 },
        ],
        biography: "John Basilone was a United States Marine Corps Gunnery Sergeant who received the Medal of Honor for his heroism at Guadalcanal and the Navy Cross for heroism at Iwo Jima, where he was killed in action. He remains the only enlisted Marine in World War II to receive both the Medal of Honor and the Navy Cross.",
        wars: ["World War II"],
        combatTours: 2,
        hadCombatCommand: false,
        powHeroism: false,
        multiServiceOrMultiWar: false,
      },
    ];

    // Seed heroes
    let created = 0;
    for (const heroData of heroesData) {
      const existing = await Hero.findOne({
        slug: heroData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      });

      if (existing) continue;

      // Build medal scoring data
      const medalTypes = await MedalType.find({
        _id: { $in: heroData.medals.map((m) => m.medalType) },
      }).lean();

      const medalMap = new Map(medalTypes.map((mt) => [mt._id.toString(), mt]));

      const medalScoringData = heroData.medals
        .map((m) => {
          const mt = medalMap.get(m.medalType);
          if (!mt) return null;
          return {
            name: mt.name,
            category: (mt as { category?: "valor" | "service" | "foreign" | "other" }).category,
            countryCode: (mt as { countryCode?: string }).countryCode,
            basePoints: mt.basePoints,
            valorPoints: (mt as { valorPoints?: number }).valorPoints ?? mt.basePoints,
            requiresValorDevice: (mt as { requiresValorDevice?: boolean }).requiresValorDevice ?? false,
            inherentlyValor: (mt as { inherentlyValor?: boolean }).inherentlyValor ?? false,
            valorTier: (mt as { tier?: number }).tier,
            count: m.count,
            hasValor: m.hasValor,
            valorDevices: m.valorDevices,
          };
        })
        .filter(Boolean) as { name: string; category?: "valor" | "service" | "foreign" | "other"; countryCode?: string; basePoints: number; valorPoints: number; requiresValorDevice: boolean; inherentlyValor: boolean; count: number; hasValor: boolean; valorDevices: number }[];

      const result = calculateScore({
        medals: medalScoringData,
        wars: heroData.wars,
        combatTours: heroData.combatTours,
        hadCombatCommand: heroData.hadCombatCommand,
        powHeroism: heroData.powHeroism,
        multiServiceOrMultiWar: heroData.multiServiceOrMultiWar,
        submarineCommandEligible: true,
        combatAchievements: { type: "none" as const },
      });

      await Hero.create({
        ...heroData,
        slug: heroData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        score: result.total,
        published: true,
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      medalTypesCount: MEDAL_TYPES.length,
      heroesCreated: created,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
