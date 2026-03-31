/**
 * Import medal rows from client CSV files into MedalType.
 * CSV columns:
 * medal_id,medal_name,precedence_weight,country_code,device_logic,v_device_allowed,category[,base_points[,valor_points[,other_names]]]
 * `other_names`: optional; pipe or semicolon separated aliases (e.g. DFC|D.F.C.).
 */

import fs from "fs";
import path from "path";
import { deriveShortNameFromMedalName } from "@/lib/medal-short-name";
import { parseMedalDeviceRule } from "@/lib/medal-device-rules";

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
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

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

export async function importMedalInventoryFromDir(dir: string): Promise<ImportResult> {
  const { default: MedalType } = await import("@/lib/models/MedalType");
  const result: ImportResult = { upserted: 0, skipped: 0, errors: [] };
  if (!fs.existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
  for (const file of files) {
    const full = path.join(dir, file);
    let content: string;
    try {
      content = fs.readFileSync(full, "utf8");
    } catch (e) {
      result.errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const rows = parseMedalInventoryCsv(content);
    for (const row of rows) {
      try {
        const category = mapInventoryCategoryToSchemaCategory(row.inventoryCategory);
        const existingById = await MedalType.findOne({ medalId: row.medalId }).lean();
        const existingByName = existingById
          ? null
          : await MedalType.findOne({ name: row.medalName }).lean();

        const shortName = deriveShortNameFromMedalName(row.medalName);
        const deviceRule = parseMedalDeviceRule(row.deviceLogic, {
          countryCode: row.countryCode,
          inventoryCategory: row.inventoryCategory,
          medalName: row.medalName,
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
          basePoints;

        const mergedOtherNames = (() => {
          const fromRow = row.otherNames;
          const existing = existingById?.otherNames ?? existingByName?.otherNames ?? [];
          if (fromRow?.length) {
            return [...new Set([...fromRow, ...existing])];
          }
          return existing;
        })();

        const doc = {
          name: row.medalName,
          shortName: existingById?.shortName ?? existingByName?.shortName ?? shortName,
          otherNames: mergedOtherNames,
          category,
          basePoints,
          valorPoints,
          requiresValorDevice: row.vDeviceAllowed,
          inherentlyValor: category === "valor" && row.precedenceWeight <= 25,
          tier: Math.min(99, Math.floor(row.precedenceWeight / 10)),
          branch: "All",
          precedenceOrder: row.precedenceWeight,
          medalId: row.medalId,
          countryCode: row.countryCode,
          deviceLogic: row.deviceLogic,
          deviceRule,
          vDeviceAllowed: row.vDeviceAllowed,
          inventoryCategory: row.inventoryCategory,
          ribbonColors:
            existingById?.ribbonColors?.length ? existingById.ribbonColors : ["#808080"],
          description: existingById?.description ?? existingByName?.description ?? "",
        };

        if (existingById) {
          await MedalType.updateOne(
            { _id: existingById._id },
            {
              $set: {
                precedenceOrder: row.precedenceWeight,
                medalId: row.medalId,
                countryCode: row.countryCode,
                deviceLogic: row.deviceLogic,
                deviceRule,
                vDeviceAllowed: row.vDeviceAllowed,
                inventoryCategory: row.inventoryCategory,
                requiresValorDevice: row.vDeviceAllowed,
                basePoints,
                valorPoints,
                ...(row.otherNames?.length ? { otherNames: mergedOtherNames } : {}),
              },
            }
          );
        } else if (existingByName) {
          await MedalType.updateOne(
            { _id: existingByName._id },
            {
              $set: {
                precedenceOrder: row.precedenceWeight,
                medalId: row.medalId,
                countryCode: row.countryCode,
                deviceLogic: row.deviceLogic,
                deviceRule,
                vDeviceAllowed: row.vDeviceAllowed,
                inventoryCategory: row.inventoryCategory,
                requiresValorDevice: row.vDeviceAllowed,
                basePoints,
                valorPoints,
                ...(row.otherNames?.length ? { otherNames: mergedOtherNames } : {}),
              },
            }
          );
        } else {
          await MedalType.create(doc);
        }
        result.upserted++;
      } catch (e) {
        result.errors.push(`${row.medalId}: ${e instanceof Error ? e.message : String(e)}`);
        result.skipped++;
      }
    }
  }
  return result;
}
