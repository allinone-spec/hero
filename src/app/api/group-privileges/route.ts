import { NextRequest, NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Menu from "@/lib/models/Menu";
import Group from "@/lib/models/Group";
import GroupPrivilege from "@/lib/models/GroupPrivilege";

export async function GET(req: NextRequest) {
  try {
    const session = await requirePrivilege("/admin/group-privileges", "canView");
    void session;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    await dbConnect();

    const group = await Group.findById(groupId).lean();
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const allMenus = await Menu.find().sort({ sortOrder: 1 }).lean();
    const privileges = await GroupPrivilege.find({ group: groupId }).lean();

    const privMap = new Map(privileges.map((p) => [p.menu.toString(), p]));

    const matrix = allMenus.map((menu) => ({
      menu,
      privilege: privMap.get(menu._id.toString()) || null,
    }));

    return NextResponse.json(matrix);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePrivilege("/admin/group-privileges", "canCreate");
    void session;

    const { groupId, menuId, canView, canCreate, canEdit, canDelete } = await req.json();
    if (!groupId || !menuId) {
      return NextResponse.json({ error: "groupId and menuId are required" }, { status: 400 });
    }

    await dbConnect();

    const group = await Group.findById(groupId).lean();
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const priv = await GroupPrivilege.findOneAndUpdate(
      { group: groupId, menu: menuId },
      { canView: !!canView, canCreate: !!canCreate, canEdit: !!canEdit, canDelete: !!canDelete },
      { upsert: true, new: true }
    );

    return NextResponse.json(priv, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
