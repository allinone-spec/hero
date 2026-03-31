import type { MedalDeviceRule } from "@/lib/medal-device-rules";
import { parseMedalDeviceRule } from "@/lib/medal-device-rules";

export interface RackDeviceImage {
  url: string;
  deviceType: string;
  count: number;
}

export interface RackMedalTypeLike {
  _id?: string;
  name: string;
  precedenceOrder: number;
  ribbonColors?: string[];
  ribbonImageUrl?: string;
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  countryCode?: string;
  inventoryCategory?: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  imageUrl?: string;
  description?: string;
  wikipediaUrl?: string;
  appearance?: string;
  established?: string;
}

export interface RackMedalEntryLike {
  medalType: RackMedalTypeLike | null | undefined;
  count: number;
  hasValor: boolean;
  arrowheads?: number;
  deviceImages?: RackDeviceImage[];
  wikiRibbonUrl?: string;
}

export interface RackRenderMedal {
  medalId?: string;
  name: string;
  count: number;
  precedenceOrder: number;
  ribbonColors: string[];
  ribbonImageUrl?: string;
  hasValor: boolean;
  arrowheads?: number;
  isUnitCitation?: boolean;
  deviceImages?: RackDeviceImage[];
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  countryCode?: string;
  inventoryCategory?: string;
  serviceBranch?: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  imageUrl?: string;
  description?: string;
  wikipediaUrl?: string;
  appearance?: string;
  established?: string;
}

export interface RibbonRackProfile {
  countryCode: string;
  defaultMaxPerRow: number;
  defaultGap: number;
  rowAlignment: "flush" | "center" | "pyramid";
}

export function isUnitCitationMedal(name: string): boolean {
  return /\bunit\b/i.test(name) || /\bpresidential.*citation\b/i.test(name);
}

export function getRibbonRackProfile(countryCode?: string | null): RibbonRackProfile {
  const cc = String(countryCode || "US").toUpperCase();
  switch (cc) {
    case "UK":
    case "CA":
    case "AU":
    case "NZ":
    case "ZA":
    case "IN":
      return { countryCode: cc, defaultMaxPerRow: 4, defaultGap: 1.5, rowAlignment: "pyramid" };
    case "US":
    default:
      return { countryCode: cc || "US", defaultMaxPerRow: 4, defaultGap: 1.5, rowAlignment: "pyramid" };
  }
}

function getMedalNationalPriority(
  medalCountryCode: string | undefined,
  nationalCountryCode: string | undefined,
): number {
  const medalCC = String(medalCountryCode || "").toUpperCase();
  const nationalCC = String(nationalCountryCode || "").toUpperCase();
  if (!nationalCC) return 0;
  if (!medalCC || medalCC === nationalCC) return 0;
  return 1;
}

/**
 * Gate 1 — deterministic catalog sort (no AI). Lower `precedenceOrder` = wears first.
 * With `nationalCountryCode`, home-country medals sort before foreign at the same tier
 * (`getMedalNationalPriority`).
 */
export function compareMedalForRackOrder(
  a: { precedenceOrder: number; name: string; countryCode?: string },
  b: { precedenceOrder: number; name: string; countryCode?: string },
  nationalCountryCode?: string,
): number {
  const aNationalPriority = getMedalNationalPriority(a.countryCode, nationalCountryCode);
  const bNationalPriority = getMedalNationalPriority(b.countryCode, nationalCountryCode);
  if (aNationalPriority !== bNationalPriority) return aNationalPriority - bNationalPriority;
  if (a.precedenceOrder !== b.precedenceOrder) return a.precedenceOrder - b.precedenceOrder;
  if ((a.countryCode || "") !== (b.countryCode || "")) {
    return String(a.countryCode || "").localeCompare(String(b.countryCode || ""));
  }
  return a.name.localeCompare(b.name);
}

export function sortRackMedals<
  T extends { precedenceOrder: number; name: string; countryCode?: string }
>(medals: T[], options?: { nationalCountryCode?: string }): T[] {
  return [...medals].sort((a, b) =>
    compareMedalForRackOrder(a, b, options?.nationalCountryCode),
  );
}

/**
 * Same ordering as {@link buildRibbonRackMedals} / {@link sortRackMedals}.
 * Use for “Awards & Decorations” lists so row order matches the ribbon rack.
 */
export function sortHeroMedalEntries<T extends RackMedalEntryLike>(
  entries: T[],
  options?: { nationalCountryCode?: string },
): T[] {
  return [...entries].filter((e) => e.medalType).sort((a, b) => {
    const ma = a.medalType!;
    const mb = b.medalType!;
    return compareMedalForRackOrder(
      {
        precedenceOrder: ma.precedenceOrder,
        name: ma.name,
        countryCode: ma.countryCode,
      },
      {
        precedenceOrder: mb.precedenceOrder,
        name: mb.name,
        countryCode: mb.countryCode,
      },
      options?.nationalCountryCode,
    );
  });
}

export function buildRibbonRackMedals(
  entries: RackMedalEntryLike[],
  options?: { serviceBranch?: string; nationalCountryCode?: string },
): RackRenderMedal[] {
  const medals = entries
    .filter((entry) => entry.medalType)
    .map((entry) => {
      const medalType = entry.medalType!;
      const resolvedDeviceRule =
        medalType.deviceRule ??
        parseMedalDeviceRule(medalType.deviceLogic, {
          countryCode: medalType.countryCode,
          inventoryCategory: medalType.inventoryCategory,
          medalName: medalType.name,
        });
      return {
        medalId: medalType._id ? String(medalType._id) : undefined,
        name: medalType.name,
        count: Math.max(1, entry.count || 1),
        precedenceOrder: medalType.precedenceOrder,
        ribbonColors: medalType.ribbonColors?.length ? medalType.ribbonColors : ["#808080"],
        ribbonImageUrl: entry.wikiRibbonUrl || medalType.ribbonImageUrl,
        hasValor: Boolean(entry.hasValor),
        arrowheads: entry.arrowheads ?? 0,
        isUnitCitation: isUnitCitationMedal(medalType.name),
        deviceImages: entry.deviceImages ?? [],
        deviceLogic: medalType.deviceLogic,
        deviceRule: resolvedDeviceRule,
        countryCode: medalType.countryCode,
        inventoryCategory: medalType.inventoryCategory,
        serviceBranch: options?.serviceBranch,
        wikiSummary: medalType.wikiSummary,
        history: medalType.history,
        awardCriteria: medalType.awardCriteria,
        imageUrl: medalType.imageUrl,
        description: medalType.description,
        wikipediaUrl: medalType.wikipediaUrl,
        appearance: medalType.appearance,
        established: medalType.established,
      } satisfies RackRenderMedal;
    });

  return sortRackMedals(medals, { nationalCountryCode: options?.nationalCountryCode });
}
