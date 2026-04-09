import express from "express";
import { getAllClients, approveClient, getNotifications, markNotificationRead } from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";

const router = express.Router();

// All admin routes are protected by authMiddleware and require "admin" role
router.use(authMiddleware);
router.use(requireRoles("admin"));

router.get("/clients", getAllClients);
router.patch("/clients/:id/approve", approveClient);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
