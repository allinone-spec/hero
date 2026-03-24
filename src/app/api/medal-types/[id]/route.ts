import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await dbConnect();
  const medalType = await MedalType.findById(id).lean();
  if (!medalType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(medalType);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  const body = await req.json();

  try {
    const updated = await MedalType.findByIdAndUpdate(id, body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await logActivity({
      action: "update",
      category: "medal",
      description: `Updated medal type "${updated.name}"`,
      userEmail: session.email,
      targetId: id,
      targetName: updated.name,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  const deleted = await MedalType.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await logActivity({
    action: "delete",
    category: "medal",
    description: `Deleted medal type "${deleted.name}"`,
    userEmail: session.email,
    targetId: id,
    targetName: deleted.name,
  });
  return NextResponse.json({ success: true });
}
