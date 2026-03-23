import { NextRequest, NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/lib/models/Group";
import GroupPrivilege from "@/lib/models/GroupPrivilege";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePrivilege("/admin/group-privileges", "canEdit");
    void session;

    const { id } = await params;
    await dbConnect();

    const priv = await GroupPrivilege.findById(id).populate("group").lean();
    if (!priv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { canView, canCreate, canEdit, canDelete } = await req.json();
    const updates: Record<string, boolean> = {};
    if (canView !== undefined) updates.canView = !!canView;
    if (canCreate !== undefined) updates.canCreate = !!canCreate;
    if (canEdit !== undefined) updates.canEdit = !!canEdit;
    if (canDelete !== undefined) updates.canDelete = !!canDelete;

    const updated = await GroupPrivilege.findByIdAndUpdate(id, updates, { new: true }).lean();
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
