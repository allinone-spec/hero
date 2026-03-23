import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import War from "@/lib/models/War";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function GET() {
  await dbConnect();
  const wars = await War.find({}).sort({ startYear: 1 }).lean();
  return NextResponse.json(wars);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();

  try {
    const war = await War.create(body);
    await logActivity({
      action: "create",
      category: "system",
      description: `Created war "${war.name}"`,
      userEmail: session.email,
      targetId: war._id.toString(),
      targetName: war.name,
    });
    return NextResponse.json(war, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create war";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
