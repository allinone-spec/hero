import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Contact from "@/lib/models/Contact";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.groupSlug !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { id } = await req.json();

    if (id) {
      await Contact.updateOne({ _id: id }, { $set: { read: true } });
    } else {
      await Contact.updateMany({ read: false }, { $set: { read: true } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
