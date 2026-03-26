import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { askAI } from "@/lib/openai";
import { resolveMedalWikipediaTitleWithFallback } from "@/lib/wikipedia-medal-title";
import { getWikipediaMedalOrRibbonImageUrl } from "@/lib/wikipedia-article-images";

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

    // Step 1: Optional Gemini normalization (can garble good names — we fall back to original)
    const normalized = await normalizeWithGemini(medalName, userEmail);

    // Step 2: Resolve article (variants + CirrusSearch + OpenSearch + verify pageid)
    const title = await resolveMedalWikipediaTitleWithFallback(medalName, normalized);
    if (!title) {
      return NextResponse.json(
        { error: `No Wikipedia article found for "${medalName}". Try uploading manually.` },
        { status: 404 },
      );
    }

    // Step 3: pageimages + scored scan of up to 500 File: embeds (old code used imlimit=10)
    const imageUrl = await getWikipediaMedalOrRibbonImageUrl(title, medalName, isRibbon ? "ribbon" : "medal");

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
