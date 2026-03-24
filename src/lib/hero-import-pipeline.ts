import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import MedalTypeModel from "@/lib/models/MedalType";
import AIUsage from "@/lib/models/AIUsage";
import { analyzeHero, fetchHeroFromAI } from "@/lib/openai";
import { scrapeWikipediaHero } from "@/lib/wikipedia-scraper";
import { normalizeMetadataTags } from "@/lib/metadata-tags";
import { matchAiMedalsToDatabase } from "@/lib/match-ai-medals";
// Stage 1 clerk path: match-ai-medals uses normalizeAwardText (see @/lib/award-clerk).

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface MedalTypeDoc {
  _id: { toString(): string };
  name: string;
  shortName: string;
  otherNames?: string[];
  ribbonImageUrl?: string;
  countryCode?: string;
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
  /** Deprecated for public rack — kept empty; medals come from AI clerk only */
  wikiRibbonRack: { ribbonUrl: string; deviceUrls: string[]; name: string; _id: string; type: "ribbon" | "other"; width?: number; height?: number }[];
  aiMedals: {
    medalTypeId: string;
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads: number;
    ribbonUrl?: string;
    wikiOrder: number;
    deviceImages: { url: string; deviceType: string; count: number }[];
  }[];
  unmatchedMedals: {
    rawName: string;
    count: number;
    hasValor: boolean;
    arrowheads: number;
    devices: string;
  }[];
  metadataTags: string[];
  countryCode: string;
}

type ProgressCallback = (step: string, percent: number) => void | Promise<void>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveMetadataTags(input: {
  branch?: string;
  combatType?: string;
  wars?: string[];
  gender?: string;
  current?: string[];
}): string[] {
  const out = new Set<string>(normalizeMetadataTags(input.current ?? []));
  const branch = String(input.branch || "").toLowerCase();
  const combatType = String(input.combatType || "").toLowerCase();
  const wars = Array.isArray(input.wars) ? input.wars.map((w) => String(w).toLowerCase()) : [];
  const gender = String(input.gender || "").toLowerCase();

  if (gender === "female") out.add("female");
  if (gender === "male") out.add("male");

  if (branch.includes("army")) out.add("army");
  if (branch.includes("navy")) out.add("navy");
  if (branch.includes("marine")) out.add("usmc");
  if (branch.includes("air force")) out.add("usaf");
  if (branch.includes("coast guard")) out.add("coast_guard");
  if (branch.includes("space force")) out.add("space_force");

  if (combatType === "submarine") out.add("submariner");
  if (combatType === "surface") {
    out.add("surface_commander");
    out.add("surface_warfare");
  }
  if (combatType === "aviation") {
    out.add("aviator");
    out.add("pilot");
  }
  if (combatType === "airborne") out.add("paratrooper");
  if (combatType === "special_operations") out.add("special_operations");
  if (combatType === "infantry" || combatType === "armor" || combatType === "artillery") {
    out.add("ground_combat");
  }

  for (const war of wars) {
    if (war.includes("world war i")) out.add("wwi");
    if (war.includes("world war ii")) out.add("wwii");
    if (war.includes("korean war") || war === "korea") out.add("korea");
    if (war.includes("vietnam")) out.add("vietnam");
    if (war.includes("iraq")) out.add("iraq");
    if (war.includes("afghanistan")) out.add("afghanistan");
    if (war.includes("terror")) out.add("war_on_terror");
  }

  return [...out];
}

function normalizeCountryCode(raw?: string, branch?: string): string {
  const allowed = new Set(["US", "UK", "CA", "AU", "NZ", "ZA", "IN"]);
  const direct = String(raw || "").trim().toUpperCase();
  if (allowed.has(direct)) return direct;

  const branchText = String(branch || "").toLowerCase();
  if (/australia|australian/.test(branchText)) return "AU";
  if (/new zealand/.test(branchText)) return "NZ";
  if (/canada|canadian/.test(branchText)) return "CA";
  if (/south africa|south african/.test(branchText)) return "ZA";
  if (/\bindia\b|indian/.test(branchText)) return "IN";
  if (/british|royal navy|royal marines|raf|royal air force/.test(branchText)) return "UK";
  return "US";
}

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
    medals?: unknown;
    otherMedals?: unknown;
    metadataTags?: string[];
    countryCode?: string;
    gender?: string;
    branch?: string;
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

  const countryCode = normalizeCountryCode(aiParsed.countryCode, scraped.branch || aiParsed.branch);
  const { matched: matchedMain, unmatched: unmatchedMain } = matchAiMedalsToDatabase(
    aiParsed.medals,
    medalTypes,
    { countryCode }
  );
  const mtById = new Map(medalTypes.map((m) => [m._id.toString(), m]));
  const aiMedals = matchedMain.map((m) => ({
    medalTypeId: m.medalTypeId,
    count: m.count,
    hasValor: m.hasValor,
    valorDevices: m.valorDevices,
    arrowheads: 0,
    ribbonUrl: mtById.get(m.medalTypeId)?.ribbonImageUrl,
    wikiOrder: 0,
    deviceImages: [] as { url: string; deviceType: string; count: number }[],
  }));
  const unmatchedMedals = unmatchedMain.map((u) => ({
    rawName: u.rawName,
    count: u.count,
    hasValor: u.hasValor,
    arrowheads: 0,
    devices: "",
  }));

  const metadataTags = deriveMetadataTags({
    branch: scraped.branch,
    combatType,
    wars: mergedWars,
    gender: aiParsed.gender,
    current: aiParsed.metadataTags,
  });
  await progress("Done!", 100);

  const wikiMedalNames = (scraped.medalCells || [])
    .filter((c) => c.links.length > 0 && c.links[0].length >= 3)
    .map((c) => ({ name: c.links[0], devices: c.devices || "" }));

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
    wikiRibbonRack: [],
    aiMedals,
    unmatchedMedals,
    metadataTags,
    countryCode,
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
    medals?: unknown;
    otherMedals?: unknown;
    metadataTags?: string[];
    countryCode?: string;
    gender?: string;
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

  const countryCode = normalizeCountryCode(aiParsed.countryCode, aiParsed.branch);
  const { matched: fbMatched, unmatched: fbUnmatched } = matchAiMedalsToDatabase(
    aiParsed.medals,
    medalTypes,
    { countryCode }
  );
  const mtByIdFb = new Map(medalTypes.map((m) => [m._id.toString(), m]));
  const aiMedals = fbMatched.map((m) => ({
    medalTypeId: m.medalTypeId,
    count: m.count,
    hasValor: m.hasValor,
    valorDevices: m.valorDevices,
    arrowheads: 0,
    ribbonUrl: mtByIdFb.get(m.medalTypeId)?.ribbonImageUrl,
    wikiOrder: 0,
    deviceImages: [] as { url: string; deviceType: string; count: number }[],
  }));
  const unmatchedMedals = fbUnmatched.map((u) => ({
    rawName: u.rawName,
    count: u.count,
    hasValor: u.hasValor,
    arrowheads: 0,
    devices: "",
  }));
  if (Array.isArray(aiParsed.otherMedals)) {
    for (const e of aiParsed.otherMedals) {
      const raw =
        typeof e === "string"
          ? e
          : typeof e === "object" && e !== null && "name" in e
            ? String((e as { name: string }).name)
            : "";
      const t = raw.trim();
      if (t.length >= 2) {
        unmatchedMedals.push({
          rawName: t,
          count: 1,
          hasValor: false,
          arrowheads: 0,
          devices: "",
        });
      }
    }
  }

  const metadataTags = deriveMetadataTags({
    branch: aiParsed.branch,
    combatType: aiParsed.combatSpecialty,
    wars: aiWars,
    gender: aiParsed.gender,
    current: aiParsed.metadataTags,
  });
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
    aiMedals,
    unmatchedMedals,
    metadataTags,
    countryCode,
  };
}
