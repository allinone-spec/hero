import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import HeroImportBatch from "@/lib/models/HeroImportBatch";
import { logActivity } from "@/lib/activity-logger";

/** Hard-delete an approved queue row; keeps the draft hero unless deleted separately. */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canDelete");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id } = await params;
  await dbConnect();
  const item = await CaretakerQueueItem.findById(id);
  if (!item) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }
  if (item.status !== "approved") {
    return NextResponse.json(
      {
        error:
          "Only approved queue items can be deleted here. Use Dismiss for items still in review or other statuses.",
      },
      { status: 400 }
    );
  }

  if (item.batchId) {
    await HeroImportBatch.findByIdAndUpdate(item.batchId, [
      { $set: { approvedRows: { $max: [0, { $subtract: ["$approvedRows", 1] }] } } },
    ]);
  }

  await CaretakerQueueItem.findByIdAndDelete(id);

  await logActivity({
    action: "delete",
    category: "hero",
    description: `Caretaker queue entry deleted (approved): ${item.heroName || item.importResult?.name || "Unnamed hero"}`,
    userEmail: session.email,
    targetId: id,
    targetName: item.heroName,
    metadata: {
      sourceUrl: item.sourceUrl || "",
      createdHeroId: item.createdHeroId ? String(item.createdHeroId) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
