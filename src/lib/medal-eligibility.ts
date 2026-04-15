/** Commonwealth set is retained for future use, but host-only filtering is now default. */
export const COMMONWEALTH_COUNTRY_CODES = new Set(["AU", "NZ", "CA", "GB", "UK", "ZA", "IN"]);

export function normalizeMedalCountryCode(cc?: string | null): string {
  const c = String(cc || "")
    .trim()
    .toUpperCase();
  if (!c) return "";

  // Common aliases seen across imports / legacy data
  if (c === "GB" || c === "GREAT BRITAIN" || c === "UNITED KINGDOM" || c === "UK") return "UK";
  if (c === "AUSTRALIA" || c === "AUS") return "AU";
  if (c === "CANADA" || c === "CAN") return "CA";
  if (c === "NEW ZEALAND" || c === "NZL") return "NZ";
  if (c === "SOUTH AFRICA" || c === "RSA") return "ZA";
  if (c === "INDIA" || c === "IND") return "IN";
  if (
    c === "UNITED STATES" ||
    c === "UNITED STATES OF AMERICA" ||
    c === "USA" ||
    c === "U.S." ||
    c === "U.S.A."
  ) {
    return "US";
  }
  return c;
}

/**
 * Default medal picker: host country medals only.
 * When `showForeign` is true, the full catalog is shown.
 */
export function isMedalEligibleForHeroCountry(
  medalCountryCode: string | undefined,
  heroCountryCode: string,
  showForeign: boolean,
  inventoryCategory?: string,
  medalTier?: number | null,
): boolean {
  const m = normalizeMedalCountryCode(medalCountryCode);
  const h = normalizeMedalCountryCode(heroCountryCode);
  if (!m || !h) return false;

  const isHostCountryAward = m === h;
  if (!showForeign) return isHostCountryAward;

  if (isHostCountryAward) return true;

  // Foreign toggle only allows foreign gallantry lines (tiers 1-4).
  const t = typeof medalTier === "number" ? medalTier : Number(medalTier);
  if (!Number.isFinite(t)) return false;
  if (t < 1 || t > 4) return false;

  const category = String(inventoryCategory || "").toLowerCase();
  if (category === "service" || category === "other") return false;
  return true;
}
