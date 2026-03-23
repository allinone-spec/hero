import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ActivityLog from "@/lib/models/ActivityLog";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const userEmail = searchParams.get("user");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (category && category !== "all") filter.category = category;
  if (userEmail) filter.userEmail = userEmail;
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: "i" } },
      { targetName: { $regex: search, $options: "i" } },
      { action: { $regex: search, $options: "i" } },
    ];
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
