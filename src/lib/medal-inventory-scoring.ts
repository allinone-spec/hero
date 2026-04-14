/**
 * Heroic scoring for the client medal sheet: 1–100 logarithmic-style catalog points.
 * Valor_Tier 1–4 = participates in heroic ranking; tier 5+ = 0 heroic points (still shown on rack).
 * Source of truth: Bong_Score + Valor_Tier in Final_Medal_Sheet_Client.csv (via `scripts/sync-medal-inventory-csv.ts`).
 * This resolver fills gaps and validates rows when CSV cells are empty.
 */

export const NON_HEROIC_VALOR_TIER = 5;
export const HEROIC_SCORE_CAP = 100;

export type InventoryHeroicScoring = { bong: number; valorTier: number };

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** U.S. / allied distinguished service medals (merit / senior service, not the UK historical DSM for gallantry). */
function isNonHeroicUsStyleDistinguishedServiceMedal(n: string): boolean {
  if (!/\bdistinguished service medal\b/.test(n)) return false;
  if (/united kingdom|\(united kingdom\)/i.test(n)) return false;
  return true;
}

/**
 * Returns Bong_Score (0–100) and Valor_Tier (1–5) for a catalog row.
 * Only tiers 1–4 earn heroic catalog points; tier 5 = rack display only.
 */
export function resolveInventoryHeroicScoring(row: {
  medalId: string;
  medalName: string;
  precedence: number;
  category: string;
}): InventoryHeroicScoring {
  const id = row.medalId.trim().toLowerCase();
  const n = normName(row.medalName);
  const cat = row.category.toLowerCase();

  /** UK DSM (historical gallantry) — sheet category is often generic “service”; must run before category gate. */
  if (n === "distinguished service medal (united kingdom)") {
    return { bong: 35, valorTier: 4 };
  }

  const nonHeroicCategory =
    /campaign|commemorative|long service|longevity|good conduct|training|unit –|unit citation|expedition service ribbon|occupation medal|anniversary|defense service medal|reserve medal|recruiting|drill|marksmanship|sea service deployment|antarctica service|humanitarian|multinational force|nato medal|united nations medal|cold war|korea service|vietnam service|southwest asia|iraq campaign|afghanistan campaign|global war on terror|inherent resolve|armed forces service|armed forces reserve|mobilization|sea service|basic training|physical fitness|marksmanship|driver and mechanic|discharge|honorable service/i.test(
      cat
    ) && !/gallantry|valor|supreme|heroism/i.test(cat);

  if (nonHeroicCategory) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }

  // ── Tier 1 (apex — 95–100) ────────────────────────────────────
  if (/\bmedal of honor\b/.test(n)) return { bong: 100, valorTier: 1 };
  if (/\bvictoria cross\b/.test(n) && !/service/.test(n)) return { bong: 100, valorTier: 1 };
  if (id.includes("param-vir")) return { bong: 100, valorTier: 1 };
  if (id.includes("ashoka-chakra")) return { bong: 100, valorTier: 1 };
  if (/malta george cross/.test(n)) return { bong: 100, valorTier: 1 };
  if (n === "george cross" || (n.includes("george cross") && !n.includes("malta"))) {
    return { bong: 95, valorTier: 1 };
  }

  // ── Tier 2 (75–85) ────────────────────────────────────────────
  if (n.includes("distinguished service cross") && n.includes("united states")) {
    return { bong: 85, valorTier: 2 };
  }
  if (/\bnavy cross\b/.test(n)) return { bong: 85, valorTier: 2 };
  if (n.includes("air force cross") && n.includes("united states")) return { bong: 85, valorTier: 2 };
  if (/\bcoast guard cross\b/.test(n)) return { bong: 85, valorTier: 2 };
  if (n.includes("conspicuous gallantry cross") && !n.includes("medal")) return { bong: 85, valorTier: 2 };
  if (n.includes("air force cross") && n.includes("united kingdom")) return { bong: 85, valorTier: 2 };
  if (n.includes("distinguished service cross") && n.includes("australia")) return { bong: 85, valorTier: 2 };
  if (n === "distinguished service order" || /^distinguished service order\b/.test(n)) {
    return { bong: 80, valorTier: 2 };
  }
  if (/\balbert medal\b/.test(n)) return { bong: 75, valorTier: 2 };

  // ── Tier 3 (45–60) ────────────────────────────────────────────
  if (/\bsilver star\b/.test(n)) return { bong: 60, valorTier: 3 };
  if (/\bmilitary cross\b/.test(n)) return { bong: 60, valorTier: 3 };
  if (n.includes("distinguished service cross") && n.includes("united kingdom")) {
    return { bong: 60, valorTier: 3 };
  }
  if (n.includes("distinguished flying cross") && n.includes("united kingdom")) {
    return { bong: 60, valorTier: 3 };
  }
  if (n.includes("distinguished flying cross") && n.includes("united states")) {
    return { bong: 55, valorTier: 3 };
  }
  if (n.includes("soldier's medal") || n.includes("navy and marine corps medal") || n.includes("airman's medal")) {
    return { bong: 50, valorTier: 3 };
  }
  if (n.includes("distinguished conduct medal")) return { bong: 55, valorTier: 3 };
  if (n.includes("conspicuous gallantry medal") && !/cross/.test(n)) return { bong: 55, valorTier: 3 };
  if (n.includes("star of gallantry") || n.includes("new zealand gallantry star")) {
    return { bong: 60, valorTier: 3 };
  }
  if (n.includes("maha vir chakra") || n.includes("kirti chakra")) return { bong: 55, valorTier: 3 };
  if (/\bvir chakra\b/.test(n) && !n.includes("param")) return { bong: 50, valorTier: 3 };
  if (n.includes("shaurya chakra")) return { bong: 50, valorTier: 3 };
  if (n.includes("medal for gallantry") && n.includes("australia")) return { bong: 60, valorTier: 3 };
  if (n.includes("african distinguished conduct")) return { bong: 55, valorTier: 3 };

  // ── Tier 4 (15–35) ─────────────────────────────────────────────
  if (n.includes("bronze star")) return { bong: 35, valorTier: 4 };
  if (/\bpurple heart\b/.test(n)) return { bong: 25, valorTier: 4 };
  if (/\bair medal\b/.test(n)) return { bong: 20, valorTier: 4 };
  if (n.includes("joint service commendation") || /\bcommendation medal\b/.test(n)) {
    return { bong: 15, valorTier: 4 };
  }
  if (/\bmilitary medal\b/.test(n)) return { bong: 35, valorTier: 4 };
  if (n.includes("new zealand gallantry medal")) return { bong: 25, valorTier: 4 };
  if (n.includes("distinguished flying medal")) return { bong: 35, valorTier: 4 };
  if (n.includes("queen's gallantry medal") || n.includes("king's gallantry medal")) {
    return { bong: 25, valorTier: 4 };
  }
  if (n.includes("commendation for gallantry") || n.includes("commendation for bravery")) {
    return { bong: 15, valorTier: 4 };
  }
  if (n.includes("mention in despatches") || n.includes("mention in dispatches")) {
    return { bong: 20, valorTier: 4 };
  }

  if (n.includes("commendation for distinguished service")) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }
  if (n.includes("conspicuous service cross")) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }

  // Senior / meritorious decorations — not heroic catalog points
  if (/\blegion of merit\b/.test(n)) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }
  if (isNonHeroicUsStyleDistinguishedServiceMedal(n) && !/gallantry|valor/i.test(n)) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }
  if (
    /\bmeritorious service medal\b|defense meritorious service|defense superior service|\bachievement medal\b/i.test(
      n
    ) &&
    !/gallantry|valor/i.test(n)
  ) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }

  if (row.precedence >= 6 && !/(gallantry|valor|supreme|heroism)/i.test(cat)) {
    return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
  }

  return { bong: 0, valorTier: NON_HEROIC_VALOR_TIER };
}
