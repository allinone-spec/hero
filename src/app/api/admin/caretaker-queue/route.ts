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

  const statusFilter = req.nextUrl.searchParams.get("status");
  const batchId = req.nextUrl.searchParams.get("batchId");
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));

  await dbConnect();
  const query: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "all") query.status = statusFilter;
  if (batchId) query.batchId = batchId;

  const items = await CaretakerQueueItem.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(
    items.map((item) => ({
      id: String(item._id),
      batchId: item.batchId ? String(item.batchId) : null,
      heroName: item.heroName,
      status: item.status,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl || "",
      error: item.error || "",
      rawRow: item.rawRow || null,
      importResult: item.importResult || null,
      unmatchedMedals: Array.isArray(item.unmatchedMedals) ? item.unmatchedMedals : [],
      createdHeroId: item.createdHeroId ? String(item.createdHeroId) : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
  );
}
