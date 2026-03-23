import { NextResponse } from "next/server";
import path from "path";
import dbConnect from "@/lib/mongodb";
import { requirePrivilege } from "@/lib/auth";
import { importMedalInventoryFromDir } from "@/lib/medal-inventory-importer";

export async function POST() {
  try {
    await requirePrivilege("/admin/medals", "canEdit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const dir = path.join(process.cwd(), "data", "medal-inventory");
  const result = await importMedalInventoryFromDir(dir);
  return NextResponse.json(result);
}
