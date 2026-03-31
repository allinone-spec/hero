/**
 * Bulk-normalize hero `branch` and `wars[]` using src/lib/hero-taxonomy.ts
 * (merges synonyms like "US Army" → "U.S. Army", "WWII" → "World War II").
 *
 * Usage:
 *   npx tsx scripts/normalize-all-heroes-taxonomy.ts
 *   npx tsx scripts/normalize-all-heroes-taxonomy.ts --apply
 *   npx tsx scripts/normalize-all-heroes-taxonomy.ts --apply --published-only
 *
 * After writing, consider recomputing metadata tags if you use them for browse:
 *   npx tsx scripts/backfill-metadata-tags.ts --apply
 *
 * Requires MONGODB_URI in .env.local
 */
import path from "node:path";
import dotenv from "dotenv";
import { normalizeBranch, normalizeWarsArray } from "../src/lib/hero-taxonomy";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

function warsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const publishedOnly = process.argv.includes("--published-only");

  const dbConnect = (await import("../src/lib/mongodb")).default;
  const Hero = (await import("../src/lib/models/Hero")).default;
  const mongoose = (await import("mongoose")).default;

  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (publishedOnly) filter.published = true;

  const heroes = await Hero.find(filter).select("_id slug branch wars").lean();

  let changed = 0;
  let sample = 0;
  const maxSamples = 20;

  for (const h of heroes) {
    const slug = String(h.slug || h._id);
    const branchIn = typeof h.branch === "string" ? h.branch : "";
    const warsIn = Array.isArray(h.wars) ? h.wars.map((w: unknown) => String(w)) : [];

    const branchOut = normalizeBranch(branchIn);
    const warsOut = normalizeWarsArray(warsIn);

    const branchDiff = branchOut !== branchIn;
    const warsDiff = !warsEqual(warsOut, warsIn);

    if (!branchDiff && !warsDiff) continue;

    changed++;
    if (!apply && sample < maxSamples) {
      console.log(`— ${slug}`);
      if (branchDiff) console.log(`  branch: ${JSON.stringify(branchIn)} → ${JSON.stringify(branchOut)}`);
      if (warsDiff) console.log(`  wars:   ${JSON.stringify(warsIn)} → ${JSON.stringify(warsOut)}`);
      sample++;
    }

    if (apply) {
      await Hero.updateOne(
        { _id: h._id },
        { $set: { branch: branchOut, wars: warsOut } }
      );
    }
  }

  console.log(
    apply
      ? `Updated ${changed} hero(es) with normalized branch/wars.`
      : `Dry-run: ${changed} hero(es) would change. Run with --apply to write.`,
  );
  if (!apply && changed > maxSamples) {
    console.log(`(Showing first ${maxSamples} samples; ${changed - maxSamples} more not printed.)`);
  }

  await mongoose.disconnect().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
