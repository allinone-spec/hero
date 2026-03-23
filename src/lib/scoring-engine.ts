import { ScoreBreakdownItem, ScoreResult } from "@/types";
import type { CombatSpecialty } from "@/lib/models/Hero";

// ─── AUTHORITATIVE HEROISM SCORING MATRIX v2.0 ──────────────────────────────
// Points | Medal                              | Type / Requirement
// -------+------------------------------------+----------------------------------
//   100  | Medal of Honor (MOH)               | Extreme Valor (Above & Beyond)
//    60  | Service Crosses (DSC, NC, AFC)      | Extraordinary Heroism
//    35  | Silver Star (SS)                    | Gallantry in Action
//    25  | Dist. Flying Cross (w/ "V")         | Heroism in Flight
//    20  | Soldier's / Navy / Airman's Medal   | Non-Combat Heroism (Life-Risk)
//    15  | Bronze Star (w/ "V")                | Combat Valor (The Anchor)
//    10  | Air Medal (w/ "V")                  | Aerial Combat Heroism
//     8  | Purple Heart (PH)                   | Physical Sacrifice in Action
//     5  | Commendation Medal (w/ "V")         | Heroic Act
//     2  | Achievement Medal (w/ "V")          | Minor Heroic Engagement
// ─────────────────────────────────────────────────────────────────────────────

interface MedalForScoring {
  name: string;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
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
  combatAchievements: {
    type: CombatSpecialty;
    confirmedKills?: number;
    shipsSunk?: number;
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
  submarineShipThreshold: number;
  submarineShipPtsPerShip: number;
  submarineMissionPts: number;
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
  woundsBonusPerHeart: 2,
  aviationKillThreshold: 5,
  aviationKillPtsPerKill: 5,
  aviationMissionPts: 10,
  submarineShipThreshold: 5,
  submarineShipPtsPerShip: 5,
  submarineMissionPts: 10,
  surfaceEngagementPts: 5,
  surfaceMissionPts: 10,
  multiServiceBonusPct: 5,
  roundingBase: 5,
};

/**
 * Resolves the heroism score for a single medal entry.
 *
 * CRITICAL V-DEVICE FILTER:
 * - If a medal is "inherently valor" (MOH, Crosses, Silver Star, Purple Heart,
 *   Soldier's/Navy/Airman's Medal), its valorPoints are always awarded.
 * - If a medal "requires valor device" (BSM, DFC, Air Medal, Commendation,
 *   Achievement), its valorPoints are ONLY awarded if hasValor is true.
 *   Otherwise, the medal scores ZERO on the Heroism Leaderboard.
 */
function resolveMedalPoints(medal: MedalForScoring): number {
  if (medal.inherentlyValor) {
    return medal.valorPoints;
  }
  if (medal.requiresValorDevice) {
    return medal.hasValor ? medal.valorPoints : 0;
  }
  // Non-heroism medals (service, foreign, etc.) use basePoints
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
    if (medal.requiresValorDevice && !medal.hasValor && medal.valorPoints > 0) {
      label = `${medal.name} (no V device)${countInLabel}`;
      detail = "Meritorious service — 0 pts on Heroism Leaderboard";
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
        detail = `0 pts on Heroism Leaderboard (${ptsPerMedal} × ${medal.count})`;
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

  // ── 6. WOUNDS BONUS ──
  const phMedal = hero.medals.find(
    (m) => m.name?.toLowerCase().includes("purple heart")
  );
  if (phMedal && phMedal.count > 1) {
    const woundsPoints = (phMedal.count - 1) * config.woundsBonusPerHeart;
    breakdown.push({
      label: "Wounds Bonus",
      points: woundsPoints,
      detail: `${phMedal.count - 1} additional Purple Heart(s) × ${config.woundsBonusPerHeart} pts`,
    });
    subtotal += woundsPoints;
  }

  // ── 7. COMBAT ACHIEVEMENT MODIFIER ──
  const ca = hero.combatAchievements;
  if (ca.type === "aviation") {
    const kills = ca.confirmedKills ?? 0;
    if (kills > config.aviationKillThreshold) {
      const killPts = (kills - config.aviationKillThreshold) * config.aviationKillPtsPerKill;
      breakdown.push({
        label: "Aviation Kills Bonus",
        points: killPts,
        detail: `${kills - config.aviationKillThreshold} kills beyond ${config.aviationKillThreshold} × ${config.aviationKillPtsPerKill} pts`,
      });
      subtotal += killPts;
    }
    const missions = ca.definingMissions ?? 0;
    if (missions > 0) {
      const missionPts = missions * config.aviationMissionPts;
      breakdown.push({
        label: "Defining Missions Bonus",
        points: missionPts,
        detail: `${missions} historically defining mission(s) × ${config.aviationMissionPts} pts`,
      });
      subtotal += missionPts;
    }
  } else if (ca.type === "submarine") {
    const sunk = ca.shipsSunk ?? 0;
    if (sunk > config.submarineShipThreshold) {
      const sunkPts = (sunk - config.submarineShipThreshold) * config.submarineShipPtsPerShip;
      breakdown.push({
        label: "Ships Sunk Bonus",
        points: sunkPts,
        detail: `${sunk - config.submarineShipThreshold} ships beyond ${config.submarineShipThreshold} × ${config.submarineShipPtsPerShip} pts`,
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
