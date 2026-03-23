import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import AdminUser from "@/lib/models/AdminUser";
import { Resend } from "resend";

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const role = body.role === "member" ? "member" : "admin";

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    const normalized = email.toLowerCase();

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    if (role === "member") {
      const user = await User.findOne({ email: normalized });
      if (!user) {
        return NextResponse.json({
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = expires;
      await user.save();
    } else {
      const user = await AdminUser.findOne({ email: normalized });
      if (!user) {
        return NextResponse.json({
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = expires;
      await user.save();
    }

    const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM || "Medals N Bongs <support@medalsnbongs.com>",
          to: email,
          subject: "Reset your Medals N Bongs password",
          html: `
        <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f9fafb">
      <div style="max-width:580px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="background:#4f46e5;color:white;text-align:center;padding:30px;font-size:24px;font-weight:bold">🎖️ Medals N Bongs</div>
        <div style="padding:40px 30px;text-align:center">
          <h1 style="font-size:22px;margin-bottom:20px">Reset your password</h1>
          <p style="font-size:16px;color:#374151;line-height:1.6">
            We received a request to reset your password. Click the button below. This link expires in one hour.
          </p>
          <div style="margin:30px 0">
            <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
              Reset password
            </a>
          </div>
          <p style="font-size:14px;color:#6b7280;word-break:break-all">
            If the button does not work, copy and paste: <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
        <div style="padding:20px 30px;font-size:13px;color:#9ca3af;text-align:center">
          If you did not request this, you can ignore this email.
        </div>
      </div>
      </body>
      </html>
      `,
        });
      } catch (err) {
        console.error("Forgot-password email error:", err);
      }
    } else {
      console.info("Password reset URL (no RESEND_API_KEY):", resetUrl);
    }

    const payload: { message: string; debugUrl?: string } = {
      message: "If an account with that email exists, a password reset link has been sent.",
    };
    if (process.env.NODE_ENV === "development") {
      payload.debugUrl = resetUrl;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
