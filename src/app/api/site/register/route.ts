import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { generateEmailVerifyToken, sendSiteMemberVerificationEmail } from "@/lib/site-verification-email";

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
      if (exists.emailVerified === false) {
        const { raw, hash } = generateEmailVerifyToken();
        exists.emailVerifyTokenHash = hash;
        exists.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await exists.save();
        const emailResult = await sendSiteMemberVerificationEmail(req, normalized, raw);
        const payload: {
          success: true;
          pendingVerification: true;
          emailSent: boolean;
          debugVerifyUrl?: string;
        } = {
          success: true,
          pendingVerification: true,
          emailSent: emailResult.sent,
        };
        if (process.env.NODE_ENV === "development" && !emailResult.sent) {
          payload.debugVerifyUrl = emailResult.verifyUrl;
        }
        return NextResponse.json(payload, { status: 200 });
      }
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

    const { raw, hash } = generateEmailVerifyToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.create({
      name: String(name).trim(),
      email: normalized,
      password,
      role: "user",
      agreedToTermsAt: new Date(),
      emailVerified: false,
      emailVerifyTokenHash: hash,
      emailVerifyExpires: expires,
    });

    const emailResult = await sendSiteMemberVerificationEmail(req, normalized, raw);

    const payload: {
      success: true;
      pendingVerification: true;
      emailSent: boolean;
      debugVerifyUrl?: string;
    } = {
      success: true,
      pendingVerification: true,
      emailSent: emailResult.sent,
    };
    if (process.env.NODE_ENV === "development" && !emailResult.sent) {
      payload.debugVerifyUrl = emailResult.verifyUrl;
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error("Site register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
