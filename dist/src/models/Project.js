"use strict";
// C:\wsd-server\src\models\Project.ts
// Project Model - Schema for project management
// Fields: name, description, client, status, priority, startDate, endDate, budget
// ADDED: progress, projectType, messages, feedback, customization for status dashboard
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Message Schema
const messageSchema = new mongoose_1.Schema({
    sender: { type: String, enum: ["client", "team"], required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});
// Feedback Schema
const feedbackSchema = new mongoose_1.Schema({
    rating: { type: Number, min: 1, max: 5, default: 5 },
    comment: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    clientName: { type: String, default: "" }
});
// Customization Schema
const customizationSchema = new mongoose_1.Schema({
    buttonColor: { type: String, default: "#007AFF" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
    headerImage: { type: String, default: "" },
    logoImage: { type: String, default: "" }
});
// Activity Log Schema
const activityLogSchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
// Main Project Schema
const projectSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    client: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientCompany: { type: String, default: "" },
    status: {
        type: String,
        enum: ["pending", "in-progress", "completed", "on-hold"],
        default: "pending"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    projectType: {
        type: String,
        enum: ["erp", "static", "dynamic", "apps", "ecommerce", "other"],
        default: "other"
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    budget: { type: Number, default: 0 },
    budgetUsed: { type: Number, default: 0 },
    messages: [messageSchema],
    feedback: [feedbackSchema],
    customization: { type: customizationSchema, default: () => ({}) },
    activityLog: [activityLogSchema],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Virtual: Calculate days remaining
projectSchema.virtual('daysRemaining').get(function () {
    if (!this.endDate)
        return null;
    const today = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});
// Virtual: Get project type display name
projectSchema.virtual('projectTypeDisplay').get(function () {
    const types = {
        erp: "ERP System",
        static: "Static Website",
        dynamic: "Dynamic Website",
        apps: "Mobile/Web App",
        ecommerce: "E-commerce Platform",
        other: "Other"
    };
    return types[this.projectType] || "Other";
});
// Virtual: Get status display text and color
projectSchema.virtual('statusDisplay').get(function () {
    const statuses = {
        pending: { text: "Pending", color: "#FF9500" },
        "in-progress": { text: "In Progress", color: "#007AFF" },
        completed: { text: "Completed", color: "#34C759" },
        "on-hold": { text: "On Hold", color: "#FF3B30" }
    };
    return statuses[this.status] || { text: this.status, color: "#8E8E93" };
});
exports.Project = mongoose_1.default.model("Project", projectSchema);
