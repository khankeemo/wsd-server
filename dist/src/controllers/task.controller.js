"use strict";
// C:\wsd-server\src\controllers\task.controller.ts
// Task Controller - Full CRUD operations for tasks
// Features: Create, Read, Update, Delete with user authentication
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTaskById = exports.getTasks = void 0;
const Task_1 = require("../models/Task");
// Helper to get userId from request
const getUserId = (req) => {
    return req.userId || req.user?.id;
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
        if (title)
            task.title = title;
        if (description !== undefined)
            task.description = description;
        if (projectId !== undefined)
            task.projectId = projectId;
        if (clientId !== undefined)
            task.clientId = clientId;
        if (status)
            task.status = status;
        if (priority)
            task.priority = priority;
        if (dueDate)
            task.dueDate = new Date(dueDate);
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
