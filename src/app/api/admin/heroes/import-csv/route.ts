import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { requirePrivilege } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canCreate");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  let body: { csv?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = typeof body.csv === "string" ? body.csv.trim() : "";
  if (!csv) {
    return NextResponse.json({ error: "csv text required" }, { status: 400 });
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must include a header row and one data row" }, { status: 400 });
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => header.indexOf(name);

  const nameI = idx("name");
  if (nameI < 0) {
    return NextResponse.json({ error: 'Header must include a "name" column' }, { status: 400 });
  }

  const rankI = idx("rank");
  const branchI = idx("branch");
  const bioI = idx("biography");
  const warsI = idx("wars");
  const slugI = idx("slug");
  const countryI = idx("countrycode");
  const publishedI = idx("published");

  await dbConnect();

  let created = 0;
  const errors: string[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]);
    const name = cols[nameI]?.trim();
    if (!name) {
      errors.push(`Row ${r + 1}: missing name`);
      continue;
    }

    const slugRaw = slugI >= 0 ? cols[slugI]?.trim() : "";
    const slug = slugRaw || slugify(name);

    const exists = await Hero.findOne({ slug });
    if (exists) {
      errors.push(`Row ${r + 1}: slug "${slug}" already exists`);
      continue;
    }

    const warsCell = warsI >= 0 ? cols[warsI]?.trim() : "";
    const wars = warsCell
      ? warsCell.split(/[|;,]/).map((w) => w.trim()).filter(Boolean)
      : [];

    let published = false;
    if (publishedI >= 0) {
      const p = cols[publishedI]?.trim().toLowerCase();
      published = p === "true" || p === "1" || p === "yes";
    }

    try {
      await Hero.create({
        name,
        slug,
        rank: rankI >= 0 ? cols[rankI]?.trim() || "Unknown" : "Unknown",
        branch: branchI >= 0 ? cols[branchI]?.trim() || "U.S. Army" : "U.S. Army",
        biography: bioI >= 0 ? cols[bioI]?.trim() || "" : "",
        wars,
        countryCode: countryI >= 0 ? (cols[countryI]?.trim() || "US").toUpperCase() : "US",
        published,
        medals: [],
      });
      created++;
    } catch (err: unknown) {
      errors.push(`Row ${r + 1}: ${err instanceof Error ? err.message : "create failed"}`);
    }
  }

  await logActivity({
    action: "import",
    category: "hero",
    description: `Bulk CSV import: ${created} heroes created`,
    userEmail: session.email,
    metadata: { errors: errors.slice(0, 20) },
  });

  return NextResponse.json({
    created,
    errors,
  });
}
