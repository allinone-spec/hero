const WORD_NUMS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
};

const ORDINAL_NUMS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

function parseIntLike(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return WORD_NUMS[cleaned] ?? null;
}

function parseOrdinalLike(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return ORDINAL_NUMS[cleaned] ?? null;
}

function extractLeadingCount(raw: string): { name: string; count: number | null } {
  const match = raw.match(/^\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i);
  if (!match) return { name: raw, count: null };
  const count = parseIntLike(match[1]);
  return { name: match[2].trim(), count };
}

/** Wikipedia prose: "... awarded three Silver Stars" (count + medal name at end). */
function extractVerbLedCount(raw: string): { name: string; count: number | null } {
  const m = raw.match(
    /\b(?:awarded|received|decorated\s+with|earning|earned)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i,
  );
  if (!m) return { name: raw, count: null };
  const c = parseIntLike(m[1]);
  if (!c) return { name: raw, count: null };
  return { name: m[2].trim(), count: c };
}

function stripValor(text: string): { text: string; hasValor: boolean } {
  let next = text;
  let hasValor = false;
  const patterns = [
    /\s+with\s+valor\b/gi,
    /\s+with\s+"?v"?\s*device\b/gi,
    /\s+with\s+combat\s+"?v"?\b/gi,
    /\s+\(?["']?v["']?\)?\s*device\b/gi,
    /\s+\(v\)/gi,
  ];
  for (const pattern of patterns) {
    if (pattern.test(next)) {
      hasValor = true;
      next = next.replace(pattern, "");
    }
  }
  return { text: next.trim(), hasValor };
}

function extractClusterCount(text: string): { text: string; totalCount: number | null } {
  const singularOlc = /\s+with\s+(?:an\s+)?oak\s+leaf\s+cluster\b/i;
  if (singularOlc.test(text)) {
    return {
      text: text.replace(singularOlc, "").trim(),
      totalCount: 2,
    };
  }

  const patterns: Array<{ re: RegExp; multiplier: number }> = [
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+oak\s+leaf\s+clusters?\b/i,
      multiplier: 5,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+bronze\s+oak\s+leaf\s+clusters?\b/i,
      multiplier: 1,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+oak\s+leaf\s+clusters?\b/i,
      multiplier: 1,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+olcs?\b/i,
      multiplier: 1,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+stars?\b/i,
      multiplier: 5,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+gold\s+stars?\b/i,
      multiplier: 1,
    },
    {
      re: /\s+with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+clusters?\b/i,
      multiplier: 1,
    },
  ];

  for (const { re, multiplier } of patterns) {
    const match = text.match(re);
    if (!match) continue;
    const n = parseIntLike(match[1]);
    if (!n) continue;
    return {
      text: text.replace(re, "").trim(),
      totalCount: 1 + (n * multiplier),
    };
  }

  return { text, totalCount: null };
}

function extractCommonwealthDeviceCount(text: string): { text: string; totalCount: number | null } {
  const numericPatterns: Array<{ re: RegExp }> = [
    {
      re: /\s+(?:with|and)\s+(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|\d+)\s+bars?\b/i,
    },
    {
      re: /\s+(?:with|and)\s+(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|\d+)\s+clasps?\b/i,
    },
    {
      re: /\s+(?:with|and)\s+(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|\d+)\s+rosettes?\b/i,
    },
  ];

  for (const { re } of numericPatterns) {
    const match = text.match(re);
    if (!match) continue;
    const countToken = match[0]
      .replace(/\s+(with|and)\s+/i, "")
      .replace(/\s+(bars?|clasps?|rosettes?)\b/i, "")
      .trim();
    const n = /^(a|an)$/i.test(countToken) ? 1 : parseIntLike(countToken);
    if (!n) continue;
    return {
      text: text.replace(re, "").trim(),
      totalCount: 1 + n,
    };
  }

  const ordinalPatterns: Array<{ re: RegExp }> = [
    { re: /\s+(?:with|and)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+bar\b/i },
    { re: /\s+(?:with|and)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+clasp\b/i },
    { re: /\s+(?:with|and)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+rosette\b/i },
  ];

  for (const { re } of ordinalPatterns) {
    const match = text.match(re);
    if (!match) continue;
    const ordinal = parseOrdinalLike(match[1]);
    if (!ordinal) continue;
    return {
      text: text.replace(re, "").trim(),
      totalCount: ordinal + 1,
    };
  }

  if (/\s+(?:with|and)\s+bar\b/i.test(text)) {
    return { text: text.replace(/\s+(?:with|and)\s+bar\b/i, "").trim(), totalCount: 2 };
  }
  if (/\s+(?:with|and)\s+clasp\b/i.test(text)) {
    return { text: text.replace(/\s+(?:with|and)\s+clasp\b/i, "").trim(), totalCount: 2 };
  }
  if (/\s+(?:with|and)\s+rosette\b/i.test(text)) {
    return { text: text.replace(/\s+(?:with|and)\s+rosette\b/i, "").trim(), totalCount: 2 };
  }

  return { text, totalCount: null };
}

function cleanupMedalName(text: string): string {
  return text
    .replace(/\s+x\s*(\d+)$/i, "")
    .replace(/\s*[,;:()-]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function singularizeMedalName(text: string): string {
  const trimmed = text.trim();
  if (/crosses$/i.test(trimmed)) return trimmed.replace(/crosses$/i, "Cross");
  if (/medals$/i.test(trimmed)) return trimmed.replace(/medals$/i, "Medal");
  if (/stars$/i.test(trimmed)) return trimmed.replace(/stars$/i, "Star");
  if (/ribbons$/i.test(trimmed)) return trimmed.replace(/ribbons$/i, "Ribbon");
  if (/citations$/i.test(trimmed)) return trimmed.replace(/citations$/i, "Citation");
  return trimmed;
}

export interface NormalizedAwardText {
  name: string;
  count: number;
  hasValor: boolean;
}

export function normalizeAwardText(
  rawName: string,
  explicitCount = 1,
  explicitHasValor = false
): NormalizedAwardText {
  const leading = extractLeadingCount(rawName);
  const verbLed = extractVerbLedCount(rawName);
  const nameBase = leading.count ? leading.name : verbLed.count ? verbLed.name : rawName;
  const earlyCount = leading.count ?? verbLed.count;
  const withValor = stripValor(nameBase);
  const withClusters = extractClusterCount(withValor.text);
  const withCommonwealthDevices = extractCommonwealthDeviceCount(withClusters.text);
  const trailingCount = withCommonwealthDevices.text.match(/\s+x\s*(\d+)$/i);

  let count = Math.max(1, explicitCount || 1);
  if (earlyCount) count = Math.max(count, earlyCount);
  if (withClusters.totalCount) count = Math.max(count, withClusters.totalCount);
  if (withCommonwealthDevices.totalCount) {
    count = Math.max(count, withCommonwealthDevices.totalCount);
  }
  if (trailingCount?.[1]) count = Math.max(count, Number(trailingCount[1]));

  const cleaned = singularizeMedalName(cleanupMedalName(withCommonwealthDevices.text));

  return {
    name: cleaned,
    count,
    hasValor: explicitHasValor || withValor.hasValor,
  };
}
