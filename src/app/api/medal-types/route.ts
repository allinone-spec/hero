import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

/**
 * Optional `countryCode` (e.g. US): returns that country's medals first (by precedence), then all others.
 * Omits filter when absent — full catalog for admin.
 */
export async function GET(req: NextRequest) {
  await dbConnect();
  const cc = req.nextUrl.searchParams.get("countryCode")?.trim().toUpperCase();
  const all = await MedalType.find({}).sort({ precedenceOrder: 1 }).lean();
  if (!cc) {
    return NextResponse.json(all);
  }
  const primary = all.filter((m) => String(m.countryCode || "US").toUpperCase() === cc);
  const rest = all.filter((m) => String(m.countryCode || "US").toUpperCase() !== cc);
  return NextResponse.json([...primary, ...rest]);
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
