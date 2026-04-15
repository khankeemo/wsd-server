import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  invoiceId?: mongoose.Types.ObjectId | null;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  provider?: "stripe" | "razorpay" | "manual";
  providerPaymentId?: string;
  method: "card" | "bank" | "cash" | "crypto";
  status: "completed" | "pending" | "failed" | "refunded";
  transactionId: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    invoiceNumber: { type: String, required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    provider: {
      type: String,
      enum: ["stripe", "razorpay", "manual"],
      default: "manual",
    },
    providerPaymentId: { type: String, default: "" },
    method: {
      type: String,
      enum: ["card", "bank", "cash", "crypto"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "refunded"],
      default: "pending",
    },
    transactionId: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", paymentSchema);
