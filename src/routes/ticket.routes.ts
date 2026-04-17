import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { ticketUpload } from "../middleware/ticketUpload.middleware";
import {
  addTicketReply,
  bulkUpdateTicketStatus,
  createPublicTicket,
  createTicket,
  deleteTicket,
  getTickets,
  sendResolutionEmail,
  updateTicketStatus,
  uploadTicketImage,
} from "../controllers/ticket.controller";

const router = Router();

router.post("/public", createPublicTicket);

router.use(authMiddleware);

router.post(
  "/upload",
  (req, res, next) => {
    ticketUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json({ success: false, message });
      }
      next();
    });
  },
  uploadTicketImage
);

router.get("/", getTickets);
router.post("/", createTicket);
router.put("/:id/status", updateTicketStatus);
router.post("/:id/replies", addTicketReply);
router.delete("/:id", deleteTicket);
router.post("/bulk-status", bulkUpdateTicketStatus);
router.post("/:id/send-resolution-email", sendResolutionEmail);

export default router;
