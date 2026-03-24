import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";
import {
  askAI,
  DEFAULT_GEMINI_MODEL_ID,
  geminiRejectsThinkingBudgetZero,
} from "@/lib/openai";

/** Prefer Flash for large JSON when GEMINI_MODEL is thinking-only Pro (optional override). */
function medalCatalogGeminiModel(): string | undefined {
  const override = process.env.GEMINI_MEDAL_CATALOG_MODEL?.trim();
  if (override) return override;
  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL_ID;
  if (geminiRejectsThinkingBudgetZero(primary)) {
    return process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_MODEL_ID;
  }
  return undefined;
}

const SYSTEM_PROMPT = `You are an expert on U.S. military decorations and on **foreign, NATO, UN, and allied awards** often seen next to U.S. ribbons. Return ONE JSON array.

**Order and scope (within the medal cap):**
1. **U.S. awards first** — all major U.S. military medals in correct **U.S.** order of precedence (valor, distinguished service, commendations, campaigns, common unit awards).
2. **Then non-U.S. awards** — widely recognized foreign state, NATO, UN, and multinational mission medals that commonly appear on allied or joint-service records. Use category **"foreign"** for those unless they are clearly U.S. **service** awards.

For EACH medal, provide this exact JSON structure:
{
  "name": "Full official name",
  "shortName": "Short label or acronym",
  "category": "valor" | "service" | "foreign" | "other",
  "basePoints": number (U.S. heroism scoring only; see below),
  "valorPoints": number (same as basePoints for U.S. valor medals; else 0),
  "requiresValorDevice": boolean,
  "inherentlyValor": boolean,
  "tier": number (1=highest U.S. valor like MOH; use higher tier numbers for foreign/non-valor),
  "branch": "All" | "Army" | "Navy" | "Navy/Marine Corps" | "Air Force" | "Coast Guard" | "Marine Corps",
  "precedenceOrder": number (1 = highest in combined list; U.S. block stays in true U.S. order, then foreign/NATO/UN in sensible order),
  "countryCode": "ISO 3166-1 alpha-2 for issuing country, or UN / NATO for those entities; use US for United States awards",
  "description": "One short phrase (under 80 characters)"
}

**U.S. heroism scoring (apply only to U.S. valor medals; foreign awards: basePoints 0, valorPoints 0, usually category foreign):**
- Medal of Honor: 100
- Service Crosses (DSC, NC, AFC, CGC): 60 each
- Silver Star: 35
- DFC (with V): 25
- Soldier's / Navy-Marine Corps / Airman's / Coast Guard Medal: 20 each
- Bronze Star (with V): 15
- Air Medal (with V): 10
- Purple Heart: 8
- Commendation (with V): 5 each
- Achievement (with V): 2 each
All other U.S. non-valor and all foreign/NATO/UN medals: 0 points unless you are clearly applying a U.S. device rule.

Keep the array to **at most 35 medals**. Prioritize a complete U.S. core; use remaining slots for the most common non-U.S. entries (e.g. NATO Medal, selected UN medals, well-known UK/Canada awards if space). Finish the JSON array completely — do not stop mid-object.

Return ONLY a JSON array (no wrapper object). No markdown fences, no commentary before or after the array.`;

const USER_PROMPT = `Generate one JSON array: U.S. decorations in correct U.S. precedence, then important foreign/NATO/UN/allied awards in the remaining slots (within the cap). Prefer fewer medals over truncating.

Output: a single JSON array only, fully closed with ].`;

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
  countryCode?: string;
  description: string;
}

function normalizeCountryCode(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().toUpperCase();
  if (t.length === 2 || t === "UN" || t === "NATO") return t;
  return undefined;
}

/**
 * When output hits max tokens mid-array, recover all fully-closed top-level objects.
 * Respects string literals so `}` inside descriptions does not confuse depth.
 */
function parseTruncatedMedalArrayJson(raw: string): MedalData[] | null {
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const start = s.indexOf("[");
  if (start < 0) return null;

  let objDepth = 0;
  let inStr = false;
  let esc = false;
  let lastTopLevelObjectClose = -1;

  for (let i = start + 1; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") {
      objDepth++;
      continue;
    }
    if (c === "}") {
      objDepth--;
      if (objDepth === 0) lastTopLevelObjectClose = i;
      continue;
    }
  }

  if (lastTopLevelObjectClose < 0) return null;
  const candidate = `${s.slice(start, lastTopLevelObjectClose + 1)}\n]`;
  try {
    const fixed = candidate.replace(/,(\s*[\]}])/g, "$1");
    const parsed = JSON.parse(fixed) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as MedalData[];
    }
  } catch {
    return null;
  }
  return null;
}

/** Parse Gemini output: JSON mode + fenced blocks + extract [...] if wrapped in prose. */
function parseMedalCatalogJson(raw: string): MedalData[] {
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

  const tryParse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      // Drop trailing commas before ] or }
      const fixed = text.replace(/,(\s*[\]}])/g, "$1");
      return JSON.parse(fixed);
    }
  };

  let parsed: unknown | undefined = undefined;
  try {
    parsed = tryParse(s);
  } catch {
    // Strip ```json ... ``` (non-greedy start, greedy end)
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      try {
        parsed = tryParse(fence[1].trim());
      } catch {
        parsed = undefined;
      }
    }
  }

  if (parsed === undefined) {
    const start = s.indexOf("[");
    const end = s.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        parsed = tryParse(s.slice(start, end + 1));
      } catch {
        const partial = parseTruncatedMedalArrayJson(s);
        if (partial) {
          console.warn("[auto-populate] Recovered truncated JSON:", partial.length, "medals");
          return partial;
        }
        throw new Error("PARSE_FAIL");
      }
    } else {
      const partial = parseTruncatedMedalArrayJson(s);
      if (partial) {
        console.warn("[auto-populate] Recovered truncated JSON:", partial.length, "medals");
        return partial;
      }
      throw new Error("PARSE_FAIL");
    }
  }

  if (!Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown> | null;
    const nested = o?.medals ?? o?.data ?? o?.items ?? o?.catalog ?? o?.awards;
    if (Array.isArray(nested)) {
      return nested as MedalData[];
    }
    throw new Error("NOT_ARRAY");
  }
  return parsed as MedalData[];
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // JSON catalog: use Flash when GEMINI_MODEL is thinking-only Pro; thinkingBudget 0 skipped for those models in askAI.
    const result = await askAI(SYSTEM_PROMPT, USER_PROMPT, session.email, {
      json: true,
      maxTokens: 8192,
      thinkingBudget: 0,
      model: medalCatalogGeminiModel(),
      maxSystemChars: 6000,
      maxUserChars: 4000,
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

    let medals: MedalData[];
    try {
      medals = parseMedalCatalogJson(result.content);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "parse";
      const len = result.content?.length ?? 0;
      console.error("[auto-populate] JSON parse failed:", reason, {
        contentLength: len,
        head: result.content?.slice(0, 400),
        tail: result.content?.slice(-400),
      });
      const hint =
        len === 0
          ? "The model returned no text (safety block, empty candidates, or an API quirk). Try again; if it persists, set GEMINI_MODEL to a current Flash id (e.g. gemini-2.5-flash) or check the API dashboard."
          : reason === "NOT_ARRAY"
            ? "Model returned JSON but not an array. Try again."
            : "Could not parse medal list (often truncated JSON). Try again; if it keeps failing, reduce list size in the prompt or raise max output tokens.";
      return NextResponse.json({ error: `AI response could not be used. ${hint}` }, { status: 500 });
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
      const countryCode = normalizeCountryCode(medal.countryCode);

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
        if (countryCode) existing.countryCode = countryCode;
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
          countryCode: countryCode || "US",
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
