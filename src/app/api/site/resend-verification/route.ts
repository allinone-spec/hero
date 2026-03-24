import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { generateEmailVerifyToken, sendSiteMemberVerificationEmail } from "@/lib/site-verification-email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email) {
      return NextResponse.json({ success: true, message: "If that account needs verification, we sent an email." });
    }

    await dbConnect();
    const user = await User.findOne({ email });
    if (!user || user.emailVerified !== false) {
      return NextResponse.json({ success: true, message: "If that account needs verification, we sent an email." });
    }

    const { raw, hash } = generateEmailVerifyToken();
    user.emailVerifyTokenHash = hash;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const { sent, verifyUrl } = await sendSiteMemberVerificationEmail(req, user.email, raw);

    const payload: {
      success: true;
      message: string;
      emailSent?: boolean;
      debugVerifyUrl?: string;
    } = {
      success: true,
      message: sent
        ? "Check your inbox for a new verification link."
        : "Verification email could not be sent. Try again later or contact support.",
    };
    if (sent) payload.emailSent = true;
    if (process.env.NODE_ENV === "development" && !sent) {
      payload.debugVerifyUrl = verifyUrl;
    }
    return NextResponse.json(payload);
  } catch (e) {
    console.error("resend-verification:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
