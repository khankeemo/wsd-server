import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDirectMessage extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  type: "text" | "image" | "file";
  status: "sent" | "delivered" | "read";
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    type: { type: String, enum: ["text", "image", "file"], default: "text" },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    readAt: { type: Date },
  },
  { timestamps: true }
);

DirectMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
DirectMessageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IDirectMessage>("DirectMessage", DirectMessageSchema);
