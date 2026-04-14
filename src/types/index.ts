export type { CombatSpecialty } from "@/lib/models/Hero";
import type { CombatSpecialty } from "@/lib/models/Hero";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";

export interface IMedalType {
  _id?: string;
  medalId?: string;
  name: string;
  shortName: string;
  category: "valor" | "service" | "foreign" | "other";
  basePoints: number;
  valorPoints: number;          // Points on the Heroism Leaderboard
  requiresValorDevice: boolean; // Must have "V" device for valor points
  inherentlyValor: boolean;     // Medal is inherently a valor award (no V needed)
  tier: number;                 // Valor_Tier: 1–4 = heroic; 5+ = no heroic points (rack only)
  branch: string;               // "All", "Army", "Navy", "Marine Corps", etc.
  precedenceOrder: number;
  countryCode?: string;
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  vDeviceAllowed?: boolean;
  ribbonColors: string[];       // Array of color hex codes for ribbon stripes
  description?: string;
  imageUrl?: string;
  ribbonImageUrl?: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
}

export interface IMedal {
  _id?: string;
  medalType: string | IMedalType; // Reference to MedalType
  count: number;
  hasValor: boolean;
  valorDevices: number; // Number of V devices
  arrowheads?: number;  // Arrowhead devices on this ribbon
}

export interface IHero {
  _id?: string;
  name: string;
  slug: string;
  wikiUrl?: string;
  rank: string;
  branch: string;
  avatarUrl?: string;
  medals: IMedal[];
  biography: string;
  wars: string[]; // Distinct wars/theaters
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  /** Eligible for submarine sink scoring when combat specialty is submarine */
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
  score: number; // Computed score
  countryCode?: string;
  metadataTags?: string[];
  ownerUserId?: string | null;
  adoptionExpiry?: Date | string | null;
  isVerified?: boolean;
  comparisonScore?: number | null;
  orderOverride?: number; // Manual ranking override
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  detail?: string;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdownItem[];
}
