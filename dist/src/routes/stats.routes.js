"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stats_controller_1 = require("../controllers/stats.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.get("/", auth_middleware_1.authMiddleware, stats_controller_1.getDashboardStats);
// GET /api/stats/developer - Developer-specific dashboard stats
router.get("/developer", auth_middleware_1.authMiddleware, stats_controller_1.getDeveloperStats);
exports.default = router;
