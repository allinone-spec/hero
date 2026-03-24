import mongoose, { Document, Schema } from "mongoose";

export interface IHeroImportBatch extends Document {
  sourceType: "csv" | "xlsx";
  filename: string;
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed";
  createdByEmail: string;
  totalRows: number;
  queuedRows: number;
  directCreatedRows: number;
  reviewRows: number;
  approvedRows: number;
  failedRows: number;
  notes?: string;
}

const HeroImportBatchSchema = new Schema<IHeroImportBatch>(
  {
    sourceType: { type: String, enum: ["csv", "xlsx"], required: true },
    filename: { type: String, default: "" },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "completed_with_errors", "failed"],
      default: "queued",
    },
    createdByEmail: { type: String, required: true },
    totalRows: { type: Number, default: 0 },
    queuedRows: { type: Number, default: 0 },
    directCreatedRows: { type: Number, default: 0 },
    reviewRows: { type: Number, default: 0 },
    approvedRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

HeroImportBatchSchema.index({ createdAt: -1 });
HeroImportBatchSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.HeroImportBatch ||
  mongoose.model<IHeroImportBatch>("HeroImportBatch", HeroImportBatchSchema);
