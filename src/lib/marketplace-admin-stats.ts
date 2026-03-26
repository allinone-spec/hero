import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import AdoptionTransaction from "@/lib/models/AdoptionTransaction";
import { User } from "@/lib/models/User";

export type MarketplaceRecentPaidRow = {
  createdAt: string;
  amountCents: number;
  currency: string;
  status: string;
  heroId: string;
  heroName: string;
  heroSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
};

export type MarketplaceAdminStats = {
  heroesPublished: number;
  /** Published heroes with no active adoption slot (no owner, expired, or missing owner). */
  heroesAvailableToAdopt: number;
  /** Published with active adoption (owner + future expiry). */
  heroesActivelyAdopted: number;
  /** `adoptionExpiry` within the next 30 days (still active today). */
  heroesAdoptionExpiring30d: number;
  ownersWithStripe: number;
  paidTransactionsAllTime: number;
  paidTransactionsLast30d: number;
  revenueCentsAllTime: number;
  revenueCentsLast30d: number;
  subscriptionStatusCounts: Record<string, number>;
  recentPaid: MarketplaceRecentPaidRow[];
};

function validObjectIdStrings(ids: string[]): mongoose.Types.ObjectId[] {
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (mongoose.isValidObjectId(id)) {
      out.push(new mongoose.Types.ObjectId(id));
    }
  }
  return out;
}

export async function getMarketplaceAdminStats(): Promise<MarketplaceAdminStats> {
  await dbConnect();
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() + 30);

  const [
    heroesPublished,
    heroesAvailableToAdopt,
    heroesActivelyAdopted,
    heroesAdoptionExpiring30d,
    ownersWithStripe,
    txAgg,
    txAgg30,
    statusAgg,
    recentPaid,
  ] = await Promise.all([
    Hero.countDocuments({ published: true }),
    Hero.countDocuments({
      published: true,
      $or: [
        { ownerUserId: null },
        { ownerUserId: { $exists: false } },
        { adoptionExpiry: null },
        { adoptionExpiry: { $exists: false } },
        { adoptionExpiry: { $lte: now } },
      ],
    }),
    Hero.countDocuments({
      published: true,
      ownerUserId: { $exists: true, $ne: null },
      adoptionExpiry: { $gt: now },
    }),
    Hero.countDocuments({
      published: true,
      ownerUserId: { $exists: true, $ne: null },
      adoptionExpiry: { $gt: now, $lte: d30 },
    }),
    User.countDocuments({ role: "owner", stripeCustomerId: { $exists: true, $nin: ["", null] } }),
    AdoptionTransaction.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenueCents: { $sum: "$amountCents" },
        },
      },
    ]),
    AdoptionTransaction.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenueCents: { $sum: "$amountCents" },
        },
      },
    ]),
    User.aggregate([
      { $match: { role: "owner" } },
      {
        $group: {
          _id: {
            $ifNull: ["$subscriptionStatus", "(none)"],
          },
          n: { $sum: 1 },
        },
      },
    ]),
    AdoptionTransaction.find({ status: "paid" })
      .sort({ createdAt: -1 })
      .limit(25)
      .select("createdAt amountCents currency status heroId userId")
      .lean(),
  ]);

  const allRow = txAgg[0] as { count?: number; revenueCents?: number } | undefined;
  const row30 = txAgg30[0] as { count?: number; revenueCents?: number } | undefined;
  const subscriptionStatusCounts: Record<string, number> = {};
  for (const row of statusAgg as { _id: string; n: number }[]) {
    subscriptionStatusCounts[String(row._id)] = row.n;
  }

  const rawRecent = recentPaid as {
    createdAt?: Date;
    amountCents?: number;
    currency?: string;
    status?: string;
    heroId?: unknown;
    userId?: unknown;
  }[];

  const heroIdStrs = [...new Set(rawRecent.map((r) => String(r.heroId ?? "").trim()).filter(Boolean))];
  const userIdStrs = [...new Set(rawRecent.map((r) => String(r.userId ?? "").trim()).filter(Boolean))];

  const heroOids = validObjectIdStrings(heroIdStrs);
  const userOids = validObjectIdStrings(userIdStrs);

  const [heroDocs, userDocs] = await Promise.all([
    heroOids.length ? Hero.find({ _id: { $in: heroOids } }).select("name slug").lean() : [],
    userOids.length ? User.find({ _id: { $in: userOids } }).select("name email").lean() : [],
  ]);

  const heroById = new Map(
    (heroDocs as { _id: unknown; name?: string; slug?: string }[]).map((h) => [
      String(h._id),
      { name: String(h.name || "").trim() || "Unnamed hero", slug: String(h.slug || "").trim() },
    ]),
  );
  const userById = new Map(
    (userDocs as { _id: unknown; name?: string; email?: string }[]).map((u) => [
      String(u._id),
      {
        name: String(u.name || "").trim(),
        email: String(u.email || "").trim(),
      },
    ]),
  );

  const recentPaidEnriched: MarketplaceRecentPaidRow[] = rawRecent.map((r) => {
    const heroId = String(r.heroId ?? "").trim();
    const userId = String(r.userId ?? "").trim();
    const h = heroById.get(heroId);
    const o = userById.get(userId);
    return {
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      amountCents: r.amountCents ?? 0,
      currency: r.currency ?? "usd",
      status: r.status ?? "paid",
      heroId,
      heroName: h?.name ?? (heroId ? `Hero (${heroId.slice(-6)})` : "—"),
      heroSlug: h?.slug ?? "",
      userId,
      userName: o?.name || "",
      userEmail: o?.email || "",
    };
  });

  return {
    heroesPublished,
    heroesAvailableToAdopt,
    heroesActivelyAdopted,
    heroesAdoptionExpiring30d,
    ownersWithStripe,
    paidTransactionsAllTime: allRow?.count ?? 0,
    paidTransactionsLast30d: row30?.count ?? 0,
    revenueCentsAllTime: allRow?.revenueCents ?? 0,
    revenueCentsLast30d: row30?.revenueCents ?? 0,
    subscriptionStatusCounts,
    recentPaid: recentPaidEnriched,
  };
}
