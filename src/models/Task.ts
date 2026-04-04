// C:\wsd-server\src\models\Task.ts
// Task Model - Schema for task management
// Fields: title, description, projectId, clientId, status, priority, dueDate, assignee

import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
  status: { 
    type: String, 
    enum: ["pending", "in-progress", "completed", "review"], 
    default: "pending" 
  },
  priority: { 
    type: String, 
    enum: ["low", "medium", "high"], 
    default: "medium" 
  },
  dueDate: { type: Date, default: null },
  assignee: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Task = mongoose.model("Task", taskSchema);