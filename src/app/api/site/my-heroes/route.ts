import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { getSiteSession } from "@/lib/site-auth";

export async function GET() {
  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const heroes = await Hero.find({ ownerUserId: session.sub })
    .select("slug name avatarUrl adoptionExpiry published score")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    heroes: heroes.map((h) => ({
      id: h._id.toString(),
      slug: h.slug,
      name: h.name,
      avatarUrl: h.avatarUrl,
      adoptionExpiry: h.adoptionExpiry ? h.adoptionExpiry.toISOString() : null,
      published: h.published,
      score: h.score,
    })),
  });
}
