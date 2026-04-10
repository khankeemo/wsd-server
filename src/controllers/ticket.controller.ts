import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";
import { escapeHtml, sendEmail } from "../services/email.service";

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
          type: "client_query",
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
    const { status } = req.body;

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!["admin", "developer"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const scope = user.role === "admin" ? { _id: id } : { _id: id, developerId: userId };
    const ticket = await Ticket.findOne(scope);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.status = status;
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({ success: false, message: "Failed to update ticket status" });
  }
};
