"use strict";
// C:\wsd-server\src\controllers\task.controller.ts
// Task Controller - Full CRUD operations for tasks
// Features: Create, Read, Update, Delete with user authentication
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTaskById = exports.getTasks = void 0;
const Task_1 = require("../models/Task");
const mongoose_1 = __importDefault(require("mongoose"));
// Helper to get userId from request
const getUserId = (req) => {
    return req.userId || req.user?.id;
};
const normalizeNullableObjectId = (value) => {
    if (value === undefined) {
        return { hasValue: false, value: undefined };
    }
    if (value === null || value === "") {
        return { hasValue: true, value: null };
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(String(value))) {
        return { hasValue: true, invalid: true };
    }
    return {
        hasValue: true,
        value: new mongoose_1.default.Types.ObjectId(String(value)),
    };
};
const normalizeNullableDate = (value) => {
    if (value === undefined) {
        return { hasValue: false, value: undefined };
    }
    if (value === null || value === "") {
        return { hasValue: true, value: null };
    }
    const parsedDate = new Date(String(value));
    if (Number.isNaN(parsedDate.getTime())) {
        return { hasValue: true, invalid: true };
    }
    return { hasValue: true, value: parsedDate };
};
// Get all tasks for the authenticated user
const getTasks = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const tasks = await Task_1.Task.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: tasks });
    }
    catch (error) {
        console.error("Get tasks error:", error);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};
exports.getTasks = getTasks;
// Get single task by ID
const getTaskById = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await Task_1.Task.findOne({ _id: id, userId });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        console.error("Get task error:", error);
        res.status(500).json({ message: "Failed to fetch task" });
    }
};
exports.getTaskById = getTaskById;
// Create new task
const createTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { title, description, projectId, clientId, status, priority, dueDate, assignee } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Validate required fields
        if (!title) {
            return res.status(400).json({ message: "Missing required field: title" });
        }
        const task = await Task_1.Task.create({
            userId,
            title,
            description: description || "",
            projectId: projectId || null,
            clientId: clientId || null,
            status: status || "pending",
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : null,
            assignee: assignee || "",
        });
        res.status(201).json({ success: true, data: task });
    }
    catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({ message: "Failed to create task" });
    }
};
exports.createTask = createTask;
// Update task
const updateTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { title, description, projectId, clientId, status, priority, dueDate, assignee } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await Task_1.Task.findOne({ _id: id, userId });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        const normalizedProjectId = normalizeNullableObjectId(projectId);
        if ("invalid" in normalizedProjectId) {
            return res.status(400).json({ message: "Invalid projectId" });
        }
        const normalizedClientId = normalizeNullableObjectId(clientId);
        if ("invalid" in normalizedClientId) {
            return res.status(400).json({ message: "Invalid clientId" });
        }
        const normalizedDueDate = normalizeNullableDate(dueDate);
        if ("invalid" in normalizedDueDate) {
            return res.status(400).json({ message: "Invalid dueDate" });
        }
        if (title)
            task.title = title;
        if (description !== undefined)
            task.description = description;
        if (normalizedProjectId.hasValue)
            task.projectId = normalizedProjectId.value;
        if (normalizedClientId.hasValue)
            task.clientId = normalizedClientId.value;
        if (status)
            task.status = status;
        if (priority)
            task.priority = priority;
        if (normalizedDueDate.hasValue)
            task.dueDate = normalizedDueDate.value;
        if (assignee !== undefined)
            task.assignee = assignee;
        await task.save();
        res.json({ success: true, data: task });
    }
    catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({ message: "Failed to update task" });
    }
};
exports.updateTask = updateTask;
// Delete task
const deleteTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await Task_1.Task.findOneAndDelete({ _id: id, userId });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json({ success: true, message: "Task deleted successfully" });
    }
    catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({ message: "Failed to delete task" });
    }
};
exports.deleteTask = deleteTask;
