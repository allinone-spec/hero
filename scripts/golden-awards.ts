/**
 * Golden tests: messy Wikipedia-style award strings → normalizeAwardText → (optional) matchAiMedalsToDatabase.
 *
 * Usage:
 *   npx tsx scripts/golden-awards.ts              # normalization only (no DB)
 *   npx tsx scripts/golden-awards.ts --match      # also match against live MedalType collection (needs .env.local)
 *
 * When a case fails: adjust src/lib/medal-normalization.ts and/or MedalType.otherNames in Mongo,
 * then re-run until green.
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import { normalizeAwardText } from "../src/lib/medal-normalization";
import { matchAiMedalsToDatabase } from "../src/lib/match-ai-medals";

type NormExpect = {
  name: string;
  count: number;
  hasValor: boolean;
};

/**
 * How to add a case:
 * 1. Copy one award phrase from Wikipedia (infobox "Awards" cell or body — not the whole paragraph).
 * 2. `raw`: paste it exactly (trim outer whitespace only).
 * 3. `expect.name`: the canonical medal name after normalization — should match `MedalType.name` in Mongo
 *    (singular, e.g. "Silver Star" not "Silver Stars"). Run `normalizeAwardText(raw)` once to see actual output
 *    if unsure, then set expect to what you *want* once rules are fixed.
 * 4. `expect.count`: total awards of that type (e.g. "with two oak leaf clusters" → 1+2 = 3).
 * 5. `expect.hasValor`: true only if text denotes a V/valor device for that award.
 * 6. `npm run test:golden-awards` — FAIL means fix `medal-normalization.ts` or correct your expect.
 */
const GOLDEN_NORMALIZE: { label?: string; raw: string; expect: NormExpect }[] = [
  {
    label: "OLC phrasing = 1 + N",
    raw: "Silver Star with two oak leaf clusters",
    expect: { name: "Silver Star", count: 3, hasValor: false },
  },
  {
    label: "Leading word number",
    raw: "three Silver Stars",
    expect: { name: "Silver Star", count: 3, hasValor: false },
  },
  {
    label: "Digit leading count",
    raw: "3 Silver Stars",
    expect: { name: "Silver Star", count: 3, hasValor: false },
  },
  {
    label: "Wikipedia prose — awarded N at end",
    raw: "He was awarded three Silver Stars",
    expect: { name: "Silver Star", count: 3, hasValor: false },
  },
  {
    label: "Valor strip",
    raw: "Bronze Star Medal (V)",
    expect: { name: "Bronze Star Medal", count: 1, hasValor: true },
  },
  {
    label: "OLC abbreviation",
    raw: "Legion of Merit with 2 OLCs",
    expect: { name: "Legion of Merit", count: 3, hasValor: false },
  },
  {
    label: "Distinguished Flying Cross + clusters",
    raw: "Distinguished Flying Cross with three oak leaf clusters",
    expect: { name: "Distinguished Flying Cross", count: 4, hasValor: false },
  },
  {
    label: "Purple Heart x2 phrasing",
    raw: "Purple Heart with oak leaf cluster",
    expect: { name: "Purple Heart", count: 2, hasValor: false },
  },
];

/** After normalization, these should resolve to a DB row (US pool). Extend expectedMedalName if your DB uses a different canonical name. */
const GOLDEN_MATCH: {
  label?: string;
  raw: string;
  countryCode?: string;
  /** Substring match against matched name from DB */
  expectedNameIncludes: string;
  minCount?: number;
}[] = [
  { raw: "Silver Star with two oak leaf clusters", expectedNameIncludes: "Silver Star", minCount: 3 },
  { raw: "Medal of Honor", expectedNameIncludes: "Medal of Honor" },
  { raw: "Navy Cross", countryCode: "US", expectedNameIncludes: "Navy Cross" },
  { raw: "Distinguished Service Cross", expectedNameIncludes: "Distinguished Service Cross" },
];

function normClose(a: NormExpect, b: NormExpect): boolean {
  return (
    a.name.toLowerCase() === b.name.toLowerCase() &&
    a.count === b.count &&
    a.hasValor === b.hasValor
  );
}

function runNormalization(): number {
  let failures = 0;
  console.log("\n=== normalizeAwardText (no DB) ===\n");
  for (const c of GOLDEN_NORMALIZE) {
    const got = normalizeAwardText(c.raw, 1, false);
    const ok = normClose(got, c.expect);
    if (!ok) {
      failures++;
      console.log(`FAIL ${c.label ? `[${c.label}] ` : ""}"${c.raw}"`);
      console.log(`  expected:`, c.expect);
      console.log(`  got:     `, got);
    } else {
      console.log(`OK   ${c.label ? `[${c.label}] ` : ""}"${c.raw}" →`, got);
    }
  }
  return failures;
}

async function runMatch(): Promise<number> {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing; cannot run --match. Set it in .env.local.");
    return 1;
  }
  const dbConnect = (await import("../src/lib/mongodb")).default;
  const MedalType = (await import("../src/lib/models/MedalType")).default;
  await dbConnect();
  const medalTypes = await MedalType.find({}).lean();
  let failures = 0;

  console.log("\n=== matchAiMedalsToDatabase (live MedalType) ===\n");

  for (const c of GOLDEN_MATCH) {
    const n = normalizeAwardText(c.raw, 1, false);
    const medals = [{ name: n.name, count: n.count, hasValor: n.hasValor }];
    const { matched, unmatched } = matchAiMedalsToDatabase(medals, medalTypes, {
      countryCode: c.countryCode || "US",
    });
    const hit = matched[0];
    const nameOk =
      hit &&
      hit.name.toLowerCase().includes(c.expectedNameIncludes.toLowerCase());
    const countOk = !c.minCount || (hit && hit.count >= c.minCount);

    if (!hit || !nameOk || !countOk) {
      failures++;
      console.log(`FAIL "${c.raw}" (normalized → ${JSON.stringify(n)})`);
      console.log(`  matched:`, matched);
      console.log(`  unmatched:`, unmatched);
    } else {
      console.log(`OK   "${c.raw}" → ${hit.name} ×${hit.count}`);
    }
  }

  await mongooseDisconnect();
  return failures;
}

async function mongooseDisconnect() {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect().catch(() => undefined);
}

async function main() {
  const normFails = runNormalization();
  const wantMatch = process.argv.includes("--match");
  const matchFails = wantMatch ? await runMatch() : 0;

  const total = normFails + matchFails;
  console.log(total === 0 ? "\nAll golden checks passed.\n" : `\n${total} golden check(s) failed.\n`);
  process.exit(total > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
