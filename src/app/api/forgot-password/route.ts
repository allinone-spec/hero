import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '../../../lib/mongodb';
import { User } from '../../../lib/models/User';
import { Resend } from 'resend';
import AdminUser from '@/lib/models/AdminUser';

const resend = new Resend("re_D2QU82gj_EZAC9w33Gg24m1XCkyDMDAwX");

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await AdminUser.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'medalsnbongs.com';

    const resetUrl = `medalsnbongs.com/reset-password?token=${token}`;

    console.info('Password reset URL:', resetUrl);

    try {
      const response = await resend.emails.send({
        from: "Medals N Bongs <support@medalsnbongs.com>",
        to: email,
        subject: "Reset Your Password",
        html: `
        <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f9fafb">
      <div style="max-width:580px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="background:#4f46e5;color:white;text-align:center;padding:30px;font-size:24px;font-weight:bold">🎖️Medals N Bongs</div>
        <div style="padding:40px 30px;text-align:center">
          <h1 style="font-size:22px;margin-bottom:20px">Reset Your Password</h1>
          <p style="font-size:16px;color:#374151;line-height:1.6">
            We received a request to reset your password. Click the button below to create a new password. This link is valid for 30 minutes.
          </p>
          <div style="margin:30px 0">
            <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
              Reset Password
            </a>
          </div>
          <p style="font-size:14px;color:#6b7280;word-break:break-all">
            If the button doesn’t work, copy and paste this link: <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
        <div style="padding:20px 30px;font-size:13px;color:#9ca3af;text-align:center">
          If you didn’t request this password reset, you can safely ignore this email.
        </div>
      </div>
      </body>
      </html>
      `
      });

      console.log(response);
    } catch (error) {
      console.error("Email error:", error);
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a password reset link has been sent.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}