import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import HeroImportBatch from "@/lib/models/HeroImportBatch";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";

function deriveBatchStatus(items: Array<{ status: string }>, batchStatus: string) {
  if (items.length === 0) return batchStatus;
  if (items.some((item) => item.status === "failed")) return "completed_with_errors";
  if (items.some((item) => item.status === "queued" || item.status === "processing")) return "processing";
  return "completed";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePrivilege("/admin/heroes", "canView");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id } = await params;
  await dbConnect();
  const batch = await HeroImportBatch.findById(id).lean();
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }
  const items = await CaretakerQueueItem.find({ batchId: id }).sort({ createdAt: -1 }).lean();
  const computedStatus = deriveBatchStatus(items, batch.status);

  if (computedStatus !== batch.status) {
    await HeroImportBatch.findByIdAndUpdate(id, { status: computedStatus });
  }

  return NextResponse.json({
    batch: {
      id: String(batch._id),
      filename: batch.filename,
      sourceType: batch.sourceType,
      status: computedStatus,
      totalRows: batch.totalRows,
      queuedRows: batch.queuedRows,
      directCreatedRows: batch.directCreatedRows,
      reviewRows: batch.reviewRows,
      approvedRows: batch.approvedRows,
      failedRows: batch.failedRows,
      notes: batch.notes || "",
      createdByEmail: batch.createdByEmail,
      createdAt: batch.createdAt,
    },
    items: items.map((item) => ({
      id: String(item._id),
      heroName: item.heroName,
      status: item.status,
      sourceUrl: item.sourceUrl || "",
      error: item.error || "",
      createdHeroId: item.createdHeroId ? String(item.createdHeroId) : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
}
