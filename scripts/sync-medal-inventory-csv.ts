/**
 * Rewrites data/medal-inventory/Final_Medal_Sheet_Client.csv with Bong_Score + Valor_Tier
 * from src/lib/medal-inventory-scoring.ts (1–100 heroic matrix).
 *
 * Run: npx tsx scripts/sync-medal-inventory-csv.ts
 */
import fs from "fs";
import path from "path";
import { parseCsvLine } from "@/lib/csv-line";
import { resolveInventoryHeroicScoring } from "@/lib/medal-inventory-scoring";

const CSV_PATH = path.join(process.cwd(), "data/medal-inventory/Final_Medal_Sheet_Client.csv");

function csvJoin(cols: string[]): string {
  return cols
    .map((c) => {
      const s = String(c);
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(",");
}

function normalizeHeaderKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function main() {
  const content = fs.readFileSync(CSV_PATH, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    console.error("Empty or invalid CSV");
    process.exit(1);
  }

  const headerCols = parseCsvLine(lines[0]);
  const keyToIdx: Record<string, number> = {};
  headerCols.forEach((cell, i) => {
    keyToIdx[normalizeHeaderKey(cell)] = i;
  });

  const g = (keys: string[], cols: string[]): string => {
    for (const k of keys) {
      const i = keyToIdx[k];
      if (i !== undefined && cols[i] !== undefined) return cols[i].trim();
    }
    return "";
  };

  const bongIdxOld = keyToIdx["bong_score"];
  const hadValorCol = keyToIdx["valor_tier"] !== undefined;
  const insertValorAt = hadValorCol ? -1 : bongIdxOld !== undefined ? bongIdxOld + 1 : 8;

  const outHeader = hadValorCol
    ? headerCols
    : [...headerCols.slice(0, insertValorAt), "Valor_Tier", ...headerCols.slice(insertValorAt)];

  const outKeyToIdx: Record<string, number> = {};
  outHeader.forEach((cell, i) => {
    outKeyToIdx[normalizeHeaderKey(cell)] = i;
  });

  const outLines: string[] = [csvJoin(outHeader)];

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    if (cols.length < 3) continue;

    const medalId = g(["medal_id"], cols);
    const medalName = g(["medal_name"], cols);
    const precRaw = g(["precedence"], cols);
    const category = g(["category"], cols);
    const precedence = parseInt(precRaw, 10);

    if (!medalId || !medalName || Number.isNaN(precedence)) {
      outLines.push(lines[li]);
      continue;
    }

    const { bong, valorTier } = resolveInventoryHeroicScoring({
      medalId,
      medalName,
      precedence,
      category,
    });

    let row: string[];
    if (hadValorCol) {
      row = [...cols];
      while (row.length < outHeader.length) row.push("");
    } else {
      row = [...cols.slice(0, insertValorAt), String(valorTier), ...cols.slice(insertValorAt)];
    }

    const bi = outKeyToIdx["bong_score"];
    const vi = outKeyToIdx["valor_tier"];
    if (bi >= 0) row[bi] = String(bong);
    if (vi >= 0) row[vi] = String(valorTier);

    while (row.length < outHeader.length) row.push("");
    outLines.push(csvJoin(row.slice(0, outHeader.length)));
  }

  const outPath = path.join(path.dirname(CSV_PATH), "_Final_Medal_Sheet_Client.synced.csv");
  fs.writeFileSync(outPath, outLines.join("\n") + "\n", "utf8");
  try {
    fs.renameSync(outPath, CSV_PATH);
  } catch {
    console.warn(
      `Could not replace ${CSV_PATH} (file may be open). Wrote ${outPath} — close the CSV and copy/rename it over the original.`
    );
  }
  console.log(`Wrote ${outLines.length - 1} data rows. Valor_Tier column ${hadValorCol ? "updated" : "inserted"}.`);
}

main();
