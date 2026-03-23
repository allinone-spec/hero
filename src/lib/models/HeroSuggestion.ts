import mongoose, { Schema, Document } from "mongoose";

export interface IHeroSuggestion extends Document {
  wikipediaUrl: string;
  submittedBy: string;
  submittedByEmail: string;
  status: "new" | "reviewed" | "denied";
  readByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSuggestionSchema = new Schema<IHeroSuggestion>(
  {
    wikipediaUrl: { type: String, required: true },
    submittedBy: { type: String, required: true },
    submittedByEmail: { type: String, default: "" },
    status: { type: String, enum: ["new", "reviewed", "denied"], default: "new" },
    readByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

HeroSuggestionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.HeroSuggestion ||
  mongoose.model<IHeroSuggestion>("HeroSuggestion", HeroSuggestionSchema);