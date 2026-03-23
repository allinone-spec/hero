import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function GET() {
  await dbConnect();
  const medalTypes = await MedalType.find({}).sort({ precedenceOrder: 1 }).lean();
  return NextResponse.json(medalTypes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();

  try {
    const medalType = await MedalType.create(body);
    await logActivity({
      action: "create",
      category: "medal",
      description: `Created medal type "${medalType.name}"`,
      userEmail: session.email,
      targetId: medalType._id.toString(),
      targetName: medalType.name,
    });
    return NextResponse.json(medalType, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create medal type";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
