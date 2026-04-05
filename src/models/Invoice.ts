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
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft";
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
    invoiceNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientAddress: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["paid", "pending", "overdue", "draft"],
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

export default mongoose.model<IInvoice>("Invoice", invoiceSchema);
