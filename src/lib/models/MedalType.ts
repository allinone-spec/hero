import mongoose, { Schema, Document } from "mongoose";

export interface IWikiImage {
  url: string;
  caption: string;
  sourceUrl?: string;
}

export interface IMedalTypeDoc extends Document {
  name: string;
  shortName: string;
  otherNames: string[];
  category: "valor" | "service" | "foreign" | "other";
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  tier: number;
  branch: string;
  precedenceOrder: number;
  ribbonColors: string[];
  description: string;
  imageUrl: string;
  ribbonImageUrl: string;
  /* Wikipedia-sourced content */
  wikipediaUrl: string;
  wikiSummary: string;
  history: string;
  awardCriteria: string;
  appearance: string;
  established: string;
  wikiImages: IWikiImage[];
  wikiLastFetched: Date | null;
}

const MedalTypeSchema = new Schema<IMedalTypeDoc>(
  {
    name: { type: String, required: true, unique: true },
    shortName: { type: String, required: true },
    otherNames: { type: [String], default: [] },
    category: {
      type: String,
      enum: ["valor", "service", "foreign", "other"],
      required: true,
    },
    basePoints: { type: Number, required: true },
    valorPoints: { type: Number, default: 0 },
    requiresValorDevice: { type: Boolean, default: false },
    inherentlyValor: { type: Boolean, default: false },
    tier: { type: Number, default: 99 },
    branch: { type: String, default: "All" },
    precedenceOrder: { type: Number, required: true },
    ribbonColors: { type: [String], default: [] },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ribbonImageUrl: { type: String, default: "" },
    /* Wikipedia-sourced content */
    wikipediaUrl: { type: String, default: "" },
    wikiSummary: { type: String, default: "" },
    history: { type: String, default: "" },
    awardCriteria: { type: String, default: "" },
    appearance: { type: String, default: "" },
    established: { type: String, default: "" },
    wikiImages: {
      type: [{ url: String, caption: String, sourceUrl: String }],
      default: [],
    },
    wikiLastFetched: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MedalType ||
  mongoose.model<IMedalTypeDoc>("MedalType", MedalTypeSchema);
