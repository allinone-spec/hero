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
};

function parseIntLike(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return WORD_NUMS[cleaned] ?? null;
}

function extractLeadingCount(raw: string): { name: string; count: number | null } {
  const match = raw.match(/^\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i);
  if (!match) return { name: raw, count: null };
  const count = parseIntLike(match[1]);
  return { name: match[2].trim(), count };
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

export function normalizeAwardText(rawName: string, explicitCount = 1, explicitHasValor = false): NormalizedAwardText {
  const leading = extractLeadingCount(rawName);
  const withValor = stripValor(leading.name);
  const withClusters = extractClusterCount(withValor.text);
  const trailingCount = withClusters.text.match(/\s+x\s*(\d+)$/i);

  let count = Math.max(1, explicitCount || 1);
  if (leading.count) count = Math.max(count, leading.count);
  if (withClusters.totalCount) count = Math.max(count, withClusters.totalCount);
  if (trailingCount?.[1]) count = Math.max(count, Number(trailingCount[1]));

  const cleaned = singularizeMedalName(cleanupMedalName(withClusters.text));

  return {
    name: cleaned,
    count,
    hasValor: explicitHasValor || withValor.hasValor,
  };
}
