import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ScoringConfig from "@/lib/models/ScoringConfig";
import { getSession } from "@/lib/auth";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring-engine";

export async function GET() {
  await dbConnect();
  const config = await ScoringConfig.findOne({ key: "default" }).lean();
  return NextResponse.json(config ?? { ...DEFAULT_SCORING_CONFIG, key: "default" });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();

  const updated = await ScoringConfig.findOneAndUpdate(
    { key: "default" },
    { ...body, key: "default" },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  return NextResponse.json(updated);
}
