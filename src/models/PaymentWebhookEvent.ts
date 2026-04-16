import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentWebhookEvent extends Document {
  provider: "stripe" | "razorpay";
  providerEventId: string;
  eventType: string;
  payload: Record<string, any>;
  status: "received" | "processed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const paymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    provider: {
      type: String,
      enum: ["stripe", "razorpay"],
      required: true,
    },
    providerEventId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["received", "processed", "failed"],
      default: "received",
    },
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export default mongoose.model<IPaymentWebhookEvent>("PaymentWebhookEvent", paymentWebhookEventSchema);
