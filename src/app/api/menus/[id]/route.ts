import { NextRequest, NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Menu from "@/lib/models/Menu";
import GroupPrivilege from "@/lib/models/GroupPrivilege";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePrivilege("/admin/menus", "canEdit");
    void session;

    const { id } = await params;
    const { label, icon, section, sortOrder } = await req.json();

    await dbConnect();

    const menu = await Menu.findById(id);
    if (!menu) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // name and path are immutable after creation
    const updates: Record<string, string | number> = {};
    if (label?.trim()) updates.label = label.trim();
    if (icon !== undefined) updates.icon = icon.trim();
    if (section?.trim()) updates.section = section.trim();
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);

    const updated = await Menu.findByIdAndUpdate(id, updates, { new: true }).lean();
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
    const session = await requirePrivilege("/admin/menus", "canDelete");
    void session;

    const { id } = await params;
    await dbConnect();

    const menu = await Menu.findById(id);
    if (!menu) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascade delete all privileges for this menu
    await GroupPrivilege.deleteMany({ menu: id });
    await Menu.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
