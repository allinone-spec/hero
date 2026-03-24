import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { createSiteUserToken, setSiteUserCookie } from "@/lib/site-auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await user.comparePassword(String(password));
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.emailVerified === false) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before signing in. Check your inbox for the link, or use “Resend verification” below.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const token = createSiteUserToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role === "owner" ? "owner" : "user",
    });

    await logActivity({
      action: "login",
      category: "auth",
      description: "Site member logged in",
      userEmail: user.email,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
    setSiteUserCookie(response, token);
    return response;
  } catch (err) {
    console.error("Site login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
