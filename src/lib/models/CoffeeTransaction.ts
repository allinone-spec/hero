import mongoose, { Schema, Document } from "mongoose";

export interface ICoffeeTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: "purchase" | "submit" | "refund_duplicate" | "refund_rejected";
  relatedSuggestionId?: mongoose.Types.ObjectId;
  stripeSessionId?: string;
  createdAt: Date;
}

const CoffeeTransactionSchema = new Schema<ICoffeeTransaction>(
  {
    userId:              { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    amount:              { type: Number, required: true },
    type:                { type: String, enum: ["purchase", "submit", "refund_duplicate", "refund_rejected"], required: true },
    relatedSuggestionId: { type: Schema.Types.ObjectId, ref: "HeroSuggestion" },
    stripeSessionId:     { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CoffeeTransactionSchema.index({ userId: 1, createdAt: -1 });
CoffeeTransactionSchema.index({ stripeSessionId: 1 }, { sparse: true });

export default mongoose.models.CoffeeTransaction ||
  mongoose.model<ICoffeeTransaction>("CoffeeTransaction", CoffeeTransactionSchema);
