// Load .env.local before any module that reads process.env
import { readFileSync } from "node:fs";
try {
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .forEach((l) => {
      const i = l.indexOf("=");
      const key = l.slice(0, i).trim();
      const val = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    });
} catch {
  // env already provided by shell
}

import mongoose from "mongoose";
import Hero, { type CombatSpecialty } from "./models/Hero";
import MedalType from "./models/MedalType";
import ScoringConfig from "./models/ScoringConfig";
import { calculateScore, DEFAULT_SCORING_CONFIG } from "./scoring-engine";

// ─────────────────────────────────────────────────────────────────────────────
// MEDAL TYPES — Authoritative Heroism Scoring Matrix v2.0
//
// valorPoints   = Points on the Heroism Leaderboard
// basePoints    = Legacy/display points (for non-valor display contexts)
// requiresValorDevice = Must have "V" device for valorPoints to apply
// inherentlyValor = Medal is itself a valor award (no V device needed)
// ─────────────────────────────────────────────────────────────────────────────
export const MEDAL_DEFS = [
  // ── TIER 1: Medal of Honor (100 pts) ──
  {
    name: "Medal of Honor",
    shortName: "MOH",
    category: "valor" as const,
    basePoints: 100,
    valorPoints: 100,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 1,
    branch: "All",
    precedenceOrder: 1,
    ribbonColors: ["#5B9BD5"],
    description: "The highest military decoration awarded by the United States government, presented for conspicuous gallantry and intrepidity at the risk of life above and beyond the call of duty in combat.",
  },

  // ── TIER 2: Service Crosses (60 pts each) ──
  {
    name: "Distinguished Service Cross",
    shortName: "DSC",
    category: "valor" as const,
    basePoints: 60,
    valorPoints: 60,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 2,
    branch: "Army",
    precedenceOrder: 2,
    ribbonColors: ["#CC0000", "#FFFFFF", "#1C2B4A", "#FFFFFF", "#CC0000"],
    description: "The second-highest U.S. Army decoration for extreme gallantry and risk of life in actual combat against an armed enemy force.",
  },
  {
    name: "Navy Cross",
    shortName: "NC",
    category: "valor" as const,
    basePoints: 60,
    valorPoints: 60,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 2,
    branch: "Navy/Marine Corps",
    precedenceOrder: 3,
    ribbonColors: ["#000080", "#FFFFFF", "#000080"],
    description: "The second-highest U.S. Navy and Marine Corps decoration for extraordinary heroism in combat with an armed enemy.",
  },
  {
    name: "Air Force Cross",
    shortName: "AFC",
    category: "valor" as const,
    basePoints: 60,
    valorPoints: 60,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 2,
    branch: "Air Force",
    precedenceOrder: 4,
    ribbonColors: ["#4A7EC1", "#FFFFFF", "#CC0000", "#4A7EC1", "#CC0000", "#FFFFFF", "#4A7EC1"],
    description: "The second-highest U.S. Air Force decoration for extraordinary heroism in combat against an armed enemy.",
  },
  {
    name: "Coast Guard Cross",
    shortName: "CGC",
    category: "valor" as const,
    basePoints: 60,
    valorPoints: 60,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 2,
    branch: "Coast Guard",
    precedenceOrder: 5,
    ribbonColors: ["#FFFFFF", "#003366", "#CC0000", "#003366", "#FFFFFF"],
    description: "The second-highest Coast Guard decoration for extraordinary heroism in combat (established 2010).",
  },

  // ── TIER 3: Silver Star (35 pts) ──
  {
    name: "Silver Star",
    shortName: "SS",
    category: "valor" as const,
    basePoints: 35,
    valorPoints: 35,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 3,
    branch: "All",
    precedenceOrder: 6,
    ribbonColors: ["#003399", "#FFFFFF", "#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#FFFFFF", "#003399"],
    description: "The third-highest purely military combat decoration, awarded for gallantry in action against an enemy of the United States.",
  },

  // ── TIER 4: Distinguished Flying Cross w/ V (25 pts) ──
  {
    name: "Distinguished Flying Cross",
    shortName: "DFC",
    category: "valor" as const,
    basePoints: 25,
    valorPoints: 25,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 4,
    branch: "All",
    precedenceOrder: 7,
    ribbonColors: ["#003399", "#FFFFFF", "#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#FFFFFF", "#003399"],
    description: "Awarded for heroism or extraordinary achievement while participating in aerial flight. Valor points require the 'V' device.",
  },

  // ── TIER 5: Non-Combat Heroism Medals (20 pts each) ──
  {
    name: "Soldier's Medal",
    shortName: "SM",
    category: "valor" as const,
    basePoints: 20,
    valorPoints: 20,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 5,
    branch: "Army",
    precedenceOrder: 8,
    ribbonColors: ["#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399"],
    description: "Awarded to U.S. Army personnel for distinguished heroism not involving conflict with an armed enemy, typically life-saving actions.",
  },
  {
    name: "Navy and Marine Corps Medal",
    shortName: "NMM",
    category: "valor" as const,
    basePoints: 20,
    valorPoints: 20,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 5,
    branch: "Navy/Marine Corps",
    precedenceOrder: 9,
    ribbonColors: ["#000080", "#CFB53B", "#CC0000"],
    description: "Awarded to Navy and Marine Corps personnel for distinguished heroism not involving conflict with an armed enemy.",
  },
  {
    name: "Airman's Medal",
    shortName: "AM",
    category: "valor" as const,
    basePoints: 20,
    valorPoints: 20,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 5,
    branch: "Air Force",
    precedenceOrder: 10,
    ribbonColors: ["#5B9BD5", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#5B9BD5"],
    description: "Awarded to Air Force personnel for distinguished heroism or extraordinary achievement not involving conflict with an armed enemy.",
  },
  {
    name: "Coast Guard Medal",
    shortName: "CGM",
    category: "valor" as const,
    basePoints: 20,
    valorPoints: 20,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 5,
    branch: "Coast Guard",
    precedenceOrder: 11,
    ribbonColors: ["#5B9BD5", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#FFFFFF", "#CC0000", "#5B9BD5"],
    description: "Awarded to Coast Guard personnel for distinguished heroism not involving conflict with an armed enemy.",
  },

  // ── TIER 6: Bronze Star w/ V (15 pts) ──
  {
    name: "Bronze Star Medal",
    shortName: "BSM",
    category: "valor" as const,
    basePoints: 15,
    valorPoints: 15,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 6,
    branch: "All",
    precedenceOrder: 12,
    ribbonColors: ["#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#FFFFFF", "#CC0000", "#FFFFFF"],
    description: "Awarded for heroic or meritorious achievement/service in military operations against an armed enemy. Valor points require the 'V' device.",
  },

  // ── TIER 7: Purple Heart (8 pts) ──
  {
    name: "Purple Heart",
    shortName: "PH",
    category: "valor" as const,
    basePoints: 8,
    valorPoints: 8,
    requiresValorDevice: false,
    inherentlyValor: true,
    tier: 7,
    branch: "All",
    precedenceOrder: 13,
    ribbonColors: ["#FFFFFF", "#69359C", "#FFFFFF"],
    description: "Awarded to members of the U.S. Armed Forces who are wounded or killed in action against an enemy. Represents physical sacrifice in combat.",
  },

  // ── TIER 8: Air Medal w/ V (10 pts) ──
  {
    name: "Air Medal",
    shortName: "AirM",
    category: "valor" as const,
    basePoints: 10,
    valorPoints: 10,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 8,
    branch: "All",
    precedenceOrder: 14,
    ribbonColors: ["#003399", "#FF8C00", "#003399", "#FF8C00", "#003399"],
    description: "Awarded for meritorious achievement while participating in aerial flight. Valor points require the 'V' device for aerial combat heroism.",
  },

  // ── TIER 9: Commendation Medals w/ V (5 pts) ──
  {
    name: "Joint Service Commendation Medal",
    shortName: "JSCM",
    category: "service" as const,
    basePoints: 5,
    valorPoints: 5,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 9,
    branch: "All",
    precedenceOrder: 15,
    ribbonColors: ["#4F86C6", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#4F86C6"],
    description: "Awarded for meritorious achievement or service while assigned to a Joint Activity. Valor points require the 'V' device.",
  },
  {
    name: "Army Commendation Medal",
    shortName: "ARCOM",
    category: "service" as const,
    basePoints: 5,
    valorPoints: 5,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 9,
    branch: "Army",
    precedenceOrder: 16,
    ribbonColors: ["#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF"],
    description: "Awarded for meritorious achievement or service, or acts of courage not involving enemy conflict. Valor points require the 'V' device.",
  },
  {
    name: "Navy and Marine Corps Commendation Medal",
    shortName: "NMCM",
    category: "service" as const,
    basePoints: 5,
    valorPoints: 5,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 9,
    branch: "Navy/Marine Corps",
    precedenceOrder: 17,
    ribbonColors: ["#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C"],
    description: "Awarded for meritorious achievement or service in the Navy or Marine Corps. Valor points require the Combat 'V' device.",
  },
  {
    name: "Air and Space Commendation Medal",
    shortName: "AFCM",
    category: "service" as const,
    basePoints: 5,
    valorPoints: 5,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 9,
    branch: "Air Force",
    precedenceOrder: 18,
    ribbonColors: ["#003366", "#FFD700", "#003366", "#FFD700", "#003366", "#FFD700", "#003366"],
    description: "Awarded for meritorious achievement or service in the Air Force. Valor points require the 'V' device.",
  },
  {
    name: "Coast Guard Commendation Medal",
    shortName: "CGCM",
    category: "service" as const,
    basePoints: 5,
    valorPoints: 5,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 9,
    branch: "Coast Guard",
    precedenceOrder: 19,
    ribbonColors: ["#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C"],
    description: "Awarded for meritorious achievement or service in the Coast Guard. Valor points require the Combat 'V' device.",
  },

  // ── TIER 10: Achievement Medals w/ V (2 pts) ──
  {
    name: "Joint Service Achievement Medal",
    shortName: "JSAM",
    category: "service" as const,
    basePoints: 2,
    valorPoints: 2,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 10,
    branch: "All",
    precedenceOrder: 20,
    ribbonColors: ["#003399", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#4F86C6", "#CC0000", "#4F86C6", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#003399"],
    description: "Awarded for meritorious service or achievement while serving with a Joint Activity.",
  },
  {
    name: "Army Achievement Medal",
    shortName: "AAM",
    category: "service" as const,
    basePoints: 2,
    valorPoints: 2,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 10,
    branch: "Army",
    precedenceOrder: 21,
    ribbonColors: ["#3C6B3C", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#003399", "#FFFFFF", "#003399", "#FFFFFF", "#3C6B3C", "#FFFFFF", "#3C6B3C"],
    description: "Awarded for meritorious service or achievement in the Army.",
  },
  {
    name: "Navy and Marine Corps Achievement Medal",
    shortName: "NMCAM",
    category: "service" as const,
    basePoints: 2,
    valorPoints: 2,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 10,
    branch: "Navy/Marine Corps",
    precedenceOrder: 22,
    ribbonColors: ["#3C6B3C", "#FF6600", "#3C6B3C", "#FF6600", "#3C6B3C"],
    description: "Awarded for meritorious service or achievement in the Navy or Marine Corps.",
  },
  {
    name: "Air and Space Achievement Medal",
    shortName: "AFAM",
    category: "service" as const,
    basePoints: 2,
    valorPoints: 2,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 10,
    branch: "Air Force",
    precedenceOrder: 23,
    ribbonColors: ["#C0C0C0", "#003399", "#C0C0C0", "#003399", "#C0C0C0", "#003399", "#C0C0C0"],
    description: "Awarded for meritorious service or achievement in the Air Force.",
  },
  {
    name: "Coast Guard Achievement Medal",
    shortName: "CGAM",
    category: "service" as const,
    basePoints: 2,
    valorPoints: 2,
    requiresValorDevice: true,
    inherentlyValor: false,
    tier: 10,
    branch: "Coast Guard",
    precedenceOrder: 24,
    ribbonColors: ["#3C6B3C", "#CC0000", "#3C6B3C", "#FFFFFF", "#3C6B3C", "#CC0000", "#3C6B3C"],
    description: "Awarded for meritorious service or achievement in the Coast Guard.",
  },

  // ── SERVICE MEDALS (non-heroism, 0 valor points) ──
  {
    name: "Defense Distinguished Service Medal",
    shortName: "DDSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "All",
    precedenceOrder: 25,
    ribbonColors: ["#4F86C6", "#FFD700", "#CC0000", "#FFD700", "#4F86C6"],
    description: "Awarded for exceptionally meritorious service in a position of great responsibility to the Department of Defense.",
  },
  {
    name: "Army Distinguished Service Medal",
    shortName: "ADSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "Army",
    precedenceOrder: 26,
    ribbonColors: ["#CC0000", "#003399", "#FFFFFF", "#003399", "#CC0000"],
    description: "Awarded for exceptionally meritorious service to the U.S. government in a duty of great responsibility in the Army.",
  },
  {
    name: "Navy Distinguished Service Medal",
    shortName: "NDSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "Navy",
    precedenceOrder: 27,
    ribbonColors: ["#000080", "#FFD700", "#000080"],
    description: "Awarded for exceptionally meritorious service to the U.S. government in a duty of great responsibility in the Navy.",
  },
  {
    name: "Air Force Distinguished Service Medal",
    shortName: "AFDSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "Air Force",
    precedenceOrder: 28,
    ribbonColors: ["#CFB53B", "#003399", "#FFFFFF", "#003399", "#CFB53B"],
    description: "Awarded for exceptionally meritorious service to the U.S. government in a duty of great responsibility in the Air Force.",
  },
  {
    name: "Defense Superior Service Medal",
    shortName: "DSSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "All",
    precedenceOrder: 29,
    ribbonColors: ["#FFD700", "#4F86C6", "#FFFFFF", "#CC0000", "#FFFFFF", "#4F86C6", "#FFD700"],
    description: "Awarded for superior meritorious service in a position of significant responsibility to the Department of Defense.",
  },
  {
    name: "Legion of Merit",
    shortName: "LM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "All",
    precedenceOrder: 30,
    ribbonColors: ["#FFFFFF", "#8B0000", "#FFFFFF"],
    description: "Awarded for exceptionally meritorious conduct in the performance of outstanding services and achievements.",
  },
  {
    name: "Defense Meritorious Service Medal",
    shortName: "DMSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "All",
    precedenceOrder: 31,
    ribbonColors: ["#FFFFFF", "#8B0000", "#FFFFFF", "#4F86C6", "#FFFFFF", "#4F86C6", "#FFFFFF", "#8B0000", "#FFFFFF"],
    description: "Awarded for non-combat meritorious achievement or service while assigned to a Joint Activity.",
  },
  {
    name: "Meritorious Service Medal",
    shortName: "MSM",
    category: "service" as const,
    basePoints: 0,
    valorPoints: 0,
    requiresValorDevice: false,
    inherentlyValor: false,
    tier: 99,
    branch: "All",
    precedenceOrder: 32,
    ribbonColors: ["#8B0000", "#FFFFFF", "#8B0000", "#FFFFFF", "#8B0000"],
    description: "Awarded for outstanding non-combat meritorious achievement or service to the United States.",
  },

  // ── UNIT AWARDS ──
  {
    name: "Presidential Unit Citation (Army)",
    shortName: "PUC-A",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 33,
    ribbonColors: ["#003399", "#FFD700", "#003399"],
    description: "Awarded to Army units for extraordinary heroism in action against an armed enemy.",
  },
  {
    name: "Presidential Unit Citation (Navy)",
    shortName: "PUC-N",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Navy/Marine Corps", precedenceOrder: 34,
    ribbonColors: ["#000080", "#FFD700", "#CC0000", "#FFD700", "#000080"],
    description: "Awarded to Navy and Marine Corps units for extraordinary heroism in action against an armed enemy.",
  },
  {
    name: "Air Force Presidential Unit Citation",
    shortName: "PUC-AF",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 35,
    ribbonColors: ["#003366", "#FFD700", "#003366"],
    description: "Awarded to Air Force units for extraordinary heroism in action against an armed enemy.",
  },
  {
    name: "Joint Meritorious Unit Award",
    shortName: "JMUA",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 36,
    ribbonColors: ["#3C6B3C", "#8B0000", "#FFD700", "#8B0000", "#3C6B3C"],
    description: "Awarded to joint service units for meritorious achievement or service.",
  },
  {
    name: "Army Valorous Unit Award",
    shortName: "VUA",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 37,
    ribbonColors: ["#CC0000", "#FFD700", "#CC0000"],
    description: "Awarded to Army units for extraordinary heroism in action against an armed enemy.",
  },
  {
    name: "Navy Unit Commendation",
    shortName: "NUC",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Navy/Marine Corps", precedenceOrder: 38,
    ribbonColors: ["#000080", "#3C6B3C", "#FFD700", "#CC0000", "#FFD700", "#3C6B3C", "#000080"],
    description: "Awarded to Navy and Marine Corps units for outstanding heroism or meritorious service.",
  },
  {
    name: "Air Force Outstanding Unit Award",
    shortName: "AFOUA",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 39,
    ribbonColors: ["#003366", "#CC0000", "#003366", "#CC0000", "#003366"],
    description: "Awarded to Air Force units for exceptionally meritorious service or outstanding achievement.",
  },
  {
    name: "Army Meritorious Unit Commendation",
    shortName: "MUC-A",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 40,
    ribbonColors: ["#8B0000", "#FFD700", "#3C6B3C"],
    description: "Awarded to Army units for exceptionally meritorious conduct in support of military operations.",
  },
  {
    name: "Navy Meritorious Unit Commendation",
    shortName: "MUC-N",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Navy/Marine Corps", precedenceOrder: 41,
    ribbonColors: ["#3C6B3C", "#FFD700", "#3C6B3C"],
    description: "Awarded to Navy and Marine Corps units for valorous or meritorious achievement.",
  },
  {
    name: "Air Force Organizational Excellence Award",
    shortName: "AFOEA",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 42,
    ribbonColors: ["#CC0000", "#003366", "#CC0000"],
    description: "Awarded to Air Force organizations for exceptionally meritorious service.",
  },

  // ── SERVICE & CAMPAIGN MEDALS ──
  {
    name: "Prisoner of War Medal",
    shortName: "POWM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 43,
    ribbonColors: ["#000000", "#CC0000", "#FFFFFF", "#003399", "#FFFFFF", "#CC0000", "#000000"],
    description: "Awarded to any member of the Armed Forces taken prisoner of war during any armed conflict.",
  },
  {
    name: "Combat Readiness Medal",
    shortName: "CRM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 44,
    ribbonColors: ["#CC0000", "#003366", "#CC0000", "#003366", "#CC0000"],
    description: "Awarded for sustained individual combat mission readiness in the Air Force.",
  },
  {
    name: "Combat Action Badge",
    shortName: "CAB",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 45,
    description: "Awarded to soldiers who personally engaged or are engaged by the enemy.",
    ribbonColors: ["#808080"],
  },
  {
    name: "Combat Infantryman Badge",
    shortName: "CIB",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 46,
    description: "Awarded to infantrymen and Special Forces soldiers who have fought in active ground combat.",
    ribbonColors: ["#4F86C6"],
  },
  {
    name: "Combat Medical Badge",
    shortName: "CMB",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 47,
    description: "Awarded to medical personnel assigned to or attached to a ground combat unit who actively engage the enemy.",
    ribbonColors: ["#CC0000", "#FFFFFF"],
  },
  {
    name: "Army Good Conduct Medal",
    shortName: "AGCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Army", precedenceOrder: 48,
    ribbonColors: ["#CC0000", "#FFFFFF", "#CC0000"],
    description: "Awarded to enlisted Army personnel for exemplary behavior, efficiency, and fidelity during a qualifying period.",
  },
  {
    name: "Navy Good Conduct Medal",
    shortName: "NGCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Navy", precedenceOrder: 49,
    ribbonColors: ["#000080", "#CC0000", "#000080"],
    description: "Awarded to enlisted Navy personnel for good conduct and faithful service.",
  },
  {
    name: "Marine Corps Good Conduct Medal",
    shortName: "MCGCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Marine Corps", precedenceOrder: 50,
    ribbonColors: ["#CC0000", "#FFFFFF", "#003399"],
    description: "Awarded to enlisted Marines for obedience, sobriety, military proficiency, and neatness.",
  },
  {
    name: "Air Force Good Conduct Medal",
    shortName: "AFGCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 51,
    ribbonColors: ["#003366", "#FFD700", "#003366"],
    description: "Awarded to enlisted Air Force personnel for exemplary behavior and faithful service.",
  },
  {
    name: "Coast Guard Good Conduct Medal",
    shortName: "CGGCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Coast Guard", precedenceOrder: 52,
    ribbonColors: ["#FFFFFF", "#CC0000", "#FFFFFF"],
    description: "Awarded to enlisted Coast Guard personnel for good conduct and faithful service.",
  },
  {
    name: "American Defense Service Medal",
    shortName: "ADSVM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 53,
    ribbonColors: ["#FFD700", "#CC0000", "#FFFFFF", "#003399", "#FFD700"],
    description: "Awarded for military service during the limited emergency period September 8, 1939 to December 7, 1941.",
  },
  {
    name: "American Campaign Medal",
    shortName: "ACM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 54,
    ribbonColors: ["#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#000000", "#003399"],
    description: "Awarded for service within the American Theater of Operations during World War II.",
  },
  {
    name: "Asiatic-Pacific Campaign Medal",
    shortName: "APCM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 55,
    ribbonColors: ["#FF8C00", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#FFFFFF", "#FF8C00"],
    description: "Awarded for service in the Asiatic-Pacific Theater during World War II.",
  },
  {
    name: "European-African-Middle Eastern Campaign Medal",
    shortName: "EAMECM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 56,
    ribbonColors: ["#8B4513", "#3C6B3C", "#FFFFFF", "#CC0000", "#FFFFFF", "#3C6B3C", "#8B4513"],
    description: "Awarded for service in the European-African-Middle Eastern Theater during World War II.",
  },
  {
    name: "World War II Victory Medal",
    shortName: "WWIIV",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 57,
    ribbonColors: ["#CC0000", "#FF8C00", "#FFD700", "#3C6B3C", "#003399", "#69359C", "#CC0000", "#FFD700"],
    description: "Awarded to all members who served in the Armed Forces between December 7, 1941 and December 31, 1946.",
  },
  {
    name: "Army of Occupation Medal",
    shortName: "AOM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 58,
    ribbonColors: ["#CC0000", "#FFFFFF", "#000000", "#FFFFFF", "#CC0000"],
    description: "Awarded for 30+ consecutive days of service in occupied territories after WWII.",
  },
  {
    name: "National Defense Service Medal",
    shortName: "NDSVM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 59,
    ribbonColors: ["#CC0000", "#FFD700", "#CC0000", "#FFD700", "#CC0000"],
    description: "Awarded for honorable active duty service during designated periods of armed conflict.",
  },
  {
    name: "Korean Service Medal",
    shortName: "KSM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 60,
    ribbonColors: ["#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399"],
    description: "Awarded for service in the Korean Theater between June 27, 1950 and July 27, 1954.",
  },
  {
    name: "Vietnam Service Medal",
    shortName: "VSM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 61,
    ribbonColors: ["#FFD700", "#3C6B3C", "#CC0000", "#3C6B3C", "#FFD700"],
    description: "Awarded for service in the Vietnam Theater between July 4, 1965 and March 28, 1973.",
  },
  {
    name: "Southwest Asia Service Medal",
    shortName: "SWASM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 62,
    ribbonColors: ["#8B4513", "#3C6B3C", "#CC0000"],
    description: "Awarded for service in support of Operations Desert Shield and Desert Storm.",
  },
  {
    name: "Afghanistan Campaign Medal",
    shortName: "AFCAM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 63,
    ribbonColors: ["#8B4513", "#CC0000", "#3C6B3C", "#CC0000", "#003399"],
    description: "Awarded for service in Afghanistan in support of Operation Enduring Freedom.",
  },
  {
    name: "Iraq Campaign Medal",
    shortName: "ICM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 64,
    ribbonColors: ["#8B4513", "#CC0000", "#FFD700", "#CC0000", "#8B4513"],
    description: "Awarded for service in Iraq in support of Operation Iraqi Freedom.",
  },
  {
    name: "Global War on Terrorism Expeditionary Medal",
    shortName: "GWOTEM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 65,
    ribbonColors: ["#CC0000", "#FFD700", "#003399"],
    description: "Awarded for service in expeditions in support of the Global War on Terrorism.",
  },
  {
    name: "Global War on Terrorism Service Medal",
    shortName: "GWOTSM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 66,
    ribbonColors: ["#CC0000", "#003399", "#FFD700"],
    description: "Awarded for service in support of the Global War on Terrorism.",
  },
  {
    name: "Armed Forces Expeditionary Medal",
    shortName: "AFEM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 67,
    ribbonColors: ["#003399", "#000000", "#FFD700", "#CC0000", "#FFD700", "#000000", "#003399"],
    description: "Awarded for participation in military operations not covered by specific campaign medals.",
  },
  {
    name: "Armed Forces Service Medal",
    shortName: "AFSM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 68,
    ribbonColors: ["#FFD700", "#003399", "#FFFFFF", "#CC0000", "#FFFFFF", "#003399", "#FFD700"],
    description: "Awarded for participation in significant military operations that do not qualify for a campaign medal.",
  },
  {
    name: "Humanitarian Service Medal",
    shortName: "HSM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 69,
    ribbonColors: ["#69359C", "#FFFFFF", "#69359C"],
    description: "Awarded to members who directly participated in a Department of Defense humanitarian operation.",
  },
  {
    name: "Armed Forces Reserve Medal",
    shortName: "AFRM",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 70,
    ribbonColors: ["#FFD700", "#003399", "#CC0000", "#003399", "#FFD700"],
    description: "Awarded to members of the Reserve Components for honorable and satisfactory service.",
  },
  {
    name: "Air Force Longevity Service Award",
    shortName: "AFLSA",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 71,
    ribbonColors: ["#003366", "#FFD700", "#003366", "#FFD700", "#003366"],
    description: "Awarded for completion of each 4-year period of honorable active Air Force service.",
  },
  {
    name: "Small Arms Expert Marksmanship Ribbon",
    shortName: "SAEMR",
    category: "service" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "Air Force", precedenceOrder: 72,
    ribbonColors: ["#3C6B3C", "#FFD700"],
    description: "Awarded to Air Force personnel who qualify as expert with small arms.",
  },

  // ── FOREIGN DECORATIONS ──
  {
    name: "United Nations Korea Medal",
    shortName: "UNKM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 80,
    ribbonColors: ["#4F86C6", "#FFFFFF", "#4F86C6"],
    description: "United Nations service medal for service in the Korean War.",
  },
  {
    name: "Vietnam Campaign Medal",
    shortName: "VCM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 81,
    ribbonColors: ["#FFFFFF", "#3C6B3C", "#CC0000", "#3C6B3C", "#FFFFFF"],
    description: "South Vietnamese campaign medal awarded to U.S. forces serving in the Vietnam War.",
  },
  {
    name: "Vietnam Gallantry Cross",
    shortName: "VGC",
    category: "foreign" as const,
    basePoints: 20, valorPoints: 20, requiresValorDevice: false, inherentlyValor: true,
    tier: 99, branch: "All", precedenceOrder: 82,
    ribbonColors: ["#CC0000", "#FFD700", "#CC0000"],
    description: "Vietnamese military decoration for gallantry in combat.",
  },
  {
    name: "Vietnam Gallantry Cross Unit Award",
    shortName: "VGCUA",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 83,
    ribbonColors: ["#CC0000", "#FFD700", "#3C6B3C", "#FFD700", "#CC0000"],
    description: "Vietnamese unit award for gallantry in combat, worn with palm and frame.",
  },
  {
    name: "National Order of Vietnam",
    shortName: "NOV",
    category: "foreign" as const,
    basePoints: 20, valorPoints: 20, requiresValorDevice: false, inherentlyValor: true,
    tier: 99, branch: "All", precedenceOrder: 84,
    ribbonColors: ["#FFD700", "#CC0000", "#FFD700"],
    description: "Vietnamese national order for distinguished service to the Republic of Vietnam.",
  },
  {
    name: "Vietnam Psychological Warfare Medal",
    shortName: "VPWM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 85,
    ribbonColors: ["#3C6B3C", "#FFFFFF", "#CC0000"],
    description: "Vietnamese medal for distinguished service in psychological warfare operations.",
  },
  {
    name: "Vietnam Armed Forces Honor Medal",
    shortName: "VAFHM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 86,
    ribbonColors: ["#FFD700", "#CC0000", "#3C6B3C"],
    description: "Vietnamese medal for honorable service in the Armed Forces.",
  },
  {
    name: "Vietnam Veteran's Medal",
    shortName: "VVM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 86,
    ribbonColors: ["#CC0000", "#FFD700", "#3C6B3C", "#FFD700", "#CC0000"],
    description: "Vietnamese medal awarded to military personnel for service during the Vietnam War.",
  },
  {
    name: "China War Memorial Medal",
    shortName: "CWMM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 87,
    ribbonColors: ["#CC0000", "#003399", "#FFD700"],
    description: "Chinese medal commemorating participation in World War II operations in the China-Burma-India Theater.",
  },
  {
    name: "Republic of Korea War Service Medal",
    shortName: "ROKWSM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 88,
    ribbonColors: ["#003399", "#CC0000", "#FFFFFF", "#CC0000", "#003399"],
    description: "South Korean medal awarded for service in the Korean War.",
  },
  {
    name: "Republic of Korea Presidential Unit Citation",
    shortName: "ROKPUC",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 89,
    ribbonColors: ["#CC0000", "#FFFFFF", "#003399"],
    description: "South Korean unit award for exceptional service in the Korean War.",
  },
  {
    name: "Philippine Presidential Unit Citation",
    shortName: "PPUC",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 90,
    ribbonColors: ["#CC0000", "#FFFFFF", "#003399", "#FFD700"],
    description: "Philippine unit award for outstanding service in the liberation of the Philippines.",
  },
  {
    name: "Philippine Liberation Medal",
    shortName: "PLM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 91,
    ribbonColors: ["#CC0000", "#FFFFFF", "#003399"],
    description: "Philippine medal for participation in the liberation of the Philippines during WWII.",
  },
  {
    name: "French Croix de Guerre",
    shortName: "FCdG",
    category: "foreign" as const,
    basePoints: 20, valorPoints: 20, requiresValorDevice: false, inherentlyValor: true,
    tier: 99, branch: "All", precedenceOrder: 92,
    ribbonColors: ["#3C6B3C", "#CC0000", "#3C6B3C", "#CC0000", "#3C6B3C"],
    description: "French military decoration for heroism in combat.",
  },
  {
    name: "French Legion of Honor",
    shortName: "FLoH",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 93,
    ribbonColors: ["#CC0000"],
    description: "The highest French order of merit, for military and civil accomplishments.",
  },
  {
    name: "Belgian Croix de Guerre",
    shortName: "BCdG",
    category: "foreign" as const,
    basePoints: 20, valorPoints: 20, requiresValorDevice: false, inherentlyValor: true,
    tier: 99, branch: "All", precedenceOrder: 94,
    ribbonColors: ["#CC0000", "#3C6B3C", "#CC0000"],
    description: "Belgian military decoration for bravery in combat.",
  },
  {
    name: "NATO Medal",
    shortName: "NATOM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 95,
    ribbonColors: ["#003399", "#FFFFFF", "#003399"],
    description: "NATO service medal for participation in NATO operations.",
  },
  {
    name: "United Nations Medal",
    shortName: "UNM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 96,
    ribbonColors: ["#4F86C6", "#FFFFFF", "#4F86C6"],
    description: "United Nations medal for participation in UN peacekeeping operations.",
  },
  {
    name: "Kuwait Liberation Medal (Saudi Arabia)",
    shortName: "KLM-SA",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 97,
    ribbonColors: ["#3C6B3C", "#FFFFFF", "#000000", "#CC0000", "#FFFFFF", "#3C6B3C"],
    description: "Saudi Arabian medal for service in the liberation of Kuwait.",
  },
  {
    name: "Kuwait Liberation Medal (Kuwait)",
    shortName: "KLM-K",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 98,
    ribbonColors: ["#3C6B3C", "#000000", "#CC0000", "#FFFFFF", "#000000", "#3C6B3C"],
    description: "Kuwaiti medal for service in the liberation of Kuwait.",
  },
  {
    name: "French National Defense Medal",
    shortName: "FNDM",
    category: "foreign" as const,
    basePoints: 0, valorPoints: 0, requiresValorDevice: false, inherentlyValor: false,
    tier: 99, branch: "All", precedenceOrder: 99,
    ribbonColors: ["#CC0000", "#FFFFFF", "#003399"],
    description: "French medal often awarded to U.S. personnel serving under French command.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HEROES  (USM-25 Top 10 — U.S. Ground Combat All-Time)
// ─────────────────────────────────────────────────────────────────────────────
type MedalEntry = {
  shortName: string;
  count: number;
  hasValor: boolean;
  valorDevices: number;
};

type HeroDef = {
  name: string;
  slug: string;
  rank: string;
  branch: string;
  biography: string;
  wars: string[];
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  combatAchievements: {
    type: CombatSpecialty;
    confirmedKills?: number;
    definingMissions?: number;
  };
  medals: MedalEntry[];
};

const HERO_DEFS: HeroDef[] = [
  {
    name: "Audie Murphy",
    slug: "audie-murphy",
    rank: "Second Lieutenant",
    branch: "U.S. Army",
    biography:
      "The most decorated U.S. combat soldier of World War II. Murphy received every military combat award for valor available from the U.S. Army, as well as French and Belgian awards for gallantry in the European Theater.",
    wars: ["World War II"],
    combatTours: 1,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: false,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "MOH", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "DSC", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "SS",  count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "LM",  count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "BSM", count: 2, hasValor: true,  valorDevices: 2 },
      { shortName: "PH",  count: 3, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "John J. Pershing",
    slug: "john-j-pershing",
    rank: "General of the Armies",
    branch: "U.S. Army",
    biography:
      "Commander of the American Expeditionary Forces in World War I and the only U.S. officer to hold the rank General of the Armies during his own lifetime. Veteran of the Mexican Border Campaign and the Indian Wars.",
    wars: ["World War I", "Mexican Border Campaign"],
    combatTours: 2,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: true,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "DSC",  count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "ADSM", count: 2, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "Alvin C. York",
    slug: "alvin-c-york",
    rank: "Sergeant",
    branch: "U.S. Army",
    biography:
      "One of the most decorated American soldiers of World War I. York single-handedly attacked a German machine-gun nest, killing 28 enemy soldiers and capturing 132 prisoners with a small detachment.",
    wars: ["World War I"],
    combatTours: 1,
    hadCombatCommand: false,
    powHeroism: false,
    multiServiceOrMultiWar: false,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "MOH", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "DSC", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "SS",  count: 1, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "Douglas MacArthur",
    slug: "douglas-macarthur",
    rank: "General of the Army",
    branch: "U.S. Army",
    biography:
      "Supreme Commander of Allied Forces in the Pacific in World War II and commander of UN forces in Korea. Served in three major conflicts spanning four decades; son of Medal of Honor recipient Arthur MacArthur Jr.",
    wars: ["World War I", "World War II", "Korean War"],
    combatTours: 3,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: true,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "MOH",  count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "ADSM", count: 3, hasValor: false, valorDevices: 0 },
      { shortName: "SS",   count: 7, hasValor: false, valorDevices: 0 },
      { shortName: "PH",   count: 2, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "George S. Patton",
    slug: "george-s-patton",
    rank: "General",
    branch: "U.S. Army",
    biography:
      "Commanding General of the U.S. Third Army in World War II, known for rapid armored offensives across France and into Germany. One of the most effective combat commanders in American military history.",
    wars: ["World War I", "World War II"],
    combatTours: 2,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: true,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "DSC",  count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "ADSM", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "SS",   count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "LM",   count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "PH",   count: 1, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "Matthew Ridgway",
    slug: "matthew-ridgway",
    rank: "General",
    branch: "U.S. Army",
    biography:
      "Commanded the 82nd Airborne Division in WWII and the Eighth Army in Korea. Credited with stabilizing and reversing the UN defeat in Korea after replacing MacArthur as Far East Commander.",
    wars: ["World War II", "Korean War"],
    combatTours: 2,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: true,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "DSC",  count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "ADSM", count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "SS",   count: 2, hasValor: false, valorDevices: 0 },
      { shortName: "PH",   count: 1, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "William C. Westmoreland",
    slug: "william-c-westmoreland",
    rank: "General",
    branch: "U.S. Army",
    biography:
      "Commander of U.S. forces in Vietnam from 1964 to 1968. Decorated veteran of both World War II and the Korean War, later serving as Chief of Staff of the Army.",
    wars: ["World War II", "Korean War", "Vietnam War"],
    combatTours: 3,
    hadCombatCommand: true,
    powHeroism: false,
    multiServiceOrMultiWar: true,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "DSC",  count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "ADSM", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "SS",   count: 3, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "Roy P. Benavidez",
    slug: "roy-p-benavidez",
    rank: "Master Sergeant",
    branch: "U.S. Army",
    biography:
      "Special Forces soldier who voluntarily ran into a firefight to rescue a 12-man patrol trapped behind enemy lines in Vietnam, sustaining 37 separate wounds. His Distinguished Service Cross was upgraded to Medal of Honor in 1981.",
    wars: ["Vietnam War"],
    combatTours: 2,
    hadCombatCommand: false,
    powHeroism: false,
    multiServiceOrMultiWar: false,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "MOH", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "PH",  count: 5, hasValor: false, valorDevices: 0 },
    ],
  },
  {
    name: "John Basilone",
    slug: "john-basilone",
    rank: "Gunnery Sergeant",
    branch: "U.S. Marine Corps",
    biography:
      "Marine Corps machine gunner who held off roughly 3,000 Japanese troops with a handful of men at Guadalcanal, keeping his guns firing throughout the night. Killed in action on the beaches of Iwo Jima.",
    wars: ["World War II"],
    combatTours: 2,
    hadCombatCommand: false,
    powHeroism: false,
    multiServiceOrMultiWar: false,
    combatAchievements: { type: "none" },
    medals: [
      { shortName: "MOH", count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "NC",  count: 1, hasValor: false, valorDevices: 0 },
      { shortName: "PH",  count: 1, hasValor: false, valorDevices: 0 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Check your .env.local file.");

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri, { bufferCommands: false });

  console.log("\nClearing existing collections...");
  await Promise.all([
    Hero.deleteMany({}),
    MedalType.deleteMany({}),
    ScoringConfig.deleteMany({}),
  ]);

  // 1. Scoring config
  console.log("Seeding scoring config (USM-25 defaults)...");
  await ScoringConfig.create({ key: "default", ...DEFAULT_SCORING_CONFIG });

  // 2. Medal types
  console.log("Seeding medal types...");
  const createdMedals = await MedalType.insertMany(MEDAL_DEFS.map((m) => ({ ...m })));
  const byShortName: Record<string, mongoose.Types.ObjectId> = {};
  createdMedals.forEach((m) => {
    byShortName[m.shortName] = m._id as mongoose.Types.ObjectId;
  });
  console.log(`  ${createdMedals.length} medal types created`);

  // 3. Heroes
  console.log("\nSeeding heroes...");
  for (const heroDef of HERO_DEFS) {
    const medals = heroDef.medals.map((m) => ({
      medalType: byShortName[m.shortName],
      count: m.count,
      hasValor: m.hasValor,
      valorDevices: m.valorDevices,
    }));

    // Resolve medal data for score calculation
    const medalData = heroDef.medals.map((m) => {
      const mt = MEDAL_DEFS.find((md) => md.shortName === m.shortName)!;
      return {
        name: mt.name,
        basePoints: mt.basePoints,
        valorPoints: mt.valorPoints,
        requiresValorDevice: mt.requiresValorDevice,
        inherentlyValor: mt.inherentlyValor,
        count: m.count,
        hasValor: m.hasValor,
        valorDevices: m.valorDevices,
      };
    });

    const { total } = calculateScore(
      {
        medals: medalData,
        wars: heroDef.wars,
        combatTours: heroDef.combatTours,
        hadCombatCommand: heroDef.hadCombatCommand,
        powHeroism: heroDef.powHeroism,
        multiServiceOrMultiWar: heroDef.multiServiceOrMultiWar,
        combatAchievements: heroDef.combatAchievements,
      },
      DEFAULT_SCORING_CONFIG
    );

    await Hero.create({
      name: heroDef.name,
      slug: heroDef.slug,
      rank: heroDef.rank,
      branch: heroDef.branch,
      biography: heroDef.biography,
      wars: heroDef.wars,
      combatTours: heroDef.combatTours,
      hadCombatCommand: heroDef.hadCombatCommand,
      powHeroism: heroDef.powHeroism,
      multiServiceOrMultiWar: heroDef.multiServiceOrMultiWar,
      combatAchievements: heroDef.combatAchievements,
      medals,
      score: total,
      published: true,
      orderOverride: null,
    });

    console.log(`  ✓ ${heroDef.name.padEnd(28)} Score: ${total}`);
  }

  console.log("\nSeed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

// Only run seed when executed directly (not imported by other scripts)
const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("seed.ts");
if (isDirectRun) {
  seed().catch((err) => {
    console.error("\nSeed failed:", err.message ?? err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
}
