/**
 * Load .env.local BEFORE any module that reads MONGODB_URI at import time.
 * Static `import "../src/lib/mongodb"` is hoisted and would run too early.
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
    /* missing .env.local — rely on shell env */
  }
}

loadEnvLocal();

async function main() {
  const { default: dbConnect } = await import("../src/lib/mongodb");
  const { importMedalInventoryFromDir } = await import("../src/lib/medal-inventory-importer");

  await dbConnect();
  const dir = path.join(process.cwd(), "data", "medal-inventory");
  const result = await importMedalInventoryFromDir(dir);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.errors.length > 0 && result.upserted === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
