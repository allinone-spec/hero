import { NextRequest, NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/lib/models/Group";
import AdminUser from "@/lib/models/AdminUser";

export async function GET() {
  try {
    const session = await requirePrivilege("/admin/groups", "canView");
    void session;

    await dbConnect();
    const groups = await Group.find().sort({ createdAt: 1 }).lean();

    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const userCount = await AdminUser.countDocuments({ group: g._id });
        return { ...g, userCount };
      })
    );

    return NextResponse.json(groupsWithCount);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePrivilege("/admin/groups", "canCreate");
    void session;

    const { name, slug: rawSlug, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await dbConnect();

    const slug = (rawSlug?.trim() || name.trim())
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const exists = await Group.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (exists) {
      return NextResponse.json({ error: "A group with that name or slug already exists" }, { status: 409 });
    }

    const group = await Group.create({
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      isSystem: false,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
