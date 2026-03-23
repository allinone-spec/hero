import mongoose, { Schema } from "mongoose";

export interface IActivityLog {
  _id: string;
  action: string;
  category: "hero" | "medal" | "user" | "scoring" | "auth" | "system";
  description: string;
  userEmail: string;
  userName: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ["hero", "medal", "user", "scoring", "auth", "system"],
      required: true,
    },
    description: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, default: "System" },
    targetId: { type: String },
    targetName: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });
ActivityLogSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
