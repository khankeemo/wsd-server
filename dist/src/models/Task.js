"use strict";
// C:\wsd-server\src\models\Task.ts
// Task Model - Schema for task management
// Fields: title, description, projectId, clientId, status, priority, dueDate, assignee
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const subtaskSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
}, { _id: true });
const taskCommentSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });
const taskSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    developerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    projectId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Project", default: null },
    clientId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", default: null },
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
}, {
    timestamps: true,
});
exports.Task = mongoose_1.default.model("Task", taskSchema);
