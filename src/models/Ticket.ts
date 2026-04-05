import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  clientId: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId | null;
  developerId?: mongoose.Types.ObjectId | null;
  projectId?: mongoose.Types.ObjectId | null;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    developerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITicket>("Ticket", ticketSchema);
