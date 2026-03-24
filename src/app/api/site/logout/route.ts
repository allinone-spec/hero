import { NextResponse } from "next/server";
import { clearSiteUserCookie } from "@/lib/site-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSiteUserCookie(response);
  return response;
}
