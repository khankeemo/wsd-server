import mongoose, { Document, Schema } from "mongoose";

export interface ILeadServiceSnapshot {
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
}

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  company?: string;
  budget?: number | null;
  timeline?: string;
  notes?: string;
  cmsRequirement?: string;
  appPlatform?: "iOS" | "Android" | "Both" | null;
  services: ILeadServiceSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const leadServiceSnapshotSchema = new Schema<ILeadServiceSnapshot>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    serviceName: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    budget: { type: Number, default: null },
    timeline: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    cmsRequirement: { type: String, default: "", trim: true },
    appPlatform: {
      type: String,
      enum: ["iOS", "Android", "Both", null],
      default: null,
    },
    services: { type: [leadServiceSnapshotSchema], required: true },
  },
  {
    timestamps: true,
  }
);

export const Lead = mongoose.model<ILead>("Lead", leadSchema);
