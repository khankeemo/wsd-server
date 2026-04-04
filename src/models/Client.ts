// C:\wsd-server\src\models\Client.ts
// Client Model - Schema for client management
// Fields: name, email, phone, company, address, status

import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: "" },
  company: { type: String, default: "" },
  address: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["active", "inactive"], 
    default: "active" 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Client = mongoose.model("Client", clientSchema);