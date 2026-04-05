import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { createTicket, getTickets, updateTicketStatus } from "../controllers/ticket.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getTickets);
router.post("/", createTicket);
router.put("/:id/status", updateTicketStatus);

export default router;
