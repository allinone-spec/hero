/**
 * Recompute hero metadataTags from branch, wars, combatAchievements, existing tags, and medal tallies.
 *
 * Usage:
 *   npx tsx scripts/backfill-metadata-tags.ts           # dry-run: print counts only
 *   npx tsx scripts/backfill-metadata-tags.ts --apply   # write to MongoDB
 *   npx tsx scripts/backfill-metadata-tags.ts --apply --published-only
 *
 * Requires MONGODB_URI in .env.local
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
  const apply = process.argv.includes("--apply");
  const publishedOnly = process.argv.includes("--published-only");

  const dbConnect = (await import("../src/lib/mongodb")).default;
  const Hero = (await import("../src/lib/models/Hero")).default;
  await import("../src/lib/models/MedalType");

  const { deriveHeroMetadataTags } = await import("../src/lib/derive-hero-metadata-tags");

  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (publishedOnly) filter.published = true;

  const heroes = await Hero.find(filter)
    .select("_id slug metadataTags branch wars combatAchievements medals")
    .populate("medals.medalType", "name")
    .lean();

  let wouldChange = 0;
  const mongoose = (await import("mongoose")).default;

  for (const h of heroes) {
    const current = Array.isArray(h.metadataTags) ? [...h.metadataTags] : [];
    const ca = h.combatAchievements as { type?: string } | undefined;
    const medals = Array.isArray(h.medals)
      ? h.medals
          .filter((m: { medalType?: { name?: string }; count?: number }) => m?.medalType && typeof m.medalType === "object")
          .map((m: { medalType: { name?: string }; count?: number }) => ({
            name: String(m.medalType?.name || ""),
            count: Math.max(1, Number(m.count) || 1),
          }))
      : [];

    const next = deriveHeroMetadataTags({
      branch: h.branch,
      combatType: ca?.type,
      wars: h.wars,
      current: current,
      medals,
    });

    const same =
      current.length === next.length && current.every((t, i) => t === next[i]);
    if (!same) {
      wouldChange++;
      if (apply) {
        await Hero.updateOne({ _id: h._id }, { $set: { metadataTags: next } });
      }
      if (!apply && wouldChange <= 15) {
        console.log(`${h.slug}:`, JSON.stringify(current), "→", JSON.stringify(next));
      }
    }
  }

  console.log(
    apply
      ? `Updated ${wouldChange} hero(es).`
      : `Dry-run: ${wouldChange} hero(es) would change. Run with --apply to write.`,
  );
  await mongoose.disconnect().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
