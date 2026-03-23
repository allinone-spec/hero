import { NextRequest, NextResponse } from "next/server";
import { heroImportQueue } from "@/lib/queue";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = await heroImportQueue.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress as { step?: string; percent?: number } | number;

  if (state === "completed") {
    return NextResponse.json({
      status: "completed",
      result: job.returnvalue,
    });
  }

  if (state === "failed") {
    return NextResponse.json({
      status: "failed",
      error: job.failedReason || "Import failed",
    });
  }

  return NextResponse.json({
    status: state,
    progress,
  });
}
