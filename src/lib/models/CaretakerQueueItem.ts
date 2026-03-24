import mongoose, { Document, Schema } from "mongoose";

export interface ICaretakerQueueItem extends Document {
  batchId?: mongoose.Types.ObjectId | null;
  sourceType: "wikipedia" | "csv" | "xlsx";
  status:
    | "queued"
    | "processing"
    | "needs_review"
    | "approved"
    | "dismissed"
    | "failed";
  sourceUrl?: string;
  heroName: string;
  jobId?: string;
  createdByEmail: string;
  importResult?: Record<string, unknown>;
  unmatchedMedals?: Array<Record<string, unknown>>;
  rawRow?: Record<string, unknown>;
  error?: string;
  createdHeroId?: mongoose.Types.ObjectId | null;
}

const CaretakerQueueItemSchema = new Schema<ICaretakerQueueItem>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "HeroImportBatch", default: null },
    sourceType: { type: String, enum: ["wikipedia", "csv", "xlsx"], required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "needs_review", "approved", "dismissed", "failed"],
      default: "queued",
    },
    sourceUrl: { type: String, default: "" },
    heroName: { type: String, default: "" },
    jobId: { type: String, default: "" },
    createdByEmail: { type: String, required: true },
    importResult: { type: Schema.Types.Mixed, default: null },
    unmatchedMedals: { type: [Schema.Types.Mixed], default: [] },
    rawRow: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: "" },
    createdHeroId: { type: Schema.Types.ObjectId, ref: "Hero", default: null },
  },
  { timestamps: true }
);

CaretakerQueueItemSchema.index({ status: 1, createdAt: -1 });
CaretakerQueueItemSchema.index({ batchId: 1, createdAt: -1 });

export default mongoose.models.CaretakerQueueItem ||
  mongoose.model<ICaretakerQueueItem>("CaretakerQueueItem", CaretakerQueueItemSchema);
