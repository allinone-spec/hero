/**
 * Map generic "Medal of Honor" text to inventory catalog names (distinct ribbon/obverse per service).
 * @see data/medal-inventory/us.csv — us-medal-of-honor-army | navy | af
 */

export const MOH_NAME_ARMY = "Medal of Honor (Army)";
export const MOH_NAME_NAVY_MC = "Medal of Honor (Navy/MC)";
export const MOH_NAME_AIR_FORCE = "Medal of Honor (Air Force)";

const SPECIFIC_MOH_NAMES = new Set(
  [MOH_NAME_ARMY, MOH_NAME_NAVY_MC, MOH_NAME_AIR_FORCE].map((s) => s.toLowerCase()),
);

function trimAwardPunctuation(medalName: string): string {
  return medalName.trim().replace(/\s*\.\s*$/, "").trim();
}

/** True when the string is only a generic MoH reference (not already a service-specific catalog row). */
export function isGenericMedalOfHonorName(medalName: string): boolean {
  const t = trimAwardPunctuation(medalName);
  const lower = t.toLowerCase();
  if (SPECIFIC_MOH_NAMES.has(lower)) return false;
  if (/\bmedal of honor\s*\([^)]+\)/i.test(t)) return false;
  if (/^medal of honor$/i.test(t)) return true;
  if (/^congressional medal of honor$/i.test(t)) return true;
  if (/^moh$/i.test(t)) return true;
  return false;
}

/**
 * Pick Navy design for Navy / USMC / USCG; Air Force for USAF/USSF; Army default (incl. unknown).
 */
export function medalOfHonorCatalogNameForBranch(serviceBranch: string): string {
  const b = String(serviceBranch || "").toLowerCase();
  if (/\bair\s*force\b|\busaf\b|\bspace\s*force\b|\bussf\b/.test(b)) {
    return MOH_NAME_AIR_FORCE;
  }
  if (
    /\bnavy\b|\bmarine\b|\bcoast\s*guard\b|\busn\b|\busmc\b|\bcg\b/.test(b)
  ) {
    return MOH_NAME_NAVY_MC;
  }
  return MOH_NAME_ARMY;
}

/**
 * When `medalName` is generic MoH and national context is US, rewrite to the service-specific
 * catalog title so `MedalType.name` matching hits the correct row (images + precedence).
 */
export function resolveMedalOfHonorCatalogName(
  medalName: string,
  options?: { serviceBranch?: string; countryCode?: string },
): string {
  const cc = String(options?.countryCode || "US").toUpperCase();
  if (cc !== "US") return medalName.trim();

  const trimmed = trimAwardPunctuation(medalName);
  if (!isGenericMedalOfHonorName(trimmed)) return medalName.trim();

  return medalOfHonorCatalogNameForBranch(options?.serviceBranch || "");
}
