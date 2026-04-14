import { ScoreBreakdownItem, ScoreResult } from "@/types";
import type { CombatSpecialty } from "@/lib/models/Hero";

// ─── Medal catalog scoring (USM-25 v1 — 1–100 heroic scale, CSV + Valor_Tier) ─
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

function normalizeMedalName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

export interface ScoringConfig {
  valorDevicePoints: number;
  theaterBonusPerWar: number;
  combatLeadershipBonus: number;
  powHeroismBonus: number;
  woundsBonusPerHeart: number;
  aviationKillThreshold: number;
  aviationKillPtsPerKill: number;
  aviationMissionPts: number;
  /** Points per probable kill (aviation), after finer modifiers */
  aviationProbablePtsPer: number;
  /** Points per aircraft damaged (ground/sea) */
  aviationDamagedPtsPer: number;
  /** One-time bonus when marked flight / squadron leadership */
  aviationFlightLeadershipBonus: number;
  submarineShipThreshold: number;
  submarineShipPtsPerShip: number;
  submarineMissionPts: number;
  /** Points per completed war patrol (submarine specialty) */
  submarineWarPatrolPtsPer: number;
  surfaceEngagementPts: number;
  surfaceMissionPts: number;
  multiServiceBonusPct: number;
  roundingBase: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  valorDevicePoints: 2,
  theaterBonusPerWar: 5,
  combatLeadershipBonus: 10,
  powHeroismBonus: 15,
  woundsBonusPerHeart: 5,
  aviationKillThreshold: 5,
  aviationKillPtsPerKill: 2,
  aviationMissionPts: 25,
  aviationProbablePtsPer: 0,
  aviationDamagedPtsPer: 0,
  aviationFlightLeadershipBonus: 0,
  submarineShipThreshold: 3,
  submarineShipPtsPerShip: 5,
  submarineMissionPts: 25,
  submarineWarPatrolPtsPer: 0,
  surfaceEngagementPts: 5,
  surfaceMissionPts: 10,
  multiServiceBonusPct: 5,
  roundingBase: 5,
};

/** Merge persisted rules with defaults so new rule keys work on older DB documents */
export function mergeScoringConfig(
  raw: Partial<Record<keyof ScoringConfig, number>> | null | undefined
): ScoringConfig {
  const out: ScoringConfig = { ...DEFAULT_SCORING_CONFIG };
  if (!raw) return out;
  for (const k of Object.keys(DEFAULT_SCORING_CONFIG) as (keyof ScoringConfig)[]) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  return out;
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

export function calculateScore(
  hero: HeroForScoring,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  let subtotal = 0;

  // ── 1. WEIGHTED MEDAL VALUES (Heroism Matrix) ──
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

  // ── 2. ADDITIONAL VALOR DEVICE CLUSTERS ──
  for (const medal of hero.medals) {
    if (medal.valorDevices > 1) {
      // First V device is already accounted for in hasValor scoring;
      // additional V devices represent additional acts of valor
      const extraDevices = medal.valorDevices - 1;
      const valorPoints = extraDevices * config.valorDevicePoints;
      breakdown.push({
        label: `Additional Valor Devices (${medal.name})`,
        points: valorPoints,
        detail: `${extraDevices} extra V device(s) × ${config.valorDevicePoints} pts`,
      });
      subtotal += valorPoints;
    }
  }

  // ── 3. COMBAT THEATER BONUS ──
  if (hero.wars.length > 0) {
    const theaterPoints = hero.wars.length * config.theaterBonusPerWar;
    breakdown.push({
      label: "Combat Theater Bonus",
      points: theaterPoints,
      detail: `${hero.wars.length} war(s)/theater(s) × ${config.theaterBonusPerWar} pts`,
    });
    subtotal += theaterPoints;
  }

  // ── 4. COMBAT LEADERSHIP BONUS ──
  if (hero.hadCombatCommand) {
    breakdown.push({
      label: "Combat Leadership Bonus",
      points: config.combatLeadershipBonus,
      detail: "Unit-level command in combat",
    });
    subtotal += config.combatLeadershipBonus;
  }

  // ── 5. POW / SURVIVAL HEROISM BONUS ──
  if (hero.powHeroism) {
    breakdown.push({
      label: "POW / Survival Heroism Bonus",
      points: config.powHeroismBonus,
      detail: "Extended captivity, escape, or leadership under torture",
    });
    subtotal += config.powHeroismBonus;
  }

  // ── 6. WOUNDS BONUS (Purple Heart / wound stripe — first instance 0, +5 each additional)
  let totalWoundInstances = 0;
  for (const m of hero.medals) {
    const n = normalizeMedalName(m.name || "");
    if (!/purple heart|wound stripe/.test(n)) continue;
    totalWoundInstances += Math.max(0, m.count);
  }
  if (totalWoundInstances > 1) {
    const woundsPoints = (totalWoundInstances - 1) * config.woundsBonusPerHeart;
    breakdown.push({
      label: "Wounds Bonus",
      points: woundsPoints,
      detail: `${totalWoundInstances - 1} wound instance(s) after first × ${config.woundsBonusPerHeart} pts`,
    });
    subtotal += woundsPoints;
  }

  // ── 7. COMBAT ACHIEVEMENT MODIFIER ──
  const ca = hero.combatAchievements;
  if (ca.type === "aviation") {
    const kills = ca.confirmedKills ?? 0;
    if (kills >= config.aviationKillThreshold) {
      const killPts =
        config.aviationMissionPts +
        (kills - config.aviationKillThreshold) * config.aviationKillPtsPerKill;
      breakdown.push({
        label: "Aviation Ace Bonus",
        points: killPts,
        detail: `${config.aviationMissionPts} for ace threshold (${config.aviationKillThreshold} kills) + ${Math.max(0, kills - config.aviationKillThreshold)} × ${config.aviationKillPtsPerKill}`,
      });
      subtotal += killPts;
    }
    const probables = ca.probableKills ?? 0;
    if (probables > 0 && config.aviationProbablePtsPer > 0) {
      const pPts = probables * config.aviationProbablePtsPer;
      breakdown.push({
        label: "Aviation Probable Kills",
        points: pPts,
        detail: `${probables} probable × ${config.aviationProbablePtsPer} pts`,
      });
      subtotal += pPts;
    }
    const damaged = ca.damagedAircraft ?? 0;
    if (damaged > 0 && config.aviationDamagedPtsPer > 0) {
      const dPts = damaged * config.aviationDamagedPtsPer;
      breakdown.push({
        label: "Aviation Damaged Aircraft",
        points: dPts,
        detail: `${damaged} damaged × ${config.aviationDamagedPtsPer} pts`,
      });
      subtotal += dPts;
    }
    if (ca.flightLeadership && config.aviationFlightLeadershipBonus > 0) {
      breakdown.push({
        label: "Aviation Leadership Bonus",
        points: config.aviationFlightLeadershipBonus,
        detail: "Squadron / wing leadership or equivalent",
      });
      subtotal += config.aviationFlightLeadershipBonus;
    }
  } else if (ca.type === "submarine") {
    if (hero.submarineCommandEligible !== false) {
      const sunk = ca.shipsSunk ?? 0;
      if (sunk >= config.submarineShipThreshold) {
        const sunkPts =
          config.submarineMissionPts +
          (sunk - config.submarineShipThreshold) * config.submarineShipPtsPerShip;
        breakdown.push({
          label: "Submarine Command Bonus",
          points: sunkPts,
          detail: `${config.submarineMissionPts} for first ${config.submarineShipThreshold} ships + ${Math.max(0, sunk - config.submarineShipThreshold)} × ${config.submarineShipPtsPerShip}`,
        });
        subtotal += sunkPts;
      }
      const missions = ca.definingMissions ?? 0;
      if (missions > 0) {
        const missionPts = missions * config.submarineMissionPts;
        breakdown.push({
          label: "Extreme Risk Missions Bonus",
          points: missionPts,
          detail: `${missions} record/extreme risk mission(s) × ${config.submarineMissionPts} pts`,
        });
        subtotal += missionPts;
      }
    }
    const patrols = ca.warPatrols ?? 0;
    if (patrols > 0 && config.submarineWarPatrolPtsPer > 0) {
      const patrolPts = patrols * config.submarineWarPatrolPtsPer;
      breakdown.push({
        label: "War Patrols Bonus",
        points: patrolPts,
        detail: `${patrols} patrol(s) × ${config.submarineWarPatrolPtsPer} pts`,
      });
      subtotal += patrolPts;
    }
  } else if (ca.type === "surface") {
    const engagements = ca.majorEngagements ?? 0;
    if (engagements > 0) {
      const engPts = engagements * config.surfaceEngagementPts;
      breakdown.push({
        label: "Major Engagements Bonus",
        points: engPts,
        detail: `${engagements} major engagement(s) × ${config.surfaceEngagementPts} pts`,
      });
      subtotal += engPts;
    }
    const missions = ca.definingMissions ?? 0;
    if (missions > 0) {
      const bravePts = missions * config.surfaceMissionPts;
      breakdown.push({
        label: "Conspicuous Bravery Bonus",
        points: bravePts,
        detail: `${missions} × ${config.surfaceMissionPts} pts`,
      });
      subtotal += bravePts;
    }
  } else if (ca.type !== "none") {
    // Generic combat specialty scoring (infantry, armor, airborne, etc.)
    const engagements = ca.majorEngagements ?? 0;
    if (engagements > 0) {
      const engPts = engagements * config.surfaceEngagementPts;
      breakdown.push({
        label: "Major Engagements Bonus",
        points: engPts,
        detail: `${engagements} major engagement(s) × ${config.surfaceEngagementPts} pts`,
      });
      subtotal += engPts;
    }
    const missions = ca.definingMissions ?? 0;
    if (missions > 0) {
      const missionPts = missions * config.surfaceMissionPts;
      breakdown.push({
        label: "Defining Missions Bonus",
        points: missionPts,
        detail: `${missions} defining mission(s) × ${config.surfaceMissionPts} pts`,
      });
      subtotal += missionPts;
    }
  }

  // ── 8. MULTI-SERVICE / MULTI-WAR BONUS ──
  if (hero.multiServiceOrMultiWar) {
    const pct = config.multiServiceBonusPct / 100;
    const multiBonus = Math.round(subtotal * pct);
    breakdown.push({
      label: `Multi-Service/Multi-War Bonus (${config.multiServiceBonusPct}%)`,
      points: multiBonus,
      detail: `${config.multiServiceBonusPct}% of ${subtotal} pts`,
    });
    subtotal += multiBonus;
  }

  // ── 9. ROUND TO NEAREST N ──
  const total = Math.round(subtotal / config.roundingBase) * config.roundingBase;

  return { total, breakdown };
}

/**
 * Heuristic 0–100 index for cross-country / browse comparisons.
 * Independent use from USM-25 total but incorporates it so profiles stay comparable.
 */
export function calculateComparisonScore(
  usm25Total: number,
  medalRows: { count: number; hasValor: boolean }[],
  warsLength: number,
  multiServiceOrMultiWar: boolean
): number {
  const totalMedals = medalRows.reduce((s, m) => s + m.count, 0);
  const valorMedals = medalRows.reduce((s, m) => s + (m.hasValor ? m.count : 0), 0);
  const c =
    usm25Total * 0.11 +
    totalMedals * 2.4 +
    valorMedals * 3.8 +
    warsLength * 1.6 +
    (multiServiceOrMultiWar ? 7 : 0);
  return Math.max(0, Math.min(100, Math.round(c)));
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
