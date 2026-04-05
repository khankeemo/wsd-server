import express from "express";
import { getServices } from "../controllers/lead.controller";
import {
  createService,
  deleteService,
  getAllServices,
  updateService,
} from "../controllers/service.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";

const router = express.Router();

router.get("/", getServices);
router.get("/admin", authMiddleware, requireRoles("admin"), getAllServices);
router.post("/", authMiddleware, requireRoles("admin"), createService);
router.put("/:id", authMiddleware, requireRoles("admin"), updateService);
router.delete("/:id", authMiddleware, requireRoles("admin"), deleteService);

export default router;
