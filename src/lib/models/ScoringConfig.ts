import mongoose, { Schema, Document } from "mongoose";

export interface IScoringConfigDoc extends Document {
  key: string;
  valorDevicePoints: number;
  theaterBonusPerWar: number;
  combatLeadershipBonus: number;
  powHeroismBonus: number;
  woundsBonusPerHeart: number;
  aviationKillThreshold: number;
  aviationKillPtsPerKill: number;
  aviationMissionPts: number;
  submarineShipThreshold: number;
  submarineShipPtsPerShip: number;
  submarineMissionPts: number;
  surfaceEngagementPts: number;
  surfaceMissionPts: number;
  multiServiceBonusPct: number;
  roundingBase: number;
}

const ScoringConfigSchema = new Schema<IScoringConfigDoc>(
  {
    key: { type: String, default: "default", unique: true },
    valorDevicePoints: { type: Number, default: 2 },
    theaterBonusPerWar: { type: Number, default: 5 },
    combatLeadershipBonus: { type: Number, default: 10 },
    powHeroismBonus: { type: Number, default: 15 },
    woundsBonusPerHeart: { type: Number, default: 2 },
    aviationKillThreshold: { type: Number, default: 5 },
    aviationKillPtsPerKill: { type: Number, default: 5 },
    aviationMissionPts: { type: Number, default: 10 },
    submarineShipThreshold: { type: Number, default: 5 },
    submarineShipPtsPerShip: { type: Number, default: 5 },
    submarineMissionPts: { type: Number, default: 10 },
    surfaceEngagementPts: { type: Number, default: 5 },
    surfaceMissionPts: { type: Number, default: 10 },
    multiServiceBonusPct: { type: Number, default: 5 },
    roundingBase: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export default mongoose.models.ScoringConfig ||
  mongoose.model<IScoringConfigDoc>("ScoringConfig", ScoringConfigSchema);
