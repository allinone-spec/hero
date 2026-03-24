import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import HeroImportBatch from "@/lib/models/HeroImportBatch";
import { createHeroFromImportResult } from "@/lib/caretaker-queue";
import { logActivity } from "@/lib/activity-logger";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canCreate");
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
  if (!item.importResult || item.status === "approved") {
    return NextResponse.json({ error: "Queue item is not ready to approve" }, { status: 400 });
  }

  const hero = await createHeroFromImportResult({
    result: item.importResult as Record<string, unknown>,
    sourceUrl: item.sourceUrl || "",
  });

  item.status = "approved";
  item.createdHeroId = hero._id;
  item.error = "";
  await item.save();

  if (item.batchId) {
    await HeroImportBatch.findByIdAndUpdate(item.batchId, { $inc: { approvedRows: 1 } });
  }

  await logActivity({
    action: "approve",
    category: "hero",
    description: `Caretaker queue approved: ${hero.name}`,
    userEmail: session.email,
    targetId: String(hero._id),
    targetName: hero.name,
    metadata: { queueItemId: id, sourceUrl: item.sourceUrl || "" },
  });

  return NextResponse.json({ ok: true, heroId: String(hero._id), heroSlug: hero.slug });
}
