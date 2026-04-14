import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { requirePrivilege } from "@/lib/auth";
import { calculateComparisonScore, calculateScore } from "@/lib/scoring-engine";
import { logActivity } from "@/lib/activity-logger";
import { branchVariantsForQuery, normalizeBranch, normalizeWarsArray, warVariantsForQuery } from "@/lib/hero-taxonomy";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published") !== "false";

  if (!publishedOnly) {
    try {
      await requirePrivilege("/admin/heroes", "canView");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forbidden";
      const status = msg === "Unauthorized" ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  await dbConnect();

  const search = searchParams.get("search");
  const medal = searchParams.get("medal");
  const branch = searchParams.get("branch");
  const war = searchParams.get("war");
  const countryCode = searchParams.get("country");
  const tag = searchParams.get("tag");
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (publishedOnly) filter.published = true;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { rank: { $regex: search, $options: "i" } },
      { branch: { $regex: search, $options: "i" } },
    ];
  }
  if (branch && branch !== "All") {
    const bv = branchVariantsForQuery(branch);
    filter.branch = bv.length <= 1 ? bv[0] : { $in: bv };
  }
  if (war && war !== "All") {
    const wv = warVariantsForQuery(war);
    filter.wars = wv.length <= 1 ? wv[0] : { $in: wv };
  }
  if (countryCode) filter.countryCode = countryCode.toUpperCase();
  if (tag) filter.metadataTags = tag;

  let query = Hero.find(filter).populate("medals.medalType");

  if (medal) {
    query = query.where("medals.medalType").equals(medal);
  }

  // If pagination requested
  if (page > 0 && limit > 0) {
    const total = await Hero.countDocuments(filter);
    const heroes = await query
      .sort({ orderOverride: 1, score: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const sorted = heroes.sort((a, b) => {
      if (a.orderOverride != null && b.orderOverride != null) return a.orderOverride - b.orderOverride;
      if (a.orderOverride != null) return -1;
      if (b.orderOverride != null) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ heroes: sorted, total, page, totalPages: Math.ceil(total / limit) });
  }

  const heroes = await query.sort({ orderOverride: 1, score: -1, name: 1 }).lean();

  const sorted = heroes.sort((a, b) => {
    if (a.orderOverride != null && b.orderOverride != null) return a.orderOverride - b.orderOverride;
    if (a.orderOverride != null) return -1;
    if (b.orderOverride != null) return 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(sorted);
}

export async function POST(req: NextRequest) {
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canCreate");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  await dbConnect();
  const body = await req.json();

  if (typeof body.branch === "string") {
    body.branch = normalizeBranch(body.branch);
  }
  if (Array.isArray(body.wars)) {
    body.wars = normalizeWarsArray(body.wars);
  }

  // Generate slug
  if (body.name && !body.slug) {
    body.slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Calculate score from medals if medals are populated
  if (body.medals && body.medals.length > 0) {
    interface PopulatedMedalType {
      name: string;
      category?: "valor" | "service" | "foreign" | "other";
      countryCode?: string;
      basePoints: number;
      valorPoints?: number;
      requiresValorDevice?: boolean;
      inherentlyValor?: boolean;
      tier?: number;
    }
    const populated = await Hero.populate(body, { path: "medals.medalType" });
    const medalData = populated.medals
      .filter((m: { medalType: PopulatedMedalType | null }) => m.medalType)
      .map((m: { medalType: PopulatedMedalType; count: number; hasValor: boolean; valorDevices: number }) => ({
        name: m.medalType.name,
        category: m.medalType.category,
        countryCode: m.medalType.countryCode,
        basePoints: m.medalType.basePoints,
        valorPoints: m.medalType.valorPoints ?? m.medalType.basePoints,
        requiresValorDevice: m.medalType.requiresValorDevice ?? false,
        inherentlyValor: m.medalType.inherentlyValor ?? false,
        valorTier: m.medalType.tier,
        count: m.count,
        hasValor: m.hasValor,
        valorDevices: m.valorDevices,
      }));

    const result = calculateScore({
      medals: medalData,
      wars: body.wars || [],
      combatTours: body.combatTours || 0,
      hadCombatCommand: body.hadCombatCommand || false,
      powHeroism: body.powHeroism || false,
      multiServiceOrMultiWar: body.multiServiceOrMultiWar || false,
      submarineCommandEligible: body.submarineCommandEligible !== false,
      combatAchievements: body.combatAchievements || { type: "none" },
    });

    body.score = result.total;
    body.comparisonScore = calculateComparisonScore(
      result.total,
      medalData.map((m: { count: number; hasValor: boolean }) => ({ count: m.count, hasValor: m.hasValor })),
      (body.wars || []).length,
      Boolean(body.multiServiceOrMultiWar)
    );
  }

  try {
    const hero = await Hero.create(body);
    await logActivity({
      action: "create",
      category: "hero",
      description: `Created hero "${hero.name}"`,
      userEmail: session.email,
      targetId: hero._id.toString(),
      targetName: hero.name,
    });
    return NextResponse.json(hero, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create hero";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
