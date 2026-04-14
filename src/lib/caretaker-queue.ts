import Hero from "@/lib/models/Hero";
import MedalType from "@/lib/models/MedalType";
import {
  calculateComparisonScore,
  calculateScore,
  DEFAULT_SCORING_CONFIG,
  type ScoringConfig,
} from "@/lib/scoring-engine";

interface ImportResultLike {
  name?: string;
  rank?: string;
  branch?: string;
  biography?: string;
  wars?: string[];
  avatarUrl?: string;
  combatType?: string;
  multiServiceOrMultiWar?: boolean;
  aiMedals?: Array<{
    medalTypeId: string;
    count: number;
    hasValor: boolean;
    valorDevices?: number;
    arrowheads?: number;
    deviceImages?: { url: string; deviceType: string; count: number }[];
    ribbonUrl?: string;
  }>;
  metadataTags?: string[];
  countryCode?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueHeroSlug(name: string): Promise<string> {
  const base = slugify(name || "hero");
  let slug = base;
  let n = 2;
  while (await Hero.exists({ slug })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createHeroFromImportResult(input: {
  result: ImportResultLike;
  sourceUrl?: string;
  scoringConfig?: ScoringConfig;
}) {
  const result = input.result;
  const aiMedals = Array.isArray(result.aiMedals) ? result.aiMedals : [];
  const medalTypeIds = aiMedals.map((m) => m.medalTypeId);
  const medalTypeDocs = await MedalType.find({ _id: { $in: medalTypeIds } }).lean<
    Array<{
      _id: { toString(): string };
      name: string;
      category?: "valor" | "service" | "foreign" | "other";
      countryCode?: string;
      basePoints: number;
      valorPoints?: number;
      requiresValorDevice?: boolean;
      inherentlyValor?: boolean;
      tier?: number;
    }>
  >();
  const medalTypeMap = new Map(medalTypeDocs.map((mt) => [mt._id.toString(), mt]));

  const medals = aiMedals
    .filter((m) => medalTypeMap.has(m.medalTypeId))
    .map((m) => ({
      medalType: m.medalTypeId,
      count: Math.max(1, Number(m.count) || 1),
      hasValor: Boolean(m.hasValor),
      valorDevices: Math.max(0, Number(m.valorDevices) || (m.hasValor ? 1 : 0)),
      arrowheads: Math.max(0, Number(m.arrowheads) || 0),
      deviceImages: Array.isArray(m.deviceImages) ? m.deviceImages : [],
      wikiRibbonUrl: m.ribbonUrl || "",
    }));

  const medalData = medals.map((m) => {
    const mt = medalTypeMap.get(String(m.medalType))!;
    return {
      name: mt.name,
      category: mt.category,
      countryCode: mt.countryCode,
      basePoints: mt.basePoints ?? 0,
      valorPoints: mt.valorPoints ?? mt.basePoints ?? 0,
      requiresValorDevice: mt.requiresValorDevice ?? false,
      inherentlyValor: mt.inherentlyValor ?? false,
      valorTier: mt.tier,
      count: m.count,
      hasValor: m.hasValor,
      valorDevices: m.valorDevices,
    };
  });

  const wars = Array.isArray(result.wars) ? result.wars.filter(Boolean) : [];
  const scoreResult = calculateScore(
    {
      medals: medalData,
      wars,
      combatTours: 0,
      hadCombatCommand: false,
      powHeroism: false,
      multiServiceOrMultiWar: Boolean(result.multiServiceOrMultiWar),
      submarineCommandEligible: true,
      combatAchievements: {
        type: (result.combatType as
          | "none"
          | "infantry"
          | "armor"
          | "artillery"
          | "aviation"
          | "airborne"
          | "special_operations"
          | "submarine"
          | "surface"
          | "amphibious"
          | "reconnaissance"
          | "air_defense"
          | "engineering"
          | "signal"
          | "intelligence"
          | "medical"
          | "logistics"
          | "chemical"
          | "electronic_warfare"
          | "cyber"
          | "military_police"
          | "ordnance"
          | "sniper"
          | "marine") || "none",
      },
    },
    input.scoringConfig || DEFAULT_SCORING_CONFIG
  );

  const slug = await uniqueHeroSlug(String(result.name || "Unnamed Hero"));

  const hero = await Hero.create({
    name: String(result.name || "Unnamed Hero"),
    slug,
    wikiUrl: input.sourceUrl || "",
    rank: String(result.rank || "Unknown"),
    branch: String(result.branch || "U.S. Army"),
    avatarUrl: String(result.avatarUrl || ""),
    medals,
    biography: String(result.biography || ""),
    wars,
    combatTours: 0,
    hadCombatCommand: false,
    powHeroism: false,
    multiServiceOrMultiWar: Boolean(result.multiServiceOrMultiWar),
    combatAchievements: { type: result.combatType || "none" },
    countryCode: String(result.countryCode || "US").toUpperCase(),
    metadataTags: Array.isArray(result.metadataTags) ? result.metadataTags : [],
    isVerified: false,
    score: scoreResult.total,
    comparisonScore: calculateComparisonScore(
      scoreResult.total,
      medalData.map((m) => ({ count: m.count, hasValor: m.hasValor })),
      wars.length,
      Boolean(result.multiServiceOrMultiWar)
    ),
    published: false,
  });

  return hero;
}
