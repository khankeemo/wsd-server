// C:\wsd-server\src\models\Client.ts
// Client Model - Schema for client management
// Fields: name, email, phone, company, address, status

import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      minlength: [2, "Client name must be at least 2 characters"],
      maxlength: [100, "Client name must be at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [emailRegex, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number must be at most 30 characters"],
      default: "",
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name must be at most 100 characters"],
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address must be at most 300 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    customId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ userId: 1, email: 1 }, { unique: true });

export const Client = mongoose.model("Client", clientSchema);
