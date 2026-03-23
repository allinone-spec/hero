import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import MedalTypeModel from "@/lib/models/MedalType";
import { getSession } from "@/lib/auth";
import { analyzeHero } from "@/lib/openai";

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
    let parsed: { description?: string; wars?: string[]; medals?: (string | AIMedal)[]; combatSpecialty?: string } = {};
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

    // Match AI-returned medals to DB medal types
    // AI now returns objects { name, count, hasValor } but we also handle plain strings
    const matchedMedals: {
      medalTypeId: string;
      name: string;
      shortName: string;
      count: number;
      hasValor: boolean;
      valorDevices: number;
    }[] = [];

    if (Array.isArray(parsed.medals)) {
      for (const entry of parsed.medals) {
        let medalName: string;
        let count = 1;
        let hasValor = false;

        if (typeof entry === "object" && entry !== null && "name" in entry) {
          medalName = String(entry.name);
          count = Math.max(1, Number(entry.count) || 1);
          hasValor = Boolean(entry.hasValor);
        } else if (typeof entry === "string") {
          medalName = entry;
        } else {
          continue;
        }

        const lower = medalName.toLowerCase().trim();

        if (!hasValor) {
          hasValor = /with\s+valor|with\s+"?v"?\s*device|combat\s+"?v"?|\(v\)|\bvalor\b/i.test(lower);
        }

        const cleanLower = lower
          .replace(/\s*with\s+valor\b/i, "")
          .replace(/\s*with\s+"?v"?\s*device\b/i, "")
          .replace(/\s*combat\s+"?v"?\b/i, "")
          .replace(/\s*\(v\)\s*/i, "")
          .trim();

        let mt = medalTypes.find((t) => t.name.toLowerCase() === cleanLower);
        if (!mt) mt = medalTypes.find((t) => t.name.toLowerCase() === lower);
        if (!mt) {
          mt = medalTypes.find((t) =>
            t.otherNames?.some((alt) => alt.toLowerCase() === cleanLower)
          );
        }
        if (!mt && cleanLower.length > 6) {
          mt = medalTypes.find(
            (t) =>
              t.name.toLowerCase().includes(cleanLower) ||
              cleanLower.includes(t.name.toLowerCase()) ||
              t.otherNames?.some((alt) => alt.toLowerCase().includes(cleanLower) || cleanLower.includes(alt.toLowerCase()))
          );
        }
        if (!mt) {
          mt = medalTypes.find((t) => t.shortName.toLowerCase() === cleanLower);
        }

        if (mt) {
          const mtId = mt._id.toString();
          const existing = matchedMedals.find((m) => m.medalTypeId === mtId);
          if (existing) {
            if (count > existing.count) existing.count = count;
            if (hasValor && !existing.hasValor) {
              existing.hasValor = true;
              existing.valorDevices = 1;
            }
          } else {
            matchedMedals.push({
              medalTypeId: mtId,
              name: mt.name,
              shortName: mt.shortName,
              count,
              hasValor,
              valorDevices: hasValor ? 1 : 0,
            });
          }
        }
      }
    }

    return NextResponse.json({
      description: parsed.description || "",
      wars: filteredWars,
      medals: matchedMedals,
      combatSpecialty: parsed.combatSpecialty || "",
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
