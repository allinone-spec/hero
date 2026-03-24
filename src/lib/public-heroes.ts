import Hero from "@/lib/models/Hero";
import { isAdoptionActive } from "@/lib/adoption";

export interface PublicHeroListItem {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  biography?: string;
  wars: string[];
  score: number;
  avatarUrl?: string;
  medals: {
    medalType: {
      _id?: string;
      name: string;
      precedenceOrder: number;
      ribbonColors: string[];
      ribbonImageUrl?: string;
    };
    count: number;
    hasValor: boolean;
    deviceImages?: { url: string; deviceType: string; count: number }[];
  }[];
  ribbonMaxPerRow?: number;
  rackGap?: number;
  combatAchievements?: {
    type: string;
  };
  countryCode?: string;
  comparisonScore?: number | null;
  memberSupported: boolean;
  availableForAdoption: boolean;
  adoptionExpiry?: string | null;
}

export async function getPublishedHeroesForPublicList(): Promise<PublicHeroListItem[]> {
  const heroes = await Hero.find({ published: true })
    .populate("medals.medalType")
    .lean();

  const sorted = (heroes as Array<Record<string, unknown>>).sort((a, b) => {
    const aOrder = (a.orderOverride as number | null | undefined) ?? null;
    const bOrder = (b.orderOverride as number | null | undefined) ?? null;
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    const aScore = Number(a.score || 0);
    const bScore = Number(b.score || 0);
    if (bScore !== aScore) return bScore - aScore;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return JSON.parse(JSON.stringify(sorted)).map((hero: Record<string, unknown>) => {
    const ownerUserId = hero.ownerUserId ? String(hero.ownerUserId) : null;
    const adoptionExpiry = hero.adoptionExpiry ? String(hero.adoptionExpiry) : null;
    const supported = Boolean(ownerUserId && isAdoptionActive(adoptionExpiry));
    return {
      ...hero,
      memberSupported: supported,
      availableForAdoption: !supported,
      adoptionExpiry,
    };
  }) as PublicHeroListItem[];
}
