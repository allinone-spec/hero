/**
 * One-time / destructive: remove all MedalType documents and strip medal refs from every Hero.
 * Then run `npm run import-medals` to reload `Final_Medal_Sheet_Client.csv`.
 *
 * Requires `--yes` on the command line (npm script passes it for you).
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
    /* missing .env.local */
  }
}

loadEnvLocal();

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("Refusing to run without --yes (this deletes all medal catalog and hero medal rows).");
    process.exit(1);
  }

  const { default: dbConnect } = await import("../src/lib/mongodb");
  const { default: MedalType } = await import("../src/lib/models/MedalType");
  const { default: Hero } = await import("../src/lib/models/Hero");

  await dbConnect();

  const medalDel = await MedalType.deleteMany({});
  const heroUpdate = await Hero.updateMany(
    {},
    {
      $set: {
        medals: [],
        wikiRibbonRack: [],
        score: 0,
        comparisonScore: null,
      },
    }
  );

  console.log(
    JSON.stringify(
      {
        deletedMedalTypes: medalDel.deletedCount,
        heroesUpdated: heroUpdate.modifiedCount,
        heroesMatched: heroUpdate.matchedCount,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
