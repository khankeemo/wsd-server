// C:\wsd-server\src\controllers\task.controller.ts
// Task Controller - Full CRUD operations for tasks
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import { Task } from "../models/Task";
import mongoose from "mongoose";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";

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
    const role = (req as any).user?.role;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope =
      role === "admin"
        ? { userId }
        : role === "developer"
          ? { developerId: userId }
          : { clientId: userId };

    const filters: Record<string, unknown> = { ...scope };
    if (req.query.projectId) {
      filters.projectId = String(req.query.projectId);
    }
    if (req.query.status) {
      filters.status = String(req.query.status);
    }

    const tasks = await Task.find(filters)
      .populate("projectId", "name status progress")
      .populate("clientId", "name email")
      .populate("developerId", "name email customId")
      .sort({ createdAt: -1 });
    
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
    const role = (req as any).user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope =
      role === "admin"
        ? { _id: id, userId }
        : role === "developer"
          ? { _id: id, developerId: userId }
          : { _id: id, clientId: userId };

    const task = await Task.findOne(scope)
      .populate("projectId", "name status progress")
      .populate("clientId", "name email")
      .populate("developerId", "name email customId");
    
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
    const role = (req as any).user?.role;
    const { title, description, projectId, clientId, developerId, status, priority, dueDate, assignee, subtasks = [] } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role !== "admin" && role !== "developer") {
      return res.status(403).json({ message: "Only admins and developers can create tasks" });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Missing required field: title" });
    }

    // Resolve project, client, and developer IDs
    let resolvedClientId = clientId || null;
    let resolvedDeveloperId = developerId || null;
    let resolvedAssignee = assignee || "";
    let resolvedProjectId = projectId || null;
    let taskOwnerId = userId; // Default to current user

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      resolvedProjectId = String(project._id);
      resolvedClientId = resolvedClientId || String(project.clientId || "");
      resolvedDeveloperId = resolvedDeveloperId || String(project.assignedDevId || "");
      // If developer is creating task, set owner to project owner (admin)
      if (role === "developer") {
        taskOwnerId = String(project.userId);
      }
    }

    if (resolvedDeveloperId) {
      const developer = await User.findOne({ _id: resolvedDeveloperId, role: "developer" });
      if (!developer) {
        return res.status(404).json({ message: "Assigned developer not found" });
      }
      resolvedAssignee = developer.name;
    }

    // If developer is creating task without project, auto-assign to themselves
    if (role === "developer" && !resolvedDeveloperId) {
      resolvedDeveloperId = userId;
      const developer = await User.findById(userId);
      if (developer) {
        resolvedAssignee = developer.name;
      }
    }

    const task = await Task.create({
      userId: taskOwnerId,
      title,
      description: description || "",
      projectId: resolvedProjectId || null,
      clientId: resolvedClientId || null,
      developerId: resolvedDeveloperId || null,
      status: status || "pending",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignee: resolvedAssignee,
      subtasks,
    });

    // Send notification to admin when developer creates task
    if (role === "developer" && task.userId) {
      await Notification.create({
        recipientId: task.userId,
        senderId: userId,
        type: "task_created_by_developer",
        message: `New task created by developer: ${title}`,
        metadata: { taskId: task._id, projectId: resolvedProjectId },
      });
    }

    // Send notification to developer when admin assigns task
    if (role === "admin" && resolvedDeveloperId) {
      await Notification.create({
        recipientId: resolvedDeveloperId,
        senderId: userId,
        type: "task_assigned",
        message: `You have been assigned a new task: ${title}`,
        metadata: { taskId: task._id, projectId: resolvedProjectId },
      });
    }

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
    const role = (req as any).user?.role;
    const { id } = req.params;
    const { title, description, projectId, clientId, developerId, status, priority, dueDate, assignee, completionNote, subtasks, comments } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope =
      role === "admin"
        ? { _id: id, userId }
        : role === "developer"
          ? { _id: id, developerId: userId }
          : { _id: id, clientId: userId };

    const task = await Task.findOne(scope);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (role === "client") {
      return res.status(403).json({ message: "Clients can only view tasks" });
    }

    const normalizedProjectId = normalizeNullableObjectId(projectId);
    if ("invalid" in normalizedProjectId) {
      return res.status(400).json({ message: "Invalid projectId" });
    }

    const normalizedClientId = normalizeNullableObjectId(clientId);
    if ("invalid" in normalizedClientId) {
      return res.status(400).json({ message: "Invalid clientId" });
    }

    const normalizedDeveloperId = normalizeNullableObjectId(developerId);
    if ("invalid" in normalizedDeveloperId) {
      return res.status(400).json({ message: "Invalid developerId" });
    }

    const normalizedDueDate = normalizeNullableDate(dueDate);
    if ("invalid" in normalizedDueDate) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (role === "admin" && normalizedProjectId.hasValue) task.projectId = normalizedProjectId.value;
    if (role === "admin" && normalizedClientId.hasValue) task.clientId = normalizedClientId.value;
    if (role === "admin" && normalizedDeveloperId.hasValue) {
      task.developerId = normalizedDeveloperId.value;
    }
    if (status) task.status = status;
    if (role === "admin" && priority) task.priority = priority;
    if (normalizedDueDate.hasValue) task.dueDate = normalizedDueDate.value;
    if (role === "admin" && assignee !== undefined) task.assignee = assignee;
    if (completionNote !== undefined) task.completionNote = completionNote;
    if (subtasks !== undefined && role === "admin") task.subtasks = subtasks;
    if (comments !== undefined && Array.isArray(comments)) task.set("comments", comments);
    if (task.status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    if (role === "developer" && status && !["pending", "in-progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Developers can only move tasks through the delivery workflow" });
    }

    await task.save();

    if (task.status === "completed") {
      const recipients = [task.userId, task.clientId].filter(Boolean);
      if (recipients.length > 0) {
        await Notification.insertMany(
          recipients.map((recipientId) => ({
            recipientId,
            senderId: userId,
            type: "task_completed",
            message: `${task.title} has been marked as completed`,
            metadata: { taskId: task._id, projectId: task.projectId },
          }))
        );
      }
    }

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
    const role = (req as any).user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete tasks" });
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

export const updateTaskStatus = async (req: Request, res: Response) => {
  return updateTask(req, res);
};

// Bulk update task statuses (for Kanban drag-and-drop)
export const bulkUpdateTaskStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const role = (req as any).user?.role;
    const { updates } = req.body; // [{ id, status }]

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!role || !["admin", "developer"].includes(role)) {
      return res.status(403).json({ message: "Only admins and developers can bulk update tasks" });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    const results = [];
    for (const update of updates) {
      const scope =
        role === "admin"
          ? { _id: update.id, userId }
          : { _id: update.id, developerId: userId };

      const task = await Task.findOne(scope);
      if (!task) continue;

      if (update.status) {
        task.status = update.status;
        if (update.status === "completed" && !task.completedAt) {
          task.completedAt = new Date();
        }
      }

      await task.save();

      // Send notification if task is completed
      if (task.status === "completed" && task.userId && task.clientId) {
        const recipients = [task.userId, task.clientId].filter(Boolean);
        if (recipients.length > 0) {
          await Notification.insertMany(
            recipients.map((recipientId) => ({
              recipientId,
              senderId: userId,
              type: "task_completed",
              message: `${task.title} has been marked as completed`,
              metadata: { taskId: task._id, projectId: task.projectId },
            }))
          );
        }
      }

      results.push({ id: update.id, success: true });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Bulk update tasks error:", error);
    res.status(500).json({ message: "Failed to bulk update tasks" });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = (req as any).user;
    const { id } = req.params;
    const { content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const role = (req as any).user?.role;
    const scope =
      role === "admin"
        ? { _id: id, userId }
        : role === "developer"
          ? { _id: id, developerId: userId }
          : { _id: id, clientId: userId };

    const task = await Task.findOne(scope);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.comments.push({
      userId: new mongoose.Types.ObjectId(userId),
      authorName: user?.name || "Unknown",
      content,
      createdAt: new Date(),
    });

    await task.save();

    res.json({ success: true, data: task.comments });
  } catch (error) {
    console.error("Add task comment error:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

export const toggleSubtask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id, subtaskId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = (req as any).user?.role;
    const scope =
      role === "admin"
        ? { _id: id, userId }
        : role === "developer"
          ? { _id: id, developerId: userId }
          : { _id: id, clientId: userId };

    const task = await Task.findOne(scope);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    subtask.completed = !subtask.completed;
    await task.save();

    res.json({ success: true, data: task.subtasks });
  } catch (error) {
    console.error("Toggle subtask error:", error);
    res.status(500).json({ message: "Failed to toggle subtask" });
  }
};

export const addSubtask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const role = (req as any).user?.role;
    if (!["admin", "developer"].includes(role)) {
      return res.status(403).json({ message: "Only admins and developers can add subtasks" });
    }

    const scope =
      role === "admin"
        ? { _id: id, userId }
        : { _id: id, developerId: userId };

    const task = await Task.findOne(scope);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.subtasks.push({ title, completed: false } as any);
    await task.save();

    res.json({ success: true, data: task.subtasks });
  } catch (error) {
    console.error("Add subtask error:", error);
    res.status(500).json({ message: "Failed to add subtask" });
  }
};
