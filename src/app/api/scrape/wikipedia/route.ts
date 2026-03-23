import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { heroImportQueue } from "@/lib/queue";
import { extractHeroNameFromUrl } from "@/lib/hero-import-pipeline";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const heroName = extractHeroNameFromUrl(url.trim());
    if (!heroName) {
      return NextResponse.json(
        { error: "Invalid Wikipedia URL. Expected: https://en.wikipedia.org/wiki/Hero_Name" },
        { status: 400 }
      );
    }

    const jobId = randomUUID();
    await heroImportQueue.add(
      "import",
      { url: url.trim(), userEmail: session.email },
      { jobId }
    );

    return NextResponse.json({ jobId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to enqueue import";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
