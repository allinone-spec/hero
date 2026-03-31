/**
 * Stage 1–2: AI medal list → DB MedalType matching (clerk output, not rack layout).
 * Normalization: `normalizeAwardText` / `@/lib/award-clerk`.
 */

import { normalizeAwardText } from "@/lib/medal-normalization";
import { resolveMedalOfHonorCatalogName } from "@/lib/medal-of-honor-resolve";

export interface MedalTypeForMatch {
  _id: { toString(): string };
  name: string;
  shortName: string;
  otherNames?: string[];
  countryCode?: string;
  medalId?: string;
}

export interface MatchedAiMedal {
  medalTypeId: string;
  name: string;
  shortName: string;
  count: number;
  hasValor: boolean;
  valorDevices: number;
}

export interface UnmatchedMedalName {
  rawName: string;
  count: number;
  hasValor: boolean;
}

interface MatchOptions {
  countryCode?: string;
  /** U.S. service branch — used to pick Army vs Navy/MC vs Air Force Medal of Honor catalog rows */
  serviceBranch?: string;
}

function getCandidatePool(
  medalTypes: MedalTypeForMatch[],
  options?: MatchOptions
): MedalTypeForMatch[] {
  const countryCode = String(options?.countryCode || "").toUpperCase();
  if (!countryCode) return medalTypes;
  const scoped = medalTypes.filter((t) => String(t.countryCode || "").toUpperCase() === countryCode);
  return scoped.length > 0 ? scoped : medalTypes;
}

export function matchAiMedalsToDatabase(
  medals: unknown,
  medalTypes: MedalTypeForMatch[],
  options?: MatchOptions
): { matched: MatchedAiMedal[]; unmatched: UnmatchedMedalName[] } {
  const matched: MatchedAiMedal[] = [];
  const unmatched: UnmatchedMedalName[] = [];
  const candidatePool = getCandidatePool(medalTypes, options);

  if (!Array.isArray(medals)) {
    return { matched, unmatched };
  }

  for (const entry of medals) {
    let medalName: string;
    let count = 1;
    let hasValor = false;

    if (typeof entry === "object" && entry !== null && "name" in entry) {
      medalName = String((entry as { name: string }).name);
      count = Math.max(1, Number((entry as { count?: number }).count) || 1);
      hasValor = Boolean((entry as { hasValor?: boolean }).hasValor);
    } else if (typeof entry === "string") {
      medalName = entry;
    } else {
      continue;
    }

    const normalized = normalizeAwardText(medalName, count, hasValor);
    medalName = normalized.name;
    count = normalized.count;
    hasValor = normalized.hasValor;

    medalName = resolveMedalOfHonorCatalogName(medalName, {
      countryCode: options?.countryCode,
      serviceBranch: options?.serviceBranch,
    });

    const lower = medalName.toLowerCase().trim();
    const cleanLower = lower;

    let mt = candidatePool.find((t) => t.name.toLowerCase() === cleanLower);
    if (!mt) mt = candidatePool.find((t) => t.name.toLowerCase() === lower);
    if (!mt) {
      mt = candidatePool.find((t) =>
        t.otherNames?.some((alt) => alt.toLowerCase() === cleanLower)
      );
    }
    if (!mt && cleanLower.length > 6) {
      mt = candidatePool.find(
        (t) =>
          t.name.toLowerCase().includes(cleanLower) ||
          cleanLower.includes(t.name.toLowerCase()) ||
          t.otherNames?.some(
            (alt) => alt.toLowerCase().includes(cleanLower) || cleanLower.includes(alt.toLowerCase())
          )
      );
    }
    if (!mt) {
      mt = candidatePool.find((t) => t.shortName.toLowerCase() === cleanLower);
    }

    if (mt) {
      const mtId = mt._id.toString();
      const existing = matched.find((m) => m.medalTypeId === mtId);
      if (existing) {
        if (count > existing.count) existing.count = count;
        if (hasValor && !existing.hasValor) {
          existing.hasValor = true;
          existing.valorDevices = 1;
        }
      } else {
        matched.push({
          medalTypeId: mtId,
          name: mt.name,
          shortName: mt.shortName,
          count,
          hasValor,
          valorDevices: hasValor ? 1 : 0,
        });
      }
    } else {
      unmatched.push({ rawName: medalName, count, hasValor });
    }
  }

  return { matched, unmatched };
}
