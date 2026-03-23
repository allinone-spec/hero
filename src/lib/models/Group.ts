import mongoose, { Schema } from "mongoose";

export interface IGroup {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    isSystem:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);
