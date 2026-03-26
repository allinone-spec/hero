/**
 * Resolve direct image URLs from English Wikipedia medal/decoration articles.
 * pageimages is often empty; we fall back to prop=images with a high imlimit and scoring.
 */

import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";
import { WIKIPEDIA_EN_API_HEADERS } from "@/lib/wikipedia-medal-title";

const TIMEOUT_MS = 15_000;

async function wikiJson(url: string): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: WIKIPEDIA_EN_API_HEADERS, signal: ac.signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || "error" in (data as object)) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SKIP_FILENAME =
  /commons-logo|wikidata|wikimedia|wikinews|meta-logo|flag_of|seal_of|coat_of_arms|information_icon|OOjs|folder|symbol_question|question_book|ambox|portal-puzzle|edit-clear|cleanup|disambig/i;

function shouldSkipFilename(lower: string): boolean {
  if (SKIP_FILENAME.test(lower)) return true;
  if (/portrait|photo_of|ceremony|headshot|signature|\.gif$/i.test(lower)) return true;
  return false;
}

/** Skip service-ribbon graphics when fetching the medal disk (obverse). */
function isServiceRibbonFilename(lower: string): boolean {
  if (!/\bribbon\b/i.test(lower)) return false;
  return !/(obverse|reverse|front|back)/i.test(lower);
}

function scoreImageFile(lower: string, medalLower: string, kind: "medal" | "ribbon"): number {
  let score = 0;
  const words = medalLower.split(/\s+/).filter((w) => w.length > 3);
  for (const w of words) {
    if (lower.includes(w)) score += 1;
  }
  if (/medal|cross|decoration|award|obverse|reverse|heart|dsm|ndsm|moh|badge/i.test(lower)) score += 2;
  if (/\bribbon\b/i.test(lower)) score += kind === "ribbon" ? 5 : -4;
  if (kind === "medal" && /\.(png|jpe?g)$/i.test(lower) && !isServiceRibbonFilename(lower)) score += 2;
  // Prefer canonical service-ribbon filenames (not random "ribbon" mentions in other graphics)
  if (kind === "ribbon" && /\bribbon\b/i.test(lower)) {
    if (/_ribbon\.(svg|png|webp)($|\?)/i.test(lower) || /service.?ribbon|ribbon_bar|ribbon\.svg($|\?)/i.test(lower)) {
      score += 12;
    }
    if (/(obverse|reverse)\.(png|jpe?g|webp)/i.test(lower) && !/_ribbon/i.test(lower)) score -= 15;
  }
  return score;
}

function pickImageUrl(info: { url?: string; thumburl?: string; mime?: string }): string | null {
  const rawUrl = info.url;
  if (!rawUrl) return null;
  const mime = info.mime || "";
  const isSvg = /svg/i.test(mime) || /\.svg($|\?)/i.test(rawUrl);
  const pick = isSvg && info.thumburl ? info.thumburl : rawUrl;
  const n = normalizeWikimediaImageUrl(pick);
  return n || pick;
}

/**
 * Best image URL for medal obverse or service ribbon from an article title.
 */
export async function getWikipediaMedalOrRibbonImageUrl(
  articleTitle: string,
  medalNameForScoring: string,
  kind: "medal" | "ribbon",
): Promise<string | null> {
  const medalLower = medalNameForScoring.trim().toLowerCase();

  // 1) pageimages — almost always the obverse / infobox medal, not the service ribbon
  if (kind === "medal") {
    const piUrl =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
      `&titles=${encodeURIComponent(articleTitle)}` +
      "&prop=pageimages&piprop=original|thumbnail&pithumbsize=900&pilicense=any";
    const piData = await wikiJson(piUrl);
    const piPages = (piData?.query as { pages?: Record<string, unknown> } | undefined)?.pages;
    if (piPages) {
      const page = Object.values(piPages)[0] as {
        pageid?: number;
        thumbnail?: { source?: string };
        original?: { source?: string };
      };
      if (typeof page?.pageid === "number" && page.pageid > 0) {
        const orig = page.original?.source;
        const th = page.thumbnail?.source;
        if (orig || th) {
          const url = (orig || th)!.toLowerCase();
          const leadLooksRibbon = /ribbon/i.test(url) && !/obverse|reverse|medal/i.test(url);
          if (!leadLooksRibbon) {
            const pick = orig && /\.svg($|\?)/i.test(orig) && th ? th : orig || th;
            if (pick) {
              const n = normalizeWikimediaImageUrl(pick);
              return n || pick;
            }
          }
        }
      }
    }
  }

  // 2) imlimit was defaulting to 10 — many medal + ribbon files never appeared
  const imUrl =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    `&titles=${encodeURIComponent(articleTitle)}` +
    "&prop=images&imlimit=500";
  const imData = await wikiJson(imUrl);
  const imPages = (imData?.query as { pages?: Record<string, unknown> } | undefined)?.pages;
  if (!imPages) return null;
  const imPage = Object.values(imPages)[0] as { images?: { title: string }[] };
  const files = imPage?.images || [];

  type Scored = { title: string; score: number };
  const candidates: Scored[] = [];

  for (const img of files) {
    if (!img.title?.startsWith("File:")) continue;
    const lower = img.title.toLowerCase();
    if (shouldSkipFilename(lower)) continue;

    if (kind === "ribbon") {
      if (!/\bribbon\b/i.test(lower)) continue;
    } else if (isServiceRibbonFilename(lower)) {
      continue;
    }

    const score = scoreImageFile(lower, medalLower, kind);
    if (kind === "ribbon") {
      if (/ribbon/i.test(lower)) candidates.push({ title: img.title, score: Math.max(score, 1) });
    } else if (score >= 1) {
      candidates.push({ title: img.title, score });
    }
  }

  if (kind === "ribbon" && candidates.length === 0) {
    for (const img of files) {
      if (!img.title?.startsWith("File:")) continue;
      const lower = img.title.toLowerCase();
      if (shouldSkipFilename(lower)) continue;
      if (/\bribbon\b/i.test(lower)) candidates.push({ title: img.title, score: 1 });
    }
  }

  if (kind === "medal" && candidates.length === 0) {
    for (const img of files) {
      if (!img.title?.startsWith("File:")) continue;
      const lower = img.title.toLowerCase();
      if (shouldSkipFilename(lower)) continue;
      if (isServiceRibbonFilename(lower)) continue;
      if (!/\.(png|jpe?g|webp)$/i.test(lower)) continue;
      candidates.push({ title: img.title, score: 0 });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  for (const { title: fileTitle } of candidates) {
    const infoUrl =
      "https://en.wikipedia.org/w/api.php?action=query&format=json" +
      `&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|mime|thumburl&iiurlwidth=900`;
    const infoData = await wikiJson(infoUrl);
    const infoPages = (infoData?.query as { pages?: Record<string, unknown> } | undefined)?.pages;
    if (!infoPages) continue;
    const infoPage = Object.values(infoPages)[0] as {
      imageinfo?: { url?: string; thumburl?: string; mime?: string }[];
    };
    const info = infoPage?.imageinfo?.[0];
    if (!info) continue;
    const out = pickImageUrl(info);
    if (out) return out;
  }

  return null;
}
