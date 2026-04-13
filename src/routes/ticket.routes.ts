import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  addTicketReply,
  bulkUpdateTicketStatus,
  createPublicTicket,
  createTicket,
  deleteTicket,
  getTickets,
  sendResolutionEmail,
  updateTicketStatus,
} from "../controllers/ticket.controller";

const router = Router();

router.post("/public", createPublicTicket);

router.use(authMiddleware);
router.get("/", getTickets);
router.post("/", createTicket);
router.put("/:id/status", updateTicketStatus);
router.post("/:id/replies", addTicketReply);
router.delete("/:id", deleteTicket);
router.post("/bulk-status", bulkUpdateTicketStatus);
router.post("/:id/send-resolution-email", sendResolutionEmail);

export default router;
