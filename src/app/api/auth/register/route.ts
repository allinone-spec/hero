import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import Group from "@/lib/models/Group";

export async function POST(req: NextRequest) {
  const { name, email, password, note, agreedToTerms } = await req.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (!agreedToTerms) {
    return NextResponse.json({ error: "You must agree to the Terms of Engagement" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  await dbConnect();

  const exists = await AdminUser.findOne({ email: email.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  // Auto-assign default-group
  const defaultGroup = await Group.findOne({ slug: "default-group" });

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "editor",
    group: defaultGroup?._id || null,
    active: false,
    status: "pending",
    note: note?.trim() || "",
    agreedToTermsAt: new Date(),
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
