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
const taskSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    projectId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Project", default: null },
    clientId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Client", default: null },
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
exports.Task = mongoose_1.default.model("Task", taskSchema);
