import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // Admin user ID
  senderId?: mongoose.Types.ObjectId;  // Client user ID
  type: 'client_setup_complete' | 'client_approval_required' | 'other';
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { 
      type: String, 
      enum: ['client_setup_complete', 'client_approval_required', 'other'], 
      default: 'other' 
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
