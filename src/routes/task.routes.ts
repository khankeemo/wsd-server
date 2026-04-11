// C:\wsd-server\src\routes\task.routes.ts
// Task Routes - All task API endpoints
// Endpoints: GET, POST, PUT, DELETE for tasks

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTaskStatus,
  addTaskComment,
  toggleSubtask,
  addSubtask
} from "../controllers/task.controller";

const router = express.Router();

// All task routes require authentication
router.use(authMiddleware);

// GET /api/tasks - Get all tasks
router.get("/", getTasks);

// GET /api/tasks/:id - Get single task
router.get("/:id", getTaskById);

// POST /api/tasks - Create new task
router.post("/", createTask);

// PUT /api/tasks/:id - Update task
router.put("/:id", updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", deleteTask);

// POST /api/tasks/bulk-status - Bulk update task statuses (for Kanban)
router.post("/bulk-status", bulkUpdateTaskStatus);

// POST /api/tasks/:id/comments - Add comment to task
router.post("/:id/comments", addTaskComment);

// POST /api/tasks/:id/subtasks - Add subtask
router.post("/:id/subtasks", addSubtask);

// PATCH /api/tasks/:id/subtasks/:subtaskId - Toggle subtask completion
router.patch("/:id/subtasks/:subtaskId", toggleSubtask);

export default router;