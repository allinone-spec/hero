import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, agreedToTerms } = await req.json();
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (!agreedToTerms) {
      return NextResponse.json({ error: "You must agree to the Terms of Engagement" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await dbConnect();
    const normalized = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normalized });
    if (exists) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

    await User.create({
      name: String(name).trim(),
      email: normalized,
      password,
      role: "user",
      agreedToTermsAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Site register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
