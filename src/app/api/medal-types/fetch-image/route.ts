import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { askAI } from "@/lib/openai";

/* ── Fetch with timeout ────────────────────────────────── */

const WIKI_HEADERS = { "User-Agent": "HeroesArchive/1.0 (educational research)" };

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: WIKI_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ── Cache (15 min TTL) ──────────────────────────────── */

const cache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.url;
}

function setCache(key: string, url: string): void {
  cache.set(key, { url, ts: Date.now() });
}

/* ── Step 1: Gemini name normalization ───────────────── */

const FULL_NAME_PATTERN = /medal|cross|star|heart|ribbon|citation|commendation|legion|order|badge|trophy/i;

async function normalizeWithGemini(medalName: string, userEmail: string): Promise<string> {
  if (medalName.length > 15 && FULL_NAME_PATTERN.test(medalName)) {
    return medalName;
  }
  try {
    const response = await askAI(
      "You are a US military decorations expert. Given a medal name (possibly abbreviated or informal), return ONLY the full official name. If the input is already a full name, return it unchanged. Return only the name, nothing else.",
      medalName,
      userEmail,
      { maxTokens: 100, maxSystemChars: 500, maxUserChars: 200 },
    );
    return response.content.trim() || medalName;
  } catch {
    return medalName;
  }
}

/* ── Step 2: Find Wikipedia article title ────────────── */

async function findWikiTitle(medalName: string): Promise<string | null> {
  const baseName = medalName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const variants = [medalName, baseName, `${baseName} (United States)`, `${baseName} (medal)`];

  for (const term of variants) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&format=json&redirects=1`;
      const res = await fetchWithTimeout(url);
      const data = await res.json();
      const pages = data?.query?.pages;
      if (!pages) continue;
      const page = Object.values(pages)[0] as { pageid?: number; title?: string; missing?: boolean };
      if (page?.pageid && !page.missing) return page.title!;
    } catch { /* try next variant */ }
  }

  // Fallback: opensearch
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(medalName)}&limit=5&format=json`;
    const res = await fetchWithTimeout(searchUrl);
    const [, titles] = await res.json();
    if (Array.isArray(titles) && titles.length > 0) return titles[0];
  } catch { /* give up */ }

  return null;
}

/* ── Step 3a: Medal image via pageimages API ─────────── */

async function getPageImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as {
    original?: { source: string };
    thumbnail?: { source: string };
  };
  const originalUrl = page?.original?.source;
  const thumbUrl = page?.thumbnail?.source;
  if (!originalUrl && !thumbUrl) return null;
  if (originalUrl && /\.svg($|\?)/i.test(originalUrl) && thumbUrl) return thumbUrl;
  return originalUrl || thumbUrl || null;
}

/* ── Step 3b: Ribbon image via article images API ────── */

async function getRibbonImage(title: string): Promise<string | null> {
  // List all images on the article
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&format=json`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as { images?: { title: string }[] };
  const images = page?.images || [];

  // Find an image with "ribbon" in the filename
  for (const img of images) {
    const lower = img.title.toLowerCase();
    if (lower.includes("flag") || lower.includes("commons-logo") || lower.includes("wiki")) continue;
    if (lower.includes("ribbon")) {
      // Resolve Commons filename → direct image URL
      const filename = img.title.replace(/^File:/i, "").replace(/ /g, "_");
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${filename}`)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
      const commonsRes = await fetchWithTimeout(commonsUrl);
      const commonsData = await commonsRes.json();
      const commonsPages = commonsData?.query?.pages;
      if (!commonsPages) continue;
      const commonsPage = Object.values(commonsPages)[0] as { imageinfo?: { url: string; thumburl?: string }[] };
      const info = commonsPage?.imageinfo?.[0];
      if (!info?.url) continue;
      // For SVGs, use rendered PNG thumbnail
      if (/\.svg($|\?)/i.test(info.url) && info.thumburl) return info.thumburl;
      return info.url;
    }
  }

  return null;
}

/* ── Route handler ───────────────────────────────────── */

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { medalName, type = "medal" } = await req.json();
    if (!medalName || typeof medalName !== "string") {
      return NextResponse.json({ error: "Medal name is required" }, { status: 400 });
    }

    const isRibbon = type === "ribbon";
    const userEmail = session.email || "anonymous";

    // Check cache
    const cacheKey = `${medalName}::${type}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ url: cached, source: "cache" });
    }

    // Step 1: Normalize name with Gemini
    const normalized = await normalizeWithGemini(medalName, userEmail);

    // Step 2: Find Wikipedia article
    const title = await findWikiTitle(normalized);
    if (!title) {
      return NextResponse.json(
        { error: `No Wikipedia article found for "${medalName}". Try uploading manually.` },
        { status: 404 },
      );
    }

    // Step 3: Fetch image URL via API
    const imageUrl = isRibbon
      ? await getRibbonImage(title)
      : await getPageImage(title);

    if (!imageUrl) {
      const label = isRibbon ? "ribbon" : "medal";
      return NextResponse.json(
        { error: `No ${label} image found on Wikipedia for "${title}". Try uploading manually.` },
        { status: 404 },
      );
    }

    // Cache and return URL directly
    setCache(cacheKey, imageUrl);
    return NextResponse.json({ url: imageUrl, source: "Wikipedia" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
