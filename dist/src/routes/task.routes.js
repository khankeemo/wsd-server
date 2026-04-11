"use strict";
// C:\wsd-server\src\routes\task.routes.ts
// Task Routes - All task API endpoints
// Endpoints: GET, POST, PUT, DELETE for tasks
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const task_controller_1 = require("../controllers/task.controller");
const router = express_1.default.Router();
// All task routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/tasks - Get all tasks
router.get("/", task_controller_1.getTasks);
// GET /api/tasks/:id - Get single task
router.get("/:id", task_controller_1.getTaskById);
// POST /api/tasks - Create new task
router.post("/", task_controller_1.createTask);
// PUT /api/tasks/:id - Update task
router.put("/:id", task_controller_1.updateTask);
// PUT /api/tasks/:id/status - Update task status
router.put("/:id/status", task_controller_1.updateTaskStatus);
// DELETE /api/tasks/:id - Delete task
router.delete("/:id", task_controller_1.deleteTask);
// POST /api/tasks/bulk-status - Bulk update task statuses (for Kanban)
router.post("/bulk-status", task_controller_1.bulkUpdateTaskStatus);
// POST /api/tasks/:id/comments - Add comment to task
router.post("/:id/comments", task_controller_1.addTaskComment);
// POST /api/tasks/:id/subtasks - Add subtask
router.post("/:id/subtasks", task_controller_1.addSubtask);
// PATCH /api/tasks/:id/subtasks/:subtaskId - Toggle subtask completion
router.patch("/:id/subtasks/:subtaskId", task_controller_1.toggleSubtask);
exports.default = router;
