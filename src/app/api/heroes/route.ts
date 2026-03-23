import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import ScoringConfig from "@/lib/models/ScoringConfig";
import { getSession } from "@/lib/auth";
import {
  calculateComparisonScore,
  calculateScore,
  DEFAULT_SCORING_CONFIG,
  ScoringConfig as IScoringConfig,
} from "@/lib/scoring-engine";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const medal = searchParams.get("medal");
  const branch = searchParams.get("branch");
  const war = searchParams.get("war");
  const countryCode = searchParams.get("country");
  const tag = searchParams.get("tag");
  const publishedOnly = searchParams.get("published") !== "false";
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
  if (branch && branch !== "All") filter.branch = branch;
  if (war && war !== "All") filter.wars = war;
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();

  // Generate slug
  if (body.name && !body.slug) {
    body.slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Calculate score from medals if medals are populated
  if (body.medals && body.medals.length > 0) {
    const rawConfig = await ScoringConfig.findOne({ key: "default" }).lean();
    const config: IScoringConfig = rawConfig ?? DEFAULT_SCORING_CONFIG;

    interface PopulatedMedalType {
      name: string;
      basePoints: number;
      valorPoints?: number;
      requiresValorDevice?: boolean;
      inherentlyValor?: boolean;
    }
    const populated = await Hero.populate(body, { path: "medals.medalType" });
    const medalData = populated.medals
      .filter((m: { medalType: PopulatedMedalType | null }) => m.medalType)
      .map((m: { medalType: PopulatedMedalType; count: number; hasValor: boolean; valorDevices: number }) => ({
        name: m.medalType.name,
        basePoints: m.medalType.basePoints,
        valorPoints: m.medalType.valorPoints ?? m.medalType.basePoints,
        requiresValorDevice: m.medalType.requiresValorDevice ?? false,
        inherentlyValor: m.medalType.inherentlyValor ?? false,
        count: m.count,
        hasValor: m.hasValor,
        valorDevices: m.valorDevices,
      }));

    const result = calculateScore(
      {
        medals: medalData,
        wars: body.wars || [],
        combatTours: body.combatTours || 0,
        hadCombatCommand: body.hadCombatCommand || false,
        powHeroism: body.powHeroism || false,
        multiServiceOrMultiWar: body.multiServiceOrMultiWar || false,
        combatAchievements: body.combatAchievements || { type: "none" },
      },
      config
    );

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
