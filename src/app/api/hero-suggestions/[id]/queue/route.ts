import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroSuggestion from "@/lib/models/HeroSuggestion";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import { getSession } from "@/lib/auth";
import { heroImportQueue } from "@/lib/queue";
import { extractHeroNameFromUrl } from "@/lib/hero-import-pipeline";
import { logActivity } from "@/lib/activity-logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.groupSlug !== "super-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const suggestion = await HeroSuggestion.findById(id);
    if (!suggestion) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (suggestion.status === "denied") {
      return NextResponse.json({ error: "Denied suggestions cannot be queued" }, { status: 400 });
    }

    const existing = await CaretakerQueueItem.findOne({
      sourceUrl: suggestion.wikipediaUrl,
      sourceType: "wikipedia",
      status: { $in: ["queued", "processing", "needs_review", "approved"] },
    }).lean();

    if (existing) {
      suggestion.status = "reviewed";
      suggestion.readByAdmin = true;
      await suggestion.save();
      return NextResponse.json({
        success: true,
        queueItemId: String(existing._id),
        alreadyQueued: true,
      });
    }

    const queueItem = await CaretakerQueueItem.create({
      sourceType: "wikipedia",
      status: "queued",
      sourceUrl: suggestion.wikipediaUrl,
      heroName: extractHeroNameFromUrl(suggestion.wikipediaUrl) || "",
      createdByEmail: session.email,
      rawRow: {
        wikipediaUrl: suggestion.wikipediaUrl,
        submittedBy: suggestion.submittedBy,
        submittedByEmail: suggestion.submittedByEmail,
        suggestionId: String(suggestion._id),
      },
    });

    await heroImportQueue.add(
      "import",
      {
        url: suggestion.wikipediaUrl,
        userEmail: session.email,
        queueItemId: String(queueItem._id),
      },
      { jobId: String(queueItem._id) }
    );

    suggestion.status = "reviewed";
    suggestion.readByAdmin = true;
    await suggestion.save();

    await logActivity({
      action: "queue",
      category: "hero",
      description: `Suggestion queued for caretaker review`,
      userEmail: session.email,
      targetId: String(queueItem._id),
      targetName: queueItem.heroName || suggestion.wikipediaUrl,
      metadata: {
        suggestionId: String(suggestion._id),
        wikipediaUrl: suggestion.wikipediaUrl,
      },
    });

    return NextResponse.json({
      success: true,
      queueItemId: String(queueItem._id),
      alreadyQueued: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to queue suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
