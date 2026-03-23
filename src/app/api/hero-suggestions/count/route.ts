import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroSuggestion from "@/lib/models/HeroSuggestion";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  try {
    await dbConnect();
    const count = await HeroSuggestion.countDocuments({ status: "new", readByAdmin: { $ne: true } });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
