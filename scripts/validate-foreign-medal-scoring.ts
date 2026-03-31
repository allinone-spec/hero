/**
 * Validate imported foreign medal scoring rows against data/medal-inventory/foreign.csv.
 *
 * Usage:
 *   npx tsx scripts/validate-foreign-medal-scoring.ts
 */
import { readFileSync } from "node:fs";
import path from "path";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
      .forEach((l) => {
        const i = l.indexOf("=");
        const key = l.slice(0, i).trim();
        const val = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
        if (key && process.env[key] === undefined) process.env[key] = val;
      });
  } catch {
    // Missing .env.local: rely on shell env.
  }
}

type ExpectedRow = {
  medalId: string;
  medalName: string;
  countryCode: string;
  vDeviceAllowed: boolean;
  basePoints: number;
  valorPoints: number;
};

type Mismatch = {
  medalId: string;
  field: string;
  expected: string | number | boolean;
  actual: string | number | boolean | null | undefined;
};

async function loadExpectedRows(): Promise<ExpectedRow[]> {
  const csvPath = path.join(process.cwd(), "data", "medal-inventory", "foreign.csv");
  const csv = readFileSync(csvPath, "utf8");
  const { parseMedalInventoryCsv } = await import("../src/lib/medal-inventory-importer");
  return parseMedalInventoryCsv(csv).map((row) => ({
    medalId: row.medalId,
    medalName: row.medalName,
    countryCode: row.countryCode,
    vDeviceAllowed: row.vDeviceAllowed,
    basePoints: row.basePoints ?? 0,
    valorPoints: row.valorPoints ?? row.basePoints ?? 0,
  }));
}

async function main() {
  loadEnvLocal();
  const { default: dbConnect } = await import("../src/lib/mongodb");
  const { default: MedalType } = await import("../src/lib/models/MedalType");

  await dbConnect();

  const expectedRows = await loadExpectedRows();
  const mismatches: Mismatch[] = [];
  const missing: string[] = [];

  for (const expected of expectedRows) {
    const doc = await MedalType.findOne({ medalId: expected.medalId }).lean<{
      medalId?: string;
      name?: string;
      category?: string;
      countryCode?: string;
      basePoints?: number;
      valorPoints?: number;
      requiresValorDevice?: boolean;
    } | null>();

    if (!doc) {
      missing.push(expected.medalId);
      continue;
    }

    const checks: Array<[string, string | number | boolean, string | number | boolean | null | undefined]> = [
      ["name", expected.medalName, doc.name],
      ["category", "foreign", doc.category],
      ["countryCode", expected.countryCode, doc.countryCode],
      ["basePoints", expected.basePoints, doc.basePoints],
      ["valorPoints", expected.valorPoints, doc.valorPoints],
      ["requiresValorDevice", expected.vDeviceAllowed, doc.requiresValorDevice],
    ];

    for (const [field, exp, act] of checks) {
      if (exp !== act) {
        mismatches.push({ medalId: expected.medalId, field, expected: exp, actual: act });
      }
    }
  }

  const expectedIds = new Set(expectedRows.map((r) => r.medalId));
  const extras = (
    await MedalType.find({ category: "foreign" })
      .select("medalId")
      .lean<Array<{ medalId?: string }>>()
  )
    .map((d) => d.medalId)
    .filter((id): id is string => Boolean(id))
    .filter((id) => id.startsWith("foreign-") && !expectedIds.has(id));

  if (missing.length === 0 && mismatches.length === 0 && extras.length === 0) {
    console.log("OK: foreign medal scoring catalog matches expected table.");
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log("\nMissing medals:");
    for (const id of missing) console.log(`- ${id}`);
  }

  if (mismatches.length > 0) {
    console.log("\nMismatches:");
    for (const mm of mismatches) {
      console.log(`- ${mm.medalId}.${mm.field}: expected=${String(mm.expected)} actual=${String(mm.actual)}`);
    }
  }

  if (extras.length > 0) {
    console.log("\nExtra foreign-* medals not in foreign.csv:");
    for (const id of extras) console.log(`- ${id}`);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
