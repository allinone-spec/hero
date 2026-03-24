import type { NextResponse } from "next/server";

function clearOpts() {
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

/** Clears staff/admin JWT only. Site member cookie is unchanged. */
export function clearAuthTokenCookie(response: NextResponse) {
  const o = clearOpts();
  response.cookies.set("auth-token", "", o);
}

/** Clears both staff and site member sessions (only for intentional global sign-out). */
export function clearAllSessionCookies(response: NextResponse) {
  const o = clearOpts();
  response.cookies.set("auth-token", "", o);
  response.cookies.set("site-user-token", "", o);
}
