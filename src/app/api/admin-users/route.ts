import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import Group from "@/lib/models/Group";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const query = statusFilter ? { status: statusFilter } : {};
  const users = await AdminUser.find(query, { passwordHash: 0 })
    .populate("group", "name slug")
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, password, role, groupId } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  await dbConnect();

  const exists = await AdminUser.findOne({ email: email.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Resolve group: use provided groupId or fall back to default-group
  let resolvedGroupId = groupId || null;
  if (!resolvedGroupId) {
    const defaultGroup = await Group.findOne({ slug: "default-group" });
    resolvedGroupId = defaultGroup?._id || null;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await AdminUser.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || "admin",
    group: resolvedGroupId,
    active: true,
    status: "active",
  });

  const { passwordHash: _ph, ...safe } = user.toObject();
  void _ph;
  return NextResponse.json(safe, { status: 201 });
}
