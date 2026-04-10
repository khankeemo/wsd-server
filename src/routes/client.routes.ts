// C:\wsd-server\src\routes\client.routes.ts
// Client Routes - All client API endpoints
// Endpoints: GET, POST, PUT, DELETE for clients

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} from "../controllers/client.controller";

const router = express.Router();

router.get("/public", getClients);

// All client routes require authentication
router.use(authMiddleware);
router.use(requireRoles("admin"));

// GET /api/clients - Get all clients
router.get("/", getClients);

// GET /api/clients/:id - Get single client
router.get("/:id", getClientById);

// POST /api/clients - Create new client
router.post("/", createClient);

// PUT /api/clients/:id - Update client
router.put("/:id", updateClient);

// DELETE /api/clients/:id - Delete client
router.delete("/:id", deleteClient);

export default router;
