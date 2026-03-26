import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";

export async function GET(req: NextRequest) {
  try {
    await requirePrivilege("/admin/heroes", "canView");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const batchId = req.nextUrl.searchParams.get("batchId")?.trim() || "";

  await dbConnect();

  const match: Record<string, unknown> = {};
  if (batchId) match.batchId = batchId;

  const grouped = await CaretakerQueueItem.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {
    needs_review: 0,
    processing: 0,
    queued: 0,
    approved: 0,
    failed: 0,
    dismissed: 0,
  };
  let all = 0;
  for (const row of grouped) {
    const c = row.count;
    all += c;
    const key = row._id != null ? String(row._id) : "";
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] = c;
    }
  }

  return NextResponse.json({ counts, all });
}
