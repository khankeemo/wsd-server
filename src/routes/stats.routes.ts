import express from "express";
import { getDashboardStats, getDeveloperStats } from "../controllers/stats.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getDashboardStats);

// GET /api/stats/developer - Developer-specific dashboard stats
router.get("/developer", authMiddleware, getDeveloperStats);

export default router;