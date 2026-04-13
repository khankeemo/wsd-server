import { Request, Response } from "express";
import {
  deleteMessageForSender,
  listConversations,
  listMessagesBetween,
  markConversationRead,
  markMessageRead,
  messageStats,
  searchUserMessages,
  sendDirectMessage,
  unreadCountForUser,
} from "../services/message.service";

const userId = (req: Request) => String((req as any).userId || "");

export const getConversations = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await listConversations(uid);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getConversations error:", error);
    res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
};

export const getMessagesWithPeer = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const peerId = req.params.peerId;
    const result = await listMessagesBetween(uid, peerId);
    if ("error" in result) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("getMessagesWithPeer error:", error);
    res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

export const postSendMessage = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { receiverId, content, type = "text" } = req.body || {};
    const result = await sendDirectMessage(uid, String(receiverId || ""), String(content || ""), type);
    if ("error" in result) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("postSendMessage error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

export const patchConversationRead = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { peerId } = req.params;
    const result = await markConversationRead(uid, peerId);
    if ("error" in result) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.status(200).json({ success: true, message: "Conversation marked as read" });
  } catch (error) {
    console.error("patchConversationRead error:", error);
    res.status(500).json({ success: false, message: "Failed to update conversation" });
  }
};

export const patchMessageRead = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { messageId } = req.params;
    const result = await markMessageRead(uid, messageId);
    if ("error" in result) {
      return res.status(404).json({ success: false, message: result.error });
    }
    res.status(200).json({ success: true, message: "Message marked as read" });
  } catch (error) {
    console.error("patchMessageRead error:", error);
    res.status(500).json({ success: false, message: "Failed to update message" });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { messageId } = req.params;
    const result = await deleteMessageForSender(uid, messageId);
    if ("error" in result) {
      return res.status(404).json({ success: false, message: result.error });
    }
    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({ success: false, message: "Failed to delete message" });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const count = await unreadCountForUser(uid);
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
};

export const getMessageStats = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await messageStats(uid);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getMessageStats error:", error);
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
};

export const getSearchMessages = async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const q = String((req.query as any).q || "");
    const conversationId = (req.query as any).conversationId as string | undefined;
    if (!q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }
    const data = await searchUserMessages(uid, q, conversationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getSearchMessages error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

export const postTypingStub = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true });
};

export const postUploadStub = async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: "File attachments for chat are not configured on this server yet.",
  });
};
