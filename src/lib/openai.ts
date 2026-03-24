import { GoogleGenAI } from "@google/genai";

/**
 * Server-side only AI client — uses Google Gemini native SDK.
 * NEVER import this file in client components.
 */

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

/** Default when `GEMINI_MODEL` is unset (`gemini-2.0-flash` is often 404 for new API projects). */
export const DEFAULT_GEMINI_MODEL_ID = "gemini-2.5-flash";

const MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL_ID;

// Pricing per 1M tokens (Gemini as of 2025)
const PRICING = {
  "gemini-3.1-pro-preview": { input: 2.50, output: 15.00 },
  "gemini-3-flash-preview": { input: 0.15, output: 0.60 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
} as Record<string, { input: number; output: number }>;

export interface AIResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Rate limiting: track calls per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max calls per minute per user
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(userEmail: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userEmail);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userEmail, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Truncate input to avoid sending massive prompts
function truncate(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[truncated]";
}

// Global request queue — serializes Gemini API calls with a minimum gap
// so parallel callers don't trip the free-tier rate limit.
let _lastRequestDone: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 1000;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const ticket = _lastRequestDone.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    return result;
  });
  _lastRequestDone = ticket.then(() => {}, () => {});
  return ticket;
}

/** HTTP status from Gemini SDK error or JSON body in `message` (e.g. UNAVAILABLE / 503). */
function getGeminiHttpStatus(err: unknown): number | undefined {
  const e = err as {
    status?: number;
    httpStatusCode?: number;
    code?: number;
    message?: string;
  };
  if (typeof e.status === "number") return e.status;
  if (typeof e.httpStatusCode === "number") return e.httpStatusCode;
  if (typeof e.code === "number" && e.code >= 400 && e.code < 600) return e.code;
  const msg = e.message || "";
  const quoted = msg.match(/"code"\s*:\s*(\d{3})\b/);
  if (quoted) return parseInt(quoted[1], 10);
  return undefined;
}

const DEFAULT_GEMINI_FALLBACK_MODEL = DEFAULT_GEMINI_MODEL_ID;

/** Narrow shape for logging / text extraction (matches GenerateContentResponse). */
type GeminiContentResponse = {
  text?: string;
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
};

function getGeminiResponseText(response: GeminiContentResponse): string {
  const fromApi = typeof response.text === "string" ? response.text : "";
  if (fromApi.trim()) return fromApi.trim();
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";
  let s = "";
  for (const part of parts) {
    if (typeof part.text === "string" && !part.thought) {
      s += part.text;
    }
  }
  return s.trim();
}

function describeGeminiEmptyResponse(response: GeminiContentResponse | undefined): string {
  if (!response) return "No response object";
  const pf = response.promptFeedback;
  if (pf?.blockReason) {
    const extra = pf.blockReasonMessage ? ` — ${pf.blockReasonMessage}` : "";
    return `Prompt blocked (${pf.blockReason})${extra}`;
  }
  const fr = response.candidates?.[0]?.finishReason;
  if (fr) return `finishReason=${fr}`;
  if (!response.candidates?.length) return "No candidates (blocked or API returned no output)";
  return "Candidates had no text";
}

// Thinking models (gemini-2.5+, gemini-3+) don't support temperature
const isThinkingModel = /gemini-(?:[2-9]\.[5-9]|[3-9])/.test(MODEL);

/** API returns 400 if thinkingBudget is 0 ("only works in thinking mode"). */
export function geminiRejectsThinkingBudgetZero(model: string): boolean {
  const m = model.toLowerCase();
  if (m.includes("gemini-2.5-pro")) return true;
  if (m.includes("gemini-3-pro")) return true;
  return false;
}

export async function askAI(
  systemPrompt: string,
  userPrompt: string,
  userEmail: string,
  options?: {
    maxTokens?: number;
    maxSystemChars?: number;
    maxUserChars?: number;
    json?: boolean;
    model?: string;
    /** `0` disables thinking where supported (frees output for long JSON). Omitted on models that require thinking (e.g. gemini-2.5-pro). */
    thinkingBudget?: number;
  }
): Promise<AIResponse> {
  if (!checkRateLimit(userEmail)) {
    throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
  }

  const ai = getClient();
  const maxTokens = options?.maxTokens ?? 2000;
  const maxSystemChars = options?.maxSystemChars ?? 2000;
  const maxUserChars = options?.maxUserChars ?? 8000;
  const primaryModel = options?.model || MODEL;
  const flashFallback =
    process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_FALLBACK_MODEL;
  /** Retries for rate limits and temporary overload (503/502). */
  const MAX_ATTEMPTS = 8;
  const MAX_EMPTY_BODY_RETRIES = 3;

  const { response, modelUsed, content } = await enqueue(async () => {
    let modelUsed = primaryModel;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const useThinking = /gemini-(?:[2-9]\.[5-9]|[3-9])/.test(modelUsed);
        let lastResponse: GeminiContentResponse | undefined;

        for (let emptyTry = 0; emptyTry < MAX_EMPTY_BODY_RETRIES; emptyTry++) {
          lastResponse = await ai.models.generateContent({
            model: modelUsed,
            contents: truncate(userPrompt, maxUserChars),
            config: {
              systemInstruction: truncate(systemPrompt, maxSystemChars),
              maxOutputTokens: maxTokens,
              ...(useThinking ? {} : { temperature: 0 }),
              ...(useThinking &&
              options?.thinkingBudget !== undefined &&
              !(
                options.thinkingBudget === 0 && geminiRejectsThinkingBudgetZero(modelUsed)
              )
                ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } }
                : {}),
              ...(options?.json ? { responseMimeType: "application/json" } : {}),
            },
          });

          const text = getGeminiResponseText(lastResponse);
          if (text) {
            return { response: lastResponse, modelUsed, content: text };
          }

          console.warn(
            `[Gemini] Empty response body (${emptyTry + 1}/${MAX_EMPTY_BODY_RETRIES}, model=${modelUsed}):`,
            describeGeminiEmptyResponse(lastResponse)
          );
          if (emptyTry < MAX_EMPTY_BODY_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, 900 * (emptyTry + 1)));
          }
        }

        if (modelUsed !== flashFallback) {
          console.warn(
            `[Gemini] Repeated empty responses on ${modelUsed} — trying ${flashFallback}`
          );
          modelUsed = flashFallback;
          continue;
        }

        throw new Error(
          `Gemini returned an empty response. ${describeGeminiEmptyResponse(lastResponse)}`
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.startsWith("Gemini returned an empty")) {
          throw err;
        }

        const status = getGeminiHttpStatus(err);
        const message = (err as Error).message || "";
        console.error(`Gemini API error (status ${status ?? "n/a"}):`, { message, model: modelUsed });

        const retryable = status === 429 || status === 502 || status === 503;
        if (!retryable) {
          throw new Error(`Gemini API error (${status || "unknown"}): ${message}`);
        }

        if (attempt >= MAX_ATTEMPTS - 1) {
          throw new Error(
            `Gemini API error (${status || "unknown"}) after ${MAX_ATTEMPTS} attempts: ${message}`
          );
        }

        // Pro / high-demand models often return 503; switch to Flash after a few failures
        if (
          (status === 503 || status === 502) &&
          modelUsed !== flashFallback &&
          attempt >= 2
        ) {
          console.warn(
            `[Gemini] ${modelUsed} unavailable (${status}) — falling back to ${flashFallback}`
          );
          modelUsed = flashFallback;
        }

        const delay = Math.min(2500 * Math.pow(1.55, attempt), 22_000);
        console.warn(
          `Gemini ${status} — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_ATTEMPTS}, model=${modelUsed})`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error("Gemini: exhausted retries");
  });

  const usage = response.usageMetadata;
  const promptTokens = usage?.promptTokenCount ?? 0;
  const completionTokens = usage?.candidatesTokenCount ?? 0;
  const totalTokens = usage?.totalTokenCount ?? (promptTokens + completionTokens);

  const pricing = PRICING[modelUsed] || PRICING[DEFAULT_GEMINI_MODEL_ID];
  const estimatedCost =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;

  return {
    content,
    model: modelUsed,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost,
  };
}

// ── Specific AI tasks ────────────────────────────────────

export async function generateHeroDescription(
  scrapedData: string,
  userEmail: string
): Promise<AIResponse> {
  const systemPrompt = `You are a military history expert. Write a concise, factual biography (2-3 paragraphs) for a military hero based on the provided data. Focus on their service record, major battles, decorations, and legacy. Use a respectful, authoritative tone.`;
  return askAI(systemPrompt, `Write a biography based on this data:\n\n${scrapedData}`, userEmail);
}

export async function getMedalList(
  query: string,
  userEmail: string
): Promise<AIResponse> {
  const systemPrompt = `You are a US military decorations expert. When asked about medals, return a JSON array of medal objects with fields: name, shortName, category (valor/service/foreign/other), description, branch (All/Army/Navy/Marine Corps/Air Force/Coast Guard). Only include real US military decorations. Return ONLY valid JSON, no markdown.`;
  return askAI(systemPrompt, query, userEmail, { json: true });
}

export async function getWarList(
  userEmail: string
): Promise<AIResponse> {
  const systemPrompt = `You are a US military history expert. Return a JSON array of major wars and conflicts the United States has participated in. Each object should have: name (string), startYear (number), endYear (number or null if ongoing), theater (string), description (string, 1-2 sentences). Order chronologically. Return ONLY valid JSON, no markdown.`;
  return askAI(systemPrompt, "List all major US wars and military conflicts from the Revolutionary War to present.", userEmail, { json: true });
}

export async function analyzeHero(
  scrapedData: string,
  dbMedalNames: string[],
  userEmail: string
): Promise<AIResponse> {
  const medalList = dbMedalNames.map((n) => `- ${n}`).join("\n");

  const systemPrompt = `You are a US military history and decorations expert.
Given scraped data about a military hero, return a JSON object with EXACTLY these 8 fields:

{
  "description": "A concise factual biography (3-5 paragraphs).",
  "wars": ["War Name 1", "War Name 2"],
  "medals": [{"name": "Medal Name", "count": 1, "hasValor": false}],
  "otherMedals": [{"name": "Full Medal Name", "count": 1, "hasValor": false}],
  "combatSpecialty": "infantry",
  "gender": "male",
  "metadataTags": ["submariner", "female"],
  "countryCode": "US"
}

FIELD RULES:
- "description": Plain text biography string. NOT JSON. NOT bullet points. Focus on service record, major battles, decorations, and legacy. Respectful, authoritative tone.
- "wars": ONLY war/conflict names like "World War I", "World War II", "Korean War", "Vietnam War", "War on Terror", "Iraq War", "War in Afghanistan". Do NOT put medal names here.
- "medals": Array of objects for medals that match the ALLOWED list below. Each object has "name" (exact medal name from the list), "count" (number of times awarded, usually 1), and "hasValor" (true if awarded with "V" device or valor distinction).
- "otherMedals": Array of objects for medals/decorations NOT in the ALLOWED list. Same format as "medals" with "name", "count", "hasValor". Use the full official name. This captures foreign decorations, campaign medals, unit citations, or any award not in the list below. Return an empty array if none.
- "combatSpecialty": The hero's primary combat specialty. Must be EXACTLY one of: "infantry", "armor", "artillery", "aviation", "airborne", "special_operations", "submarine", "surface", "amphibious", "reconnaissance", "air_defense", "engineering", "signal", "intelligence", "medical", "logistics", "chemical", "electronic_warfare", "cyber", "military_police", "ordnance", "sniper", "marine", "none". Pick the single best match based on their primary role and service record.
- "gender": "male" or "female" based on the source text. If unknown, use "male".
- "metadataTags": Array of zero or more tags from this CLOSED LIST ONLY (use exact ids): "female", "submariner", "surface_commander", "aviator", "ace", "astronaut", "paratrooper", "double_moh", "multiple_purple_hearts", "ground_combat", "foreign_awards". Include "female" when gender is female. Include "double_moh" only when two Medals of Honor are explicit. Include "multiple_purple_hearts" when multiple Purple Hearts or severe wounding is explicit. Include "submariner", "aviator", "astronaut", etc. only when clearly supported by the text.
- "countryCode": ISO-style code for primary service: "US", "UK", "CA", "AU", "NZ", "ZA", or "IN". Default "US" for United States military.

IMPORTANT: ONLY extract medals and decorations that are EXPLICITLY mentioned in the provided data. The awards section text is the primary source for medal data. Do NOT add medals from your own knowledge — if a medal is not listed in the provided text, do NOT include it. Extract counts (Oak Leaf Clusters, service stars) and valor distinctions (V device) only when explicitly stated.

VALIDATION CONTEXT:
- You will receive pre-extracted medal data alongside the raw awards text.
- "Already matched medals" shows medals already identified from HTML parsing.
- "Unmatched medal names" shows raw text that could not be matched to known medals.
- Include ALL medals you find, including those already matched — this helps validate the list.
- The HTML-parsed counts are usually more accurate, but note any discrepancies you see.

ALLOWED MEDAL NAMES (use these exact names in the "medals" field):
${medalList}

For the "medals" field, ONLY use names from the ALLOWED list above.
For the "otherMedals" field, include any additional medals/decorations found that are NOT in the list above.
Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  return askAI(systemPrompt, `Analyze this military hero data:\n\n${scrapedData}`, userEmail, {
    maxTokens: 4000,
    maxSystemChars: 8000,
    maxUserChars: 12000,
    json: true,
  });
}

// ── Fetch hero data entirely from AI knowledge ───────────────────────────────

export async function fetchHeroFromAI(
  heroName: string,
  dbMedalNames: string[],
  userEmail: string
): Promise<AIResponse> {
  const medalList = dbMedalNames.map((n) => `- ${n}`).join("\n");

  const systemPrompt = `Role: You are an expert military historian specializing in personnel records, awards, and decorations. You possess advanced knowledge of U.S. military dress and appearance regulations.

Task: Given a military hero's name, create a technical service profile as structured JSON. Do not include narrative filler outside the biography field.

REQUIRED JSON OUTPUT:

{
  "name": "Full official name",
  "rank": "Highest rank achieved (include retired/posthumous if applicable)",
  "branch": "Must be EXACTLY one of: U.S. Army, U.S. Navy, U.S. Marine Corps, U.S. Air Force, U.S. Coast Guard, U.S. Space Force",
  "datesOfService": "YYYY-YYYY or Not Stated",
  "description": "A factual 3-5 paragraph biography.",
  "wars": ["Theater/Conflict 1", "Theater/Conflict 2"],
  "medals": [
    {
      "name": "Official Medal Title (from ALLOWED LIST)",
      "count": 1,
      "hasValor": false,
      "devices": "Description of all devices (OLC, stars, V device, etc.) or None"
    }
  ],
  "otherMedals": [
    {
      "name": "Full Official Medal Title (NOT in allowed list)",
      "count": 1,
      "hasValor": false,
      "devices": "Description of devices or None"
    }
  ],
  "combatSpecialty": "infantry",
  "ribbonRack": {
    "maxPerRow": 4,
    "rows": [
      {"row": 1, "centered": false, "ribbons": ["Medal Name 1", "Medal Name 2", "Medal Name 3", "Medal Name 4"]},
      {"row": 2, "centered": true, "ribbons": ["Medal Name 5", "Medal Name 6"]}
    ]
  }
}

EXTRACTION RULES:

1. Service Overview:
   - "name": Full name as commonly known.
   - "rank": Highest rank held, official title (e.g. "Major General" not "MG"). Include "(Ret.)" or "(Posthumous)" if applicable. If missing, "Not Stated".
   - "branch": Primary military branch served.
   - "datesOfService": Start and end years. If unknown, "Not Stated".

2. Biography ("description"):
   - Plain text, 3-5 paragraphs. Respectful, authoritative tone.
   - Focus on service record, major battles, decorations, and legacy.
   - NOT JSON. NOT bullet points.

3. Theater/Conflict ("wars"):
   - ONLY war/conflict names: "World War I", "World War II", "Korean War", "Vietnam War", "War on Terror", "Iraq War", "War in Afghanistan", etc.
   - Do NOT put medal names here.

4. Awards & Decorations ("medals" and "otherMedals"):
   - "medals": Awards matching the ALLOWED LIST below. "name" MUST be exact from the list.
   - "otherMedals": Awards NOT in the allowed list. Use full official title. Captures foreign decorations, campaign medals, unit citations.
   - Granularity Requirement: You MUST explicitly state:
     * "name": The official title
     * "count": Total number of awards received (e.g. 4 Oak Leaf Clusters = count 5 total awards)
     * "hasValor": true if awarded with "V" device or valor distinction
     * "devices": Specific devices attached (e.g. "2 Bronze Oak Leaf Clusters, V Device", "3 Service Stars", or "None")

5. Combat Specialty ("combatSpecialty"):
   - Must be EXACTLY one of: "infantry", "armor", "artillery", "aviation", "airborne", "special_operations", "submarine", "surface", "amphibious", "reconnaissance", "air_defense", "engineering", "signal", "intelligence", "medical", "logistics", "chemical", "electronic_warfare", "cyber", "military_police", "ordnance", "sniper", "marine", "none".

6. Ribbon Rack Configuration ("ribbonRack") — STRICT PROTOCOL, DO NOT DEVIATE:
   - "maxPerRow": Maximum ribbons per row (3 or 4). Use 4 unless the person's branch regulations or documented photos indicate 3.
   - Precedence: Use the official U.S. branch-specific order of precedence.
   - The Medal of Honor: This ribbon MUST be the first item in the rack (Row 1, position 1) if present.
   - Rack Layout: Arrange awards in rows. Maximum of "maxPerRow" ribbons per row.
   - Centering Logic: If a row has fewer than "maxPerRow" awards, set "centered": true.
   - "rows": Array of row objects. Each row has "row" (number), "centered" (boolean), and "ribbons" (array of medal names in precedence order).
   - Include ALL medals from both "medals" and "otherMedals" in the ribbon rack.

7. Strict Veracity Clause:
   - Use ONLY well-documented, historically verified facts about this person.
   - If device counts or award totals are not well-documented, output count: 1 and devices: "Not Specified in Source".
   - Do NOT infer counts, do NOT estimate based on common patterns, and do NOT omit the entry entirely.
   - Do NOT include awards you are uncertain about.

ALLOWED MEDAL NAMES (use exact names for "medals" field):
${medalList}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  return askAI(systemPrompt, `Provide a complete military profile for: ${heroName}`, userEmail, {
    maxTokens: 8000,
    maxSystemChars: 12000,
    maxUserChars: 1000,
    json: true,
  });
}

// ── Match ribbon image filenames to medal names using AI ─────────────────────

export async function matchRibbonsToMedals(
  medalNames: string[],
  ribbonFilenames: string[],
  userEmail: string
): Promise<AIResponse> {
  const systemPrompt = `You are a US military decorations expert. You will receive two lists:
1. A list of medal/decoration names
2. A list of ribbon image filenames from Wikipedia

Your task: Match each medal name to the correct ribbon image filename.

RULES:
- Each medal should match AT MOST one ribbon filename.
- Each ribbon filename should match AT MOST one medal.
- Use your knowledge of military decorations to handle abbreviations (e.g., "DFC" = Distinguished Flying Cross), alternate names, and filename conventions.
- Wikipedia ribbon filenames often use underscores, abbreviations, and may include suffixes like "-3d", dimensions like "106px-", or file extensions.
- Focus on the meaningful part of the filename (ignore "ribbon", "svg", "png", pixel sizes, and path prefixes).
- If you are NOT confident about a match, omit it — do NOT guess.

Return a JSON object where keys are medal names (exactly as given) and values are ribbon filenames (exactly as given). Only include confident matches.

Example:
{"Bronze Star Medal": "Bronze_Star_ribbon.svg", "Purple Heart": "Purple_Heart_ribbon.svg"}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  const userPrompt = `Medal names:\n${medalNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nRibbon filenames:\n${ribbonFilenames.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;

  // Use Gemini 2.5 Flash for ribbon matching — same as comprehensive matching
  return askAI(systemPrompt, userPrompt, userEmail, {
    maxTokens: 4000,
    maxSystemChars: 4000,
    maxUserChars: 8000,
    json: true,
    model: "gemini-2.5-flash",
  });
}

// ── Match medals to ribbons AND device images using AI ──────────────────────

export interface MedalCellInput {
  cellText: string;
  links: string[];
}

export async function matchMedalsRibbonsAndDevices(
  medalCells: MedalCellInput[],
  ribbonFilenames: string[],
  deviceFilenames: string[],
  userEmail: string
): Promise<AIResponse> {
  const systemPrompt = `You are a structured data extraction system for Wikipedia military awards pages.

Your task is to convert medal table cells into structured medal data and match them with ribbon image files and device image files.

CRITICAL RULES:

1. Do NOT invent filenames.
2. Only use filenames from the provided ribbon_files list and device_files list.
3. Preserve the medal order exactly as provided.
4. The first link in each medal cell is always the medal name.
5. Device information appears in the remaining text.
6. Device descriptions may begin with:
   * "with"
   * "w/"
7. Device counts may appear as numbers or words.

Word numbers must convert to integers:
one=1, two=2, three=3, four=4, five=5, six=6, seven=7, eight=8, nine=9, ten=10

Common devices include:
* bronze oak leaf cluster
* silver oak leaf cluster
* bronze campaign star
* silver campaign star
* bronze award numeral
* silver award numeral
* "V" device (valor)

Each device must map to a corresponding device image file.

Ribbon filenames may contain abbreviations.
Examples:
Distinguished Flying Cross → DFC_ribbon.svg
Victoria Cross → VC_ribbon.svg
Order of the British Empire → OBE_ribbon.svg

When matching ribbon files:
* Use semantic similarity
* Prefer filenames containing medal keywords
* If no ribbon matches, return null

When matching device files:
* Match the device type name to the closest filename
* Oak leaf cluster devices typically match files with "oak_leaf" or "Oak_Leaf" in the name
* Star devices match files with "star", "Ribbonstar", or "campaign_star"
* "V" devices match files with "V_device" or "v_device"
* Numeral devices match files with "numeral" or "Award_numeral"

OUTPUT REQUIREMENTS:
Return JSON only.

Schema:
{
  "medals": [
    {
      "medal_name": "string",
      "ribbon_file": "string|null",
      "devices": [
        {
          "device_type": "string",
          "count": number,
          "device_file": "string"
        }
      ]
    }
  ]
}

If a medal has no devices: devices must be an empty array.

Do not include explanations.
Do not include markdown.
Only return valid JSON.`;

  const userPrompt = `Parse the medal cells and match them with ribbon image files and device image files.

Medal cells:
${JSON.stringify(medalCells)}

Available ribbon files:
${JSON.stringify(ribbonFilenames)}

Available device files:
${JSON.stringify(deviceFilenames)}

Tasks:
1. Extract the medal name from the first link in each cell (or from cell text if no links).
2. Extract device types and counts from the remaining text.
3. Convert word numbers into integers.
4. Match each medal to the correct ribbon file.
5. Match each device type to the closest device image file.
6. Preserve medal order exactly.
7. Do not invent filenames.
8. Only use filenames from the provided lists.

Return JSON only.`;

  // Use Gemini 2.5 Flash specifically for ribbon matching — fast and accurate
  // for structured extraction tasks while keeping costs low.
  return askAI(systemPrompt, userPrompt, userEmail, {
    maxTokens: 16000,
    maxSystemChars: 6000,
    maxUserChars: 12000,
    json: true,
    model: "gemini-2.5-flash",
  });
}
