import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { User } from "@/lib/models/User";
import Hero from "@/lib/models/Hero";
import mongoose from "mongoose";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (session.groupSlug !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  return null;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400, headers: noStore });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const role = body.role === "owner" || body.role === "user" ? body.role : undefined;
  const password = typeof body.password === "string" && body.password.length > 0 ? body.password : undefined;

  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400, headers: noStore });
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (password) user.password = password;

  await user.save();

  const adoptedHeroCount = await Hero.countDocuments({ ownerUserId: user._id });
  const obj = user.toObject();
  delete (obj as { password?: string }).password;

  return NextResponse.json(
    { ...obj, _id: String(user._id), adoptedHeroCount },
    { headers: noStore }
  );
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400, headers: noStore });
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });

  await Hero.updateMany({ ownerUserId: user._id }, { $set: { ownerUserId: null } });
  await User.deleteOne({ _id: user._id });

  return NextResponse.json({ success: true }, { headers: noStore });
}
