import crypto from "crypto";
import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getResendFrom } from "@/lib/resend-from";

export function generateEmailVerifyToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export async function sendSiteMemberVerificationEmail(
  req: NextRequest,
  toEmail: string,
  rawToken: string
): Promise<{ sent: boolean; verifyUrl: string }> {
  const origin = getPublicSiteUrl(req);
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(rawToken)}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.info("[site register] Verify email URL (no RESEND_API_KEY):", verifyUrl);
    return { sent: false, verifyUrl };
  }

  try {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: getResendFrom(),
      to: toEmail,
      subject: "Verify your Medals N Bongs account",
      html: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#0f0f12">
<div style="max-width:580px;margin:40px auto;background:#1a1a1f;border-radius:12px;overflow:hidden;border:1px solid #2d2d35">
  <div style="background:linear-gradient(135deg,#c07b08,#e3a826);color:#1a1000;text-align:center;padding:28px;font-size:22px;font-weight:bold">★ Medals N Bongs</div>
  <div style="padding:36px 28px;text-align:center;color:#e5e5e5">
    <h1 style="font-size:20px;margin:0 0 16px;color:#f5f5f5">Confirm your email</h1>
    <p style="font-size:15px;color:#a3a3a3;line-height:1.6;margin:0 0 24px">
      Thanks for signing up as an Owner. Open the link below, then click <strong>Verify email and sign in</strong> on the next page. You&apos;ll be signed in automatically — no password needed.
    </p>
    <div style="margin:28px 0">
      <a href="${verifyUrl}" style="background:linear-gradient(135deg,#c07b08,#e3a826);color:#1a1000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
        Continue to verify
      </a>
    </div>
    <p style="font-size:13px;color:#737373;word-break:break-all;text-align:left">
      If the button doesn&apos;t work, copy this link into your browser:<br/>
      <a href="${verifyUrl}" style="color:#e3a826">${verifyUrl}</a>
    </p>
    <p style="font-size:12px;color:#525252;margin-top:24px">This link expires in 24 hours.</p>
  </div>
</div>
</body>
</html>`,
    });
    if (error) {
      console.error("sendSiteMemberVerificationEmail Resend error:", error.message, error.name);
      if (/not verified|validation_error/i.test(String(error.message))) {
        console.error(
          "[Resend] Add and verify your domain at https://resend.com/domains — production: NEXT_PUBLIC_APP_URL must match that domain (noreply@hostname)."
        );
      }
      return { sent: false, verifyUrl };
    }
    return { sent: true, verifyUrl };
  } catch (err) {
    console.error("sendSiteMemberVerificationEmail:", err);
    return { sent: false, verifyUrl };
  }
}
