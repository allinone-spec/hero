import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSiteSession } from "@/lib/site-auth";
import { User } from "@/lib/models/User";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: noStore });
  }

  await dbConnect();
  const user = await User.findById(session.sub).select("email role name").lean();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: noStore });
  }

  return NextResponse.json(
    {
      id: session.sub,
      email: user.email,
      role: user.role,
      name: typeof user.name === "string" ? user.name.trim() : "",
    },
    { headers: noStore },
  );
}
