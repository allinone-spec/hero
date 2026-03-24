// ── Sync Medal Types ────────────────────────────────────────────────────────
// Upserts ALL medal types: updates existing records with authoritative scoring
// values from MEDAL_DEFS, and inserts any that don't yet exist.
// Run: npx tsx src/lib/sync-medal-types.ts

import { readFileSync } from "node:fs";
try {
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .forEach((l) => {
      const i = l.indexOf("=");
      const key = l.slice(0, i).trim();
      const val = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    });
} catch {
  // env already provided by shell
}

import mongoose from "mongoose";
import MedalType from "./models/MedalType";
import { MEDAL_DEFS } from "./seed";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Check your .env.local file.");

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri, { bufferCommands: false });

  let updated = 0;
  let inserted = 0;

  for (const def of MEDAL_DEFS) {
    const result = await MedalType.findOneAndUpdate(
      { name: def.name },
      { $set: def },
      { upsert: true, returnDocument: "after" }
    );

    // findOneAndUpdate returns the doc — check if it was newly created
    // by comparing timestamps (createdAt ≈ updatedAt means just created)
    const doc = result as unknown as { createdAt?: Date; updatedAt?: Date };
    if (
      doc.createdAt &&
      doc.updatedAt &&
      Math.abs(doc.createdAt.getTime() - doc.updatedAt.getTime()) < 1000
    ) {
      inserted++;
      console.log(`  + INSERTED: ${def.name} (${def.shortName})`);
    } else {
      updated++;
      console.log(`  ~ UPDATED:  ${def.name} (${def.shortName}) → ${def.valorPoints || def.basePoints} pts`);
    }
  }

  console.log(
    `\nDone! ${updated} updated, ${inserted} inserted (${MEDAL_DEFS.length} total medal types).`
  );

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed:", err.message ?? err);
  mongoose.disconnect().finally(() => process.exit(1));
});
