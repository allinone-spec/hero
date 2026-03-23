import { NextRequest, NextResponse } from "next/server";
import { getSession, requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Menu from "@/lib/models/Menu";
import Group from "@/lib/models/Group";
import GroupPrivilege from "@/lib/models/GroupPrivilege";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const menus = await Menu.find().sort({ sortOrder: 1 }).lean();
    return NextResponse.json(menus);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePrivilege("/admin/menus", "canCreate");
    void session;

    const { name, path, label, icon, section, sortOrder } = await req.json();
    if (!name?.trim() || !path?.trim() || !label?.trim() || !section?.trim()) {
      return NextResponse.json({ error: "name, path, label, and section are required" }, { status: 400 });
    }

    await dbConnect();

    const exists = await Menu.findOne({ $or: [{ name: name.trim() }, { path: path.trim() }] });
    if (exists) {
      return NextResponse.json({ error: "A menu with that name or path already exists" }, { status: 409 });
    }

    const menu = await Menu.create({
      name: name.trim(),
      path: path.trim(),
      label: label.trim(),
      icon: icon?.trim() || "",
      section: section.trim(),
      sortOrder: sortOrder ?? 0,
    });

    // Auto-create super-admin privilege for the new menu
    const superAdminGroup = await Group.findOne({ slug: "super-admin" });
    if (superAdminGroup) {
      await GroupPrivilege.updateOne(
        { group: superAdminGroup._id, menu: menu._id },
        {
          $setOnInsert: {
            group: superAdminGroup._id,
            menu: menu._id,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json(menu, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
