import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";
import { sendEmail, isEmailConfigured, escapeHtml } from "../services/email.service";

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

    const client = await User.findById(userId).select("name email");
    const admins = await User.find({ role: "admin" }).select("_id name email");

    if (admins.length > 0 && client) {
      const projectLabel = project?.name || "General support";
      const notificationMessage = `New client query from ${client.name}: "${subject}" for ${projectLabel}.`;

      await Notification.insertMany(
        admins.map((admin) => ({
          recipientId: admin._id,
          senderId: userId,
          type: "query_created",
          message: notificationMessage,
        }))
      );

      const emailRecipients = [
        ...new Set(
          admins
            .map((admin) => admin.email)
            .filter(Boolean)
            .concat(process.env.ADMIN_NOTIFICATION_EMAIL ? [process.env.ADMIN_NOTIFICATION_EMAIL] : [])
        ),
      ];

      if (emailRecipients.length > 0) {
        const safeDescription = escapeHtml(description);
        const safeSubject = escapeHtml(subject);
        const safeClientName = escapeHtml(client.name);
        const safeProjectLabel = escapeHtml(projectLabel);
        const emailSubject = `Client Query: ${subject}`;
        const emailText = `
          A new client query has been submitted.

          Client: ${client.name}
          Client Email: ${client.email}
          Project: ${projectLabel}
          Subject: ${subject}
          Priority: ${priority || "medium"}

          ${description}
        `;
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5ea; border-radius: 12px;">
            <h2 style="color: #007AFF;">New Client Query</h2>
            <p><strong>Client:</strong> ${safeClientName}</p>
            <p><strong>Client Email:</strong> ${escapeHtml(client.email)}</p>
            <p><strong>Project:</strong> ${safeProjectLabel}</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <p><strong>Priority:</strong> ${escapeHtml(priority || "medium")}</p>
            <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin-top: 16px; white-space: pre-wrap;">${safeDescription}</div>
          </div>
        `;

        try {
          await sendEmail(emailRecipients.join(","), emailSubject, emailText, emailHtml);
        } catch (emailError) {
          console.error("Client query email failed:", emailError);
        }
      }
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

export const bulkUpdateTicketStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { updates } = req.body;

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

export const sendResolutionEmail = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { id } = req.params;
    const { resolution } = req.body;

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const ticket = await Ticket.findById(id).populate("clientId", "name email");
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const client = ticket.clientId as any;
    if (!client?.email) {
      return res.status(400).json({ success: false, message: "Client email not available" });
    }

    const emailSubject = `Query Resolved: ${ticket.subject}`;
    const emailText = resolution || `Your query has been resolved.`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #34C759;">Query Resolved</h2>
        <p>Your query <strong>${ticket.subject}</strong> has been resolved.</p>
        <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin-top: 16px;">
          ${resolution || "No additional details provided."}
        </div>
      </div>
    `;

    await sendEmail(client.email, emailSubject, emailText, emailHtml);

    res.json({ success: true, message: "Resolution email sent successfully" });
  } catch (error) {
    console.error("Send resolution email error:", error);
    res.status(500).json({ success: false, message: "Failed to send resolution email" });
  }
};
