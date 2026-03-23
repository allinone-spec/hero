import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin", "/admin/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin/* routes
  if (pathname.startsWith("/admin")) {
    // Allow public admin paths (login + register)
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // Block unauthenticated requests to protected admin pages → unified login
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("role", "admin");
      const dest = pathname + req.nextUrl.search;
      login.searchParams.set("next", dest);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
