import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroSuggestion from "@/lib/models/HeroSuggestion";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  try {
    await dbConnect();
    const [suggestionCount, caretakerCount] = await Promise.all([
      HeroSuggestion.countDocuments({ status: "new", readByAdmin: { $ne: true } }),
      CaretakerQueueItem.countDocuments({ status: "needs_review" }),
    ]);
    const count = suggestionCount + caretakerCount;
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
