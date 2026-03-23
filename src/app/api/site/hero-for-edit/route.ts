import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { getSiteSession } from "@/lib/site-auth";

export async function GET(req: NextRequest) {
  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug query required" }, { status: 400 });
  }

  await dbConnect();
  const hero = await Hero.findOne({ slug })
    .select("_id slug name biography avatarUrl ownerUserId published")
    .lean();

  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  const ownerId = hero.ownerUserId?.toString();
  if (!ownerId || ownerId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    _id: hero._id.toString(),
    slug: hero.slug,
    name: hero.name,
    biography: hero.biography || "",
    avatarUrl: hero.avatarUrl || "",
    published: hero.published,
  });
}
