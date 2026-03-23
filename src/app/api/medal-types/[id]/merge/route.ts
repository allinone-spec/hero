import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import Hero from "@/lib/models/Hero";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sourceId } = await params;
  const { targetId } = await req.json();

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "Cannot merge a medal into itself" }, { status: 400 });
  }

  await dbConnect();

  const source = await MedalType.findById(sourceId);
  const target = await MedalType.findById(targetId);

  if (!source) {
    return NextResponse.json({ error: "Source medal not found" }, { status: 404 });
  }
  if (!target) {
    return NextResponse.json({ error: "Target medal not found" }, { status: 404 });
  }

  // Add source name + its otherNames to target's otherNames (deduplicated)
  const existingOther = new Set((target.otherNames || []).map((n: string) => n.toLowerCase()));
  existingOther.add(target.name.toLowerCase()); // don't add target's own name as alias

  const toAdd: string[] = [];
  if (!existingOther.has(source.name.toLowerCase())) {
    toAdd.push(source.name);
  }
  for (const alt of source.otherNames || []) {
    if (!existingOther.has(alt.toLowerCase())) {
      toAdd.push(alt);
    }
  }

  if (toAdd.length > 0) {
    target.otherNames = [...(target.otherNames || []), ...toAdd];
    await target.save();
  }

  // Update all heroes that reference the source medal
  const heroes = await Hero.find({ "medals.medalType": sourceId });
  let heroesUpdated = 0;

  for (const hero of heroes) {
    const sourceIdx = hero.medals.findIndex(
      (m: { medalType: { toString(): string } }) => m.medalType.toString() === sourceId
    );
    const targetIdx = hero.medals.findIndex(
      (m: { medalType: { toString(): string } }) => m.medalType.toString() === targetId
    );

    if (sourceIdx === -1) continue;

    if (targetIdx !== -1) {
      // Hero has both medals — merge entries, keep the better values
      const src = hero.medals[sourceIdx];
      const tgt = hero.medals[targetIdx];
      tgt.count = Math.max(tgt.count, src.count);
      tgt.hasValor = tgt.hasValor || src.hasValor;
      tgt.valorDevices = Math.max(tgt.valorDevices, src.valorDevices);
      tgt.arrowheads = Math.max(tgt.arrowheads, src.arrowheads);
      // Remove source entry
      hero.medals.splice(sourceIdx, 1);
    } else {
      // Hero only has source — change reference to target
      hero.medals[sourceIdx].medalType = targetId;
    }

    await hero.save();
    heroesUpdated++;
  }

  // Delete the source medal
  await MedalType.findByIdAndDelete(sourceId);

  await logActivity({
    action: "merge",
    category: "medal",
    description: `Merged medal "${source.name}" into "${target.name}" (${heroesUpdated} heroes updated)`,
    userEmail: session.email,
    targetId: targetId,
    targetName: target.name,
  });

  return NextResponse.json({
    success: true,
    heroesUpdated,
    targetName: target.name,
    addedAliases: toAdd,
  });
}
