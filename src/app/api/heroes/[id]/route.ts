import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import HeroImportBatch from "@/lib/models/HeroImportBatch";
import MedalTypeModel from "@/lib/models/MedalType";
import ScoringConfig from "@/lib/models/ScoringConfig";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import { assertHeroOwnerAccess } from "@/lib/hero-access";
import { getSession, requirePrivilege } from "@/lib/auth";
import { getSiteSession, OWNER_HERO_PATCH_KEYS } from "@/lib/site-auth";
import {
  calculateComparisonScore,
  calculateScore,
  mergeScoringConfig,
  ScoringConfig as IScoringConfig,
} from "@/lib/scoring-engine";
import { logActivity } from "@/lib/activity-logger";
import { deriveHeroMetadataTags } from "@/lib/derive-hero-metadata-tags";
import { normalizeBranch, normalizeWarsArray } from "@/lib/hero-taxonomy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege("/admin/heroes", "canView");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

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
  const adminSession = await getSession();
  const siteSession = await getSiteSession();
  if (!adminSession && !siteSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const body = await req.json();
  type BodyMedal = {
    medalType?: string;
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads?: number;
    deviceImages?: { url: string; deviceType: string; count: number }[];
    wikiRibbonUrl?: string;
  };

  if (!adminSession && siteSession) {
    const existing = await Hero.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }
    try {
      assertHeroOwnerAccess(existing, siteSession);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patch: Record<string, unknown> = {};
    for (const key of OWNER_HERO_PATCH_KEYS) {
      if (key in body && typeof (body as Record<string, unknown>)[key] === "string") {
        patch[key] = String((body as Record<string, unknown>)[key]);
      }
    }

    const ownerMedals = Array.isArray(body.medals)
      ? (body.medals as BodyMedal[])
          .filter((m) => typeof m?.medalType === "string")
          .map((m) => ({
            medalType: String(m.medalType),
            count: Math.max(1, Number(m.count) || 1),
            hasValor: Boolean(m.hasValor),
            valorDevices: Math.max(0, Number(m.valorDevices) || (m.hasValor ? 1 : 0)),
            arrowheads: Math.max(0, Number(m.arrowheads) || 0),
            deviceImages: Array.isArray(m.deviceImages) ? m.deviceImages : [],
            wikiRibbonUrl: typeof m.wikiRibbonUrl === "string" ? m.wikiRibbonUrl : "",
          }))
      : null;

    if (ownerMedals) {
      patch.medals = ownerMedals;

      const rawConfig = await ScoringConfig.findOne({ key: "default" }).lean();
      const config: IScoringConfig = mergeScoringConfig(rawConfig as Partial<IScoringConfig> | null);
      const medalTypeIds = ownerMedals.map((m) => m.medalType);
      const medalTypeDocs = await MedalTypeModel.find({ _id: { $in: medalTypeIds } }).lean<
        Array<{
          _id: { toString(): string };
          name: string;
          category?: "valor" | "service" | "foreign" | "other";
          countryCode?: string;
          basePoints: number;
          valorPoints?: number;
          requiresValorDevice?: boolean;
          inherentlyValor?: boolean;
        }>
      >();
      const medalTypeMap = new Map(medalTypeDocs.map((mt) => [mt._id.toString(), mt]));
      const medalData = ownerMedals
        .filter((m) => medalTypeMap.has(m.medalType))
        .map((m) => {
          const mt = medalTypeMap.get(m.medalType)!;
          return {
            name: mt.name,
            category: mt.category,
            countryCode: mt.countryCode,
            basePoints: mt.basePoints ?? 0,
            valorPoints: mt.valorPoints ?? mt.basePoints ?? 0,
            requiresValorDevice: mt.requiresValorDevice ?? false,
            inherentlyValor: mt.inherentlyValor ?? false,
            count: m.count,
            hasValor: m.hasValor,
            valorDevices: m.valorDevices ?? 0,
          };
        });

      const result = calculateScore(
        {
          medals: medalData,
          wars: existing.wars,
          combatTours: existing.combatTours,
          hadCombatCommand: existing.hadCombatCommand,
          powHeroism: existing.powHeroism,
          multiServiceOrMultiWar: existing.multiServiceOrMultiWar,
          submarineCommandEligible: existing.submarineCommandEligible !== false,
          combatAchievements: existing.combatAchievements,
        },
        config
      );

      patch.score = result.total;
      patch.comparisonScore = calculateComparisonScore(
        result.total,
        medalData.map((m) => ({ count: m.count, hasValor: m.hasValor })),
        existing.wars?.length ?? 0,
        Boolean(existing.multiServiceOrMultiWar)
      );
      const ca = existing.combatAchievements as { type?: string } | undefined;
      patch.metadataTags = deriveHeroMetadataTags({
        branch: existing.branch,
        combatType: ca?.type,
        wars: existing.wars,
        current: Array.isArray(existing.metadataTags) ? existing.metadataTags : [],
        medals: medalData.map((m) => ({ name: m.name, count: m.count })),
      });
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No allowed fields to update" }, { status: 400 });
    }

    try {
      const hero = await Hero.findByIdAndUpdate(id, patch, {
        returnDocument: "after",
        runValidators: true,
      }).populate("medals.medalType");

      if (!hero) {
        return NextResponse.json({ error: "Hero not found" }, { status: 404 });
      }

      await logActivity({
        action: "update",
        category: "hero",
        description: `Hero owner updated "${hero.name}" (${Object.keys(patch).join(", ")})`,
        userEmail: siteSession.email,
        targetId: hero._id.toString(),
        targetName: hero.name,
      });

      return NextResponse.json(hero);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update hero";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    await requirePrivilege("/admin/heroes", "canEdit");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const session = adminSession!;

  if (typeof body.branch === "string") {
    body.branch = normalizeBranch(body.branch);
  }
  if (Array.isArray(body.wars)) {
    body.wars = normalizeWarsArray(body.wars);
  }

  // Recalculate score if medals changed
  if (body.recalculateScore) {
    delete body.recalculateScore;

    const rawConfig = await ScoringConfig.findOne({ key: "default" }).lean();
    const config: IScoringConfig = mergeScoringConfig(rawConfig as Partial<IScoringConfig> | null);

    const hero = await Hero.findById(id);
    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }

    // body.medals contains string IDs (not populated objects), so look up medal types directly
    type BodyMedal = { medalType?: string; count: number; hasValor: boolean; valorDevices: number; deviceImages?: { url: string; deviceType: string; count: number }[] };
    const bodyMedals = ((body.medals ?? []) as BodyMedal[]).filter((m) => m.medalType);
    const medalTypeIds = bodyMedals.map((m) => m.medalType);
    const medalTypeDocs = await MedalTypeModel.find({ _id: { $in: medalTypeIds } }).lean<Array<{ _id: { toString(): string }; name: string; category?: "valor" | "service" | "foreign" | "other"; countryCode?: string; basePoints: number; valorPoints?: number; requiresValorDevice?: boolean; inherentlyValor?: boolean }>>();
    const medalTypeMap = new Map(medalTypeDocs.map((mt) => [mt._id.toString(), mt]));

    const medalData = bodyMedals
      .filter((m) => medalTypeMap.has(m.medalType!))
      .map((m) => {
        const mt = medalTypeMap.get(m.medalType!)!;
        return {
          name: mt.name,
          category: mt.category,
          countryCode: mt.countryCode,
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
        submarineCommandEligible: hero.submarineCommandEligible !== false,
        combatAchievements: hero.combatAchievements,
      },
      config
    );

    body.score = result.total;
    body.comparisonScore = calculateComparisonScore(
      result.total,
      medalData.map((m) => ({ count: m.count, hasValor: m.hasValor })),
      hero.wars?.length ?? 0,
      Boolean(hero.multiServiceOrMultiWar)
    );
  }

  try {
    const hero = await Hero.findByIdAndUpdate(id, body, {
      returnDocument: "after",
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
  let session: { email: string; groupSlug: string };
  try {
    session = await requirePrivilege("/admin/heroes", "canDelete");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  await dbConnect();
  const { id } = await params;

  const hero = await Hero.findByIdAndDelete(id);
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  const queueLinked = await CaretakerQueueItem.find({ createdHeroId: hero._id })
    .select("batchId status")
    .lean();
  const batchDecrements = new Map<string, number>();
  for (const row of queueLinked) {
    if (row.batchId && row.status === "approved") {
      const bid = String(row.batchId);
      batchDecrements.set(bid, (batchDecrements.get(bid) ?? 0) + 1);
    }
  }
  for (const [batchId, dec] of batchDecrements) {
    if (!mongoose.Types.ObjectId.isValid(batchId)) continue;
    await HeroImportBatch.findByIdAndUpdate(batchId, [
      { $set: { approvedRows: { $max: [0, { $subtract: ["$approvedRows", dec] }] } } },
    ]);
  }
  await CaretakerQueueItem.deleteMany({ createdHeroId: hero._id });

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
