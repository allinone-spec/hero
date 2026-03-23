import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import War from "@/lib/models/War";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  try {
    const war = await War.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!war) {
      return NextResponse.json({ error: "War not found" }, { status: 404 });
    }
    await logActivity({
      action: "update",
      category: "system",
      description: `Updated war "${war.name}"`,
      userEmail: session.email,
      targetId: war._id.toString(),
      targetName: war.name,
    });
    return NextResponse.json(war);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update war";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  const war = await War.findByIdAndDelete(id);
  if (!war) {
    return NextResponse.json({ error: "War not found" }, { status: 404 });
  }

  await logActivity({
    action: "delete",
    category: "system",
    description: `Deleted war "${war.name}"`,
    userEmail: session.email,
    targetId: id,
    targetName: war.name,
  });

  return NextResponse.json({ success: true });
}
