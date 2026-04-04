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
  deleteTask
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

export default router;