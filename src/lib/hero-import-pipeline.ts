import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import MedalTypeModel from "@/lib/models/MedalType";
import AIUsage from "@/lib/models/AIUsage";
import { analyzeHero, fetchHeroFromAI } from "@/lib/openai";
import { scrapeWikipediaHero } from "@/lib/wikipedia-scraper";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface MedalTypeDoc {
  _id: { toString(): string };
  name: string;
  otherNames?: string[];
  ribbonImageUrl?: string;
}

export interface HeroImportResult {
  name: string;
  rank: string;
  branch: string;
  biography: string;
  wars: string[];
  avatarUrl: string;
  combatType: string;
  multiServiceOrMultiWar: boolean;
  aiDescription: string;
  aiWars: string[];
  aiCombatSpecialty: string;
  aiTokens: number;
  aiCost: number;
  newMedalTypesCreated: number;
  ribbonMaxPerRow: number;
  wikiMedalNames: { name: string; devices: string }[];
  wikiRibbonRack: { ribbonUrl: string; deviceUrls: string[]; name: string; _id: string; type: "ribbon" | "other"; width?: number; height?: number }[];
}

type ProgressCallback = (step: string, percent: number) => void | Promise<void>;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function extractHeroNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("wikipedia.org")) return null;
    const match = parsed.pathname.match(/^\/wiki\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]).replace(/_/g, " ");
  } catch {
    return null;
  }
}

/** Upload a Wikipedia image URL to Cloudinary */
async function uploadWikiImageToCloudinary(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return "";
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "Heroes/Heroes", resource_type: "image" },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error ?? new Error("Upload failed"));
          else resolve(uploadResult as { secure_url: string });
        }
      )
      .end(buffer);
  });
  return result.secure_url;
}

/** Fetch hero photo from Wikipedia pageimages API + upload to Cloudinary */
async function fetchWikiPhoto(heroName: string): Promise<string> {
  const title = heroName.replace(/ /g, "_");
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400&pilicense=any`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "HeroesArchive/1.0 (educational research)" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0] as { thumbnail?: { source?: string } } | undefined;
  const thumbnailUrl = page?.thumbnail?.source;
  if (!thumbnailUrl) return "";
  return uploadWikiImageToCloudinary(thumbnailUrl);
}

// ── Main pipeline ──────────────────────────────────────────────────────────────

export async function runHeroImportPipeline(
  url: string,
  userEmail: string,
  onProgress?: ProgressCallback,
): Promise<HeroImportResult> {
  const progress = async (step: string, percent: number) => {
    if (onProgress) await onProgress(step, percent);
  };

  const heroName = extractHeroNameFromUrl(url);
  if (!heroName) {
    throw new Error("Invalid Wikipedia URL. Expected: https://en.wikipedia.org/wiki/Hero_Name");
  }

  await progress("Connecting to database...", 5);
  await connectDB();
  const medalTypes = await MedalTypeModel.find({}).lean<MedalTypeDoc[]>();

  // ════════════════════════════════════════════════════════════════════════
  // Phase 1: Wikipedia scraping (primary source)
  // ════════════════════════════════════════════════════════════════════════
  await progress("Fetching from Wikipedia...", 10);
  let scraped;
  try {
    scraped = await scrapeWikipediaHero(url);
  } catch (scrapeErr) {
    console.warn("Wikipedia scraper failed, falling back to AI-only:", scrapeErr);
    scraped = null;
  }

  const scraperEmpty = !scraped || (
    scraped.medals.length === 0 && !scraped.rank && !scraped.branch
  );

  if (scraperEmpty || !scraped) {
    return await aiFallbackPipeline(heroName, medalTypes, userEmail, onProgress);
  }
  console.log(scraped.medalCells);
  // ════════════════════════════════════════════════════════════════════════
  // Phase 2: Upload avatar + AI validation (parallel)
  // ════════════════════════════════════════════════════════════════════════
  await progress("Uploading avatar & AI validation...", 40);

  const dbMedalNames = medalTypes.map((mt) => {
    const aliases = mt.otherNames?.length ? ` (also: ${mt.otherNames.join(", ")})` : "";
    return `${mt.name}${aliases}`;
  });

  const scrapedContext = [
    `Hero: ${scraped.name}`,
    `Rank: ${scraped.rank}`,
    `Branch: ${scraped.branch}`,
    scraped.biography ? `Biography: ${scraped.biography}` : "",
    scraped.rawAwardsText ? `Awards section text:\n${scraped.rawAwardsText}` : "",
  ].filter(Boolean).join("\n");

  const [avatarUrl, aiResult] = await Promise.all([
    uploadWikiImageToCloudinary(scraped.avatarUrl || "").catch(() => ""),
    analyzeHero(scrapedContext, dbMedalNames, userEmail).catch((err) => {
      console.warn("Gemini validation failed, proceeding with scraper data only:", err);
      return null;
    }),
  ]);

  if (aiResult) {
    await AIUsage.create({
      userEmail,
      action: "analyze_hero_validation",
      aiModel: aiResult.model,
      promptTokens: aiResult.promptTokens,
      completionTokens: aiResult.completionTokens,
      totalTokens: aiResult.totalTokens,
      estimatedCost: aiResult.estimatedCost,
      inputPreview: heroName.slice(0, 200),
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Phase 3: Merge scraper + AI results
  // ════════════════════════════════════════════════════════════════════════
  await progress("Merging results...", 70);
  let aiParsed: {
    description?: string;
    wars?: string[];
    combatSpecialty?: string;
  } = {};

  if (aiResult) {
    try {
      let raw = aiResult.content.trim();
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      aiParsed = JSON.parse(raw);
    } catch {
      aiParsed = {};
    }
  }

  const medalNameSet = new Set(medalTypes.map((t) => t.name.toLowerCase()));
  const scrapedWars = scraped.wars.filter(
    (w) => typeof w === "string" && !medalNameSet.has(w.toLowerCase().trim())
  );
  const aiWars = Array.isArray(aiParsed.wars)
    ? aiParsed.wars.filter((w) => typeof w === "string" && !medalNameSet.has(w.toLowerCase().trim()))
    : [];
  const mergedWars = [...new Set([...scrapedWars, ...aiWars])];

  const biography = aiParsed.description || scraped.biography || "";

  const combatType = scraped.combatType !== "none"
    ? scraped.combatType
    : (aiParsed.combatSpecialty || "none");

  await progress("Done!", 100);

  // Extract base filename from a URL for fuzzy matching.
  // Handles Wikipedia thumbnails (e.g. "/thumb/.../106px-Silver_Star_ribbon.svg.png")
  // and Cloudinary URLs (e.g. ".../Silver_Star_ribbon.svg").
  const extractRibbonFilename = (url: string): string => {
    const decoded = decodeURIComponent(url);
    // Get the last path segment
    const lastSegment = decoded.split("/").pop() || "";
    // Strip Wikipedia thumbnail prefix like "106px-"
    const stripped = lastSegment.replace(/^\d+px-/, "");
    // Strip trailing render extension (.png added to .svg thumbnails)
    return stripped.replace(/\.(svg|png|jpg|jpeg|gif)\.png$/i, ".$1").toLowerCase();
  };

  // Match ribbon rack cells to DB medal types by ribbon filename (fuzzy)
  const ribbonFilenameToMedal = new Map<string, MedalTypeDoc>();
  const ribbonUrlToMedal = new Map<string, MedalTypeDoc>();
  for (const mt of medalTypes) {
    if (mt.ribbonImageUrl) {
      ribbonUrlToMedal.set(mt.ribbonImageUrl, mt);
      ribbonFilenameToMedal.set(extractRibbonFilename(mt.ribbonImageUrl), mt);
    }
  }

  // Also build a name-based lookup for "other" items (badges, tabs, insignia)
  const nameToMedal = new Map<string, MedalTypeDoc>();
  for (const mt of medalTypes) {
    nameToMedal.set(mt.name.toLowerCase(), mt);
    if (mt.otherNames) {
      for (const alias of mt.otherNames) {
        nameToMedal.set(alias.toLowerCase(), mt);
      }
    }
  }

  // Extract medal names + device info from medalCells
  const wikiMedalNames = (scraped.medalCells || [])
    .filter((c) => c.links.length > 0 && c.links[0].length >= 3)
    .map((c) => ({ name: c.links[0], devices: c.devices || "" }));

  // Build a name→devices lookup from wikiMedalNames for ribbon rack items
  const nameToDevices = new Map<string, string>();
  for (const m of wikiMedalNames) {
    if (m.devices && !nameToDevices.has(m.name.toLowerCase())) {
      nameToDevices.set(m.name.toLowerCase(), m.devices);
    }
  }

  const wikiRibbonRack = (scraped.ribbonRackCells || []).map((cell) => {
    // Try exact URL match first, then fuzzy filename match
    const match = ribbonUrlToMedal.get(cell.ribbonUrl)
      || ribbonFilenameToMedal.get(extractRibbonFilename(cell.ribbonUrl));
    return {
      ribbonUrl: cell.ribbonUrl,
      deviceUrls: cell.deviceUrls,
      name: match?.name || "",
      _id: match?._id.toString() || "",
      type: cell.type,
      ...(cell.width ? { width: cell.width } : {}),
      ...(cell.height ? { height: cell.height } : {}),
    };
  });

  return {
    name: scraped.name || heroName,
    rank: scraped.rank || "",
    branch: scraped.branch || "U.S. Army",
    biography,
    wars: mergedWars,
    avatarUrl,
    combatType,
    multiServiceOrMultiWar: mergedWars.length > 1,
    aiDescription: aiParsed.description || "",
    aiWars: aiWars,
    aiCombatSpecialty: aiParsed.combatSpecialty || "",
    aiTokens: aiResult?.totalTokens ?? 0,
    aiCost: aiResult?.estimatedCost ?? 0,
    newMedalTypesCreated: 0,
    ribbonMaxPerRow: scraped.ribbonMaxPerRow || 4,
    wikiMedalNames,
    wikiRibbonRack,
  };
}

// ── AI-only fallback (when scraper returns nothing) ────────────────────────────

async function aiFallbackPipeline(
  heroName: string,
  medalTypes: MedalTypeDoc[],
  userEmail: string,
  onProgress?: ProgressCallback,
): Promise<HeroImportResult> {
  const progress = async (step: string, percent: number) => {
    if (onProgress) await onProgress(step, percent);
  };

  const dbMedalNames = medalTypes.map((mt) => {
    const aliases = mt.otherNames?.length ? ` (also: ${mt.otherNames.join(", ")})` : "";
    return `${mt.name}${aliases}`;
  });

  await progress("AI-only mode: fetching hero data...", 30);

  const [aiResult, avatarUrl] = await Promise.all([
    fetchHeroFromAI(heroName, dbMedalNames, userEmail),
    fetchWikiPhoto(heroName).catch(() => ""),
  ]);

  await AIUsage.create({
    userEmail,
    action: "fetch_hero_from_ai",
    aiModel: aiResult.model,
    promptTokens: aiResult.promptTokens,
    completionTokens: aiResult.completionTokens,
    totalTokens: aiResult.totalTokens,
    estimatedCost: aiResult.estimatedCost,
    inputPreview: heroName.slice(0, 200),
  });

  await progress("Parsing AI results...", 60);

  let rawContent = aiResult.content.trim();
  rawContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let aiParsed: {
    name?: string;
    rank?: string;
    branch?: string;
    description?: string;
    wars?: string[];
    combatSpecialty?: string;
  } = {};
  try {
    aiParsed = JSON.parse(rawContent);
  } catch {
    aiParsed = { description: rawContent, wars: [] };
  }

  const medalNameSet = new Set(medalTypes.map((t) => t.name.toLowerCase()));
  const aiWars = Array.isArray(aiParsed.wars)
    ? aiParsed.wars.filter((w) => typeof w === "string" && !medalNameSet.has(w.toLowerCase().trim()))
    : [];

  await progress("Done!", 100);

  return {
    name: aiParsed.name || heroName,
    rank: aiParsed.rank || "",
    branch: aiParsed.branch || "U.S. Army",
    biography: aiParsed.description || "",
    wars: aiWars,
    avatarUrl,
    combatType: aiParsed.combatSpecialty || "none",
    multiServiceOrMultiWar: aiWars.length > 1,
    aiDescription: aiParsed.description || "",
    aiWars: aiWars,
    aiCombatSpecialty: aiParsed.combatSpecialty || "",
    aiTokens: aiResult.totalTokens,
    aiCost: aiResult.estimatedCost,
    newMedalTypesCreated: 0,
    ribbonMaxPerRow: 4,
    wikiMedalNames: [],
    wikiRibbonRack: [],
  };
}
