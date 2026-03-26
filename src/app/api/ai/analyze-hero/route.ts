import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import MedalTypeModel from "@/lib/models/MedalType";
import { getSession } from "@/lib/auth";
import { analyzeHero } from "@/lib/openai";
import { deriveHeroMetadataTags } from "@/lib/derive-hero-metadata-tags";
import { matchAiMedalsToDatabase } from "@/lib/match-ai-medals";

interface MedalTypeDoc {
  _id: { toString(): string };
  name: string;
  shortName: string;
  otherNames?: string[];
  basePoints: number;
  precedenceOrder: number;
  ribbonColors: string[];
  imageUrl?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scrapedData } = await req.json();
  if (!scrapedData || typeof scrapedData !== "string") {
    return NextResponse.json({ error: "scrapedData is required" }, { status: 400 });
  }

  try {
    await dbConnect();

    // Get all medal types from DB to pass their names to the AI
    const medalTypes = await MedalTypeModel.find({}).lean<MedalTypeDoc[]>();
    const dbMedalNames = medalTypes.map((mt) => {
      const aliases = mt.otherNames?.length ? ` (also: ${mt.otherNames.join(", ")})` : "";
      return `${mt.name}${aliases}`;
    });

    const result = await analyzeHero(scrapedData, dbMedalNames, session.email);

    // Log usage
    await AIUsage.create({
      userEmail: session.email,
      action: "analyze_hero",
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      inputPreview: scrapedData.slice(0, 200),
    });

    // Parse AI response — strip markdown code blocks if present
    let rawContent = result.content.trim();
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    interface AIMedal { name: string; count?: number; hasValor?: boolean }
    let parsed: {
      description?: string;
      wars?: string[];
      medals?: (string | AIMedal)[];
      combatSpecialty?: string;
      gender?: string;
      metadataTags?: string[];
      countryCode?: string;
    } = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { description: rawContent, wars: [], medals: [] };
    }

    // Filter wars: remove anything that looks like a medal name
    const medalNameSet = new Set(medalTypes.map((t) => t.name.toLowerCase()));
    const filteredWars = Array.isArray(parsed.wars)
      ? parsed.wars.filter((w) => typeof w === "string" && !medalNameSet.has(w.toLowerCase().trim()))
      : [];

    const allowedCC = new Set(["US", "UK", "CA", "AU", "NZ", "ZA", "IN"]);
    const ccRaw = String(parsed.countryCode || "US").toUpperCase();
    const countryCode = allowedCC.has(ccRaw) ? ccRaw : "US";

    const { matched: matchedMedals } = matchAiMedalsToDatabase(parsed.medals, medalTypes, { countryCode });

    const metadataTags = deriveHeroMetadataTags({
      combatType: parsed.combatSpecialty,
      wars: filteredWars,
      gender: parsed.gender,
      current: parsed.metadataTags,
      medals: matchedMedals.map((m) => ({ name: m.name, count: m.count })),
    });

    return NextResponse.json({
      description: parsed.description || "",
      wars: filteredWars,
      medals: matchedMedals,
      combatSpecialty: parsed.combatSpecialty || "",
      metadataTags,
      countryCode,
      gender: parsed.gender || "",
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
