import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  clientId?: mongoose.Types.ObjectId | null;
  adminId?: mongoose.Types.ObjectId | null;
  developerId?: mongoose.Types.ObjectId | null;
  projectId?: mongoose.Types.ObjectId | null;
  source: "client_portal" | "public_contact";
  contactName?: string;
  contactEmail?: string;
  contactCompany?: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  resolution?: string;
  attachments: Array<{
    name: string;
    url: string;
  }>;
  history: Array<{
    action: string;
    actorId?: mongoose.Types.ObjectId | null;
    actorRole: "admin" | "client" | "developer" | "system";
    message?: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    developerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    source: {
      type: String,
      enum: ["client_portal", "public_contact"],
      default: "client_portal",
    },
    contactName: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    contactCompany: { type: String, trim: true, default: "" },
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
    resolution: { type: String, default: "" },
    attachments: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, trim: true },
            url: { type: String, required: true, trim: true },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    history: {
      type: [
        new Schema(
          {
            action: { type: String, required: true },
            actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
            actorRole: {
              type: String,
              enum: ["admin", "client", "developer", "system"],
              default: "system",
            },
            message: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITicket>("Ticket", ticketSchema);
