import { NextResponse } from "next/server";
import { clearAuthTokenCookie } from "@/lib/session-cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthTokenCookie(response);
  return response;
}
