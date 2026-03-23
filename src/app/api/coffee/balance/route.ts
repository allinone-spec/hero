import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ balance: 0 });
  }

  try {
    await dbConnect();
    const user = await AdminUser.findOne({ email: session.email }).select("coffeeBalance").lean();
    return NextResponse.json({ balance: user?.coffeeBalance ?? 0 });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
