import type { NextRequest } from "next/server";

function isLoopbackHostname(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Public-facing origin from proxy headers or Host (avoids localhost when Node is behind Nginx on :3000). */
function originFromRequest(req: NextRequest, defaultProto: "http" | "https"): string | null {
  const rawProto = (req.headers.get("x-forwarded-proto") || defaultProto).split(",")[0].trim().toLowerCase();
  const proto = rawProto === "https" || rawProto === "http" ? rawProto : defaultProto;

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const hostHeader = req.headers.get("host")?.split(",")[0].trim();
  const host = forwardedHost || hostHeader;

  if (host) {
    return `${proto}://${host}`;
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
 *   behind proxies and serverless internal hosts. Loopback values in those env vars are ignored
 *   so Stripe success URLs use the real `Host` / `X-Forwarded-*` headers from Nginx.
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
      const origin = new URL(s).origin;
      const hostname = new URL(origin).hostname;
      // Do not use a dev / misconfigured public URL in production; prefer real Host / proxy headers.
      if (isLoopbackHostname(hostname)) {
        /* fall through */
      } else {
        return origin;
      }
    } catch {
      /* fall through */
    }
  }

  const fromReq = originFromRequest(req, "https");
  if (fromReq) return fromReq;

  return "http://localhost:3000";
}
