import type { CombatSpecialty } from "@/lib/models/Hero";
import Hero from "@/lib/models/Hero";
import {
  branchVariantsForQuery,
  normalizeBranch,
  normalizeWar,
  warVariantsForQuery,
} from "@/lib/hero-taxonomy";

/** Human-readable labels for combat specialty filters (matches category / explore pages). */
export const COMBAT_SPECIALTY_CONTEXT_LABEL: Partial<Record<CombatSpecialty, string>> = {
  infantry: "Infantry",
  armor: "Armor",
  artillery: "Artillery",
  aviation: "Fighter / combat pilot",
  airborne: "Airborne",
  special_operations: "Special operations",
  submarine: "Submarine command",
  surface: "Surface warfare",
  amphibious: "Amphibious",
  reconnaissance: "Reconnaissance",
  air_defense: "Air defense",
  engineering: "Engineering",
  signal: "Signal",
  intelligence: "Intelligence",
  medical: "Medical",
  logistics: "Logistics",
  chemical: "Chemical",
  electronic_warfare: "Electronic warfare",
  cyber: "Cyber",
  military_police: "Military police",
  ordnance: "Ordnance",
  sniper: "Sniper",
  marine: "Marine Corps",
};

export interface ContextualRankRow {
  /** Short label shown on the profile */
  label: string;
  /** 1-based rank among published heroes in this slice (higher score = better rank number) */
  rank: number;
  /** Number of published heroes in this slice */
  total: number;
}

type HeroRankSlice = {
  _id: string;
  score: number;
  branch: string;
  wars?: string[];
  combatAchievements?: { type?: string };
};

/**
 * Contextual leaderboard positions: same score ordering as the global list
 * (count published heroes with strictly higher `score`, then rank = count + 1).
 */
export async function getContextualRanksForHero(hero: HeroRankSlice): Promise<ContextualRankRow[]> {
  const published = { published: true } as const;
  const rows: ContextualRankRow[] = [];

  const higherIn = async (extra: Record<string, unknown>) =>
    Hero.countDocuments({ ...published, ...extra, score: { $gt: hero.score } });
  const totalIn = async (extra: Record<string, unknown>) =>
    Hero.countDocuments({ ...published, ...extra });

  const branchRaw = hero.branch?.trim();
  if (branchRaw) {
    const label = normalizeBranch(branchRaw);
    const branchIn = branchVariantsForQuery(label);
    const [higher, total] = await Promise.all([
      branchIn.length <= 1
        ? higherIn({ branch: branchIn[0] })
        : higherIn({ branch: { $in: branchIn } }),
      branchIn.length <= 1
        ? totalIn({ branch: branchIn[0] })
        : totalIn({ branch: { $in: branchIn } }),
    ]);
    rows.push({ label, rank: higher + 1, total });
  }

  const spec = hero.combatAchievements?.type as CombatSpecialty | undefined;
  if (spec && spec !== "none") {
    const label = COMBAT_SPECIALTY_CONTEXT_LABEL[spec] ?? spec;
    const [higher, total] = await Promise.all([
      higherIn({ "combatAchievements.type": spec }),
      totalIn({ "combatAchievements.type": spec }),
    ]);
    rows.push({ label, rank: higher + 1, total });
  }

  const warCanonSet = new Set<string>();
  for (const w of hero.wars ?? []) {
    const c = normalizeWar(w.trim());
    if (c) warCanonSet.add(c);
  }
  for (const war of warCanonSet) {
    const variants = warVariantsForQuery(war);
    const [higher, total] = await Promise.all([
      variants.length <= 1
        ? higherIn({ wars: variants[0] })
        : higherIn({ wars: { $in: variants } }),
      variants.length <= 1
        ? totalIn({ wars: variants[0] })
        : totalIn({ wars: { $in: variants } }),
    ]);
    rows.push({ label: war, rank: higher + 1, total });
  }

  return rows;
}
