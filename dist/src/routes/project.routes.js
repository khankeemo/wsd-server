"use strict";
// C:\wsd-server\src\routes\project.routes.ts
// Project Routes - All project API endpoints
// Endpoints: GET, POST, PUT, DELETE for projects
// ADDED: Status, Progress, Messages, Feedback, Customization routes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const project_controller_1 = require("../controllers/project.controller");
const router = express_1.default.Router();
// All project routes require authentication
router.use(auth_middleware_1.authMiddleware);
// ============================================================
// BASIC CRUD ROUTES
// ============================================================
// GET /api/projects - Get all projects
router.get("/", project_controller_1.getProjects);
// GET /api/projects/:id - Get single project
router.get("/:id", project_controller_1.getProjectById);
// POST /api/projects - Create new project
router.post("/", project_controller_1.createProject);
// PUT /api/projects/:id - Update project
router.put("/:id", project_controller_1.updateProject);
// DELETE /api/projects/:id - Delete project
router.delete("/:id", project_controller_1.deleteProject);
// ============================================================
// STATUS & PROGRESS ROUTES (NEW)
// ============================================================
// PUT /api/projects/:id/progress - Update project progress
router.put("/:id/progress", project_controller_1.updateProgress);
// GET /api/projects/:id/status - Get complete status for 8 cards
router.get("/:id/status", project_controller_1.getProjectStatus);
// GET /api/projects/status/all - Get all projects status summary
router.get("/status/all", project_controller_1.getAllProjectsStatus);
// ============================================================
// MESSAGE ROUTES (Q&A - Card #5)
// ============================================================
// POST /api/projects/:id/messages - Add new message to conversation
router.post("/:id/messages", project_controller_1.addMessage);
// GET /api/projects/:id/messages - Get all messages for a project
router.get("/:id/messages", project_controller_1.getMessages);
// ============================================================
// FEEDBACK ROUTES (Card #6)
// ============================================================
// POST /api/projects/:id/feedback - Add client feedback
router.post("/:id/feedback", project_controller_1.addFeedback);
// GET /api/projects/:id/feedback - Get all feedback for a project
router.get("/:id/feedback", project_controller_1.getFeedback);
// ============================================================
// CUSTOMIZATION ROUTES (Card #7)
// ============================================================
// PUT /api/projects/:id/customization - Update project customization
router.put("/:id/customization", project_controller_1.updateCustomization);
exports.default = router;
