import { NextRequest, NextResponse } from "next/server";
import { createSiteUserToken, setSiteUserCookie } from "@/lib/site-auth";
import { logActivity } from "@/lib/activity-logger";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { normalizeVerifyToken, verifyMemberEmailToken } from "./verify-shared";

export const dynamic = "force-dynamic";

function redirectInvalid(req: NextRequest) {
  const u = new URL("/login?role=member&verified=invalid", getPublicSiteUrl(req));
  return NextResponse.redirect(u);
}

/** Legacy links: /api/site/verify-email?token=… → send user to the verify page (POST avoids link-scanner token burn). */
export async function GET(req: NextRequest) {
  const token = normalizeVerifyToken(req.nextUrl.searchParams.get("token"));
  if (!token) return redirectInvalid(req);

  const page = new URL("/verify-email", getPublicSiteUrl(req));
  page.searchParams.set("token", token);
  return NextResponse.redirect(page);
}

export async function POST(req: NextRequest) {
  let raw = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = (await req.json()) as { token?: unknown };
      raw = typeof body.token === "string" ? body.token : "";
    } catch {
      raw = "";
    }
  } else {
    try {
      const fd = await req.formData();
      raw = String(fd.get("token") ?? "");
    } catch {
      raw = "";
    }
  }

  const token = normalizeVerifyToken(raw);
  if (!token) return redirectInvalid(req);

  const result = await verifyMemberEmailToken(token);
  if (!result.ok) return redirectInvalid(req);

  const { user } = result;
  const sessionToken = createSiteUserToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role === "owner" ? "owner" : "user",
  });

  await logActivity({
    action: "login",
    category: "auth",
    description: "Site member verified email (auto sign-in)",
    userEmail: user.email,
  });

  const dest = new URL("/my-heroes", getPublicSiteUrl(req));
  dest.searchParams.set("verified", "1");
  const res = NextResponse.redirect(dest);
  setSiteUserCookie(res, sessionToken);
  return res;
}
