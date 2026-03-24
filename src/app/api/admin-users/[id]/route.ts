import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import Group from "@/lib/models/Group";
import { getSession } from "@/lib/auth";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await dbConnect();

  // Build update — only allow safe fields
  const update: Record<string, unknown> = {};
  if (body.name     !== undefined) update.name   = body.name;
  if (body.role     !== undefined) update.role   = body.role;
  if (body.group    !== undefined) update.group  = body.group || null;
  if (body.active   !== undefined) update.active = body.active;
  if (body.status   !== undefined) update.status = body.status;
  if (body.password !== undefined) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    update.passwordHash = await bcrypt.hash(body.password, 12);
  }

  const user = await AdminUser.findByIdAndUpdate(
    id,
    { $set: update },
    { returnDocument: "after", select: "-passwordHash" }
  ).populate("group", "name slug").lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await dbConnect();

  const user = await AdminUser.findById(id).populate("group").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent deleting yourself
  if (user.email === session.email) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Prevent deleting the last super-admin group member
  const group = user.group as unknown as { slug?: string } | null;
  if (group?.slug === "super-admin") {
    const superAdminGroup = await Group.findOne({ slug: "super-admin" });
    if (superAdminGroup) {
      const superAdminCount = await AdminUser.countDocuments({ group: superAdminGroup._id, active: true });
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last super-admin user" }, { status: 400 });
      }
    }
  }

  await AdminUser.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
