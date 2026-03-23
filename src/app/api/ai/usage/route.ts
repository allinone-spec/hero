import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Get paginated logs
  const total = await AIUsage.countDocuments();
  const logs = await AIUsage.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Get aggregated stats
  const stats = await AIUsage.aggregate([
    {
      $group: {
        _id: null,
        totalCost: { $sum: "$estimatedCost" },
        totalTokens: { $sum: "$totalTokens" },
        totalCalls: { $sum: 1 },
      },
    },
  ]);

  // Cost per user
  const perUser = await AIUsage.aggregate([
    {
      $group: {
        _id: "$userEmail",
        totalCost: { $sum: "$estimatedCost" },
        totalTokens: { $sum: "$totalTokens" },
        callCount: { $sum: 1 },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  // Cost per action type
  const perAction = await AIUsage.aggregate([
    {
      $group: {
        _id: "$action",
        totalCost: { $sum: "$estimatedCost" },
        totalTokens: { $sum: "$totalTokens" },
        callCount: { $sum: 1 },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: stats[0] || { totalCost: 0, totalTokens: 0, totalCalls: 0 },
    perUser,
    perAction,
  });
}
