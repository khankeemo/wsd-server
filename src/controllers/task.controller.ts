// C:\wsd-server\src\controllers\task.controller.ts
// Task Controller - Full CRUD operations for tasks
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import { Task } from "../models/Task";
import mongoose from "mongoose";

// Helper to get userId from request
const getUserId = (req: Request): string | undefined => {
  return (req as any).userId || (req as any).user?.id;
};

const normalizeNullableObjectId = (value: unknown) => {
  if (value === undefined) {
    return { hasValue: false as const, value: undefined };
  }

  if (value === null || value === "") {
    return { hasValue: true as const, value: null };
  }

  if (!mongoose.Types.ObjectId.isValid(String(value))) {
    return { hasValue: true as const, invalid: true as const };
  }

  return {
    hasValue: true as const,
    value: new mongoose.Types.ObjectId(String(value)),
  };
};

const normalizeNullableDate = (value: unknown) => {
  if (value === undefined) {
    return { hasValue: false as const, value: undefined };
  }

  if (value === null || value === "") {
    return { hasValue: true as const, value: null };
  }

  const parsedDate = new Date(String(value));
  if (Number.isNaN(parsedDate.getTime())) {
    return { hasValue: true as const, invalid: true as const };
  }

  return { hasValue: true as const, value: parsedDate };
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

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (normalizedProjectId.hasValue) task.projectId = normalizedProjectId.value;
    if (normalizedClientId.hasValue) task.clientId = normalizedClientId.value;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (normalizedDueDate.hasValue) task.dueDate = normalizedDueDate.value;
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
