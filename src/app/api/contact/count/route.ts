import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Contact from "@/lib/models/Contact";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.groupSlug !== "super-admin") {
      return NextResponse.json({ count: 0 });
    }

    await dbConnect();
    const count = await Contact.countDocuments({ read: false });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
