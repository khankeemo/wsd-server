"use strict";
// C:\wsd-server\src\routes\client.routes.ts
// Client Routes - All client API endpoints
// Endpoints: GET, POST, PUT, DELETE for clients
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_controller_1 = require("../controllers/client.controller");
const router = express_1.default.Router();
// All client routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/clients - Get all clients
router.get("/", client_controller_1.getClients);
// GET /api/clients/:id - Get single client
router.get("/:id", client_controller_1.getClientById);
// POST /api/clients - Create new client
router.post("/", client_controller_1.createClient);
// PUT /api/clients/:id - Update client
router.put("/:id", client_controller_1.updateClient);
// DELETE /api/clients/:id - Delete client
router.delete("/:id", client_controller_1.deleteClient);
exports.default = router;
