// C:\wsd-server\src\models\Task.ts
// Task Model - Schema for task management
// Fields: title, description, projectId, clientId, status, priority, dueDate, assignee

import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskCommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "review"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date, default: null },
    assignee: { type: String, default: "" },
    completionNote: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    subtasks: { type: [subtaskSchema], default: [] },
    comments: { type: [taskCommentSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.model("Task", taskSchema);
