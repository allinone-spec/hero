/**
 * Import medal catalog from `data/medal-inventory/Final_Medal_Sheet_Client.csv` into MedalType.
 *
 * Columns: Medal_ID, Medal_Name, Acronym, Slang, Service, Precedence, Category, Bong_Score, Valor_Tier,
 * Ribbon_File_Direct_URL / Ribbon_Thumbnail_URL (ribbon art), Wiki_Link, Medal_Link (optional;
 * often Wikipedia article — not used as ribbon image). Legacy `ribbons.csv` layout is still
 * understood by {@link parseRibbonsInventoryCsv}. Legacy {@link parseMedalInventoryCsv} retains
 * the old flat column layout for scripts.
 */

import fs from "fs";
import path from "path";
import { parseCsvLine } from "@/lib/csv-line";
import { deriveShortNameFromMedalName } from "@/lib/medal-short-name";
import { parseMedalDeviceRule } from "@/lib/medal-device-rules";
import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";
import {
  NON_HEROIC_VALOR_TIER,
  resolveInventoryHeroicScoring,
} from "@/lib/medal-inventory-scoring";
import { inferMedalValorBehavior } from "@/lib/medal-valor-flags";

/** Preferred client sheet after running `scripts/sync-medal-inventory-csv.ts` */
export const MEDAL_INVENTORY_SYNCED_CSV_FILENAME = "_Final_Medal_Sheet_Client.synced.csv";
/** Legacy / Excel export name (same schema once synced). */
export const MEDAL_INVENTORY_CSV_FILENAME = "Final_Medal_Sheet_Client.csv";

export function resolveMedalInventoryCsvPath(dir: string): string {
  if (process.env.MEDAL_INVENTORY_CSV?.trim()) {
    return path.join(dir, process.env.MEDAL_INVENTORY_CSV.trim());
  }
  const synced = path.join(dir, MEDAL_INVENTORY_SYNCED_CSV_FILENAME);
  if (fs.existsSync(synced)) return synced;
  return path.join(dir, MEDAL_INVENTORY_CSV_FILENAME);
}

export type ImportMedalRow = {
  medalId: string;
  medalName: string;
  precedenceWeight: number;
  countryCode: string;
  deviceLogic: string;
  vDeviceAllowed: boolean;
  inventoryCategory: string;
  basePoints?: number;
  valorPoints?: number;
  /** Synonyms for matchAiMedalsToDatabase — from optional CSV column */
  otherNames?: string[];
  ribbonImageUrl?: string;
  wikipediaUrl?: string;
  /** 1–4 = heroic matrix; 5+ = no heroic points */
  valorTier?: number;
};

export function parseMedalInventoryCsv(content: string): ImportMedalRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: ImportMedalRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 7) continue;
    const precedenceWeight = parseInt(cols[2], 10);
    if (Number.isNaN(precedenceWeight)) continue;
    const basePointsRaw = cols[7]?.trim();
    const valorPointsRaw = cols[8]?.trim();
    const otherNamesRaw = cols[9]?.trim();
    const parsedBasePoints = basePointsRaw ? parseInt(basePointsRaw, 10) : undefined;
    const parsedValorPoints = valorPointsRaw ? parseInt(valorPointsRaw, 10) : undefined;
    const otherNames: string[] | undefined = otherNamesRaw
      ? otherNamesRaw
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    rows.push({
      medalId: cols[0].trim(),
      medalName: cols[1].trim(),
      precedenceWeight,
      countryCode: cols[3].trim().toUpperCase(),
      deviceLogic: cols[4].trim(),
      vDeviceAllowed: /^true$/i.test(cols[5].trim()),
      inventoryCategory: cols[6].trim(),
      basePoints: Number.isFinite(parsedBasePoints) ? parsedBasePoints : undefined,
      valorPoints: Number.isFinite(parsedValorPoints) ? parsedValorPoints : undefined,
      otherNames: otherNames?.length ? otherNames : undefined,
    });
  }
  return rows;
}

function normalizeInventoryHeaderKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Derive ISO-style hero/medal country from inventory medal_id + Service (see HeroForm allowed set). */
export function countryCodeFromRibbonsRow(medalId: string, service: string): string {
  const id = medalId.trim().toLowerCase();
  if (id.startsWith("us-")) return "US";
  if (id.startsWith("can-")) return "CA";
  if (id.startsWith("cw-") || id.startsWith("gb-")) return "UK";
  if (id.startsWith("au-")) return "AU";
  if (id.startsWith("nz-")) return "NZ";
  if (id.startsWith("za-")) return "ZA";
  if (id.startsWith("in-")) return "IN";
  const s = service.trim().toUpperCase();
  if (s === "CAN") return "CA";
  if (s === "UK" || s.startsWith("UK")) return "UK";
  return "US";
}

function isLikelyRibbonAssetUrl(raw: string): boolean {
  const u = raw.trim().toLowerCase();
  if (!u.startsWith("http")) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (host === "upload.wikimedia.org" || host.endsWith(".wikimedia.org")) return true;
    if (host.endsWith(".wikipedia.org")) {
      return /\.(svg|png|jpg|jpeg|gif|webp)(\?|$)/i.test(u);
    }
  } catch {
    return false;
  }
  return false;
}

function cobaltOtherNamesFromRibbons(acronym: string, slang: string): string[] {
  const out: string[] = [];
  const a = acronym.trim();
  const sl = slang.trim();
  if (a && a !== "-") out.push(a);
  if (sl && sl !== "-" && sl.toLowerCase() !== a.toLowerCase()) out.push(sl);
  return out;
}

/** Match AI / legacy strings to client-sheet MoH titles (and MOH acronym). */
function medalOfHonorExtraOtherNames(medalName: string): string[] {
  const n = medalName.trim();
  if (n === "Medal of Honor (U.S. Navy / USMC / USCG)")
    return ["Medal of Honor (Navy)", "Medal of Honor (Navy/MC)", "MOH"];
  if (n === "Medal of Honor (U.S. Air Force)")
    return ["Medal of Honor (AF)", "Medal of Honor (Air Force)", "MOH"];
  if (n === "Medal of Honor (U.S. Army)") return ["Medal of Honor (Army)", "MOH"];
  if (n === "Medal of Honor (Navy)") return ["Medal of Honor (Navy/MC)", "MOH"];
  if (n === "Medal of Honor (AF)") return ["Medal of Honor (Air Force)", "MOH"];
  if (n === "Medal of Honor (Army)") return ["MOH"];
  return [];
}

/**
 * Parse ribbon-inventory CSV (client sheet or legacy `ribbons.csv`) into importer rows.
 * `Precedence` → precedenceOrder, `Bong_Score` → points (empty or non-numeric → 0).
 */
export function parseRibbonsInventoryCsv(content: string): ImportMedalRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerCols = parseCsvLine(lines[0]);
  const keyToIdx: Record<string, number> = {};
  headerCols.forEach((cell, i) => {
    keyToIdx[normalizeInventoryHeaderKey(cell)] = i;
  });

  const g = (keys: string[], cols: string[]): string => {
    for (const k of keys) {
      const i = keyToIdx[k];
      if (i !== undefined && cols[i] !== undefined) return cols[i].trim();
    }
    return "";
  };

  const rows: ImportMedalRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    const medalId = g(["medal_id"], cols);
    if (!medalId) continue;

    const medalName = g(["medal_name"], cols);
    const precedenceRaw = g(["precedence"], cols);
    const precedenceWeight = parseInt(precedenceRaw, 10);
    if (!medalName || Number.isNaN(precedenceWeight)) continue;

    const service = g(["service"], cols);
    const category = g(["category"], cols);
    const bongRaw = g(["bong_score"], cols);
    const valorTierRaw = g(["valor_tier"], cols);
    const deviceText = g(["device"], cols);

    const computed = resolveInventoryHeroicScoring({
      medalId,
      medalName,
      precedence: precedenceWeight,
      category,
    });

    let bong = bongRaw === "" ? NaN : parseInt(bongRaw, 10);
    if (!Number.isFinite(bong)) bong = computed.bong;

    let valorTier = valorTierRaw === "" ? NaN : parseInt(valorTierRaw, 10);
    if (!Number.isFinite(valorTier)) valorTier = computed.valorTier;
    valorTier = Math.min(99, Math.max(1, valorTier));

    const flags = inferMedalValorBehavior({
      medalId,
      medalName,
      deviceText,
      valorTier,
    });

    const acronym = g(["acronym"], cols);
    const slang = g(["slang"], cols);

    let ribbonImageRaw = "";
    for (const k of [
      "ribbon_file_direct_url",
      "ribbon_thumbnail_url",
      "ribbon_thumbnail_image",
      "ribbon_link",
    ] as const) {
      const raw = g([k], cols);
      if (raw && isLikelyRibbonAssetUrl(raw)) {
        ribbonImageRaw = raw;
        break;
      }
    }
    if (!ribbonImageRaw) {
      const ml = g(["medal_link"], cols);
      if (ml && isLikelyRibbonAssetUrl(ml)) ribbonImageRaw = ml;
    }
    const medalLink = normalizeWikimediaImageUrl(ribbonImageRaw);

    let wikiLink = g(["wiki_link"], cols).trim();
    if (!wikiLink) {
      const ml = g(["medal_link"], cols).trim();
      if (/wikipedia\.org\/wiki\//i.test(ml)) wikiLink = ml;
    }

    const countryCode = countryCodeFromRibbonsRow(medalId, service);
    const fromRibbonsNames = cobaltOtherNamesFromRibbons(acronym, slang);
    const mohExtras = medalOfHonorExtraOtherNames(medalName);
    const otherNames = [...new Set([...fromRibbonsNames, ...mohExtras])];

    rows.push({
      medalId,
      medalName,
      precedenceWeight,
      countryCode,
      deviceLogic: deviceText || "None",
      vDeviceAllowed: flags.vDeviceAllowed,
      inventoryCategory: category,
      basePoints: bong,
      valorPoints: valorTier >= NON_HEROIC_VALOR_TIER ? 0 : bong,
      valorTier,
      otherNames: otherNames.length ? otherNames : undefined,
      ribbonImageUrl: medalLink.trim() ? medalLink : undefined,
      wikipediaUrl: wikiLink || undefined,
    });
  }
  return rows;
}

/** Maps CSV category to MedalType.category. Valor-Merit / Valor → valor (substring "valor"). */
function mapInventoryCategoryToSchemaCategory(
  inv: string
): "valor" | "service" | "foreign" | "other" {
  const u = inv.toLowerCase();
  if (/valor|heroism|action/.test(u)) return "valor";
  if (/campaign|service/.test(u)) return "service";
  if (/foreign|allied/.test(u)) return "foreign";
  return "other";
}

/** Default basePoints for scoring when creating a new medal from inventory only */
function defaultBasePoints(weight: number, invCat: string): number {
  const u = invCat.toLowerCase();
  if (weight <= 30 && /valor|heroism/.test(u)) return Math.max(25, 100 - weight);
  if (weight <= 120 && /merit|achievement|unit/.test(u)) return Math.max(15, 80 - Math.floor(weight / 2));
  if (weight < 300) return Math.max(10, 50 - Math.floor(weight / 5));
  return Math.max(2, Math.min(15, 25 - Math.floor(weight / 50)));
}

export type ImportResult = { upserted: number; skipped: number; errors: string[] };

/** New client-sheet MoH medalId → legacy `ribbons.csv` ids (merge on first import). */
const MOH_MEDAL_ID_ALTERNATES: Record<string, string[]> = {
  "us-a-medal-of-honor-u-s-arm": ["us-army-moh"],
  "us-n-medal-of-honor-u-s-nav": ["us-navy-moh"],
  "us-af-medal-of-honor-u-s-air": ["us-af-moh"],
};

/** New MoH display name → legacy MedalType.name values for lookup before create. */
const MOH_NAME_ALTERNATES: Record<string, string[]> = {
  "Medal of Honor (U.S. Army)": ["Medal of Honor (Army)"],
  "Medal of Honor (U.S. Navy / USMC / USCG)": [
    "Medal of Honor (Navy)",
    "Medal of Honor (Navy/MC)",
  ],
  "Medal of Honor (U.S. Air Force)": ["Medal of Honor (AF)", "Medal of Honor (Air Force)"],
};

const LEGACY_MOH_NAMES: Record<string, string> = {
  "Medal of Honor (Navy)": "Medal of Honor (Navy/MC)",
  "Medal of Honor (AF)": "Medal of Honor (Air Force)",
};

export async function importMedalInventoryFromDir(dir: string): Promise<ImportResult> {
  const { default: MedalType } = await import("@/lib/models/MedalType");
  const result: ImportResult = { upserted: 0, skipped: 0, errors: [] };
  if (!fs.existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const full = resolveMedalInventoryCsvPath(dir);
  if (!fs.existsSync(full)) {
    result.errors.push(`Missing medal inventory CSV in ${dir} (expected ${MEDAL_INVENTORY_SYNCED_CSV_FILENAME} or ${MEDAL_INVENTORY_CSV_FILENAME})`);
    return result;
  }

  let content: string;
  try {
    content = fs.readFileSync(full, "utf8");
  } catch (e) {
    result.errors.push(`${MEDAL_INVENTORY_CSV_FILENAME}: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  const rows = parseRibbonsInventoryCsv(content);
  for (const row of rows) {
    try {
      const category = mapInventoryCategoryToSchemaCategory(row.inventoryCategory);
      let existingById = await MedalType.findOne({ medalId: row.medalId }).lean();
      if (!existingById) {
        const altIds = MOH_MEDAL_ID_ALTERNATES[row.medalId];
        if (altIds?.length) {
          existingById = await MedalType.findOne({ medalId: { $in: altIds } }).lean();
        }
      }
      let existingByName = existingById
        ? null
        : await MedalType.findOne({ name: row.medalName }).lean();
      if (!existingById && !existingByName) {
        const legacy = LEGACY_MOH_NAMES[row.medalName];
        if (legacy) {
          existingByName = await MedalType.findOne({ name: legacy }).lean();
        }
      }
      if (!existingById && !existingByName) {
        const altNames = MOH_NAME_ALTERNATES[row.medalName];
        if (altNames?.length) {
          existingByName = await MedalType.findOne({ name: { $in: altNames } }).lean();
        }
      }

      const shortName = deriveShortNameFromMedalName(row.medalName);
      const deviceRule = parseMedalDeviceRule(row.deviceLogic, {
        countryCode: row.countryCode,
        inventoryCategory: row.inventoryCategory,
        medalName: row.medalName,
      });
      const valorTier =
        row.valorTier ??
        existingById?.tier ??
        existingByName?.tier ??
        NON_HEROIC_VALOR_TIER;
      const flags = inferMedalValorBehavior({
        medalId: row.medalId,
        medalName: row.medalName,
        deviceText: row.deviceLogic === "None" ? "" : row.deviceLogic,
        valorTier,
      });
      const basePoints =
        row.basePoints ??
        existingById?.basePoints ??
        existingByName?.basePoints ??
        defaultBasePoints(row.precedenceWeight, row.inventoryCategory);
      const valorPoints =
        row.valorPoints ??
        existingById?.valorPoints ??
        existingByName?.valorPoints ??
        (valorTier >= NON_HEROIC_VALOR_TIER ? 0 : basePoints);

      const mergedOtherNames = (() => {
        const fromRow = row.otherNames;
        const existing = existingById?.otherNames ?? existingByName?.otherNames ?? [];
        if (fromRow?.length) {
          return [...new Set([...fromRow, ...existing])];
        }
        return existing;
      })();

      const ribbonImageUrl =
        row.ribbonImageUrl ||
        existingById?.ribbonImageUrl ||
        existingByName?.ribbonImageUrl ||
        "";
      const wikipediaUrl =
        row.wikipediaUrl || existingById?.wikipediaUrl || existingByName?.wikipediaUrl || "";

      const doc = {
        name: row.medalName,
        shortName: existingById?.shortName ?? existingByName?.shortName ?? shortName,
        otherNames: mergedOtherNames,
        category,
        basePoints,
        valorPoints,
        requiresValorDevice: flags.requiresValorDevice,
        inherentlyValor: flags.inherentlyValor,
        tier: valorTier,
        branch: "All",
        precedenceOrder: row.precedenceWeight,
        medalId: row.medalId,
        countryCode: row.countryCode,
        deviceLogic: row.deviceLogic,
        deviceRule,
        vDeviceAllowed: flags.vDeviceAllowed,
        inventoryCategory: row.inventoryCategory,
        ribbonColors:
          existingById?.ribbonColors?.length ? existingById.ribbonColors : ["#808080"],
        description: existingById?.description ?? existingByName?.description ?? "",
        ribbonImageUrl,
        wikipediaUrl,
      };

      const catalogSet = {
        name: row.medalName,
        precedenceOrder: row.precedenceWeight,
        medalId: row.medalId,
        countryCode: row.countryCode,
        deviceLogic: row.deviceLogic,
        deviceRule,
        vDeviceAllowed: flags.vDeviceAllowed,
        inventoryCategory: row.inventoryCategory,
        requiresValorDevice: flags.requiresValorDevice,
        category,
        basePoints,
        valorPoints,
        inherentlyValor: flags.inherentlyValor,
        tier: doc.tier,
        ribbonImageUrl,
        wikipediaUrl,
        ...(mergedOtherNames.length ? { otherNames: mergedOtherNames } : {}),
      };

      if (existingById) {
        await MedalType.updateOne({ _id: existingById._id }, { $set: catalogSet });
      } else if (existingByName) {
        await MedalType.updateOne({ _id: existingByName._id }, { $set: catalogSet });
      } else {
        await MedalType.create(doc);
      }
      result.upserted++;
    } catch (e) {
      result.errors.push(`${row.medalId}: ${e instanceof Error ? e.message : String(e)}`);
      result.skipped++;
    }
  }
  return result;
}
