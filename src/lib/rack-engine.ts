import type { MedalDeviceRule } from "@/lib/medal-device-rules";
import { parseMedalDeviceRule } from "@/lib/medal-device-rules";
import { RIBBON_GAP } from "@/components/ribbon-rack/ribbon-data";
import {
  normalizeMedalCountryCode,
} from "@/lib/medal-eligibility";

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
  tier?: number;
  basePoints?: number;
  valorPoints?: number;
  requiresValorDevice?: boolean;
  inherentlyValor?: boolean;
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
  valorTier?: number;
  basePoints?: number;
  valorPoints?: number;
  requiresValorDevice?: boolean;
  inherentlyValor?: boolean;
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
      return { countryCode: cc, defaultMaxPerRow: 4, defaultGap: RIBBON_GAP, rowAlignment: "pyramid" };
    case "US":
    default:
      return {
        countryCode: cc || "US",
        defaultMaxPerRow: 4,
        defaultGap: RIBBON_GAP,
        rowAlignment: "pyramid",
      };
  }
}

/**
 * Rack order: (0) medals from the hero’s own country, (1) other Commonwealth catalog countries,
 * (2) all other foreign awards — then precedence within each band. This keeps a host-nation gallantry
 * ribbon ahead of a higher-precedence foreign decoration on the same rack.
 */
function nationalRackGroup(
  medalCountryCode: string | undefined,
  nationalCountryCode: string | undefined,
  inventoryCategory?: string,
): number {
  const medalCC = normalizeMedalCountryCode(medalCountryCode);
  const nationalCC = normalizeMedalCountryCode(nationalCountryCode);
  if (!nationalCC) return 0;
  if (String(inventoryCategory || "").toLowerCase() === "foreign") return 2;
  if (!medalCC) return 2;
  if (medalCC === nationalCC) return 0;
  return 2;
}

/** Shared by ribbon rack SVG and hero award lists — keep ordering identical. */
export function compareMedalForRackOrder(
  a: { precedenceOrder: number; name: string; countryCode?: string; inventoryCategory?: string },
  b: { precedenceOrder: number; name: string; countryCode?: string; inventoryCategory?: string },
  nationalCountryCode?: string,
): number {
  const aNationalPriority = nationalRackGroup(a.countryCode, nationalCountryCode, a.inventoryCategory);
  const bNationalPriority = nationalRackGroup(b.countryCode, nationalCountryCode, b.inventoryCategory);
  if (aNationalPriority !== bNationalPriority) return aNationalPriority - bNationalPriority;
  if (a.precedenceOrder !== b.precedenceOrder) return a.precedenceOrder - b.precedenceOrder;
  if ((a.countryCode || "") !== (b.countryCode || "")) {
    return String(a.countryCode || "").localeCompare(String(b.countryCode || ""));
  }
  return a.name.localeCompare(b.name);
}

export function sortRackMedals<
  T extends { precedenceOrder: number; name: string; countryCode?: string; inventoryCategory?: string }
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
        inventoryCategory: ma.inventoryCategory,
      },
      {
        precedenceOrder: mb.precedenceOrder,
        name: mb.name,
        countryCode: mb.countryCode,
        inventoryCategory: mb.inventoryCategory,
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
        valorTier: medalType.tier,
        basePoints: medalType.basePoints ?? 0,
        valorPoints: medalType.valorPoints ?? medalType.basePoints ?? 0,
        requiresValorDevice: Boolean(medalType.requiresValorDevice),
        inherentlyValor: Boolean(medalType.inherentlyValor),
      } satisfies RackRenderMedal;
    });

  return sortRackMedals(medals, { nationalCountryCode: options?.nationalCountryCode });
}
