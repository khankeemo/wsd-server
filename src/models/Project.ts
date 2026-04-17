// C:\wsd-server\src\models\Project.ts
// Project Model - Schema for project management
// Fields: name, description, client, status, priority, startDate, endDate, budget
// ADDED: progress, projectType, messages, feedback, customization for status dashboard

import mongoose, { Document, Schema } from "mongoose";

// Interface for Message sub-document
export interface IMessage {
  sender: 'client' | 'team';
  senderName: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

// Interface for Feedback sub-document
export interface IFeedback {
  rating: number;
  comment: string;
  date: Date;
  clientName: string;
  publishedAsTestimonial: boolean;
  testimonialPublishedAt?: Date | null;
}

// Interface for Customization sub-document
export interface ICustomization {
  buttonColor: string;
  theme: 'light' | 'dark' | 'system';
  headerImage: string;
  logoImage: string;
}

// Interface for Activity Log sub-document
export interface IActivityLog {
  action: string;
  user: string;
  timestamp: Date;
}

export interface ISharedFile {
  name: string;
  url: string;
  category: "deliverable" | "asset" | "document" | "other";
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IStatusUpdate {
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  progress: number;
  note: string;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

// Main Project Interface with virtuals
export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  assignedDevId?: mongoose.Types.ObjectId | null;
  name: string;
  description: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  publicUrl: string;
  previewImage: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high';
  projectType: 'erp' | 'static' | 'dynamic' | 'apps' | 'ecommerce' | 'other';
  progress: number;
  startDate: Date;
  endDate: Date | null;
  expectedCompletionDate: Date | null;
  customClientId?: string;
  budget: number;
  budgetUsed: number;
  messages: IMessage[];
  feedback: IFeedback[];
  customization: ICustomization;
  activityLog: IActivityLog[];
  statusUpdates: IStatusUpdate[];
  sharedFiles: ISharedFile[];
  published?: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  // Virtuals
  daysRemaining: number | null;
  projectTypeDisplay: string;
  statusDisplay: { text: string; color: string };
}

// Message Schema
const messageSchema = new Schema<IMessage>({
  sender: { type: String, enum: ["client", "team"], required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

// Feedback Schema
const feedbackSchema = new Schema<IFeedback>({
  rating: { type: Number, min: 1, max: 5, default: 5 },
  comment: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  clientName: { type: String, default: "" },
  publishedAsTestimonial: { type: Boolean, default: false },
  testimonialPublishedAt: { type: Date, default: null }
});

// Customization Schema
const customizationSchema = new Schema<ICustomization>({
  buttonColor: { type: String, default: "#007AFF" },
  theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
  headerImage: { type: String, default: "" },
  logoImage: { type: String, default: "" }
});

// Activity Log Schema
const activityLogSchema = new Schema<IActivityLog>({
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const sharedFileSchema = new Schema<ISharedFile>({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["deliverable", "asset", "document", "other"],
    default: "document"
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const statusUpdateSchema = new Schema<IStatusUpdate>({
  status: { type: String, enum: ["pending", "in-progress", "completed", "on-hold"], required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  note: { type: String, default: "" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

// Main Project Schema
const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedDevId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true },
    description: { type: String, required: true },
    client: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientCompany: { type: String, default: "" },
    publicUrl: { type: String, default: "", trim: true },
    previewImage: { type: String, default: "", trim: true },
    
    status: { 
      type: String, 
      enum: ["pending", "in-progress", "completed", "on-hold"], 
      default: "pending" 
    },
    priority: { 
      type: String, 
      enum: ["low", "medium", "high"], 
      default: "medium" 
    },
    
    projectType: { 
      type: String, 
      enum: ["erp", "static", "dynamic", "apps", "ecommerce", "other"], 
      default: "other" 
    },
    
    progress: { 
      type: Number, 
      min: 0, 
      max: 100, 
      default: 0 
    },
    
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    expectedCompletionDate: { type: Date, default: null },
    
    customClientId: { type: String, trim: true, default: "" },
    
    budget: { type: Number, default: 0 },
    budgetUsed: { type: Number, default: 0 },
    
    messages: [messageSchema],
    feedback: [feedbackSchema],
    customization: { type: customizationSchema, default: () => ({}) },
    activityLog: [activityLogSchema],
    statusUpdates: [statusUpdateSchema],
    sharedFiles: { type: [sharedFileSchema], default: [] },
    published: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Calculate days remaining
projectSchema.virtual('daysRemaining').get(function(this: IProject) {
  if (!this.endDate) return null;
  const today = new Date();
  const end = new Date(this.endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual: Get project type display name
projectSchema.virtual('projectTypeDisplay').get(function(this: IProject) {
  const types: Record<string, string> = {
    erp: "ERP System",
    static: "Static Website",
    dynamic: "Dynamic Website",
    apps: "Mobile/Web App",
    ecommerce: "E-commerce Platform",
    other: "Other"
  };
  return types[this.projectType] || "Other";
});

// Virtual: Get status display text and color
projectSchema.virtual('statusDisplay').get(function(this: IProject) {
  const statuses: Record<string, { text: string; color: string }> = {
    pending: { text: "Pending", color: "#FF9500" },
    "in-progress": { text: "In Progress", color: "#007AFF" },
    completed: { text: "Completed", color: "#34C759" },
    "on-hold": { text: "On Hold", color: "#FF3B30" }
  };
  return statuses[this.status] || { text: this.status, color: "#8E8E93" };
});

export const Project = mongoose.model<IProject>("Project", projectSchema);
