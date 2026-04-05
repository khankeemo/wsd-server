import express from "express";
import { createLead } from "../controllers/lead.controller";
import { leadRateLimiter } from "../middleware/leadRateLimiter.middleware";

const router = express.Router();

router.post("/", leadRateLimiter, createLead);

export default router;
