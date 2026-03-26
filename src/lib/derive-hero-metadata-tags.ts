import { normalizeMetadataTags } from "@/lib/metadata-tags";

const MOH_RE = /\bmedal\s+of\s+honor\b/i;
const PH_RE = /\bpurple\s+heart\b/i;

/**
 * Merges AI/caretaker tags with deterministic rules from branch, combat specialty, wars, and medal tallies.
 * Used by import pipeline, owner medal saves, and optional backfill scripts.
 */
export function deriveHeroMetadataTags(input: {
  branch?: string;
  combatType?: string;
  wars?: string[];
  gender?: string;
  current?: string[];
  medals?: { name: string; count?: number }[];
}): string[] {
  const out = new Set<string>(normalizeMetadataTags(input.current ?? []));
  const branch = String(input.branch || "").toLowerCase();
  const combatType = String(input.combatType || "").toLowerCase();
  const wars = Array.isArray(input.wars) ? input.wars.map((w) => String(w).toLowerCase()) : [];
  const gender = String(input.gender || "").toLowerCase();

  if (gender === "female") out.add("female");
  if (gender === "male") out.add("male");

  if (branch.includes("army")) out.add("army");
  if (branch.includes("navy")) out.add("navy");
  if (branch.includes("marine")) out.add("usmc");
  if (branch.includes("air force")) out.add("usaf");
  if (branch.includes("coast guard")) out.add("coast_guard");
  if (branch.includes("space force")) out.add("space_force");

  if (combatType === "submarine") out.add("submariner");
  if (combatType === "surface") {
    out.add("surface_commander");
    out.add("surface_warfare");
  }
  if (combatType === "aviation") {
    out.add("aviator");
    out.add("pilot");
  }
  if (combatType === "airborne") out.add("paratrooper");
  if (combatType === "special_operations") out.add("special_operations");
  if (combatType === "infantry" || combatType === "armor" || combatType === "artillery") {
    out.add("ground_combat");
  }

  for (const war of wars) {
    if (war.includes("world war i")) out.add("wwi");
    if (war.includes("world war ii")) out.add("wwii");
    if (war.includes("korean war") || war === "korea") out.add("korea");
    if (war.includes("vietnam")) out.add("vietnam");
    if (war.includes("iraq")) out.add("iraq");
    if (war.includes("afghanistan")) out.add("afghanistan");
    if (war.includes("terror")) out.add("war_on_terror");
  }

  if (Array.isArray(input.medals) && input.medals.length > 0) {
    let mohTotal = 0;
    let phTotal = 0;
    for (const m of input.medals) {
      const n = String(m.name || "");
      const c = Math.max(1, Number(m.count) || 1);
      if (MOH_RE.test(n)) mohTotal += c;
      if (PH_RE.test(n)) phTotal += c;
    }
    if (mohTotal >= 2) out.add("double_moh");
    if (phTotal >= 2) out.add("multiple_purple_hearts");
  }

  return normalizeMetadataTags([...out]);
}
