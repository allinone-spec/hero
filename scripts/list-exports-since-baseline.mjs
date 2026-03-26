import { execSync } from "node:child_process";
import fs from "node:fs";

const BASELINE = process.argv[2] ?? "803f38e";
const pathSpec = process.argv[3] ?? "src/lib/";

const files = execSync(`git diff --name-only ${BASELINE}..HEAD -- ${pathSpec}`, {
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .sort();

const blocks = [];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  const syms = [];
  for (const line of lines) {
    let m;
    if ((m = line.match(/^export\s+async\s+function\s+(\w+)/)))
      syms.push(`${m[1]}() — async function`);
    else if ((m = line.match(/^export\s+function\s+(\w+)/)))
      syms.push(`${m[1]}() — function`);
    else if ((m = line.match(/^export\s+const\s+(\w+)\s*=/)))
      syms.push(`${m[1]} — const`);
    else if ((m = line.match(/^export\s+class\s+(\w+)/)))
      syms.push(`class ${m[1]}`);
    else if ((m = line.match(/^export\s+type\s+(\w+)/)))
      syms.push(`type ${m[1]}`);
    else if ((m = line.match(/^export\s+interface\s+(\w+)/)))
      syms.push(`interface ${m[1]}`);
    else if ((m = line.match(/^export\s+enum\s+(\w+)/)))
      syms.push(`enum ${m[1]}`);
  }
  const uniq = [...new Set(syms)];
  if (uniq.length) blocks.push({ file: f, syms: uniq });
}

console.log(JSON.stringify({ baseline: BASELINE, pathSpec, blocks }, null, 2));
