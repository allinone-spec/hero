import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import AdminUser from "@/lib/models/AdminUser";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long" }, { status: 400 });
    }

    await dbConnect();

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const now = new Date();

    const admin = await AdminUser.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: now },
    });

    if (admin) {
      admin.passwordHash = await bcrypt.hash(newPassword, 12);
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save();
      return NextResponse.json({ message: "Password has been reset successfully" }, { status: 200 });
    }

    const siteUser = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: now },
    });

    if (siteUser) {
      siteUser.password = newPassword;
      siteUser.resetPasswordToken = undefined;
      siteUser.resetPasswordExpires = undefined;
      await siteUser.save();
      return NextResponse.json({ message: "Password has been reset successfully" }, { status: 200 });
    }

    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "An error occurred. Please try again." }, { status: 500 });
  }
}
