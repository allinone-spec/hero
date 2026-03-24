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
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  imageUrl?: string;
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
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  imageUrl?: string;
}

export function isUnitCitationMedal(name: string): boolean {
  return /\bunit\b/i.test(name) || /\bpresidential.*citation\b/i.test(name);
}

export function sortRackMedals<T extends { precedenceOrder: number; name: string }>(medals: T[]): T[] {
  return [...medals].sort((a, b) => {
    if (a.precedenceOrder !== b.precedenceOrder) return a.precedenceOrder - b.precedenceOrder;
    return a.name.localeCompare(b.name);
  });
}

export function buildRibbonRackMedals(entries: RackMedalEntryLike[]): RackRenderMedal[] {
  const medals = entries
    .filter((entry) => entry.medalType)
    .map((entry) => {
      const medalType = entry.medalType!;
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
        wikiSummary: medalType.wikiSummary,
        history: medalType.history,
        awardCriteria: medalType.awardCriteria,
        imageUrl: medalType.imageUrl,
      } satisfies RackRenderMedal;
    });

  return sortRackMedals(medals);
}
