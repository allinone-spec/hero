import { Buffer } from "buffer";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import HeroImportBatch from "@/lib/models/HeroImportBatch";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import { heroImportQueue } from "@/lib/queue";
import { requirePrivilege } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { uniqueHeroSlug } from "@/lib/caretaker-queue";

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

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cols[i]?.trim() || "";
    return row;
  });
}

function parseWorkbookRows(base64: string): Record<string, string>[] {
  const buf = Buffer.from(base64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) out[normalizeHeader(k)] = String(v ?? "").trim();
    return out;
  });
}

function pickUrl(row: Record<string, string>): string {
  return row.wikipedia_url || row.wiki_url || row.url || "";
}

function splitWars(raw: string): string[] {
  return raw ? raw.split(/[|;,]/).map((w) => w.trim()).filter(Boolean) : [];
}

function deriveBatchStatus(
  batchStatus: string,
  items: Array<{ status: string }>
): string {
  if (items.length === 0) return batchStatus;
  if (items.some((item) => item.status === "queued" || item.status === "processing")) {
    return "processing";
  }
  if (items.some((item) => item.status === "failed")) {
    return "completed_with_errors";
  }
  return "completed";
}

export async function GET() {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canView");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
  void session;

  await dbConnect();
  const batches = await HeroImportBatch.find({}).sort({ createdAt: -1 }).limit(30).lean();
  const normalized = await Promise.all(
    batches.map(async (b) => {
      const items = await CaretakerQueueItem.find({ batchId: b._id })
        .select("status")
        .lean<Array<{ status: string }>>();
      const status = deriveBatchStatus(b.status, items);
      if (status !== b.status) {
        await HeroImportBatch.findByIdAndUpdate(b._id, { status }).catch(() => undefined);
      }
      return {
      id: String(b._id),
      filename: b.filename,
      sourceType: b.sourceType,
      status,
      totalRows: b.totalRows,
      queuedRows: b.queuedRows,
      directCreatedRows: b.directCreatedRows,
      reviewRows: b.reviewRows,
      approvedRows: b.approvedRows,
      failedRows: b.failedRows,
      createdByEmail: b.createdByEmail,
      createdAt: b.createdAt,
      };
    })
  );
  return NextResponse.json(normalized);
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

  let body: { csv?: string; base64?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = typeof body.csv === "string" ? body.csv.trim() : "";
  const base64 = typeof body.base64 === "string" ? body.base64.trim() : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "bulk-import";
  const sourceType = /\.xlsx$/i.test(filename) ? "xlsx" : "csv";
  const rows = base64 ? parseWorkbookRows(base64) : parseCsvRows(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No import rows found" }, { status: 400 });
  }

  await dbConnect();
  const batch = await HeroImportBatch.create({
    sourceType,
    filename,
    status: "queued",
    createdByEmail: session.email,
    totalRows: rows.length,
  });

  let queuedRows = 0;
  let directCreatedRows = 0;
  let failedRows = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const name = (row.name || "").trim();
    if (!name) {
      failedRows++;
      errors.push(`Row ${idx + 2}: missing name`);
      continue;
    }
    const sourceUrl = pickUrl(row);
    if (sourceUrl) {
      const queueItem = await CaretakerQueueItem.create({
        batchId: batch._id,
        sourceType,
        status: "queued",
        sourceUrl,
        heroName: name,
        createdByEmail: session.email,
        rawRow: row,
      });
      await heroImportQueue.add(
        "import",
        {
          url: sourceUrl,
          userEmail: session.email,
          queueItemId: String(queueItem._id),
          batchId: String(batch._id),
        },
        { jobId: String(queueItem._id) }
      );
      queuedRows++;
      continue;
    }

    try {
      const slug = await uniqueHeroSlug(name);
      await Hero.create({
        name,
        slug,
        wikiUrl: "",
        rank: row.rank || "Unknown",
        branch: row.branch || "U.S. Army",
        biography: row.biography || "",
        wars: splitWars(row.wars || ""),
        countryCode: (row.countrycode || row.country || "US").toUpperCase(),
        published: /^(true|1|yes)$/i.test(row.published || ""),
        medals: [],
        metadataTags: [],
        isVerified: false,
      });
      directCreatedRows++;
    } catch (err: unknown) {
      failedRows++;
      errors.push(`Row ${idx + 2}: ${err instanceof Error ? err.message : "create failed"}`);
    }
  }

  const status =
    failedRows > 0
      ? "completed_with_errors"
      : queuedRows > 0
        ? "processing"
        : "completed";

  await HeroImportBatch.findByIdAndUpdate(batch._id, {
    queuedRows,
    directCreatedRows,
    failedRows,
    status,
    notes: errors.slice(0, 20).join("\n"),
  });

  await logActivity({
    action: "import",
    category: "hero",
    description: `Bulk ${sourceType.toUpperCase()} import started (${rows.length} rows)`,
    userEmail: session.email,
    targetId: String(batch._id),
    targetName: filename,
    metadata: { queuedRows, directCreatedRows, failedRows, errors: errors.slice(0, 20) },
  });

  return NextResponse.json({
    batchId: String(batch._id),
    totalRows: rows.length,
    queuedRows,
    directCreatedRows,
    failedRows,
    errors,
  });
}
