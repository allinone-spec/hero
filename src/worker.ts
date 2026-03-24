import { Worker } from "bullmq";
import dbConnect from "@/lib/mongodb";
import { runHeroImportPipeline } from "@/lib/hero-import-pipeline";
import CaretakerQueueItem from "@/lib/models/CaretakerQueueItem";
import HeroImportBatch from "@/lib/models/HeroImportBatch";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker(
  "hero-import",
  async (job) => {
    const { url, userEmail, queueItemId, batchId } = job.data as {
      url: string;
      userEmail: string;
      queueItemId?: string;
      batchId?: string;
    };
    console.log(`[worker] Processing job ${job.id}: ${url}`);

    if (queueItemId) {
      await dbConnect();
      await CaretakerQueueItem.findByIdAndUpdate(queueItemId, {
        status: "processing",
        jobId: String(job.id),
      }).catch(() => undefined);
      if (batchId) {
        await HeroImportBatch.findByIdAndUpdate(batchId, { status: "processing" }).catch(() => undefined);
      }
    }

    const result = await runHeroImportPipeline(url, userEmail, async (step, percent) => {
      await job.updateProgress({ step, percent });
    });
    if (queueItemId) {
      await dbConnect();
      await CaretakerQueueItem.findByIdAndUpdate(queueItemId, {
        status: "needs_review",
        heroName: result.name || "",
        importResult: result,
        unmatchedMedals: result.unmatchedMedals || [],
        error: "",
      }).catch(() => undefined);
      if (batchId) {
        await HeroImportBatch.findByIdAndUpdate(batchId, { $inc: { reviewRows: 1 } }).catch(() => undefined);
      }
    }
    return result;
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
  const queueItemId = (job?.data as { queueItemId?: string } | undefined)?.queueItemId;
  const batchId = (job?.data as { batchId?: string } | undefined)?.batchId;
  if (queueItemId) {
    void dbConnect().then(async () => {
      await CaretakerQueueItem.findByIdAndUpdate(queueItemId, {
        status: "failed",
        error: err.message,
      }).catch(() => undefined);
      if (batchId) {
        await HeroImportBatch.findByIdAndUpdate(batchId, {
          $inc: { failedRows: 1 },
          status: "completed_with_errors",
        }).catch(() => undefined);
      }
    });
  }
});

console.log("[hero-import-worker] Started, waiting for jobs...");
