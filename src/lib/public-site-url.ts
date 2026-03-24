import type { NextRequest } from "next/server";

function originFromRequest(req: NextRequest, defaultProto: "http" | "https"): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = (req.headers.get("x-forwarded-proto") || defaultProto).split(",")[0].trim();
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    return `${forwardedProto}://${host}`;
  }
  const o = req.nextUrl?.origin;
  if (o && /^https?:\/\//i.test(o)) return o.replace(/\/$/, "");
  return null;
}

/**
 * Canonical public origin for links in emails (verify, reset password, redirects).
 *
 * - **Development** (`next dev`): uses the incoming request (localhost, tunnel host, etc.) so
 *   verification links work while `NEXT_PUBLIC_APP_URL` still points at production.
 * - **Production**: prefers `SITE_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` so links stay correct
 *   behind proxies and serverless internal hosts.
 */
export function getPublicSiteUrl(req: NextRequest): string {
  if (process.env.NODE_ENV === "development") {
    return originFromRequest(req, "http") ?? "http://localhost:3000";
  }

  const fromEnv =
    process.env.SITE_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    let s = fromEnv.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(s)) {
      const host = s.split("/")[0].toLowerCase();
      s =
        host.startsWith("localhost") || host.startsWith("127.0.0.1") ? `http://${s}` : `https://${s}`;
    }
    try {
      return new URL(s).origin;
    } catch {
      /* fall through */
    }
  }

  const fromReq = originFromRequest(req, "https");
  if (fromReq) return fromReq;

  return "http://localhost:3000";
}
