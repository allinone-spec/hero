// ── Wikipedia Hero Scraper ────────────────────────────────────────────────────
// Fetches and parses a Wikipedia page for a military hero, extracting name,
// rank, branch, biography, wars, and awards from the standard military infobox.

import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";

export interface ScrapedMedal {
  rawName: string;
  devices: string;
  count: number;
  hasValor: boolean;
  arrowheads: number;
}

export type CombatType = string;

export interface MedalCell {
  cellText: string;
  links: string[];
  devices: string; // device text extracted from cell (e.g. "with two Oak Leaf Clusters")
}

export interface RibbonRackCell {
  ribbonUrl: string;
  deviceUrls: string[];
  type: "ribbon" | "other";
  width?: number;
  height?: number;
}

export interface ScrapedHero {
  name: string;
  rank: string;
  branch: string;
  biography: string;
  wars: string[];
  medals: ScrapedMedal[];
  ribbonUrls: string[];
  deviceUrls: string[];
  medalCells: MedalCell[];
  ribbonRackCells: RibbonRackCell[];
  ribbonMaxPerRow: number;
  avatarUrl?: string;
  combatType: CombatType;
  multiServiceOrMultiWar: boolean;
  rawAwardsText: string;
  rawAwardsHtml: string;
}

function detectCombatType(infoboxText: string): CombatType {
  const t = infoboxText.toLowerCase();
  if (/\b(pilot|aviator|aerial|air ace|fighter pilot|bomber pilot|flying ace|sortie|squadron|wing commander|airman|airforce)\b/.test(t)) return "aviation";
  if (/\b(submarine|submariner|sub commander|undersea)\b/.test(t)) return "submarine";
  if (/\b(surface warfare|destroyer|battleship|cruiser|naval combat|fleet commander)\b/.test(t)) return "surface";
  if (/\b(amphibious|beach assault|landing craft|amphibious assault)\b/.test(t)) return "amphibious";
  if (/\b(paratrooper|airborne|parachute|glider infantry|air assault|101st|82nd)\b/.test(t)) return "airborne";
  if (/\b(special forces|green beret|navy seal|seal team|delta force|ranger regiment|special operations|commando)\b/.test(t)) return "special_operations";
  if (/\b(sniper|marksman|sharpshooter|designated marksman)\b/.test(t)) return "sniper";
  if (/\b(marine corps|marines|leatherneck|usmc|marine raider|marine division)\b/.test(t)) return "marine";
  if (/\b(tank|armor|armored|cavalry|mechanized infantry|panzer)\b/.test(t)) return "armor";
  if (/\b(artillery|howitzer|mortar|field battery|cannoneer|bombardment)\b/.test(t)) return "artillery";
  if (/\b(combat engineer|sapper|demolition|mine clearance|bridge building)\b/.test(t)) return "engineering";
  if (/\b(reconnaissance|scout|forward observer|long range patrol|lrrp)\b/.test(t)) return "reconnaissance";
  if (/\b(combat medic|corpsman|field surgeon|medical corps|battlefield medicine)\b/.test(t)) return "medical";
  if (/\b(military intelligence|intelligence officer|oss|cia|cryptanalysis|signals intelligence)\b/.test(t)) return "intelligence";
  if (/\b(signal corps|communications|radio operator)\b/.test(t)) return "signal";
  if (/\b(air defense|anti-aircraft|missile defense|patriot|flak)\b/.test(t)) return "air_defense";
  if (/\b(military police|provost|law enforcement)\b/.test(t)) return "military_police";
  if (/\b(ordnance|bomb disposal|eod|explosive ordnance)\b/.test(t)) return "ordnance";
  if (/\b(chemical|biological|nuclear|cbrn|chemical warfare)\b/.test(t)) return "chemical";
  if (/\b(electronic warfare|electronic countermeasure|jamming|sigint)\b/.test(t)) return "electronic_warfare";
  if (/\b(cyber|information warfare|cyber command)\b/.test(t)) return "cyber";
  if (/\b(logistics|quartermaster|supply|transportation corps)\b/.test(t)) return "logistics";
  if (/\b(infantry|infantryman|rifleman|foot soldier|platoon leader|company commander)\b/.test(t)) return "infantry";
  return "none";
}

function extractWikiTitle(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("wikipedia.org")) return null;
    const match = parsed.pathname.match(/^\/wiki\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))) // decode all numeric entities
    .replace(/\[[\d\w]+\]/g, "") // strip footnote refs [1], [a]
    .replace(/\s+/g, " ")
    .trim();
}

// Like stripHtml but preserves line breaks from <br>, <li>, <tr> elements
// so the raw text retains list structure for AI context
function stripHtmlKeepLines(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")   // strip style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")  // strip script blocks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, "\n")              // table cells → newlines (separate multi-column medals)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\[[\d\w]+\]/g, "")
    .replace(/[ \t]+/g, " ")       // collapse spaces/tabs but NOT newlines
    .replace(/\n[ \t]*/g, "\n")    // trim leading whitespace on each line
    .replace(/\n{2,}/g, "\n")      // collapse multiple blank lines
    .trim();
}

// Simplify awards HTML for AI extraction.
// Keeps <table>/<tr>/<td>/<th> structure + colspan/rowspan, replaces <img> with alt text,
// strips everything else. Extracts only <table> blocks to drop prose/citations.
function simplifyAwardsHtml(html: string): string {
  let result = html
    .replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi, "[$1]")
    .replace(/<img[^>]*\/?>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, "")
    .replace(/(<(?:table|tr|td|th|caption)\b)\s+[^>]*((?:\s+(?:colspan|rowspan)="[^"]*")*)[^>]*>/gi,
      (_, tag, spans) => `${tag}${spans}>`)
    .replace(/<[^>]+>/g, (tag) =>
      /^<\/?(?:table|tr|td|th|caption)\b/i.test(tag) ? tag : "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\[[\d\w]+\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  // Extract all tables at every nesting level using depth tracking
  const allTables: { start: number; end: number }[] = [];
  let pos = 0;
  while (pos < result.length) {
    const openIdx = result.indexOf("<table", pos);
    if (openIdx === -1) break;

    let depth = 1;
    let scanPos = openIdx + 6;
    let endPos = -1;

    while (scanPos < result.length) {
      const nextOpen = result.indexOf("<table", scanPos);
      const nextClose = result.indexOf("</table>", scanPos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        scanPos = nextOpen + 6;
      } else {
        depth--;
        if (depth === 0) {
          endPos = nextClose + 8;
          break;
        }
        scanPos = nextClose + 8;
      }
    }

    if (endPos > openIdx) {
      allTables.push({ start: openIdx, end: endPos });
      // Continue scanning INSIDE this table to find nested tables
      pos = openIdx + 6;
    } else {
      pos = openIdx + 6;
    }
  }

  // Prefer leaf tables (no nested <table> inside) — gives clean individual tables
  // instead of wrapper tables containing nested sub-tables
  const leafTables = allTables.filter((t) => {
    const content = result.slice(t.start, t.end);
    return (content.match(/<table/gi) || []).length === 1;
  });

  const tables = leafTables.length > 0
    ? leafTables.map((t) => result.slice(t.start, t.end))
    : allTables
        .filter((t) => !allTables.some((o) => o.start < t.start && o.end > t.end))
        .map((t) => result.slice(t.start, t.end));

  return tables.length > 0 ? tables.join("\n") : result;
}

const BRANCH_MAP: [RegExp, string][] = [
  [/marine corps|usmc/i,             "U.S. Marine Corps"],
  [/army air force|army air corps|air force|usaf/i, "U.S. Air Force"],
  [/coast guard/i,                   "U.S. Coast Guard"],
  [/space force/i,                   "U.S. Space Force"],
  [/navy|usn/i,                      "U.S. Navy"],
  [/army|usa/i,                      "U.S. Army"],
];

function normalizeBranch(raw: string): string {
  for (const [re, name] of BRANCH_MAP) {
    if (re.test(raw)) return name;
  }
  return raw.trim();
}

// Word-to-number map for OLC/device parsing
const WORD_NUMS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/** True if a line is a device/modifier description rather than a medal name */
function isDeviceLine(line: string): boolean {
  // "with N [silver|bronze] oak leaf clusters", "with V device", "w/ 3 bronze..."
  if (/^(?:with\s+|w\/\s*)/i.test(line)) return true;
  // "2 Bronze Oak Leaf Clusters", "1 Silver Service Star"
  if (/^\d+\s+(bronze|silver|gold)\s+(oak leaf|service star)/i.test(line)) return true;
  // Standalone device descriptions: "Bronze Oak Leaf Cluster"
  if (/^(bronze|silver|gold)\s+(oak leaf cluster|service star)/i.test(line)) return true;
  // "V device", "Combat Distinguishing Device"
  if (/^"?v"?\s*device/i.test(line)) return true;
  if (/^combat\s+(distinguishing\s+)?device/i.test(line)) return true;
  // "Arrowhead device"
  if (/^arrowhead/i.test(line)) return true;
  return false;
}

/**
 * Wikitable-specific medal parser.
 * In wikitables, each <td> cell = one medal.
 * The first tag (usually <a>) contains the medal name.
 * Everything else in the cell is device information.
 */
function parseWikitableMedals(tableHtml: string): ScrapedMedal[] {
  const medals: ScrapedMedal[] = [];

  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(tableHtml)) !== null) {
    const cellHtml = cellMatch[1].trim();
    if (!cellHtml) continue;

    // The first tag contains the medal name
    // Try <a> first, then any other tag with text content
    const firstTagMatch = cellHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
      || cellHtml.match(/<(?:span|b|i|strong|em)[^>]*>([\s\S]*?)<\/(?:span|b|i|strong|em)>/i);

    let medalName: string;
    let deviceHtml: string;

    if (firstTagMatch) {
      medalName = firstTagMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      // Everything after the first tag is device info
      deviceHtml = cellHtml.slice(firstTagMatch.index! + firstTagMatch[0].length);
    } else {
      // No tag found — use plain text of cell, split at first <br> if present
      const brSplit = cellHtml.split(/<br\s*\/?>/i);
      medalName = brSplit[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      deviceHtml = brSplit.slice(1).join(" ");
    }

    if (!medalName || medalName.length < 3) continue;

    // Clean the device portion to plain text
    const deviceText = deviceHtml
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#160;/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\[[\d\w]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Combine medal name + device text for valor/arrowhead/count detection
    const fullText = [medalName, deviceText].filter(Boolean).join(" ");
    let hasValor = /\bvalor\b|"v"\s*device|'v'\s*device|\u201cv\u201d\s*device|\bwith\s+"?v"?\b|combat\s+"?v"?|\(v\)/i.test(fullText);
    let arrowheads = /arrowhead/i.test(fullText) ? 1 : 0;

    // Parse count from device text
    let count = 1;
    if (deviceText) {
      count = parseDeviceCount(deviceText, count);
      if (/\bvalor\b|"v"\s*device|'v'\s*device|\u201cv\u201d\s*device|"?v"?\s*device|combat\s+"?v"?|\(v\)/i.test(deviceText)) {
        hasValor = true;
      }
      if (/arrowhead/i.test(deviceText)) arrowheads = 1;
    }

    // Check medal name for inline count: "Silver Star (3)" or "×3"
    count = parseDeviceCount(medalName, count);
    if (count === 1) {
      const parenMatch = medalName.match(/\((\d+)\)\s*$/);
      if (parenMatch) {
        count = parseInt(parenMatch[1]);
        medalName = medalName.replace(/\s*\(\d+\)\s*$/, "").trim();
      }
    }
    if (count === 1) {
      const timesMatch = medalName.match(/[×x]\s*(\d+)\s*$/);
      if (timesMatch) {
        count = parseInt(timesMatch[1]);
        medalName = medalName.replace(/\s*[×x]\s*\d+\s*$/, "").trim();
      }
    }

    // Clean medal name
    medalName = cleanMedalName(medalName);

    // Skip non-medal content and device-only lines
    if (isNonMedalLine(medalName)) continue;
    if (isDeviceLine(medalName)) continue;

    medals.push({ rawName: medalName, devices: deviceText, count, hasValor, arrowheads });
  }

  return medals;
}

/**
 * Cell-based award parser.
 * Each <td> cell may contain one medal (name + device info below) or
 * multiple medals in a flat <br>-separated list (common in infoboxes).
 * Uses isDeviceLine() to distinguish device descriptions from medal names.
 */
function parseAwardLines(awardsHtml: string): ScrapedMedal[] {
  const medals: ScrapedMedal[] = [];

  // Collect cell contents: extract <td> cells, or treat entire HTML as one cell
  const cellContents: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(awardsHtml)) !== null) {
    cellContents.push(cellMatch[1]);
  }
  // If no <td> tags found, the input is already the inner content of a cell
  // (common for infobox awards passed as valueHtml)
  if (cellContents.length === 0) {
    cellContents.push(awardsHtml);
  }

  // Groups persist across cells so that a device cell (e.g. "with Combat V")
  // can attach to the medal from the previous cell.
  const groups: { segmentHtml: string; deviceSegments: string[] }[] = [];

  for (const cellHtml of cellContents) {

    // Split cell content into segments via <br>, preserving HTML for <a> extraction
    const segments = cellHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#160;/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\[[\d\w]+\]/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 3);

    if (segments.length === 0) continue;

    for (const segment of segments) {
      const plainText = segment.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (plainText.length < 3) continue;

      // Skip row labels, section headers, annotations
      if (/^\d+(?:st|nd|rd|th)\s+row$/i.test(plainText)) continue;
      if (/^(?:foreign awards|domestic awards|military awards|awards and decorations|other awards)\s*$/i.test(plainText)) continue;
      if (/^(?:personal awards|unit awards|service awards|campaign & service awards|badges and tabs|individual & unit awards|service & training awards)\s*$/i.test(plainText)) continue;
      if (/^(?:u\.?s\.?\s+awards?\s+and\s+decorations?|foreign awards?\s+and\s+decorations?)\s*$/i.test(plainText)) continue;
      if (/^retroactively\s+awarded/i.test(plainText)) continue;

      if (isDeviceLine(plainText) && groups.length > 0) {
        // Attach to current medal (may be from a previous cell)
        groups[groups.length - 1].deviceSegments.push(plainText);
      } else {
        // New medal
        groups.push({ segmentHtml: segment, deviceSegments: [] });
      }
    }
  }

  // Process each medal group
  for (const group of groups) {
      const { segmentHtml, deviceSegments } = group;

      // Extract medal name from first <a> tag in the segment
      const linkMatch = segmentHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
      let medalName: string;
      let inlineDeviceText: string;

      if (linkMatch) {
        // Medal name = text of first <a> tag
        medalName = linkMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        // Device info = everything outside the first <a> tag
        const beforeLink = segmentHtml.slice(0, linkMatch.index).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        const afterLink = segmentHtml.slice(linkMatch.index! + linkMatch[0].length).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        inlineDeviceText = [beforeLink, afterLink].filter(Boolean).join(" ").trim();
      } else {
        // No <a> tag: fall back to full plain text as medal name
        medalName = segmentHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        inlineDeviceText = "";
      }

      // Combine inline device text with separate device lines
      const allDeviceTexts = [inlineDeviceText, ...deviceSegments].filter(Boolean);
      const deviceText = allDeviceTexts.join("; ");

      // Detect valor/arrowhead from medal name + all device info
      const fullText = [medalName, ...allDeviceTexts].join(" ");
      let hasValor = /\bvalor\b|"v"\s*device|'v'\s*device|\u201cv\u201d\s*device|\bwith\s+"?v"?\b|combat\s+"?v"?|\(v\)/i.test(fullText);
      let arrowheads = /arrowhead/i.test(fullText) ? 1 : 0;

      // Parse count from all device text (inline + separate lines)
      let count = 1;
      for (const dt of allDeviceTexts) {
        count = parseDeviceCount(dt, count);
        if (/\bvalor\b|"v"\s*device|'v'\s*device|\u201cv\u201d\s*device|"?v"?\s*device|combat\s+"?v"?|\(v\)/i.test(dt)) {
          hasValor = true;
        }
        if (/arrowhead/i.test(dt)) arrowheads = 1;
      }

      // Also check medal name line for inline count (e.g. "Silver Star (3)")
      count = parseDeviceCount(medalName, count);

      // Parse count from trailing parentheses: "Silver Star (3)"
      if (count === 1) {
        const parenMatch = medalName.match(/\((\d+)\)\s*$/);
        if (parenMatch) {
          count = parseInt(parenMatch[1]);
          medalName = medalName.replace(/\s*\(\d+\)\s*$/, "").trim();
        }
      }

      // Parse count from "×N" or "xN"
      if (count === 1) {
        const timesMatch = medalName.match(/[×x]\s*(\d+)\s*$/);
        if (timesMatch) {
          count = parseInt(timesMatch[1]);
          medalName = medalName.replace(/\s*[×x]\s*\d+\s*$/, "").trim();
        }
      }

      // Clean medal name
      medalName = cleanMedalName(medalName);

      // Skip non-medal content
      if (isNonMedalLine(medalName)) continue;

      medals.push({ rawName: medalName, devices: deviceText, count, hasValor, arrowheads });
  }

  return medals;
}

/** Parse OLC/star device count from a line of text.
 *  Accepts both "with" and "w/" as device prefixes. */
function parseDeviceCount(line: string, currentCount: number): number {
  // Normalize "w/" to "with" for uniform matching
  const normalized = line.replace(/\bw\/\s*/gi, "with ");

  // Complex: "with N silver ... and N bronze ... oak leaf cluster/service star"
  const complexOlcMatch = normalized.match(
    /with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+(?:oak leaf cluster|service star)s?\s+and\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+bronze\s+(?:oak leaf cluster|service star)s?/i
  );
  if (complexOlcMatch) {
    const silver = WORD_NUMS[complexOlcMatch[1].toLowerCase()] ?? parseInt(complexOlcMatch[1]);
    const bronze = WORD_NUMS[complexOlcMatch[2].toLowerCase()] ?? parseInt(complexOlcMatch[2]);
    return Math.max(currentCount, silver * 5 + bronze + 1);
  }

  // Simple: "with N (bronze) oak leaf cluster(s) / service star(s)"
  const olcMatch = normalized.match(/with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:bronze\s+)?(?:oak leaf cluster|service star|award star|campaign star)/i);
  if (olcMatch) {
    const n = WORD_NUMS[olcMatch[1].toLowerCase()] ?? parseInt(olcMatch[1]);
    if (n > 0) return Math.max(currentCount, n + 1);
  }

  // Silver-only: "with N silver oak leaf cluster(s)"
  const silverMatch = normalized.match(/with\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+(?:oak leaf cluster|service star)/i);
  if (silverMatch) {
    const n = WORD_NUMS[silverMatch[1].toLowerCase()] ?? parseInt(silverMatch[1]);
    return Math.max(currentCount, n * 5 + 1);
  }

  // Fraction stars: "with N 5⁄16-inch stars"
  const fractionStarMatch = normalized.match(/with\s+(\d+)\s+\d+[\u2044\/]\d+-inch\s+stars?/i);
  if (fractionStarMatch) {
    const n = parseInt(fractionStarMatch[1]);
    if (n > 0) return Math.max(currentCount, n + 1);
  }

  // Single fraction star: "with 5⁄16-inch star"
  if (/with\s+\d+[\u2044\/]\d+-inch\s+stars?/i.test(normalized)) {
    return Math.max(currentCount, 2);
  }

  // Service/campaign stars: "with N service stars"
  const serviceStarMatch = normalized.match(/with\s+(\d+)\s+(?:service|campaign)\s+stars?/i);
  if (serviceStarMatch) {
    const n = parseInt(serviceStarMatch[1]);
    if (n > 0) return Math.max(currentCount, n + 1);
  }

  return currentCount;
}

/** Strip device text and other suffixes from a medal name */
function cleanMedalName(name: string): string {
  return name
    // Strip OLC/star device text (both "with" and "w/" prefixes)
    .replace(/\s*(?:with|w\/)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+(?:oak leaf cluster|service star)s?\s+and\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+bronze\s+(?:oak leaf cluster|service star)s?.*/i, "")
    .replace(/\s*(?:with|w\/)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:bronze\s+)?(?:oak leaf cluster|service star|award star|campaign star)s?\b.*/i, "")
    .replace(/\s*(?:with|w\/)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+silver\s+(?:oak leaf cluster|service star)s?\b.*/i, "")
    .replace(/\s*(?:with|w\/)\s+\d+\s+\d+[\u2044\/]\d+-inch\s+stars?/i, "")
    .replace(/\s*(?:with|w\/)\s+\d+[\u2044\/]\d+-inch\s+stars?/i, "")
    .replace(/\s*(?:with|w\/)\s+\d+\s+(?:service|campaign)\s+stars?\b.*/i, "")
    // Strip leading list markers
    .replace(/^[\s\-–—•·]+/, "")
    // Strip parenthetical OLC/star descriptions
    .replace(/\s*\((?:with|w\/)\s+.*?(?:oak leaf|cluster|star|device).*?\)/i, "")
    // Strip "V" device annotations
    .replace(/\s+(?:with|w\/)\s+["'\u201c]?v["'\u201d]?\s*device/i, "")
    // "with palm", "with swords", etc.
    .replace(/\s+(?:with|w\/)\s+(palm|swords|crossed swords|wreath|clasp)s?\b/i, "")
    // "with 'Asia' clasp" etc.
    .replace(/\s+(?:with|w\/)\s+['"\u2018\u201c]?\w+['"\u2019\u201d]?\s*clasp/i, "")
    // Rank designations: ", Knight" / ", Officer" / ", Commander"
    .replace(/,\s*(Knight|Officer|Commander|Grand Officer|Grand Cross|1st Class|2nd Class|3rd Class)\s*$/i, "")
    // "1st Class" at end
    .replace(/\s+\d+(?:st|nd|rd|th)\s+Class\s*$/i, "")
    // Strip trailing comma
    .replace(/,\s*$/, "")
    .trim();
}

/** Check if a line is NOT a medal name (section header, prose, badge, insignia, etc.) */
function isNonMedalLine(line: string): boolean {
  return (
    line.length < 3 ||
    line.length > 120 ||
    /^\d+$/.test(line) ||
    /^(see also|references|notes|external|citations|general orders|rank and organization|place and date|entered service|born:|citation:)/i.test(line) ||
    /\b(was named|was awarded|was chosen|was dedicated|was renamed|will be inducted|is named|designated the|on behalf of|legislature designated)\b/i.test(line) ||
    /\b(he |she |his |her |they |the |on \d|in \d{4}|after causing|despite|due to|with the aid)\b/i.test(line) ||
    /\bplus,?\s/i.test(line) ||
    // Filter insignia, badges, tabs (not medals)
    // Filter "edit" links from Wikipedia section headers
    /^edit$/i.test(line) ||
    /^\[edit\]$/i.test(line) ||
    // Filter "Navy & Marine Corps" fragment (incomplete medal name)
    /^(?:navy|army|air force)\s*&\s*(?:marine|navy)/i.test(line) ||
    // Filter government/organizational names that aren't medals
    /\b(department of defense|department of the navy|department of the army)\b/i.test(line)
  );
}

// ── Extract full infobox with nested table support ───────────────────────────
// Wikipedia infoboxes often contain nested <table> elements (rank insignia, etc).
// A simple non-greedy regex [\s\S]*?<\/table> stops at the first </table>,
// cutting off content after nested tables — including the Awards row.
// This function counts table depth to find the correct closing tag.

function extractInfobox(html: string): { fullHtml: string; innerHtml: string } | null {
  const openMatch = html.match(/<table[^>]+class="[^"]*infobox[^"]*"[^>]*>/i);
  if (!openMatch || openMatch.index === undefined) return null;

  const startOuter = openMatch.index;
  const startInner = startOuter + openMatch[0].length;
  let depth = 1;
  let pos = startInner;

  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf("<table", pos);
    const nextClose = html.indexOf("</table>", pos);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 6;
    } else {
      depth--;
      if (depth === 0) {
        return {
          fullHtml: html.slice(startOuter, nextClose + 8),
          innerHtml: html.slice(startInner, nextClose),
        };
      }
      pos = nextClose + 8;
    }
  }

  return null;
}

// ── Extract ribbon image URLs from awards HTML ───────────────────────────────
// Wikipedia awards sections use various layouts: a single table with alternating
// image/text rows, two sibling tables (images + text), or infobox ribbon racks.
// Some cells contain multiple ribbon images. Instead of position-based matching,
// we extract ALL ribbon URLs and match them to medals by name similarity.

function extractAllRibbonUrls(html: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  function addUrl(src: string): void {
    let url = src;
    if (url.startsWith("//")) url = "https:" + url;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  }

  function isDeviceOverlay(src: string, imgTag: string): boolean {
    // Device overlays: Ribbonstar, Ribbonbar, oak leaf clusters, V devices
    if (/ribbonstar|ribbonbar/i.test(src)) return true;
    // Small thumbnails in URL (device overlays are typically ≤30px)
    const thumbSize = src.match(/\/(\d+)px-/);
    if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
    // Small by HTML width attribute
    const w = imgTag.match(/width="(\d+)"/i);
    if (w && parseInt(w[1]) < 50) return true;
    return false;
  }

  // Pass 1: flat scan for images with "ribbon" in the URL (catches most ribbons)
  const imgRegex1 = /<img[^>]+>/gi;
  let m;
  while ((m = imgRegex1.exec(html)) !== null) {
    const srcMatch = m[0].match(/src="([^"]+)"/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!/ribbon/i.test(src)) continue;
    if (isDeviceOverlay(src, m[0])) continue;
    addUrl(src);
  }

  // Pass 2: scan "image rows" for ribbon-shaped images without "ribbon" in filename
  // (e.g., Vietnam_gallantry_cross_unit_award-3d.svg)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const rowImgs = rowHtml.match(/<img[^>]+>/gi) || [];
    const textOnly = rowHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    // Only process image-dominant rows (ribbon rack rows)
    if (rowImgs.length === 0 || textOnly.length > rowImgs.length * 30) continue;

    for (const imgTag of rowImgs) {
      const srcMatch = imgTag.match(/src="([^"]+)"/i);
      if (!srcMatch) continue;
      const src = srcMatch[1];
      if (isDeviceOverlay(src, imgTag)) continue;
      // Check if ribbon-shaped: standard ribbon is ~106x29 (ratio ~3.7)
      // Use stricter filter than Pass 1 since we don't have "ribbon" in filename
      const wMatch = imgTag.match(/width="(\d+)"/i);
      const hMatch = imgTag.match(/height="(\d+)"/i);
      const w = wMatch ? parseInt(wMatch[1]) : 0;
      const h = hMatch ? parseInt(hMatch[1]) : 0;
      if (w >= 80 && w <= 150 && h > 0 && w / h > 3.0) {
        addUrl(src);
      }
    }
  }

  return urls;
}

// ── Extract device overlay image URLs from awards HTML ────────────────────────
// Device overlays are the small images (oak leaf clusters, V devices, campaign
// stars, award numerals) that appear on top of ribbon images in Wikipedia.
// These are exactly the images that isDeviceOverlay() identifies.

function extractAllDeviceUrls(html: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  function addUrl(src: string): void {
    let url = src;
    if (url.startsWith("//")) url = "https:" + url;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  }

  function isDevice(src: string, imgTag: string): boolean {
    if (/ribbonstar|ribbonbar/i.test(src)) return true;
    const thumbSize = src.match(/\/(\d+)px-/);
    if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
    const w = imgTag.match(/width="(\d+)"/i);
    if (w && parseInt(w[1]) < 50) return true;
    return false;
  }

  // Scan all images in the HTML — capture device overlays
  const imgRegex = /<img[^>]+>/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const srcMatch = m[0].match(/src="([^"]+)"/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!isDevice(src, m[0])) continue;
    // Skip tiny spacers and icons that aren't military devices
    if (/spacer|pixel|transparent|icon/i.test(src)) continue;
    addUrl(src);
  }

  return urls;
}

// ── Extract per-cell ribbon + device URLs from ribbon rack rows ───────────────
// Wikipedia ribbon racks are tables where each <td> contains a ribbon <img>
// plus optional device overlay <img> elements. The order matches the medal table.

/** Check if an image is a ribbon (wide, thin, ~106x29 aspect ratio ~3.7) */
function isRibbonImage(imgTag: string, src: string): boolean {
  // Ribbons typically have "ribbon" in filename
  const hasRibbonInName = /ribbon/i.test(src);
  // Check dimensions
  const wMatch = imgTag.match(/width="(\d+)"/i);
  const hMatch = imgTag.match(/height="(\d+)"/i);
  const w = wMatch ? parseInt(wMatch[1]) : 0;
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  // Standard ribbon: ~106x29 — aspect ratio > 2.5, width 80-150
  const isRibbonShaped = w >= 80 && w <= 150 && h > 0 && w / h > 2.5;
  // Accept if it has "ribbon" in the filename OR is ribbon-shaped
  return hasRibbonInName || isRibbonShaped;
}

function extractRibbonRackCells(awardsHtml: string): { cells: RibbonRackCell[]; maxPerRow: number } {
  const cells: RibbonRackCell[] = [];
  let maxPerRow = 0;

  // Find ribbon rack rows: rows where most cells contain images and little text
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(awardsHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const rowImgs = rowHtml.match(/<img[^>]+>/gi) || [];
    const textOnly = rowHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    // Only process image-dominant rows (ribbon rack rows have many images and little text)
    if (rowImgs.length === 0 || textOnly.length > rowImgs.length * 30) continue;

    let rowCellCount = 0;

    // Extract cells from this row (match both <td> and <th> — some wiki pages
    // have markup errors where a ribbon cell uses <th> instead of <td>)
    const tdRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const cellHtml = tdMatch[1];
      const cellImgs = cellHtml.match(/<img[^>]+>/gi) || [];
      if (cellImgs.length === 0) continue;

      // Walk images in HTML source order and group each device with the ribbon
      // that precedes it.  This correctly handles cells containing multiple
      // ribbons where each ribbon has its own device overlays.
      const groups: { src: string; imgTag: string; deviceUrls: string[] }[] = [];
      let leadingDevices: string[] = []; // devices before the first ribbon

      for (const imgTag of cellImgs) {
        const srcMatch = imgTag.match(/src="([^"]+)"/i);
        if (!srcMatch) continue;
        let src = srcMatch[1];
        if (src.startsWith("//")) src = "https:" + src;

        // Skip spacer/transparent pixel images
        if (/spacer|pixel|transparent/i.test(src)) continue;

        // Classify as device overlay (stars, V devices, oak leaf clusters, etc.)
        // Layer 1: known device URL patterns
        const isKnownDeviceUrl = /ribbonstar|ribbonbar|oak_leaf|oakleaf|service.star|award.star|arrowhead|Gcl-|"V"_device|%22V%22_device|V_device.*brass/i.test(src);
        // Layer 2: small image size (thumbnail < 50px or explicit width < 50px)
        const isSmallImg = (() => {
          const thumbSize = src.match(/\/(\d+)px-/);
          if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
          const w = imgTag.match(/width="(\d+)"/i);
          if (w && parseInt(w[1]) < 50) return true;
          return false;
        })();
        // Layer 3: aspect ratio check — ribbons are wide (ratio > 2.5) and tall
        // enough (height > 20px); devices that are wide but short are caught here
        const isDeviceByRatio = (() => {
          const w = imgTag.match(/width="(\d+)"/i);
          const h = imgTag.match(/height="(\d+)"/i);
          if (!w || !h) return false;
          const wi = parseInt(w[1]);
          const hi = parseInt(h[1]);
          // If both width and height are present and the image is shorter than
          // typical ribbons (< 20px tall) while being nearly ribbon-width, it's
          // likely a device overlay like a clasp or bar (e.g. Gcl-03.png at 100x16).
          // Require width > 80 to avoid catching small standalone bars/tabs.
          if (hi < 20 && wi > 80 && wi < 110) return true;
          return false;
        })();
        const isDeviceImg = isKnownDeviceUrl || isSmallImg || isDeviceByRatio;

        if (isDeviceImg) {
          if (groups.length > 0) {
            // Attach to the most recent ribbon
            groups[groups.length - 1].deviceUrls.push(src);
          } else {
            // Device appeared before any ribbon in this cell
            leadingDevices.push(src);
          }
        } else {
          // New ribbon/badge — start a new group
          groups.push({ src, imgTag, deviceUrls: [] });
        }
      }

      // If there were leading devices (before any ribbon), attach to the first ribbon
      if (leadingDevices.length > 0 && groups.length > 0) {
        groups[0].deviceUrls = [...leadingDevices, ...groups[0].deviceUrls];
      }

      // The Medal of Honor is never awarded with devices (oak leaf clusters, etc.).
      // If a MoH ribbon has devices, they belong to the next ribbon in the cell.
      for (let gi = 0; gi < groups.length; gi++) {
        if (groups[gi].deviceUrls.length > 0 && /medal.of.honor/i.test(groups[gi].src)) {
          const spillover = groups[gi].deviceUrls;
          groups[gi].deviceUrls = [];
          if (gi + 1 < groups.length) {
            groups[gi + 1].deviceUrls = [...spillover, ...groups[gi + 1].deviceUrls];
          }
        }
      }

      // Create one RibbonRackCell per item found in this cell.
      for (const group of groups) {
        const { src, imgTag } = group;
        const itemType = isRibbonImage(imgTag, src) ? "ribbon" : "other";
        const wMatch = imgTag.match(/width="(\d+)"/i);
        const hMatch = imgTag.match(/height="(\d+)"/i);
        cells.push({
          ribbonUrl: src,
          deviceUrls: group.deviceUrls,
          type: itemType,
          ...(itemType === "other" && wMatch ? { width: parseInt(wMatch[1]) } : {}),
          ...(itemType === "other" && hMatch ? { height: parseInt(hMatch[1]) } : {}),
        });
        rowCellCount++;
      }
    }

    if (rowCellCount > maxPerRow) {
      maxPerRow = rowCellCount;
    }
  }

  return { cells, maxPerRow: maxPerRow || 4 };
}

// ── Extract medal cells from wikitable ────────────────────────────────────────
// Each <td> cell = one medal. The first tag contains the medal name,
// the rest is device information.

function extractMedalCells(wikitableHtml: string): MedalCell[] {
  const cells: MedalCell[] = [];

  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(wikitableHtml)) !== null) {
    const cellHtml = cellMatch[1].trim();
    if (!cellHtml) continue;

    // First tag (usually <a>) = medal name
    const firstTagMatch = cellHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
      || cellHtml.match(/<(?:span|b|i|strong|em)[^>]*>([\s\S]*?)<\/(?:span|b|i|strong|em)>/i);

    const medalName = firstTagMatch
      ? firstTagMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : cellHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    if (medalName.length < 3) continue;
    if (/^(?:awards|decorations|badges|medals|honours|honors)\s*$/i.test(medalName)) continue;
    if (/^\d+(?:st|nd|rd|th)\s+row$/i.test(medalName)) continue;

    // Full cell text for context
    const cellText = stripHtml(cellHtml).trim();

    // Links array: only the first link is the medal name
    const links: string[] = [];
    if (firstTagMatch) links.push(medalName);

    // Extract device text: everything after the medal name in the cell text
    let devices = "";
    if (medalName && cellText.length > medalName.length) {
      const afterName = cellText.slice(cellText.indexOf(medalName) + medalName.length).trim();
      // Clean up leading punctuation/whitespace
      devices = afterName.replace(/^[,;:\s\-–—]+/, "").trim();
    }

    cells.push({ cellText, links, devices });
  }

  return cells;
}

// ── Extract awards from article body sections (outside infobox) ───────────────
// Many Wikipedia military bios have a "Awards and decorations" or "Badges and
// awards" section in the article body with a much more complete medal list than
// the abbreviated infobox version.

function extractBodyAwards(html: string, infoboxFullHtml?: string): { medals: ScrapedMedal[]; ribbonUrls: string[]; deviceUrls: string[]; medalCells: MedalCell[]; ribbonRackCells: RibbonRackCell[]; ribbonMaxPerRow: number; rawText: string; rawHtml: string } {
  // Remove infobox to avoid double-counting
  const htmlNoInfobox = infoboxFullHtml
    ? html.replace(infoboxFullHtml, "")
    : html;

  // Find all headings with their positions
  const headingRegex = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: { level: number; text: string; startIdx: number; endIdx: number }[] = [];
  let hMatch;
  while ((hMatch = headingRegex.exec(htmlNoInfobox)) !== null) {
    headings.push({
      level: parseInt(hMatch[1]),
      text: stripHtml(hMatch[2]).toLowerCase(),
      startIdx: hMatch.index,
      endIdx: hMatch.index + hMatch[0].length,
    });
  }

  // Find award-related sections
  const awardKeywords = ["award", "decoration", "badge", "medal", "ribbon", "honour", "honor"];
  const skipKeywords = ["medal of honor citation", "citation"];
  const awardSections: string[] = [];

  // Collect award heading ranges first, then skip children already covered by a parent.
  // E.g. if <h2>Honors and awards</h2> covers lines 100-500 and <h3>Decorations</h3>
  // covers lines 200-400, the h3 is fully inside the h2 — skip it to avoid duplicates.
  const awardRanges: { start: number; end: number }[] = [];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const isAwardSection = awardKeywords.some((kw) => h.text.includes(kw));
    const isSkipped = skipKeywords.some((kw) => h.text.includes(kw));
    if (!isAwardSection || isSkipped) continue;

    // Section content: from heading end to next heading of same/higher level
    let endIdx = htmlNoInfobox.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        endIdx = headings[j].startIdx;
        break;
      }
    }

    // Skip this section if it's fully contained within an already-captured parent section
    const isChildOfExisting = awardRanges.some(
      (r) => h.endIdx >= r.start && endIdx <= r.end
    );
    if (isChildOfExisting) continue;

    awardRanges.push({ start: h.endIdx, end: endIdx });
    awardSections.push(htmlNoInfobox.slice(h.endIdx, endIdx));
  }

  // Parse medals only from <table class="wikitable"> elements within award sections.
  // Wikipedia medal lists are always in tables that have classNames "wikitable"; other content (prose, lists) is skipped.
  const allMedals: ScrapedMedal[] = [];
  const allRibbonUrls: string[] = [];
  const allDeviceUrls: string[] = [];
  const allMedalCells: MedalCell[] = [];
  const allRibbonRackCells: RibbonRackCell[] = [];
  let allMaxPerRow = 0;
  let rawText = "";
  let rawHtml = "";

  // First pass: collect all wikitables across all award sections
  const allWikitables: string[] = [];
  for (const section of awardSections) {
    const openRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>/gi;
    let openMatch;
    while ((openMatch = openRegex.exec(section)) !== null) {
      const startIdx = openMatch.index;
      let depth = 1;
      let pos = startIdx + openMatch[0].length;
      while (depth > 0 && pos < section.length) {
        const nextOpen = section.indexOf("<table", pos);
        const nextClose = section.indexOf("</table>", pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 6;
        } else {
          depth--;
          if (depth === 0) {
            allWikitables.push(section.slice(startIdx, nextClose + 8));
          }
          pos = nextClose + 8;
        }
      }
    }
  }

  // Extract medals: from wikitables if any exist, otherwise from body section content
  if (allWikitables.length > 0) {
    for (const table of allWikitables) {
      rawText += stripHtmlKeepLines(table) + "\n";
      const medals = parseWikitableMedals(table);
      allMedals.push(...medals);

      const medalCells = extractMedalCells(table);
      allMedalCells.push(...medalCells);

      rawHtml += simplifyAwardsHtml(table) + "\n";
    }
  } else {
    // No wikitables anywhere — fall back to parsing all section content directly
    for (const section of awardSections) {
      rawText += stripHtmlKeepLines(section) + "\n";
      const medals = parseAwardLines(section);
      allMedals.push(...medals);

      const medalCells = extractMedalCells(section);
      allMedalCells.push(...medalCells);

      rawHtml += simplifyAwardsHtml(section) + "\n";
    }
  }

  for (const section of awardSections) {
    // Extract ribbon URLs, device URLs, and ribbon rack cells from ALL tables
    // in the section — ribbon racks are typically in plain (non-wikitable) tables.
    const allTablesRegex = /<table[\s>]/gi;
    let tableMatch;
    while ((tableMatch = allTablesRegex.exec(section)) !== null) {
      const startIdx = tableMatch.index;
      let depth = 1;
      let pos = startIdx + tableMatch[0].length;
      while (depth > 0 && pos < section.length) {
        const nextOpen = section.indexOf("<table", pos);
        const nextClose = section.indexOf("</table>", pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 6;
        } else {
          depth--;
          if (depth === 0) {
            const tableHtml = section.slice(startIdx, nextClose + 8);

            // Skip wrapper tables that contain nested tables —
            // inner tables are already processed individually
            const innerContent = tableHtml.slice(tableMatch[0].length);
            if (/<table[\s>]/i.test(innerContent)) {
              pos = nextClose + 8;
              break;
            }

            // Collect ribbon URLs for AI matching
            const ribbonUrls = extractAllRibbonUrls(tableHtml);
            for (const url of ribbonUrls) {
              if (!allRibbonUrls.includes(url)) allRibbonUrls.push(url);
            }

            // Collect device overlay URLs
            const deviceUrls = extractAllDeviceUrls(tableHtml);
            for (const url of deviceUrls) {
              if (!allDeviceUrls.includes(url)) allDeviceUrls.push(url);
            }

            // Collect per-cell ribbon rack data (ribbon + device images per cell)
            const { cells: ribbonRackCells, maxPerRow } = extractRibbonRackCells(tableHtml);
            allRibbonRackCells.push(...ribbonRackCells);
            if (maxPerRow > allMaxPerRow) allMaxPerRow = maxPerRow;
          }
          pos = nextClose + 8;
        }
      }
    }
  }

  // Fallback: if no ribbon rack cells found (no compact ribbon grid on page),
  // build them from wikitable rows where each row has an image cell + text cell.
  if (allRibbonRackCells.length === 0 && allWikitables.length > 0) {
    for (const table of allWikitables) {
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(table)) !== null) {
        const rowHtml = rowMatch[1];
        // Extract td/th cells from this row
        const tdRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        const tds: string[] = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
          tds.push(tdMatch[1]);
        }
        // Look for rows with at least one cell containing images
        // (covers both 2-cell layout [img | name] and single-cell layout)
        const imgCell = tds.find((td) => /<img[^>]+>/i.test(td));
        if (!imgCell) continue;

        const cellImgs = imgCell.match(/<img[^>]+>/gi) || [];
        const itemUrls: { src: string; imgTag: string }[] = [];
        const deviceUrls: string[] = [];

        for (const imgTag of cellImgs) {
          const srcMatch = imgTag.match(/src="([^"]+)"/i);
          if (!srcMatch) continue;
          let src = srcMatch[1];
          if (src.startsWith("//")) src = "https:" + src;
          if (/spacer|pixel|transparent/i.test(src)) continue;

          const isDevice =
            /ribbonstar|ribbonbar/i.test(src) ||
            (() => {
              const thumbSize = src.match(/\/(\d+)px-/);
              if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
              const w = imgTag.match(/width="(\d+)"/i);
              if (w && parseInt(w[1]) < 50) return true;
              return false;
            })();

          if (isDevice) {
            deviceUrls.push(src);
          } else {
            itemUrls.push({ src, imgTag });
          }
        }

        // Skip header/section-label rows (e.g. "Personal decorations", "Unit awards")
        if (itemUrls.length === 0) continue;

        for (let i = 0; i < itemUrls.length; i++) {
          const { src, imgTag } = itemUrls[i];
          const itemType = isRibbonImage(imgTag, src) ? "ribbon" : "other";
          const wMatch = imgTag.match(/width="(\d+)"/i);
          const hMatch = imgTag.match(/height="(\d+)"/i);
          allRibbonRackCells.push({
            ribbonUrl: src,
            deviceUrls: i === 0 ? deviceUrls : [],
            type: itemType,
            ...(itemType === "other" && wMatch ? { width: parseInt(wMatch[1]) } : {}),
            ...(itemType === "other" && hMatch ? { height: parseInt(hMatch[1]) } : {}),
          });
        }
      }
    }
  }

  return { medals: allMedals, ribbonUrls: allRibbonUrls, deviceUrls: allDeviceUrls, medalCells: allMedalCells, ribbonRackCells: allRibbonRackCells, ribbonMaxPerRow: allMaxPerRow || 4, rawText: rawText.trim(), rawHtml: rawHtml.trim() };
}

// ── Merge medals, deduplicating by name similarity ───────────────────────────

function mergeMedals(primary: ScrapedMedal[], secondary: ScrapedMedal[]): ScrapedMedal[] {
  const result = [...primary];
  const seen = new Set(primary.map((m) => m.rawName.toLowerCase()));

  for (const medal of secondary) {
    const key = medal.rawName.toLowerCase();
    if (seen.has(key)) continue;

    // Check if a similar medal already exists (substring match, min 8 chars)
    const existing = key.length >= 8
      ? result.find((r) => {
          const rk = r.rawName.toLowerCase();
          return rk.includes(key) || key.includes(rk);
        })
      : null;

    if (existing) {
      // Keep higher count
      if (medal.count > existing.count) existing.count = medal.count;
      if (medal.hasValor && !existing.hasValor) existing.hasValor = true;
    } else {
      result.push(medal);
      seen.add(key);
    }
  }

  return result;
}

export async function scrapeWikipediaHero(url: string): Promise<ScrapedHero> {
  const title = extractWikiTitle(url);
  if (!title) {
    throw new Error(
      "Invalid Wikipedia URL. Expected: https://en.wikipedia.org/wiki/Name"
    );
  }

  const headers = { "User-Agent": "HeroesArchive/1.0 (educational research)" };

  const [parseRes, summaryRes, imageRes] = await Promise.all([
    fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&disabletoc=true&redirects=true`,
      { headers }
    ),
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers }
    ),
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400&pilicense=any&redirects=true`,
      { headers }
    ),
  ]);

  if (!parseRes.ok) throw new Error(`Wikipedia returned ${parseRes.status}`);

  const parseData = await parseRes.json();
  if (parseData.error) throw new Error(`Wikipedia: ${parseData.error.info}`);

  const html: string = parseData.parse?.text?.["*"] || "";
  const pageName: string = parseData.parse?.title || title.replace(/_/g, " ");

  let biography = "";
  if (summaryRes.ok) {
    const s = await summaryRes.json();
    biography = s.extract || "";
  }

  let avatarUrl: string | undefined;
  if (imageRes.ok) {
    const imgData = await imageRes.json();
    const pages = imgData.query?.pages ?? {};
    const page = Object.values(pages)[0] as { thumbnail?: { source?: string } } | undefined;
    const rawThumb = page?.thumbnail?.source;
    const n = rawThumb ? normalizeWikimediaImageUrl(rawThumb) : "";
    avatarUrl = n || undefined;
  }

  // ── Parse infobox ────────────────────────────────────────────────────────
  let rank = "";
  let branch = "";
  let wars: string[] = [];
  let medals: ScrapedMedal[] = [];
  let infoboxRibbonUrls: string[] = [];
  let infoboxDeviceUrls: string[] = [];
  let infoboxMedalCells: MedalCell[] = [];
  let infoboxRibbonRackCells: RibbonRackCell[] = [];
  let infoboxRibbonMaxPerRow = 4;
  let infoboxPlainText = "";
  let rawInfoboxAwardsText = "";
  let rawInfoboxAwardsHtml = "";

  const infobox = extractInfobox(html);

  if (infobox) {
    infoboxPlainText = stripHtml(infobox.innerHtml);
    const rows = infobox.innerHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

    for (const row of rows) {
      const thMatch = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      const tdMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!thMatch || !tdMatch) continue;

      const key = stripHtml(thMatch[1]).toLowerCase();
      const valueHtml = tdMatch[1];
      const value = stripHtml(valueHtml);

      if (!rank && key.includes("rank")) {
        rank = value.split("\n")[0].trim();
      } else if (!branch && (key.includes("branch") || key.includes("service"))) {
        const firstLine =
          value.split("\n").find((l) => l.trim().length > 2) || "";
        branch = normalizeBranch(firstLine);
      } else if (
        key.includes("battle") ||
        key.includes("conflict") ||
        (/\bwars?\b/.test(key) && !key.includes("award"))
      ) {
        // Use stripHtmlKeepLines to convert <li>/<br> to newlines, then split.
        // This correctly handles nested treeview lists where sub-conflicts
        // (e.g. "Battle of Khe Sanh" under "Vietnam War") are separate <li> items.
        wars = stripHtmlKeepLines(valueHtml)
          .split("\n")
          .map((s) => s.trim())
          .filter((w) => w.length > 2 && !/^\d+$/.test(w));
      } else if (
        key.includes("award") ||
        key.includes("decoration") ||
        key.includes("honour") ||
        key.includes("honor")
      ) {
        medals = parseAwardLines(valueHtml);
        // Extract ribbon URLs from infobox ribbon rack (if present)
        infoboxRibbonUrls = extractAllRibbonUrls(valueHtml);
        infoboxDeviceUrls = extractAllDeviceUrls(valueHtml);
        infoboxMedalCells = extractMedalCells(valueHtml);
        const infoboxRackResult = extractRibbonRackCells(valueHtml);
        infoboxRibbonRackCells = infoboxRackResult.cells;
        infoboxRibbonMaxPerRow = infoboxRackResult.maxPerRow;
        rawInfoboxAwardsText = stripHtmlKeepLines(valueHtml);
        if (/<table/i.test(valueHtml)) {
          rawInfoboxAwardsHtml = simplifyAwardsHtml(valueHtml);
        }
      }
    }
  }

  // ── Extract awards from article body sections ────────────────────────────
  const bodyAwards = extractBodyAwards(html, infobox?.fullHtml);

  // When wikitable medals exist, use ONLY those — do not supplement with infobox medals.
  // Infobox medals are only used as a fallback when no wikitables are found.
  const mergedMedals = bodyAwards.medals.length > 0
    ? bodyAwards.medals
    : medals;

  // Build raw awards text for AI context — use raw text instead of parsed medal names
  // so Gemini can extract medals directly from the original Wikipedia text
  const rawAwardsText = [rawInfoboxAwardsText, bodyAwards.rawText].filter(Boolean).join("\n");
  const rawAwardsHtml = [rawInfoboxAwardsHtml, bodyAwards.rawHtml].filter(Boolean).join("\n");

  const combatType = detectCombatType(infoboxPlainText + " " + biography);
  const multiServiceOrMultiWar = wars.length > 1;

  // Combine ribbon URLs from infobox + body, deduplicated
  const seenRibbons = new Set<string>();
  const ribbonUrls: string[] = [];
  for (const url of [...bodyAwards.ribbonUrls]) {
    if (!seenRibbons.has(url)) {
      seenRibbons.add(url);
      ribbonUrls.push(url);
    }
  }

  // Combine device URLs from infobox + body, deduplicated
  const seenDevices = new Set<string>();
  const deviceUrls: string[] = [];
  for (const url of [...bodyAwards.deviceUrls]) {
    if (!seenDevices.has(url)) {
      seenDevices.add(url);
      deviceUrls.push(url);
    }
  }

  // Combine medal cells from infobox + body
  const medalCells = [ ...bodyAwards.medalCells];
  // Combine ribbon rack cells (prefer body, fall back to infobox)
  const ribbonRackCells = bodyAwards.ribbonRackCells.length > 0
    ? bodyAwards.ribbonRackCells
    : infoboxRibbonRackCells;

  const ribbonMaxPerRow = bodyAwards.ribbonRackCells.length > 0
    ? bodyAwards.ribbonMaxPerRow
    : infoboxRibbonMaxPerRow;
    
  return {
    name: pageName, rank, branch, biography, wars, medals: mergedMedals, ribbonUrls, deviceUrls, medalCells, ribbonRackCells, ribbonMaxPerRow, avatarUrl,
    combatType, multiServiceOrMultiWar, rawAwardsText, rawAwardsHtml,
  };
}
