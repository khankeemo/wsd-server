import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  provider: { type: String, enum: ['google', 'yahoo', null], default: null },
  providerId: { type: String, default: null },
  isOAuthUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model("User", userSchema);