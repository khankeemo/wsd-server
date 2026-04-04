// C:\wsd-server\src\controllers\task.controller.ts
// Task Controller - Full CRUD operations for tasks
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import { Task } from "../models/Task";

// Helper to get userId from request
const getUserId = (req: Request): string | undefined => {
  return (req as any).userId || (req as any).user?.id;
};

// Get all tasks for the authenticated user
export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

// Get single task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await Task.findOne({ _id: id, userId });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
};

// Create new task
export const createTask = async (req: Request, res: Response) => {
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

    const task = await Task.create({
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
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, description, projectId, clientId, status, priority, dueDate, assignee } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await Task.findOne({ _id: id, userId });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (projectId !== undefined) task.projectId = projectId;
    if (clientId !== undefined) task.clientId = clientId;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (assignee !== undefined) task.assignee = assignee;

    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await Task.findOneAndDelete({ _id: id, userId });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
};