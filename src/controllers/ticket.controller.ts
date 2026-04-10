import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import { Project } from "../models/Project";
import Notification from "../models/Notification";
import User from "../models/User";
import { sendEmail, isEmailConfigured } from "../services/email.service";

const getTicketScope = (req: Request) => {
  const user = (req as any).user;
  const userId = (req as any).userId;

  if (!user || !userId) {
    return null;
  }

  if (user.role === "admin") {
    return {};
  }

  if (user.role === "client") {
    return { clientId: userId };
  }

  if (user.role === "developer") {
    return { developerId: userId };
  }

  return null;
};

export const createTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { projectId, subject, description, priority } = req.body;

    if (!userId || !user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (user.role !== "client") {
      return res.status(403).json({ success: false, message: "Only clients can create tickets" });
    }

    let project = null;
    if (projectId) {
      project = await Project.findOne({ _id: projectId, clientId: userId });
      if (!project) {
        return res.status(404).json({ success: false, message: "Assigned project not found" });
      }
    }

    const ticket = await Ticket.create({
      clientId: userId,
      adminId: project?.userId || null,
      developerId: project?.assignedDevId || null,
      projectId: project?._id || null,
      subject,
      description,
      priority: priority || "medium",
      status: "open",
      history: [
        {
          action: "created",
          actorId: userId,
          actorRole: "client",
          message: description,
          createdAt: new Date(),
        },
      ],
    });

    const recipients = [ticket.adminId, ticket.developerId].filter(Boolean);
    if (recipients.length > 0) {
      await Notification.insertMany(
        recipients.map((recipientId) => ({
          recipientId,
          senderId: userId,
          type: "query_created",
          message: `New query raised: ${subject}`,
          metadata: { ticketId: ticket._id, projectId: ticket.projectId, priority: ticket.priority },
        }))
      );
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const scope = getTicketScope(req);

    if (!scope) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const tickets = await Ticket.find(scope)
      .populate("clientId", "name email")
      .populate("developerId", "name email")
      .populate("projectId", "name status")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status, resolution, reopenMessage } = req.body;

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!["admin", "developer", "client"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const scope =
      user.role === "admin"
        ? { _id: id }
        : user.role === "developer"
          ? { _id: id, developerId: userId }
          : { _id: id, clientId: userId };
    const ticket = await Ticket.findOne(scope);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (user.role === "client" && status !== "open") {
      return res.status(403).json({ success: false, message: "Clients can only reopen their own queries" });
    }

    ticket.status = status;
    if (resolution !== undefined) {
      ticket.resolution = resolution;
    }
    ticket.history.push({
      action: status === "resolved" ? "resolved" : status === "open" ? "reopened" : "updated",
      actorId: userId,
      actorRole: user.role,
      message: resolution || reopenMessage || `Status changed to ${status}`,
      createdAt: new Date(),
    } as any);
    await ticket.save();

    await Notification.create({
      recipientId: ticket.clientId,
      senderId: userId,
      type: "query_updated",
      message: `${ticket.subject} is now ${status.replace("_", " ")}`,
      metadata: { ticketId: ticket._id, status, resolution: resolution || "" },
    });

    if (status === "resolved" && resolution && isEmailConfigured()) {
      const client = await User.findById(ticket.clientId);
      if (client?.email) {
        await sendEmail(
          client.email,
          `Query resolved: ${ticket.subject}`,
          resolution,
          `<p>Your query <strong>${ticket.subject}</strong> has been resolved.</p><p>${resolution}</p>`
        );
      }
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({ success: false, message: "Failed to update ticket status" });
  }
};

// Bulk update ticket statuses (for Kanban drag-and-drop)
export const bulkUpdateTicketStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { updates } = req.body; // [{ id, status }]

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!["admin", "developer"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Only admins and developers can bulk update tickets" });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: "Updates array is required" });
    }

    const results = [];
    for (const update of updates) {
      const scope =
        user.role === "admin"
          ? { _id: update.id }
          : { _id: update.id, developerId: userId };

      const ticket = await Ticket.findOne(scope);
      if (!ticket) continue;

      ticket.status = update.status;
      ticket.history.push({
        action: "updated",
        actorId: userId,
        actorRole: user.role,
        message: `Status changed to ${update.status} via Kanban`,
        createdAt: new Date(),
      } as any);

      await ticket.save();

      // Send notification to client
      await Notification.create({
        recipientId: ticket.clientId,
        senderId: userId,
        type: "query_updated",
        message: `${ticket.subject} is now ${update.status.replace("_", " ")}`,
        metadata: { ticketId: ticket._id, status: update.status },
      });

      results.push({ id: update.id, success: true });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Bulk update tickets error:", error);
    res.status(500).json({ success: false, message: "Failed to bulk update tickets" });
  }
};
