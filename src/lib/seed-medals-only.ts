// ── Upsert Medal Types ──────────────────────────────────────────────────────
// Adds any NEW medal types to the DB without deleting existing ones.
// Run: npx tsx src/lib/seed-medals-only.ts

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

  const existing = await MedalType.find({}).lean();
  const existingNames = new Set(existing.map((m) => (m as { name: string }).name.toLowerCase()));

  const toInsert = MEDAL_DEFS.filter(
    (m) => !existingNames.has(m.name.toLowerCase())
  );

  if (toInsert.length === 0) {
    console.log("All medal types already exist in DB. Nothing to add.");
  } else {
    console.log(`Adding ${toInsert.length} new medal types...`);
    const result = await MedalType.insertMany(toInsert);
    for (const m of result) {
      console.log(`  + ${m.name} (${m.shortName})`);
    }
    console.log(`\nDone! ${result.length} medal types added.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed:", err.message ?? err);
  mongoose.disconnect().finally(() => process.exit(1));
});
