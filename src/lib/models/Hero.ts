import mongoose, { Schema, Document } from "mongoose";

export type CombatSpecialty =
  | "none"
  | "infantry"
  | "armor"
  | "artillery"
  | "aviation"
  | "airborne"
  | "special_operations"
  | "submarine"
  | "surface"
  | "amphibious"
  | "reconnaissance"
  | "air_defense"
  | "engineering"
  | "signal"
  | "intelligence"
  | "medical"
  | "logistics"
  | "chemical"
  | "electronic_warfare"
  | "cyber"
  | "military_police"
  | "ordnance"
  | "sniper"
  | "marine";

const DeviceImageSchema = new Schema(
  {
    url: { type: String, required: true },
    deviceType: { type: String, required: true },
    count: { type: Number, default: 1 },
  },
  { _id: false }
);

const WikiRibbonCellSchema = new Schema(
  {
    ribbonUrl: { type: String, required: true },
    deviceUrls: { type: [String], default: [] },
    medalName: { type: String, default: "" },
    medalType: { type: Schema.Types.ObjectId, ref: "MedalType" },
    count: { type: Number, default: 1 },
    hasValor: { type: Boolean, default: false },
    arrowheads: { type: Number, default: 0 },
    cellType: { type: String, enum: ["ribbon", "other"], default: "ribbon" },
    imgWidth: { type: Number },
    imgHeight: { type: Number },
    scale: { type: Number, default: 1 },
    row: { type: Number, default: 0 },
  },
  { _id: false }
);

const MedalEntrySchema = new Schema(
  {
    medalType: { type: Schema.Types.ObjectId, ref: "MedalType", required: true },
    count: { type: Number, default: 1, min: 1 },
    hasValor: { type: Boolean, default: false },
    valorDevices: { type: Number, default: 0 },
    arrowheads: { type: Number, default: 0, min: 0 },
    deviceImages: { type: [DeviceImageSchema], default: [] },
    wikiRibbonUrl: { type: String, default: "" },
    wikiDeviceText: { type: String, default: "" },
  },
  { _id: false }
);

const CombatAchievementSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "none",
        "infantry",
        "armor",
        "artillery",
        "aviation",
        "airborne",
        "special_operations",
        "submarine",
        "surface",
        "amphibious",
        "reconnaissance",
        "air_defense",
        "engineering",
        "signal",
        "intelligence",
        "medical",
        "logistics",
        "chemical",
        "electronic_warfare",
        "cyber",
        "military_police",
        "ordnance",
        "sniper",
        "marine",
      ],
      default: "none",
    },
    confirmedKills: { type: Number, default: 0 },
    shipsSunk: { type: Number, default: 0 },
    majorEngagements: { type: Number, default: 0 },
    definingMissions: { type: Number, default: 0 },
  },
  { _id: false }
);

export interface IHeroDoc extends Document {
  name: string;
  slug: string;
  rank: string;
  branch: string;
  avatarUrl: string;
  medals: {
    medalType: mongoose.Types.ObjectId;
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads: number;
    deviceImages: { url: string; deviceType: string; count: number }[];
    wikiRibbonUrl: string;
  }[];
  biography: string;
  wars: string[];
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  combatAchievements: {
    type: CombatSpecialty;
    confirmedKills: number;
    shipsSunk: number;
    majorEngagements: number;
    definingMissions: number;
  };
  wikiRibbonRack: {
    ribbonUrl: string;
    deviceUrls: string[];
    medalName: string;
    medalType?: mongoose.Types.ObjectId;
    count: number;
    hasValor: boolean;
    arrowheads: number;
    cellType: "ribbon" | "other";
    imgWidth?: number;
    imgHeight?: number;
    scale?: number;
    row?: number;
  }[];
  ribbonMaxPerRow: number;
  rackGap: number;
  score: number;
  orderOverride: number | null;
  published: boolean;
}

const HeroSchema = new Schema<IHeroDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    rank: { type: String, required: true },
    branch: { type: String, default: "U.S. Army" },
    avatarUrl: { type: String, default: "" },
    medals: { type: [MedalEntrySchema], default: [] },
    wikiRibbonRack: { type: [WikiRibbonCellSchema], default: [] },
    ribbonMaxPerRow: { type: Number, default: 0 },
    rackGap: { type: Number, default: 8 },
    biography: { type: String, default: "" },
    wars: { type: [String], default: [] },
    combatTours: { type: Number, default: 0 },
    hadCombatCommand: { type: Boolean, default: false },
    powHeroism: { type: Boolean, default: false },
    multiServiceOrMultiWar: { type: Boolean, default: false },
    combatAchievements: { type: CombatAchievementSchema, default: () => ({ type: "none" }) },
    score: { type: Number, default: 0 },
    orderOverride: { type: Number, default: null },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Performance indexes
HeroSchema.index({ published: 1, score: -1 });
HeroSchema.index({ published: 1, branch: 1 });
HeroSchema.index({ published: 1, name: 1 });
HeroSchema.index({ slug: 1, published: 1 });

// Auto-generate slug from name
HeroSchema.pre("validate", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

export default mongoose.models.Hero ||
  mongoose.model<IHeroDoc>("Hero", HeroSchema);
