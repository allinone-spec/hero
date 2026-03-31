/**
 * Catalog + hero medal integrity checks:
 * - Medal types sharing the same ribbon/obverse URLs (visual duplicates risk)
 * - Heroes with multiple rows pointing at the same MedalType (should merge via count)
 *
 * Loads `MONGODB_URI` from `.env.local` (same pattern as `golden-awards.ts`).
 *
 * Usage:
 *   npx tsx scripts/validate-medal-catalog.ts
 *   npm run validate:medal-catalog
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

function urlSignature(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  const s = raw.trim();
  try {
    const u = new URL(s.startsWith("//") ? `https:${s}` : s);
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

function displaySignature(m: {
  ribbonImageUrl?: string;
  imageUrl?: string;
}): string {
  return `${urlSignature(m.ribbonImageUrl)}||${urlSignature(m.imageUrl)}`;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required — add it to .env.local (or export it in the shell).");
    process.exit(1);
  }

  const dbConnect = (await import("../src/lib/mongodb")).default;
  const MedalType = (await import("../src/lib/models/MedalType")).default;
  const Hero = (await import("../src/lib/models/Hero")).default;

  await dbConnect();

  const types = await MedalType.find({})
    .select({ name: 1, medalId: 1, ribbonImageUrl: 1, imageUrl: 1, countryCode: 1 })
    .lean<
      {
        _id: unknown;
        name?: string;
        medalId?: string;
        ribbonImageUrl?: string;
        imageUrl?: string;
        countryCode?: string;
      }[]
    >();

  const bySig = new Map<string, typeof types>();
  for (const t of types) {
    const sig = displaySignature(t);
    if (!urlSignature(t.ribbonImageUrl) && !urlSignature(t.imageUrl)) continue;
    const list = bySig.get(sig) ?? [];
    list.push(t);
    bySig.set(sig, list);
  }

  console.log("=== Medal types — shared ribbon/obverse URL signature ===\n");
  let sigIssues = 0;
  for (const [, group] of bySig) {
    if (group.length < 2) continue;
    const names = group.map((g) => g.name).filter(Boolean);
    if (names.length < 2) continue;
    sigIssues++;
    console.log(`Shared visual signature (${group.length} types):`);
    for (const g of group) {
      console.log(
        `  - ${g.name}${g.medalId ? ` [${g.medalId}]` : ""} (${g.countryCode || "?"})`,
      );
    }
    console.log("");
  }
  if (sigIssues === 0) {
    console.log("(none — no two catalog rows share the same ribbon+obverse URL paths.)\n");
  }

  const medalIds = types.map((t) => t.medalId).filter(Boolean) as string[];
  const idCounts = new Map<string, number>();
  for (const id of medalIds) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  const dupMedalIds = [...idCounts.entries()].filter(([, n]) => n > 1);
  if (dupMedalIds.length > 0) {
    console.log("=== Duplicate medalId values (should not happen) ===\n");
    for (const [id, n] of dupMedalIds) {
      console.log(`  ${id}: ${n} documents`);
    }
    console.log("");
  }

  const heroes = await Hero.find({ published: true })
    .select({ slug: 1, name: 1, medals: 1 })
    .lean<
      {
        slug?: string;
        name?: string;
        medals?: { medalType?: unknown }[];
      }[]
    >();

  console.log("=== Heroes — duplicate MedalType rows (same type repeated) ===\n");
  let heroDupes = 0;
  for (const h of heroes) {
    const rows = h.medals ?? [];
    const idStrs = rows
      .map((r) => (r.medalType != null ? String(r.medalType) : ""))
      .filter(Boolean);
    const seen = new Set<string>();
    const repeated = new Set<string>();
    for (const id of idStrs) {
      if (seen.has(id)) repeated.add(id);
      seen.add(id);
    }
    if (repeated.size === 0) continue;
    heroDupes++;
    console.log(`${h.name || "?"} (${h.slug || "?"}) — repeated medalType id(s):`);
    for (const id of repeated) {
      const n = idStrs.filter((x) => x === id).length;
      console.log(`  ${id} appears ${n} times`);
    }
    console.log("");
  }
  if (heroDupes === 0) {
    console.log("(none)\n");
  }

  console.log(
    `Done. Catalog signature groups with duplicates: ${sigIssues}; heroes with repeated medal rows: ${heroDupes}.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
