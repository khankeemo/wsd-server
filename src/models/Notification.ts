import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type:
    | "client_setup_complete"
    | "client_approval_required"
    | "task_completed"
    | "task_assigned"
    | "query_created"
    | "query_updated"
    | "project_status_changed"
    | "other";
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { 
      type: String, 
      enum: [
        "client_setup_complete",
        "client_approval_required",
        "task_completed",
        "task_assigned",
        "query_created",
        "query_updated",
        "project_status_changed",
        "other",
      ], 
      default: 'other' 
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
