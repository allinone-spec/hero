import { ScoreBreakdownItem, ScoreResult } from "@/types";
import type { CombatSpecialty } from "@/lib/models/Hero";

// ─── Medal catalog scoring (USM-25.2 — 1–100 heroic scale, CSV + Valor_Tier) ─
// See `src/lib/medal-inventory-scoring.ts` and `data/medal-inventory/*.csv`.

import { NON_HEROIC_VALOR_TIER } from "@/lib/medal-inventory-scoring";

interface MedalForScoring {
  name: string;
  basePoints: number;
  valorPoints: number;
  category?: "valor" | "service" | "foreign" | "other";
  countryCode?: string;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  /** 1–4 = heroic tiers; 5+ = no heroic points (service/campaign). */
  valorTier?: number;
  count: number;
  hasValor: boolean;
  valorDevices: number;
}

interface HeroForScoring {
  medals: MedalForScoring[];
  wars: string[];
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  /** When false, submarine ship-sink modifier is skipped (master doc §12 command role) */
  submarineCommandEligible?: boolean;
  combatAchievements: {
    type: CombatSpecialty;
    confirmedKills?: number;
    probableKills?: number;
    damagedAircraft?: number;
    flightLeadership?: boolean;
    shipsSunk?: number;
    warPatrols?: number;
    majorEngagements?: number;
    definingMissions?: number;
  };
}

/**
 * Resolves heroic points for one medal instance from catalog `Bong_Score` / `valorPoints`
 * and `Valor_Tier` (tier ≥ 5 → 0 heroic points). V-device medals only score when `hasValor`.
 */
function resolveMedalPoints(medal: MedalForScoring): number {
  const t = medal.valorTier;
  if (t == null || t < 1 || t >= NON_HEROIC_VALOR_TIER) {
    return 0;
  }
  if (medal.inherentlyValor) {
    return medal.valorPoints;
  }
  if (medal.requiresValorDevice) {
    return medal.hasValor ? medal.valorPoints : 0;
  }
  return medal.basePoints;
}

// ─── USM-25 SCORING ENGINE (Matrix 2.0) ─────────────────────────────────────

export function calculateScore(hero: HeroForScoring): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  let subtotal = 0;

  // ── WEIGHTED MEDAL VALUES (Heroism Matrix) ──
  // Every medal on the hero appears here so Score Breakdown matches Awards / Ribbon Rack.
  for (const medal of hero.medals) {
    const ptsPerMedal = resolveMedalPoints(medal);
    const medalPoints = ptsPerMedal * medal.count;
    const countInLabel = medal.count > 1 ? ` x${medal.count}` : "";
    const vLabel = medal.requiresValorDevice && medal.hasValor ? " (V)" : "";

    if (medalPoints > 0) {
      breakdown.push({
        label: `${medal.name}${vLabel}${countInLabel}`,
        points: medalPoints,
        detail: `${ptsPerMedal} pts × ${medal.count}`,
      });
      subtotal += medalPoints;
      continue;
    }

    let label: string;
    let detail: string;
    if (medal.valorTier == null || medal.valorTier < 1 || medal.valorTier >= NON_HEROIC_VALOR_TIER) {
      label = `${medal.name}${countInLabel}`;
      detail =
        medal.valorTier != null && medal.valorTier >= NON_HEROIC_VALOR_TIER
          ? "Not counted toward heroic score (Valor_Tier ≥ 5)"
          : "Re-import medals or set Valor_Tier 1–4 for heroic catalog scoring";
    } else if (medal.requiresValorDevice && !medal.hasValor && medal.valorPoints > 0) {
      label = `${medal.name} (no V device)${countInLabel}`;
      detail = "Meritorious service — 0 heroic pts (V device required for this award)";
    } else {
      label = `${medal.name}${vLabel}${countInLabel}`;
      if (medal.requiresValorDevice && !medal.hasValor && medal.valorPoints === 0) {
        detail = "No V device and valor line is 0 in catalog — check medal type";
      } else if (!medal.inherentlyValor && !medal.requiresValorDevice && medal.basePoints === 0) {
        detail = "USM-25: not scored (non-heroism / decorative award)";
      } else if (medal.inherentlyValor && medal.valorPoints === 0) {
        detail = "Inherently-valor award has 0 pts in catalog — check medal type";
      } else if (medal.requiresValorDevice && medal.hasValor && medal.valorPoints === 0) {
        detail = "V device recorded but valor line is 0 in catalog";
      } else {
        detail = `0 heroic pts (${ptsPerMedal} × ${medal.count})`;
      }
    }
    breakdown.push({ label, points: 0, detail });
  }

  return { total: subtotal, breakdown };
}

/**
 * 0–100 browse index from catalog heroic total only (capped). Extra args kept for call-site
 * compatibility; they are not used.
 */
export function calculateComparisonScore(
  usm25Total: number,
  _medalRows?: { count: number; hasValor: boolean }[],
  _warsLength?: number,
  _multiServiceOrMultiWar?: boolean
): number {
  return Math.max(0, Math.min(100, Math.round(usm25Total)));
}

// ─── TIE-BREAKER LOGIC ──────────────────────────────────────

export interface HeroForRanking {
  _id: string;
  name: string;
  score: number;
  orderOverride: number | null;
  highestSingleAward: number;
  combatTours: number;
  totalWounds: number;
}

export function rankHeroes(heroes: HeroForRanking[]): HeroForRanking[] {
  return [...heroes].sort((a, b) => {
    if (a.orderOverride !== null && b.orderOverride !== null) {
      return a.orderOverride - b.orderOverride;
    }
    if (a.orderOverride !== null) return -1;
    if (b.orderOverride !== null) return 1;

    if (b.score !== a.score) return b.score - a.score;

    if (b.highestSingleAward !== a.highestSingleAward) {
      return b.highestSingleAward - a.highestSingleAward;
    }

    if (b.combatTours !== a.combatTours) {
      return b.combatTours - a.combatTours;
    }

    if (b.totalWounds !== a.totalWounds) {
      return b.totalWounds - a.totalWounds;
    }

    return a.name.localeCompare(b.name);
  });
}
