import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";
import { askAI } from "@/lib/openai";

const SYSTEM_PROMPT = `You are a U.S. military decorations and awards expert. Return a JSON array of ALL major U.S. military medals and decorations in correct order of precedence. Include valor awards, service medals, campaign medals, and unit awards.

For EACH medal, provide this exact JSON structure:
{
  "name": "Full official name",
  "shortName": "Acronym (e.g. MOH, DSC, SS, BSM, PH)",
  "category": "valor" | "service" | "foreign" | "other",
  "basePoints": number (heroism scoring points, 0 if not a heroism medal),
  "valorPoints": number (same as basePoints for heroism medals),
  "requiresValorDevice": boolean (true if needs "V" device for valor credit),
  "inherentlyValor": boolean (true if the medal itself is a valor award),
  "tier": number (1=highest like MOH, 2=service crosses, etc.),
  "branch": "All" | "Army" | "Navy" | "Navy/Marine Corps" | "Air Force" | "Coast Guard" | "Marine Corps",
  "precedenceOrder": number (1=highest precedence, sequential),
  "description": "2-3 sentence description of the medal, its criteria, and history"
}

Heroism Scoring (valor medals only):
- Medal of Honor: 100 pts
- Service Crosses (DSC, NC, AFC, CGC): 60 pts each
- Silver Star: 35 pts
- Distinguished Flying Cross (with V): 25 pts
- Soldier's Medal, Navy/Marine Corps Medal, Airman's Medal, Coast Guard Medal: 20 pts each
- Bronze Star Medal (with V): 15 pts
- Air Medal (with V): 10 pts
- Purple Heart: 8 pts
- Commendation Medals (with V): 5 pts each
- Achievement Medals (with V): 2 pts each

All other medals (DSMs, Legion of Merit, MSM, campaign medals, etc.) get 0 points.

Include at minimum these categories:
1. Valor decorations (MOH through Achievement Medals)
2. Distinguished Service Medals (Defense, Army, Navy, Air Force, Coast Guard)
3. Legion of Merit
4. Defense/Meritorious Service Medals
5. Commendation Medals (all branches, without counting valor separately)
6. Achievement Medals (all branches)
7. Campaign/Service medals (Good Conduct, Expeditionary, etc.)
8. Common unit awards

Return ONLY valid JSON array, no markdown code blocks, no explanation.`;

const USER_PROMPT = `Generate the complete U.S. military medal catalog in correct precedence order. Include all major decorations from Medal of Honor through common service and campaign medals. Return as a JSON array.`;

interface MedalData {
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  tier: number;
  branch: string;
  precedenceOrder: number;
  description: string;
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // Use extended max_tokens for this large response
    const result = await askAI(SYSTEM_PROMPT, USER_PROMPT, session.email, {
      maxTokens: 8000,
      maxSystemChars: 4000,
    });

    // Log AI usage
    await AIUsage.create({
      userEmail: session.email,
      action: "auto_populate_medals",
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      inputPreview: "Auto-populate medal catalog",
    });

    // Parse AI response
    let medals: MedalData[];
    try {
      // Strip markdown code blocks if present
      let content = result.content.trim();
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }
      medals = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 500 }
      );
    }

    if (!Array.isArray(medals) || medals.length === 0) {
      return NextResponse.json(
        { error: "AI returned empty or invalid medal list." },
        { status: 500 }
      );
    }

    // Upsert medals: match by name, create new or update existing
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const medal of medals) {
      if (!medal.name || !medal.shortName) {
        skipped++;
        continue;
      }

      const validCategories = ["valor", "service", "foreign", "other"];
      const category = validCategories.includes(medal.category) ? medal.category : "other";

      const existing = await MedalType.findOne({ name: medal.name });

      if (existing) {
        // Update existing medal with AI data (preserve imageUrl and ribbonColors)
        existing.shortName = medal.shortName;
        existing.category = category;
        existing.basePoints = medal.basePoints ?? 0;
        existing.valorPoints = medal.valorPoints ?? 0;
        existing.requiresValorDevice = medal.requiresValorDevice ?? false;
        existing.inherentlyValor = medal.inherentlyValor ?? false;
        existing.tier = medal.tier ?? 99;
        existing.branch = medal.branch || "All";
        existing.precedenceOrder = medal.precedenceOrder ?? 99;
        if (medal.description && (!existing.description || existing.description.length < 10)) {
          existing.description = medal.description;
        }
        await existing.save();
        updated++;
      } else {
        // Create new medal
        await MedalType.create({
          name: medal.name,
          shortName: medal.shortName,
          category,
          basePoints: medal.basePoints ?? 0,
          valorPoints: medal.valorPoints ?? 0,
          requiresValorDevice: medal.requiresValorDevice ?? false,
          inherentlyValor: medal.inherentlyValor ?? false,
          tier: medal.tier ?? 99,
          branch: medal.branch || "All",
          precedenceOrder: medal.precedenceOrder ?? 99,
          ribbonColors: [],
          description: medal.description || "",
          imageUrl: "",
        });
        created++;
      }
    }

    return NextResponse.json({
      created,
      updated,
      skipped,
      total: medals.length,
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auto-populate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
