import mongoose, { Document, Schema } from "mongoose";

export interface IAdoptionTransaction extends Document {
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  userId: mongoose.Types.ObjectId | string;
  heroId: mongoose.Types.ObjectId | string;
  amountCents: number;
  currency: string;
  status: "paid" | "blocked" | "refunded";
  note?: string;
}

const AdoptionTransactionSchema = new Schema<IAdoptionTransaction>(
  {
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String, default: "" },
    stripeCustomerId: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    heroId: { type: Schema.Types.ObjectId, ref: "Hero", required: true },
    amountCents: { type: Number, default: 0 },
    currency: { type: String, default: "usd" },
    status: { type: String, enum: ["paid", "blocked", "refunded"], default: "paid" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

AdoptionTransactionSchema.index({ userId: 1, createdAt: -1 });
AdoptionTransactionSchema.index({ heroId: 1, createdAt: -1 });

export default mongoose.models.AdoptionTransaction ||
  mongoose.model<IAdoptionTransaction>("AdoptionTransaction", AdoptionTransactionSchema);
