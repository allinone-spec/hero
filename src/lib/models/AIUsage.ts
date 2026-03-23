import mongoose, { Schema, Document } from "mongoose";

export interface IAIUsageDoc extends Document {
  userEmail: string;
  action: string; // "generate_description" | "get_medals" | "get_wars" | etc.
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in USD
  inputPreview: string; // truncated input for debugging
  createdAt: Date;
}

const AIUsageSchema = new Schema<IAIUsageDoc>(
  {
    userEmail: { type: String, required: true, index: true },
    action: { type: String, required: true },
    aiModel: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    inputPreview: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes for efficient queries
AIUsageSchema.index({ createdAt: -1 });
AIUsageSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.models.AIUsage ||
  mongoose.model<IAIUsageDoc>("AIUsage", AIUsageSchema);
