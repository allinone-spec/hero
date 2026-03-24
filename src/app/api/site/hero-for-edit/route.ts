import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { isAdoptionActive } from "@/lib/adoption";
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
    .select("_id slug name branch countryCode rackGap ribbonMaxPerRow biography avatarUrl ownerUserId adoptionExpiry published medals")
    .populate({
      path: "medals.medalType",
      select:
        "name shortName precedenceOrder ribbonColors ribbonImageUrl deviceLogic deviceRule countryCode inventoryCategory wikiSummary history awardCriteria imageUrl",
    })
    .lean();

  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  const ownerId = hero.ownerUserId?.toString();
  if (!ownerId || ownerId !== session.sub || !isAdoptionActive(hero.adoptionExpiry)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    _id: hero._id.toString(),
    slug: hero.slug,
    name: hero.name,
    branch: hero.branch || "",
    countryCode: hero.countryCode || "US",
    rackGap: hero.rackGap ?? 2,
    ribbonMaxPerRow: hero.ribbonMaxPerRow ?? 0,
    biography: hero.biography || "",
    avatarUrl: hero.avatarUrl || "",
    published: hero.published,
    medals: Array.isArray(hero.medals)
      ? (hero.medals as Array<{
          medalType?: unknown;
          count?: number;
          hasValor?: boolean;
          valorDevices?: number;
          arrowheads?: number;
          deviceImages?: { url: string; deviceType: string; count: number }[];
          wikiRibbonUrl?: string;
        }>)
          .filter((m) => m?.medalType)
          .map((m) => ({
            medalType: m.medalType,
            count: m.count ?? 1,
            hasValor: Boolean(m.hasValor),
            valorDevices: m.valorDevices ?? 0,
            arrowheads: m.arrowheads ?? 0,
            deviceImages: Array.isArray(m.deviceImages) ? m.deviceImages : [],
            wikiRibbonUrl: m.wikiRibbonUrl || "",
          }))
      : [],
  });
}
