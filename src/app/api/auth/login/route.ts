import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createToken, getGroupSlugForUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await verifyCredentials(email, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Invalid credentials" }, { status: 401 });
    }

    const groupSlug = await getGroupSlugForUser(email.toLowerCase());
    const token = createToken(email.toLowerCase(), groupSlug);
    const isSuperAdmin = groupSlug === "super-admin";

    await logActivity({
      action: "login",
      category: "auth",
      description: `User logged in`,
      userEmail: email,
    });

    const isSecure = process.env.COOKIE_SECURE === "true" ||
      (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false");

    const response = NextResponse.json({ success: true, isSuperAdmin });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
