import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { User } from "@/lib/models/User";
import Hero from "@/lib/models/Hero";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (session.groupSlug !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  return null;
}

export async function GET() {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  await dbConnect();
  const users = await User.find().select("-password").sort({ email: 1 }).lean();
  const ids = users.map((u) => u._id);

  const agg =
    ids.length === 0
      ? []
      : await Hero.aggregate<{ _id: unknown; n: number }>([
          { $match: { ownerUserId: { $in: ids } } },
          { $group: { _id: "$ownerUserId", n: { $sum: 1 } } },
        ]);

  const countMap = new Map(agg.map((a) => [String(a._id), a.n]));

  const payload = users.map((u) => ({
    ...u,
    _id: String(u._id),
    adoptedHeroCount: countMap.get(String(u._id)) ?? 0,
  }));

  return NextResponse.json(payload, { headers: noStore });
}
