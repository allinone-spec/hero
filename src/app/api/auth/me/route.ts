import { NextResponse } from "next/server";
import { getSession, ensureSeedAdmin } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import Menu from "@/lib/models/Menu";
import Group from "@/lib/models/Group";
import GroupPrivilege from "@/lib/models/GroupPrivilege";
import type { IMenu } from "@/lib/models/Menu";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: noStore });
  }

  await dbConnect();
  await ensureSeedAdmin();

  const user = await AdminUser.findOne(
    { email: session.email },
    { name: 1, email: 1, group: 1 }
  ).lean();

  const isSuperAdmin = session.groupSlug === "super-admin";

  const group = await Group.findOne({ slug: session.groupSlug }).lean();
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 403, headers: noStore });
  }

  const privileges = await GroupPrivilege.find({ group: group._id, canView: true })
    .populate("menu")
    .lean();

  const accessibleMenus = privileges
    .filter((p) => p.menu)
    .sort((a, b) => {
      const ma = a.menu as unknown as IMenu;
      const mb = b.menu as unknown as IMenu;
      return ma.sortOrder - mb.sortOrder;
    })
    .map((p) => {
      const m = p.menu as unknown as IMenu;
      return {
        path: m.path,
        label: m.label,
        section: m.section,
        sortOrder: m.sortOrder,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      };
    });

  return NextResponse.json(
    {
      email: session.email,
      name: (user as { name?: string } | null)?.name || "Admin",
      groupSlug: session.groupSlug,
      isSuperAdmin,
      accessibleMenus,
    },
    { headers: noStore },
  );
}
