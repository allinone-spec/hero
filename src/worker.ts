import { Worker } from "bullmq";
import { runHeroImportPipeline } from "@/lib/hero-import-pipeline";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker(
  "hero-import",
  async (job) => {
    const { url, userEmail } = job.data;
    console.log(`[worker] Processing job ${job.id}: ${url}`);

    return await runHeroImportPipeline(url, userEmail, async (step, percent) => {
      await job.updateProgress({ step, percent });
    });
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
});

console.log("[hero-import-worker] Started, waiting for jobs...");
