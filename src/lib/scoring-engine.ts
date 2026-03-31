import { ScoreBreakdownItem, ScoreResult } from "@/types";
import type { CombatSpecialty } from "@/lib/models/Hero";

// ─── GLOBAL NORMALIZED VALOR LEVELS (see docs/master-scoring-logic.md) ───────
// Gallantry levels 1–4 (100 / 75 / 50 / 25), British military orders (tier base 60),
// Indian grade %, wound increments, foreign overrides, ace / submarine modifiers.

interface MedalForScoring {
  name: string;
  basePoints: number;
  valorPoints: number;
  category?: "valor" | "service" | "foreign" | "other";
  countryCode?: string;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  count: number;
  hasValor: boolean;
  valorDevices: number;
}

type ForeignScoreRule = {
  patterns: RegExp[];
  basePoints: number;
  gallantryBonusEligible?: boolean;
};

type MedalScoreOverrideRule = {
  patterns: RegExp[];
  points: number;
  requiresGallantryFlag?: boolean;
  detailIfMissingGallantryFlag?: string;
};

const FOREIGN_VALOUR_BONUS_POINTS = 15;
/** Max points for a single foreign pattern match (MOH/VC/GC use CORE at 100; foreign tops out here). */
const FOREIGN_PATTERN_SCORE_CAP = 100;

/** Pattern-based foreign national awards (frequency-calibrated). See docs/master-scoring-logic.md §Foreign. */
const FOREIGN_SCORE_RULES: ForeignScoreRule[] = [
  // Foreign Level 1 — Top national awards: base 70 typical; VM 90 (rarity); +15 valour when eligible; cap FOREIGN_PATTERN_SCORE_CAP
  {
    patterns: [/^medal of valor\b.*philippines|^philippine medal of valor\b/],
    basePoints: 70,
    gallantryBonusEligible: true,
  },
  {
    patterns: [/military william order|militaire willems-orde/],
    basePoints: 70,
    gallantryBonusEligible: true,
  },
  { patterns: [/virtuti militari/], basePoints: 90, gallantryBonusEligible: true },
  {
    patterns: [/legion d.?honneur.*grand.?croix|grand.?croix.*legion d.?honneur/],
    basePoints: 70,
    gallantryBonusEligible: true,
  },
  {
    patterns: [/order of leopold.*grand cordon|grand cordon.*order of leopold/],
    basePoints: 70,
    gallantryBonusEligible: true,
  },
  // Note: Order of the Bath GCB is scored under BRITISH_ORDER_GRADE_RULES (UK military division), not here.

  // Foreign Level 2 — First-tier gallantry (45–65)
  { patterns: [/medaille militaire/], basePoints: 65, gallantryBonusEligible: true },
  {
    patterns: [/croix de guerre.*bronze palm|bronze palm.*croix de guerre/],
    basePoints: 60,
    gallantryBonusEligible: true,
  },
  {
    patterns: [/croix de guerre.*(silver|gilt)\s*star|(silver|gilt)\s*star.*croix de guerre/],
    basePoints: 50,
    gallantryBonusEligible: true,
  },
  {
    patterns: [/legion d.?honneur.*(officier|chevalier)|(officier|chevalier).*legion d.?honneur/],
    basePoints: 45,
    gallantryBonusEligible: true,
  },
  { patterns: [/order of the crown\b.*belgium|belgium.*order of the crown\b/], basePoints: 45, gallantryBonusEligible: true },

  // Foreign Level 3 — Second-tier & service (25–40); no valour bonus on pure service rows
  { patterns: [/luxembourg croix de guerre/], basePoints: 40, gallantryBonusEligible: true },
  {
    patterns: [/croix de guerre.*bronze star|bronze star.*croix de guerre/],
    basePoints: 30,
    gallantryBonusEligible: true,
  },
  {
    patterns: [/vietnam gallantry cross.*palm|gallantry cross.*palm.*vietnam/],
    basePoints: 25,
    gallantryBonusEligible: true,
  },
  { patterns: [/nato meritorious service medal/], basePoints: 25, gallantryBonusEligible: false },
  {
    patterns: [/philippine (defense|defence) medal|philippine liberation medal/],
    basePoints: 25,
    gallantryBonusEligible: false,
  },
];

const CORE_MEDAL_SCORE_RULES: MedalScoreOverrideRule[] = [
  { patterns: [/medal of honor|\bmoh\b/], points: 100 },
  { patterns: [/victoria cross|\bvc\b/], points: 100 },
  { patterns: [/george cross|\bgc\b/], points: 100 },
  { patterns: [/param vir chakra/], points: 100 },
  { patterns: [/ashoka chakra/], points: 100 },

  { patterns: [/distinguished service cross|\bdsc\b/], points: 75 },
  { patterns: [/navy cross/], points: 75 },
  { patterns: [/air force cross|\bafc\b/], points: 75 },
  { patterns: [/distinguished service order|\bdso\b/], points: 75 },
  { patterns: [/conspicuous gallantry cross|\bcgc\b/], points: 75 },
  { patterns: [/\bmilitary cross\b|\bmc\b/], points: 75 },
  { patterns: [/distinguished flying cross|\bdfc\b/], points: 75 },
  { patterns: [/star of military valour|\bsmv\b/], points: 75 },
  { patterns: [/star of gallantry|\bsg\b/], points: 75 },
  { patterns: [/maha vir chakra/], points: 75 },
  { patterns: [/kirti chakra/], points: 75 },

  { patterns: [/silver star|\bss\b/], points: 50 },
  { patterns: [/\bmilitary medal\b|\bmm\b/], points: 50 },
  { patterns: [/distinguished service medal|\bdsm\b/], points: 50 },
  { patterns: [/distinguished flying medal|\bdfm\b/], points: 50 },
  { patterns: [/\bair force medal\b|\bafm\b/], points: 50 },
  { patterns: [/sea gallantry medal|\bsgm\b/], points: 50 },
  { patterns: [/medal of military valour|\bmmv\b/], points: 50 },
  { patterns: [/\bmedal for gallantry\b|\bmg\b/], points: 50 },
  { patterns: [/vir chakra/], points: 50 },
  { patterns: [/shaurya chakra/], points: 50 },

  /** US order of merit — treated as ~MBE-tier anchor in master worked examples */
  { patterns: [/\blegion of merit\b/], points: 24 },
  /** French Légion Chevalier/Officier: scored via FOREIGN_SCORE_RULES (45 + optional valour bonus), not CORE */

  { patterns: [/mention in despatches|\bmid\b/], points: 25 },
  { patterns: [/queen.?s gallantry medal|\bqgm\b/], points: 25 },
  { patterns: [/king.?s commendation for brave conduct|queen.?s commendation for brave conduct/], points: 25 },
  { patterns: [/bronze star/], points: 25, requiresGallantryFlag: true, detailIfMissingGallantryFlag: 'Bronze Star scores only with "V"/gallantry flag' },
  { patterns: [/commendation medal/], points: 25, requiresGallantryFlag: true, detailIfMissingGallantryFlag: 'Commendation Medal scores only with "V"/gallantry flag' },
];

const BRITISH_ORDER_GRADE_RULES: MedalScoreOverrideRule[] = [
  { patterns: [/\bgbe\b|grand cross.*british empire/], points: 60, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "British Order military stripe/gallantry flag required" },
  { patterns: [/\bkbe\b|\bdbe\b|knight commander.*british empire|dame commander.*british empire/], points: 48, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "British Order military stripe/gallantry flag required" },
  { patterns: [/\bcbe\b|commander.*british empire/], points: 36, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "British Order military stripe/gallantry flag required" },
  { patterns: [/\bobe\b|officer.*british empire/], points: 24, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "British Order military stripe/gallantry flag required" },
  { patterns: [/\bmbe\b|member.*british empire/], points: 12, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "British Order military stripe/gallantry flag required" },
  { patterns: [/order of the bath.*\bgcb\b|\bgcb\b.*order of the bath|\bgcmg\b|grand cross.*st michael/], points: 60, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "Military division/gallantry flag required" },
  { patterns: [/order of the bath.*\bkcb\b|\bkcb\b.*order of the bath|\bkcmg\b|knight commander.*st michael/], points: 48, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "Military division/gallantry flag required" },
  { patterns: [/order of the bath.*\bcb\b|\bcb\b.*order of the bath|\bcmg\b|companion.*st michael/], points: 36, requiresGallantryFlag: true, detailIfMissingGallantryFlag: "Military division/gallantry flag required" },
];

function normalizeMedalName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveForeignScoreOverride(medal: MedalForScoring): number | null {
  const normalized = normalizeMedalName(medal.name);
  const rule = FOREIGN_SCORE_RULES.find((r) => r.patterns.some((p) => p.test(normalized)));
  if (!rule) return null;
  const baseAdjusted = resolveIndianGradeAdjustedPoints(rule.basePoints, normalized);
  const gallantryBonus =
    rule.gallantryBonusEligible && medal.hasValor ? FOREIGN_VALOUR_BONUS_POINTS : 0;
  return Math.min(FOREIGN_PATTERN_SCORE_CAP, baseAdjusted + gallantryBonus);
}

function resolveIndianGradeAdjustedPoints(baseLevelPoints: number, normalizedName: string): number {
  if (/\bgold\b|1st class|first class/.test(normalizedName)) return baseLevelPoints;
  if (/\bsilver\b|2nd class|second class/.test(normalizedName)) return Math.round(baseLevelPoints * 0.66);
  if (/\bbronze\b|3rd class|third class/.test(normalizedName)) return Math.round(baseLevelPoints * 0.33);
  return baseLevelPoints;
}

function resolveRulePoints(
  medal: MedalForScoring,
  normalizedName: string,
  rules: MedalScoreOverrideRule[]
): { points: number; note?: string } | null {
  const match = rules.find((r) => r.patterns.some((p) => p.test(normalizedName)));
  if (!match) return null;
  if (match.requiresGallantryFlag && !medal.hasValor) {
    return { points: 0, note: match.detailIfMissingGallantryFlag ?? "Gallantry flag required" };
  }
  return { points: resolveIndianGradeAdjustedPoints(match.points, normalizedName) };
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
  const normalized = normalizeMedalName(medal.name);

  if (/purple heart|wound stripe/.test(normalized)) {
    return 0;
  }

  const coreOverride = resolveRulePoints(medal, normalized, CORE_MEDAL_SCORE_RULES);
  if (coreOverride) {
    return coreOverride.points;
  }

  const britishOrderOverride = resolveRulePoints(medal, normalized, BRITISH_ORDER_GRADE_RULES);
  if (britishOrderOverride) {
    return britishOrderOverride.points;
  }

  /** Name-pattern foreign tiers (frequency-modulated) before catalog foreign basePoints */
  const foreignOverride = resolveForeignScoreOverride(medal);
  if (foreignOverride !== null) {
    return foreignOverride;
  }

  if (medal.category === "foreign") {
    return medal.basePoints + (medal.requiresValorDevice && medal.hasValor ? FOREIGN_VALOUR_BONUS_POINTS : 0);
  }
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
