import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession, getEffectivePermissionLevel } from "@/lib/auth";
import AdminUser from "@/lib/models/AdminUser";

// PATCH — update a user's permissionLevel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const admin = await AdminUser.findOne({ email: session.email }).lean();
  if (!admin || getEffectivePermissionLevel(admin) !== 1) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const { permissionLevel } = await req.json();

  if (permissionLevel == null || permissionLevel < 1 || permissionLevel > 10) {
    return NextResponse.json({ error: "Permission level must be between 1 and 10" }, { status: 400 });
  }

  const user = await AdminUser.findByIdAndUpdate(
    id,
    { permissionLevel },
    { new: true, projection: { name: 1, email: 1, role: 1, permissionLevel: 1, active: 1, status: 1 } }
  );

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
