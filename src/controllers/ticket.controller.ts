import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";
import { sendEmail, isEmailConfigured, escapeHtml } from "../services/email.service";

const isQueryNotificationEnabled = async (recipientId: any) => {
  if (!recipientId) return false;
  const recipient = await User.findById(recipientId).select("preferences.notifications");
  return recipient?.preferences?.notifications?.queryResponses !== false;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLOSED_STATUSES = new Set(["resolved", "closed"]);

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
    const { projectId, subject, description, priority, attachments = [] } = req.body;

    if (!userId || !user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (user.role !== "client") {
      return res.status(403).json({ success: false, message: "Only clients can create tickets" });
    }

    if (!String(subject || "").trim() || !String(description || "").trim()) {
      return res.status(400).json({ success: false, message: "Subject and description are required" });
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
      source: "client_portal",
      contactName: "",
      contactEmail: "",
      contactCompany: "",
      subject,
      description,
      priority: priority || "medium",
      attachments: Array.isArray(attachments)
        ? attachments
            .map((item: any) => ({
              name: String(item?.name || "").trim(),
              url: String(item?.url || "").trim(),
            }))
            .filter((item) => item.name && item.url)
        : [],
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
      .populate("adminId", "name email")
      .populate("developerId", "name email")
      .populate("projectId", "name status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets.map((ticket: any) => ({
        ...ticket.toObject(),
        chatStatus: ticket.chatStatus || (CLOSED_STATUSES.has(ticket.status) ? "closed" : "open"),
      })),
    });
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

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid ticket status" });
    }

    ticket.status = status;
    ticket.chatStatus = CLOSED_STATUSES.has(status) ? "closed" : "open";
    ticket.closedAt = ticket.chatStatus === "closed" ? new Date() : null;
    if (resolution !== undefined) {
      ticket.resolution = resolution;
    }
    ticket.history.push({
      action:
        status === "resolved"
          ? "resolved"
          : status === "closed"
            ? "closed"
            : status === "open"
              ? "reopened"
              : "updated",
      actorId: userId,
      actorRole: user.role,
      message: resolution || reopenMessage || `Status changed to ${status}`,
      createdAt: new Date(),
    } as any);
    await ticket.save();

    if (await isQueryNotificationEnabled(ticket.clientId)) {
      await Notification.create({
        recipientId: ticket.clientId,
        senderId: userId,
        type: "query_updated",
        message: `${ticket.subject} is now ${status.replace("_", " ")}`,
        metadata: { ticketId: ticket._id, status, resolution: resolution || "" },
      });
    }

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

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const scope =
      user.role === "admin"
        ? { _id: id }
        : user.role === "client"
          ? { _id: id, clientId: userId }
          : { _id: id, developerId: userId };

    const ticket = await Ticket.findOne(scope);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (user.role === "client" && ticket.status === "in_progress") {
      return res.status(400).json({ success: false, message: "In-progress queries cannot be deleted" });
    }

    await Ticket.deleteOne({ _id: ticket._id });
    res.json({ success: true, message: "Query deleted successfully" });
  } catch (error) {
    console.error("Delete ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to delete ticket" });
  }
};

export const addTicketReply = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    const { id } = req.params;
    const message = String(req.body.message || "").trim();

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!message) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
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

    if ((ticket.chatStatus || (CLOSED_STATUSES.has(ticket.status) ? "closed" : "open")) === "closed") {
      return res.status(400).json({ success: false, message: "Closed queries are read-only" });
    }

    ticket.history.push({
      action: "reply",
      actorId: userId,
      actorRole: user.role,
      message,
      createdAt: new Date(),
    } as any);

    if ((user.role === "admin" || user.role === "developer") && ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    if (ticket.clientId && user.role !== "client" && (await isQueryNotificationEnabled(ticket.clientId))) {
      await Notification.create({
        recipientId: ticket.clientId,
        senderId: userId,
        type: "query_updated",
        message: `${ticket.subject} has a new reply`,
        metadata: { ticketId: ticket._id, status: ticket.status, reply: message },
      });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Add ticket reply error:", error);
    res.status(500).json({ success: false, message: "Failed to add reply" });
  }
};

export const createPublicTicket = async (req: Request, res: Response) => {
  try {
    const contactName = String(req.body.name || "").trim();
    const contactEmail = String(req.body.email || "").trim().toLowerCase();
    const contactCompany = String(req.body.company || "").trim();
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.message || req.body.description || "").trim();

    if (!contactName || !contactEmail || !subject || !description) {
      return res.status(400).json({ success: false, message: "Name, email, subject, and message are required" });
    }

    if (!emailPattern.test(contactEmail)) {
      return res.status(400).json({ success: false, message: "A valid email address is required" });
    }

    const ticket = await Ticket.create({
      clientId: null,
      adminId: null,
      developerId: null,
      projectId: null,
      source: "public_contact",
      contactName,
      contactEmail,
      contactCompany,
      subject,
      description,
      priority: "medium",
      status: "open",
      history: [
        {
          action: "created",
          actorId: null,
          actorRole: "system",
          message: description,
          createdAt: new Date(),
        },
      ],
    });

    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map((admin) => ({
          recipientId: admin._id,
          senderId: null,
          type: "query_created",
          message: `New public inquiry from ${contactName}: "${subject}"`,
          metadata: {
            ticketId: String(ticket._id),
            source: "public_contact",
            contactEmail,
            contactCompany,
          },
        }))
      );
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Create public ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to submit inquiry" });
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
      ticket.chatStatus = CLOSED_STATUSES.has(update.status) ? "closed" : "open";
      ticket.closedAt = ticket.chatStatus === "closed" ? new Date() : null;
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
    const recipientEmail = client?.email || ticket.contactEmail;
    if (!recipientEmail) {
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

    await sendEmail(recipientEmail, emailSubject, emailText, emailHtml);

    res.json({ success: true, message: "Resolution email sent successfully" });
  } catch (error) {
    console.error("Send resolution email error:", error);
    res.status(500).json({ success: false, message: "Failed to send resolution email" });
  }
};

export const cleanupArchivedTickets = async () => {
  const projects = await Project.find({
    completedAt: { $ne: null, $lte: new Date() },
  }).select("_id completedAt");

  if (!projects.length) {
    return { projectCount: 0, deletedCount: 0 };
  }

  const archiveTargets = projects
    .filter((project: any) => project.completedAt)
    .map((project: any) => ({
      projectId: project._id,
      archiveAfter: new Date(new Date(project.completedAt).getTime() + 7 * 24 * 60 * 60 * 1000),
    }));

  for (const target of archiveTargets) {
    await Ticket.updateMany(
      {
        projectId: target.projectId,
        archiveAfter: null,
      },
      {
        $set: {
          archiveAfter: target.archiveAfter,
        },
      }
    );
  }

  const deleteResult = await Ticket.deleteMany({
    projectId: { $in: archiveTargets.map((target) => target.projectId) },
    archiveAfter: { $lte: new Date() },
  });

  return {
    projectCount: archiveTargets.length,
    deletedCount: deleteResult.deletedCount || 0,
  };
};
