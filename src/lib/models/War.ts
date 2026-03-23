import mongoose, { Schema, Document } from "mongoose";

export interface IWarDoc extends Document {
  name: string;
  startYear: number;
  endYear: number | null;
  theater: string;
  description: string;
  active: boolean;
}

const WarSchema = new Schema<IWarDoc>(
  {
    name: { type: String, required: true, unique: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, default: null },
    theater: { type: String, default: "" },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WarSchema.index({ startYear: 1 });
WarSchema.index({ name: 1 });

export default mongoose.models.War ||
  mongoose.model<IWarDoc>("War", WarSchema);
