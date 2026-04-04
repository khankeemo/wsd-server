import express from "express";
import { getDashboardStats } from "../controllers/stats.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getDashboardStats);

export default router;