import mongoose, { Document, Schema } from "mongoose";

/** Dedupes subscription renewal handling when Stripe retries `invoice.paid`. */
export interface IProcessedStripeInvoice extends Document {
  stripeInvoiceId: string;
}

const ProcessedStripeInvoiceSchema = new Schema<IProcessedStripeInvoice>(
  {
    stripeInvoiceId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.ProcessedStripeInvoice ||
  mongoose.model<IProcessedStripeInvoice>("ProcessedStripeInvoice", ProcessedStripeInvoiceSchema);
