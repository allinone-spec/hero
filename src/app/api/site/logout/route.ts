import { NextResponse } from "next/server";
import { clearAllSessionCookies } from "@/lib/session-cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAllSessionCookies(response);
  return response;
}
