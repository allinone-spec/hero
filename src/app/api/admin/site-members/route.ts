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

  const payload = users.map((u) => {
    const plain = u as unknown as Record<string, unknown> & { _id: unknown };
    return {
      ...plain,
      _id: String(u._id),
      adoptedHeroCount: countMap.get(String(u._id)) ?? 0,
      emailVerified: plain.emailVerified === true ? true : plain.emailVerified === false ? false : undefined,
      createdAt:
        plain.createdAt instanceof Date
          ? plain.createdAt.toISOString()
          : typeof plain.createdAt === "string"
            ? plain.createdAt
            : undefined,
      updatedAt:
        plain.updatedAt instanceof Date
          ? plain.updatedAt.toISOString()
          : typeof plain.updatedAt === "string"
            ? plain.updatedAt
            : undefined,
    };
  });

  return NextResponse.json(payload, { headers: noStore });
}
