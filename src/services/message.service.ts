import mongoose from "mongoose";
import DirectMessage from "../models/Message";
import User from "../models/User";

const refId = (x: any): string => {
  if (!x) return "";
  if (typeof x === "object" && x._id) return String(x._id);
  return String(x);
};

const roleLabel = (role?: string) => {
  if (role === "admin") return "Administrator";
  if (role === "developer") return "Developer";
  if (role === "client") return "Client";
  return "Team member";
};

export const formatMessageDoc = (doc: any, userId: string) => ({
  _id: String(doc._id),
  senderId: refId(doc.senderId),
  receiverId: refId(doc.receiverId),
  content: doc.content,
  type: doc.type || "text",
  status: doc.status || "sent",
  timestamp: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  readAt: doc.readAt ? new Date(doc.readAt).toISOString() : undefined,
});

export async function listConversations(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const rows = await DirectMessage.find({
    $or: [{ senderId: uid }, { receiverId: uid }],
  })
    .sort({ createdAt: -1 })
    .populate("senderId", "name email role")
    .populate("receiverId", "name email role")
    .lean();

  const peerLatest = new Map<string, (typeof rows)[0]>();
  const peerUnread = new Map<string, number>();

  for (const m of rows) {
    const sid = refId(m.senderId);
    const rid = refId(m.receiverId);
    const peer = sid === userId ? rid : sid;
    if (!peerLatest.has(peer)) {
      peerLatest.set(peer, m);
    }
    if (rid === userId && m.status !== "read") {
      peerUnread.set(peer, (peerUnread.get(peer) || 0) + 1);
    }
  }

  const conversations: any[] = [];
  for (const [peerId, last] of peerLatest) {
    const peerUser =
      refId(last.senderId) === peerId ? last.senderId : last.receiverId;
    const peerObj = typeof peerUser === "object" && peerUser ? peerUser : null;
    const name = (peerObj as any)?.name || "Unknown user";
    const role = (peerObj as any)?.role as string | undefined;
    const preview = String(last.content || "").slice(0, 120);
    const ts = last.createdAt ? new Date(last.createdAt).toISOString() : new Date().toISOString();

    conversations.push({
      _id: peerId,
      participantId: peerId,
      participantName: name,
      participantAvatar: name.charAt(0).toUpperCase(),
      participantRole: roleLabel(role),
      lastMessage: preview,
      lastMessageTime: ts,
      unreadCount: peerUnread.get(peerId) || 0,
      online: false,
    });
  }

  conversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  return conversations;
}

export async function listMessagesBetween(userId: string, peerId: string) {
  if (!mongoose.Types.ObjectId.isValid(peerId)) {
    return { error: "Invalid conversation" as const };
  }

  if (peerId === userId) {
    return { error: "Invalid conversation" as const };
  }

  const me = new mongoose.Types.ObjectId(userId);
  const peer = new mongoose.Types.ObjectId(peerId);

  const peerExists = await User.exists({ _id: peer });
  if (!peerExists) {
    return { error: "User not found" as const };
  }

  const docs = await DirectMessage.find({
    $or: [
      { senderId: me, receiverId: peer },
      { senderId: peer, receiverId: me },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  return { data: docs.map((d) => formatMessageDoc(d, userId)) };
}

export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  content: string,
  type: "text" | "image" | "file" = "text"
) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return { error: "Message content is required" as const };
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return { error: "Invalid recipient" as const };
  }

  if (receiverId === senderId) {
    return { error: "Cannot message yourself" as const };
  }

  const receiver = await User.findById(receiverId).select("_id");
  if (!receiver) {
    return { error: "Recipient not found" as const };
  }

  const doc = await DirectMessage.create({
    senderId: new mongoose.Types.ObjectId(senderId),
    receiverId: new mongoose.Types.ObjectId(receiverId),
    content: trimmed,
    type,
    status: "sent",
  });

  const populated = await DirectMessage.findById(doc._id).lean();
  return { data: formatMessageDoc(populated, senderId) };
}

export async function markConversationRead(userId: string, peerId: string) {
  if (!mongoose.Types.ObjectId.isValid(peerId)) {
    return { error: "Invalid conversation" as const };
  }

  const me = new mongoose.Types.ObjectId(userId);
  const peer = new mongoose.Types.ObjectId(peerId);

  await DirectMessage.updateMany(
    { senderId: peer, receiverId: me, status: { $ne: "read" } },
    { $set: { status: "read", readAt: new Date() } }
  );

  return { success: true as const };
}

export async function markMessageRead(userId: string, messageId: string) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: "Invalid message" as const };
  }

  const me = new mongoose.Types.ObjectId(userId);
  const updated = await DirectMessage.findOneAndUpdate(
    { _id: messageId, receiverId: me, status: { $ne: "read" } },
    { $set: { status: "read", readAt: new Date() } },
    { new: true }
  ).lean();

  if (!updated) {
    return { error: "Message not found or already read" as const };
  }

  return { success: true as const };
}

export async function deleteMessageForSender(userId: string, messageId: string) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: "Invalid message" as const };
  }

  const me = new mongoose.Types.ObjectId(userId);
  const deleted = await DirectMessage.findOneAndDelete({ _id: messageId, senderId: me });
  if (!deleted) {
    return { error: "Message not found or not allowed" as const };
  }

  return { success: true as const };
}

export async function unreadCountForUser(userId: string) {
  const me = new mongoose.Types.ObjectId(userId);
  const count = await DirectMessage.countDocuments({ receiverId: me, status: { $ne: "read" } });
  return count;
}

export async function messageStats(userId: string) {
  const me = new mongoose.Types.ObjectId(userId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, unread, messagesToday] = await Promise.all([
    DirectMessage.countDocuments({ $or: [{ senderId: me }, { receiverId: me }] }),
    DirectMessage.countDocuments({ receiverId: me, status: { $ne: "read" } }),
    DirectMessage.countDocuments({
      $or: [{ senderId: me }, { receiverId: me }],
      createdAt: { $gte: startOfDay },
    }),
  ]);

  const activePeers = await DirectMessage.distinct("senderId", {
    receiverId: me,
    createdAt: { $gte: startOfDay },
  });
  const activePeers2 = await DirectMessage.distinct("receiverId", {
    senderId: me,
    createdAt: { $gte: startOfDay },
  });
  const activeToday = new Set([...activePeers.map(String), ...activePeers2.map(String)]).size;

  return {
    total,
    unread,
    activeToday,
    messagesToday,
  };
}

export async function searchUserMessages(userId: string, q: string, conversationPeerId?: string) {
  const me = new mongoose.Types.ObjectId(userId);
  const regex = new RegExp(String(q || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const threadFilter =
    conversationPeerId && mongoose.Types.ObjectId.isValid(conversationPeerId)
      ? {
          $or: [
            { senderId: me, receiverId: new mongoose.Types.ObjectId(conversationPeerId) },
            { senderId: new mongoose.Types.ObjectId(conversationPeerId), receiverId: me },
          ],
        }
      : { $or: [{ senderId: me }, { receiverId: me }] };

  const docs = await DirectMessage.find({
    ...threadFilter,
    content: { $regex: regex },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return docs.map((d) => formatMessageDoc(d, userId));
}
