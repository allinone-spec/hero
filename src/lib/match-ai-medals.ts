/** Shared AI medal list → DB MedalType matching (clerk output, not layout). */

export interface MedalTypeForMatch {
  _id: { toString(): string };
  name: string;
  shortName: string;
  otherNames?: string[];
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

export function matchAiMedalsToDatabase(
  medals: unknown,
  medalTypes: MedalTypeForMatch[]
): { matched: MatchedAiMedal[]; unmatched: UnmatchedMedalName[] } {
  const matched: MatchedAiMedal[] = [];
  const unmatched: UnmatchedMedalName[] = [];

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

    const lower = medalName.toLowerCase().trim();

    if (!hasValor) {
      hasValor = /with\s+valor|with\s+"?v"?\s*device|combat\s+"?v"?|\(v\)|\bvalor\b/i.test(lower);
    }

    const cleanLower = lower
      .replace(/\s*with\s+valor\b/i, "")
      .replace(/\s*with\s+"?v"?\s*device\b/i, "")
      .replace(/\s*combat\s+"?v"?\b/i, "")
      .replace(/\s*\(v\)\s*/i, "")
      .trim();

    let mt = medalTypes.find((t) => t.name.toLowerCase() === cleanLower);
    if (!mt) mt = medalTypes.find((t) => t.name.toLowerCase() === lower);
    if (!mt) {
      mt = medalTypes.find((t) =>
        t.otherNames?.some((alt) => alt.toLowerCase() === cleanLower)
      );
    }
    if (!mt && cleanLower.length > 6) {
      mt = medalTypes.find(
        (t) =>
          t.name.toLowerCase().includes(cleanLower) ||
          cleanLower.includes(t.name.toLowerCase()) ||
          t.otherNames?.some(
            (alt) => alt.toLowerCase().includes(cleanLower) || cleanLower.includes(alt.toLowerCase())
          )
      );
    }
    if (!mt) {
      mt = medalTypes.find((t) => t.shortName.toLowerCase() === cleanLower);
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
