import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { createTicket, getTickets, updateTicketStatus, bulkUpdateTicketStatus, sendResolutionEmail } from "../controllers/ticket.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getTickets);
router.post("/", createTicket);
router.put("/:id/status", updateTicketStatus);
router.post("/bulk-status", bulkUpdateTicketStatus);
router.post("/:id/send-resolution-email", sendResolutionEmail);

export default router;
