export type { CombatSpecialty } from "@/lib/models/Hero";
import type { CombatSpecialty } from "@/lib/models/Hero";

export interface IMedalType {
  _id?: string;
  name: string;
  shortName: string;
  category: "valor" | "service" | "foreign" | "other";
  basePoints: number;
  valorPoints: number;          // Points on the Heroism Leaderboard
  requiresValorDevice: boolean; // Must have "V" device for valor points
  inherentlyValor: boolean;     // Medal is inherently a valor award (no V needed)
  tier: number;                 // Scoring tier (1=MOH, 2=Crosses, etc.)
  branch: string;               // "All", "Army", "Navy", "Marine Corps", etc.
  precedenceOrder: number;
  ribbonColors: string[];       // Array of color hex codes for ribbon stripes
  description?: string;
  imageUrl?: string;
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
  combatAchievements: {
    type: CombatSpecialty;
    confirmedKills?: number;
    shipsSunk?: number;
    majorEngagements?: number;
    definingMissions?: number;
  };
  score: number; // Computed score
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
