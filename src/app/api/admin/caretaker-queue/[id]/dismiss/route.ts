import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import { logActivity } from "@/lib/activity-logger";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canEdit");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id } = await params;
  await dbConnect();
  const item = await CaretakerQueueItem.findByIdAndUpdate(
    id,
    { status: "dismissed" },
    { new: true }
  );
  if (!item) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  await logActivity({
    action: "dismiss",
    category: "hero",
    description: `Caretaker queue dismissed: ${item.heroName || "Unnamed hero"}`,
    userEmail: session.email,
    targetId: id,
    targetName: item.heroName,
    metadata: { sourceUrl: item.sourceUrl || "" },
  });

  return NextResponse.json({ ok: true });
}
