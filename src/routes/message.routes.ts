// PATH: C:\wsd-server\src\routes\message.routes.ts
// Direct messages — static paths must be registered before /:param routes.

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { messageUpload } from "../middleware/messageUpload.middleware";
import {
  deleteMessage,
  getConversations,
  getMessageStats,
  getMessagesWithPeer,
  getSearchMessages,
  getUnreadCount,
  patchConversationRead,
  patchMessageRead,
  postSendMessage,
  postTypingStub,
  postUploadMessageFile,
} from "../controllers/message.controller";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", getConversations);
router.get("/unread/count", getUnreadCount);
router.get("/stats", getMessageStats);
router.get("/search", getSearchMessages);

router.post("/send", postSendMessage);
router.post("/typing", postTypingStub);
router.post(
  "/upload",
  (req, res, next) => {
    messageUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json({ success: false, message });
      }
      next();
    });
  },
  postUploadMessageFile
);

router.patch("/conversations/:peerId/read", patchConversationRead);
router.patch("/:messageId/read", patchMessageRead);
router.delete("/:messageId", deleteMessage);

router.get("/:peerId", getMessagesWithPeer);

export default router;
