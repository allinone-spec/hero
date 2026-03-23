import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import MedalTypeModel from "@/lib/models/MedalType";
import ScoringConfig from "@/lib/models/ScoringConfig";
import { getSession } from "@/lib/auth";
import { calculateScore, DEFAULT_SCORING_CONFIG, ScoringConfig as IScoringConfig } from "@/lib/scoring-engine";
import { logActivity } from "@/lib/activity-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  const hero = await Hero.findById(id).populate("medals.medalType").lean();
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  return NextResponse.json(hero);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  // Recalculate score if medals changed
  if (body.recalculateScore) {
    delete body.recalculateScore;

    const rawConfig = await ScoringConfig.findOne({ key: "default" }).lean();
    const config: IScoringConfig = rawConfig ?? DEFAULT_SCORING_CONFIG;

    const hero = await Hero.findById(id);
    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }

    // body.medals contains string IDs (not populated objects), so look up medal types directly
    type BodyMedal = { medalType?: string; count: number; hasValor: boolean; valorDevices: number; deviceImages?: { url: string; deviceType: string; count: number }[] };
    const bodyMedals = ((body.medals ?? []) as BodyMedal[]).filter((m) => m.medalType);
    const medalTypeIds = bodyMedals.map((m) => m.medalType);
    const medalTypeDocs = await MedalTypeModel.find({ _id: { $in: medalTypeIds } }).lean<Array<{ _id: { toString(): string }; name: string; basePoints: number; valorPoints?: number; requiresValorDevice?: boolean; inherentlyValor?: boolean }>>();
    const medalTypeMap = new Map(medalTypeDocs.map((mt) => [mt._id.toString(), mt]));

    const medalData = bodyMedals
      .filter((m) => medalTypeMap.has(m.medalType!))
      .map((m) => {
        const mt = medalTypeMap.get(m.medalType!)!;
        return {
          name: mt.name,
          basePoints: mt.basePoints ?? 0,
          valorPoints: mt.valorPoints ?? mt.basePoints ?? 0,
          requiresValorDevice: mt.requiresValorDevice ?? false,
          inherentlyValor: mt.inherentlyValor ?? false,
          count: m.count,
          hasValor: m.hasValor,
          valorDevices: m.valorDevices ?? 0,
        };
      });

    // Apply updates to hero for other fields needed in scoring
    Object.assign(hero, body);

    const result = calculateScore(
      {
        medals: medalData,
        wars: hero.wars,
        combatTours: hero.combatTours,
        hadCombatCommand: hero.hadCombatCommand,
        powHeroism: hero.powHeroism,
        multiServiceOrMultiWar: hero.multiServiceOrMultiWar,
        combatAchievements: hero.combatAchievements,
      },
      config
    );

    body.score = result.total;
  }

  try {
    const hero = await Hero.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("medals.medalType");

    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }

    await logActivity({
      action: "update",
      category: "hero",
      description: `Updated hero "${hero.name}"`,
      userEmail: session.email,
      targetId: hero._id.toString(),
      targetName: hero.name,
    });

    return NextResponse.json(hero);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update hero";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  const hero = await Hero.findByIdAndDelete(id);
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  await logActivity({
    action: "delete",
    category: "hero",
    description: `Deleted hero "${hero.name}"`,
    userEmail: session.email,
    targetId: id,
    targetName: hero.name,
  });

  return NextResponse.json({ success: true });
}
