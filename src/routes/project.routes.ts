// C:\wsd-server\src\routes\project.routes.ts
// Project Routes - All project API endpoints
// Endpoints: GET, POST, PUT, DELETE for projects
// ADDED: Status, Progress, Messages, Feedback, Customization routes

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProgress,
  updateProjectStatus,
  getProjectStatus,
  getAllProjectsStatus,
  getPublishedProjects,
  addMessage,
  getMessages,
  addFeedback,
  getFeedback,
  updateCustomization,
  bulkUpdateProjectStatus,
  togglePublish
} from "../controllers/project.controller";

const router = express.Router();

router.get("/public", getPublishedProjects);

// All project routes require authentication
router.use(authMiddleware);

// ============================================================
// BASIC CRUD ROUTES
// ============================================================

// GET /api/projects - Get all projects
router.get("/", getProjects);

// GET /api/projects/status/all - Get all projects status summary
router.get("/status/all", getAllProjectsStatus);

// GET /api/projects/:id - Get single project
router.get("/:id", getProjectById);

// POST /api/projects - Create new project
router.post("/", createProject);

// PUT /api/projects/:id - Update project
router.put("/:id", updateProject);

// DELETE /api/projects/:id - Delete project
router.delete("/:id", deleteProject);

// ============================================================
// STATUS & PROGRESS ROUTES (NEW)
// ============================================================

// PUT /api/projects/:id/progress - Update project progress
router.put("/:id/progress", updateProgress);

// GET /api/projects/:id/status - Get complete status for 8 cards
router.get("/:id/status", getProjectStatus);

// PUT /api/projects/:id/status - Update project status
router.put("/:id/status", updateProjectStatus);

// ============================================================
// MESSAGE ROUTES (Q&A - Card #5)
// ============================================================

// POST /api/projects/:id/messages - Add new message to conversation
router.post("/:id/messages", addMessage);

// GET /api/projects/:id/messages - Get all messages for a project
router.get("/:id/messages", getMessages);

// ============================================================
// FEEDBACK ROUTES (Card #6)
// ============================================================

// POST /api/projects/:id/feedback - Add client feedback
router.post("/:id/feedback", addFeedback);

// GET /api/projects/:id/feedback - Get all feedback for a project
router.get("/:id/feedback", getFeedback);

// ============================================================
// CUSTOMIZATION ROUTES (Card #7)
// ============================================================

// PUT /api/projects/:id/customization - Update project customization
router.put("/:id/customization", updateCustomization);

// POST /api/projects/bulk-status - Bulk update project statuses (for Kanban)
router.post("/bulk-status", bulkUpdateProjectStatus);

// PATCH /api/projects/:id/publish - Toggle project publish status
router.patch("/:id/publish", togglePublish);

export default router;
