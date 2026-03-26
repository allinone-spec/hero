// ── Wikipedia Medal Scraper ───────────────────────────────────────────────────
// Fetches and parses a Wikipedia article for a military medal/decoration,
// extracting summary, history, award criteria, appearance, images, and infobox data.

import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";
import { resolveMedalWikipediaTitle, WIKIPEDIA_EN_API_HEADERS } from "@/lib/wikipedia-medal-title";

const WIKI_HEADERS = WIKIPEDIA_EN_API_HEADERS;
/** Per-field cap after merge (MongoDB + UI); keeps very long articles bounded */
const MAX_SECTION_LENGTH = 48_000;
const INTRO_EXTRACT_CHARS = 25_000;

export interface ScrapedMedalImage {
  url: string;
  caption: string;
}

export interface ScrapedMedalData {
  wikipediaUrl: string;
  wikiSummary: string;
  history: string;
  awardCriteria: string;
  appearance: string;
  established: string;
  images: ScrapedMedalImage[];
}

/* ── Helpers ──────────────────────────────────────────── */

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: WIKI_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\[[\d\w]+\]/g, "") // strip footnote refs [1], [a]
    .replace(/\[\s*edit\s*\]/gi, "") // strip [edit] links
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf("\n", maxLen);
  return (cut > maxLen * 0.5 ? text.slice(0, cut) : text.slice(0, maxLen)) + "…";
}

/** Prefer the longer usable plain-text intro (REST summary vs MediaWiki extracts). */
function pickLongerPlainText(a: string, b: string): string {
  const na = a.replace(/\s+/g, " ").trim();
  const nb = b.replace(/\s+/g, " ").trim();
  if (na.length >= nb.length) return na || nb;
  return nb || na;
}

/** Intro via action=query&prop=extracts — much longer than REST /page/summary extract. */
async function fetchIntroExtractPlain(title: string, maxChars: number): Promise<string> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(title)}` +
    `&explaintext=1&exintro=1&exchars=${maxChars}&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return "";
  const page = Object.values(pages)[0] as { extract?: string; missing?: boolean };
  if (!page || page.missing) return "";
  return String(page.extract || "").trim();
}

/* ── Fetch article sections list ──────────────────────── */

interface WikiSection {
  index: string;
  line: string;
  level: string;
}

async function fetchSections(title: string): Promise<WikiSection[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  return data?.parse?.sections || [];
}

/* ── Fetch a single section's HTML and clean it ───────── */

async function fetchSectionText(title: string, sectionIndex: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${sectionIndex}&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const html: string = data?.parse?.text?.["*"] || "";
  // Remove the heading itself (first <h2>/<h3> tag)
  const cleaned = html.replace(/<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>/i, "");
  return stripHtml(cleaned);
}

/* ── Fetch intro summary ──────────────────────────────── */

async function fetchSummary(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data?.extract || "";
}

/* ── Extract infobox "established" field from wikitext ── */

async function fetchEstablished(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&section=0&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const wikitext: string = data?.parse?.wikitext?.["*"] || "";

  // Look for established/created/date fields in infobox
  const patterns = [
    /\|\s*established\s*=\s*(.+)/i,
    /\|\s*created\s*=\s*(.+)/i,
    /\|\s*first_awarded\s*=\s*(.+)/i,
    /\|\s*date\s*=\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = wikitext.match(pattern);
    if (match) {
      // Clean wikitext markup from the value
      let val = match[1]
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2") // [[link|text]] → text
        .replace(/\{\{[^}]+\}\}/g, "") // remove templates
        .replace(/<[^>]+>/g, "")
        .trim();
      // Extract just a year if the full date is too complex
      const yearMatch = val.match(/\b(1[7-9]\d{2}|20\d{2})\b/);
      if (yearMatch) return yearMatch[1];
      if (val.length < 60) return val;
    }
  }

  return "";
}

/* ── Collect article images ───────────────────────────── */

const SKIP_IMAGE_PATTERNS = /commons-logo|wiki|flag_of|seal_of|coat_of_arms|portrait|photo_of|ceremony|wearing|logo|emblem_of|insignia_of|patch_of|shoulder|collar|sleeve|badge_of|map|icon/i;

interface WikiImageInfo {
  url: string;
  descriptionurl: string;
}

async function fetchArticleImages(title: string, medalName: string): Promise<ScrapedMedalImage[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&format=json&imlimit=50`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];

  const page = Object.values(pages)[0] as { images?: { title: string }[] };
  const imageFiles = page?.images || [];

  const medalLower = medalName.toLowerCase();
  const medalWords = medalLower.split(/\s+/).filter((w) => w.length > 3);

  const results: ScrapedMedalImage[] = [];

  for (const img of imageFiles) {
    const filename = img.title;
    const lower = filename.toLowerCase();

    // Skip SVGs and junk
    if (lower.endsWith(".svg")) continue;
    if (SKIP_IMAGE_PATTERNS.test(lower)) continue;

    // Score relevance
    let score = 0;
    for (const word of medalWords) {
      if (lower.includes(word)) score++;
    }
    if (/medal|cross|heart|decoration|award|star|obverse|reverse|front|back/i.test(lower)) score += 2;
    if (/ribbon/i.test(lower)) score -= 1; // Slight downrank for ribbon-only images

    if (score < 1) continue;

    // Resolve to actual URL
    try {
      const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|extmetadata&format=json`;
      const infoRes = await fetchWithTimeout(infoUrl);
      const infoData = await infoRes.json();
      const infoPages = infoData?.query?.pages;
      if (!infoPages) continue;
      const infoPage = Object.values(infoPages)[0] as { imageinfo?: (WikiImageInfo & { extmetadata?: Record<string, { value: string }> })[] };
      const info = infoPage?.imageinfo?.[0];
      if (!info?.url) continue;

      // Skip SVG URLs
      if (/\.svg($|\?)/i.test(info.url)) continue;

      const caption = info.extmetadata?.ObjectName?.value
        || info.extmetadata?.ImageDescription?.value
        || filename.replace(/^File:/i, "").replace(/_/g, " ").replace(/\.\w+$/, "");

      results.push({
        url: normalizeWikimediaImageUrl(info.url) || info.url,
        caption: stripHtml(caption).slice(0, 200),
      });
    } catch { /* skip this image */ }

    // Limit to 6 images max
    if (results.length >= 6) break;
  }

  return results;
}

/* ── Section matching helpers ─────────────────────────── */

/** Match section heading line (Wikipedia TOC); multiple sections are merged in document order */
const HISTORY_SECTION_RE =
  /^(history|background|origin|origins|creation|establishment|development|precedence|former versions)/i;
const CRITERIA_SECTION_RE =
  /^(award criteria|criteria|eligibility|qualification|requirements|recipient|recipients|notable recipients|presentation|presentations|award process|selection|how (it )?is (awarded|earned|presented|conferred)|statutes|regulations)/i;
/** Avoid bare "Description" — often duplicates the lead; keep design-forward headings */
const APPEARANCE_SECTION_RE =
  /^(appearance|design|physical description|medal design|ribbon|obverse|reverse|insignia|device)/i;

function sectionIndicesMatching(sections: WikiSection[], pattern: RegExp): string[] {
  const hits: { ord: number; index: string }[] = [];
  for (const s of sections) {
    if (!pattern.test(s.line.trim())) continue;
    const ord = parseInt(String(s.index), 10);
    hits.push({ ord: Number.isFinite(ord) ? ord : 999, index: s.index });
  }
  hits.sort((a, b) => a.ord - b.ord);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const h of hits) {
    if (seen.has(h.index)) continue;
    seen.add(h.index);
    ordered.push(h.index);
  }
  return ordered;
}

async function fetchMergedSectionTexts(title: string, sectionIndices: string[]): Promise<string> {
  if (sectionIndices.length === 0) return "";
  const parts = await Promise.all(sectionIndices.map((idx) => fetchSectionText(title, idx)));
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/* ── Main scraper function ────────────────────────────── */

export async function scrapeMedalWikipedia(medalName: string): Promise<ScrapedMedalData | null> {
  const title = await resolveMedalWikipediaTitle(medalName);
  if (!title) return null;

  const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  // Fetch sections and summary in parallel
  const [sections, summary, established] = await Promise.all([
    fetchSections(title),
    fetchSummary(title),
    fetchEstablished(title),
  ]);

  const historyIdxs = sectionIndicesMatching(sections, HISTORY_SECTION_RE);
  const criteriaIdxs = sectionIndicesMatching(sections, CRITERIA_SECTION_RE);
  const appearanceIdxs = sectionIndicesMatching(sections, APPEARANCE_SECTION_RE);

  const [introExtract, historyRaw, criteriaRaw, appearanceRaw, images] = await Promise.all([
    fetchIntroExtractPlain(title, INTRO_EXTRACT_CHARS),
    fetchMergedSectionTexts(title, historyIdxs),
    fetchMergedSectionTexts(title, criteriaIdxs),
    fetchMergedSectionTexts(title, appearanceIdxs),
    fetchArticleImages(title, medalName),
  ]);

  const wikiSummary = truncateText(pickLongerPlainText(introExtract, summary), MAX_SECTION_LENGTH);

  return {
    wikipediaUrl,
    wikiSummary,
    history: truncateText(historyRaw, MAX_SECTION_LENGTH),
    awardCriteria: truncateText(criteriaRaw, MAX_SECTION_LENGTH),
    appearance: truncateText(appearanceRaw, MAX_SECTION_LENGTH),
    established,
    images,
  };
}
