import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SITE_JWT_SECRET =
  process.env.SITE_JWT_SECRET || process.env.NEXTAUTH_SECRET || "site-jwt-fallback";

export interface SiteSession {
  sub: string;
  email: string;
  role: "user" | "owner";
}

export function createSiteUserToken(session: SiteSession): string {
  return jwt.sign(
    { sub: session.sub, email: session.email, role: session.role, typ: "site" },
    SITE_JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export function verifySiteUserToken(token: string): SiteSession | null {
  try {
    const p = jwt.verify(token, SITE_JWT_SECRET) as {
      sub?: string;
      email?: string;
      role?: string;
      typ?: string;
    };
    if (p.typ !== "site" || !p.sub || !p.email) return null;
    const role = p.role === "owner" ? "owner" : "user";
    return { sub: String(p.sub), email: String(p.email), role };
  } catch {
    return null;
  }
}

export async function getSiteSession(): Promise<SiteSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("site-user-token")?.value;
  if (!token) return null;
  return verifySiteUserToken(token);
}

function cookieBase() {
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSiteUserCookie(response: NextResponse, token: string) {
  response.cookies.set("site-user-token", token, {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSiteUserCookie(response: NextResponse) {
  response.cookies.set("site-user-token", "", {
    ...cookieBase(),
    maxAge: 0,
  });
}

/** Fields a hero owner may PATCH on their adopted hero (not full admin). */
export const OWNER_HERO_PATCH_KEYS = ["biography", "avatarUrl"] as const;
