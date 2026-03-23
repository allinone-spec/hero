import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession, getEffectivePermissionLevel } from "@/lib/auth";
import PagePermission from "@/lib/models/PagePermission";
import AdminUser from "@/lib/models/AdminUser";

async function requireLevel1(session: { email: string }) {
  const user = await AdminUser.findOne({ email: session.email }).lean();
  return user && getEffectivePermissionLevel(user) === 1;
}

// PATCH — update a page's requiredLevel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  if (!(await requireLevel1(session))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const { requiredLevel } = await req.json();

  if (requiredLevel == null || requiredLevel < 0 || requiredLevel > 10) {
    return NextResponse.json({ error: "Required level must be between 0 and 10" }, { status: 400 });
  }

  const page = await PagePermission.findByIdAndUpdate(
    id,
    { requiredLevel },
    { new: true }
  );

  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json(page);
}

// DELETE — remove a page permission (non-system only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  if (!(await requireLevel1(session))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const page = await PagePermission.findById(id);

  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (page.isSystem) {
    return NextResponse.json({ error: "System pages cannot be deleted" }, { status: 400 });
  }

  await page.deleteOne();
  return NextResponse.json({ success: true });
}
