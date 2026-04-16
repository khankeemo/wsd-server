import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  projectId?: mongoose.Types.ObjectId | null;
  billingType: "project_completion" | "advance_payment" | "milestone";
  milestoneLabel?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "pending" | "partially_paid" | "overdue" | "draft";
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  notes?: string;
  tax?: number;
  discount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    billingType: {
      type: String,
      enum: ["project_completion", "advance_payment", "milestone"],
      default: "project_completion",
    },
    milestoneLabel: { type: String, default: "" },
    invoiceNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientAddress: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["paid", "pending", "partially_paid", "overdue", "draft"],
      default: "pending",
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    items: { type: [invoiceItemSchema], default: [] },
    notes: { type: String, default: "" },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

invoiceSchema.pre("save", function () {
  const invoice = this as IInvoice;
  const paidAmount = Number(invoice.paidAmount || 0);
  const amount = Number(invoice.amount || 0);

  invoice.paidAmount = Math.min(Math.max(paidAmount, 0), amount);
  invoice.dueAmount = Math.max(amount - invoice.paidAmount, 0);

  if (invoice.status !== "draft") {
    if (invoice.dueAmount <= 0) {
      invoice.status = "paid";
    } else if (invoice.paidAmount > 0) {
      invoice.status = "partially_paid";
    } else if (invoice.status === "paid") {
      invoice.status = "pending";
    }
  }
});

export default mongoose.model<IInvoice>("Invoice", invoiceSchema);
