import { NextRequest, NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/lib/models/Group";
import AdminUser from "@/lib/models/AdminUser";
import GroupPrivilege from "@/lib/models/GroupPrivilege";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePrivilege("/admin/groups", "canView");
    void session;

    const { id } = await params;
    await dbConnect();

    const group = await Group.findById(id).lean();
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const users = await AdminUser.find({ group: id }, { name: 1, email: 1, status: 1, active: 1 }).lean();
    return NextResponse.json({ ...group, users });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePrivilege("/admin/groups", "canEdit");
    void session;

    const { id } = await params;
    const { name, description } = await req.json();

    await dbConnect();

    const group = await Group.findById(id);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates: Record<string, string> = {};
    if (name?.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    const updated = await Group.findByIdAndUpdate(id, updates, { returnDocument: "after" }).lean();
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePrivilege("/admin/groups", "canDelete");
    void session;

    const { id } = await params;
    await dbConnect();

    const group = await Group.findById(id);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (group.isSystem) {
      return NextResponse.json({ error: "Cannot delete system groups" }, { status: 400 });
    }

    // Move users to default-group
    const defaultGroup = await Group.findOne({ slug: "default-group" });
    if (defaultGroup) {
      await AdminUser.updateMany({ group: id }, { $set: { group: defaultGroup._id } });
    }

    // Cascade delete group privileges
    await GroupPrivilege.deleteMany({ group: id });

    await Group.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
