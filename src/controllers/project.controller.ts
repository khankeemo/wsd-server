// C:\wsd-server\src\controllers\project.controller.ts
// Project Controller - Full CRUD operations for projects
// Features: Create, Read, Update, Delete with user authentication
// ADDED: Status dashboard methods (progress, messages, feedback, customization)

import { Request, Response } from "express";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";

// Helper to get userId from request (set by auth middleware)
const getUserId = (req: Request): string | undefined => {
  return (req as any).userId || (req as any).user?.id;
};

const getProjectScopeQuery = (req: Request) => {
  const userId = getUserId(req);
  const role = (req as any).user?.role;

  if (!userId || !role) {
    return null;
  }

  if (role === "admin") {
    return { userId };
  }

  if (role === "client") {
    return { clientId: userId };
  }

  if (role === "developer") {
    return { assignedDevId: userId };
  }

  return null;
};

const findAccessibleProject = (req: Request, id: string) => {
  const scope = getProjectScopeQuery(req);

  if (!scope) {
    return null;
  }

  return Project.findOne({ _id: id, ...scope });
};

const mapProjectResponse = (project: any) => ({
  ...project.toObject(),
  assignedDeveloperName: project.assignedDevId?.name || "",
  assignedDeveloperEmail: project.assignedDevId?.email || "",
  clientUserName: project.clientId?.name || project.client,
  clientUserEmail: project.clientId?.email || project.clientEmail,
  published: Boolean(project.published),
});

const createClientAssignmentNotification = async (project: any) => {
  if (!project?.clientId?._id) {
    return;
  }

  const hasDeveloper = Boolean(project.assignedDevId?._id || project.assignedDevId);
  const message = hasDeveloper
    ? `Project "${project.name}" has been assigned and is now moving forward with a developer.`
    : `Project "${project.name}" is currently not assigned to a developer yet.`;

  await Notification.create({
    recipientId: project.clientId._id,
    senderId: project.userId,
    type: hasDeveloper ? "project_assignment_assigned" : "project_assignment_unassigned",
    message,
  });
};

// ============================================================
// BASIC CRUD FUNCTIONS
// ============================================================

// Get all projects for the authenticated user
export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = getProjectScopeQuery(req);

    if (!scope) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projects = await Project.find(scope)
      .populate("clientId", "name email")
      .populate("assignedDevId", "name email")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: projects.map(mapProjectResponse) });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};

// Get single project by ID
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findAccessibleProject(req, id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await project.populate("clientId", "name email");
    await project.populate("assignedDevId", "name email");

    res.json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, client, assignedDevId, status, priority, startDate, endDate, budget, projectType, clientEmail, clientPhone, clientCompany, customClientId, published } = req.body;
    const role = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can create projects" });
    }

    // Validate required fields
    if (!name || !description || !client || !startDate || !customClientId) {
      return res.status(400).json({ message: "Missing required fields: name, description, client, startDate, customClientId" });
    }

    // Lookup client by customClientId
    const clientUser = await User.findOne({ customId: customClientId, role: 'client' });
    if (!clientUser) {
      return res.status(404).json({ message: `Client with ID "${customClientId}" not found. Project cannot be created.` });
    }

    const project = await Project.create({
      userId,
      clientId: clientUser._id,
      customClientId,
      assignedDevId: assignedDevId || null,
      name,
      description,
      client,
      clientEmail: clientEmail || clientUser.email,
      clientPhone: clientPhone || clientUser.phone || "",
      clientCompany: clientCompany || clientUser.company || "",
      status: status || "pending",
      priority: priority || "medium",
      projectType: projectType || "other",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      expectedCompletionDate: req.body.expectedCompletionDate ? new Date(req.body.expectedCompletionDate) : null,
      budget: budget || 0,
      progress: 0,
      messages: [],
      feedback: [],
      customization: { buttonColor: "#007AFF", theme: "light" },
      activityLog: [{ action: "Project created", user: userId, timestamp: new Date() }],
      published: Boolean(published),
      statusUpdates: [{
        status: status || "pending",
        progress: 0,
        note: "Project created",
        updatedBy: userId as any,
        createdAt: new Date()
      }]
    });

    await project.populate("clientId", "name email");
    await project.populate("assignedDevId", "name email");
    await createClientAssignmentNotification(project);

    res.status(201).json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Failed to create project" });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, description, client, assignedDevId, status, priority, startDate, endDate, budget, projectType, clientEmail, clientPhone, clientCompany, customClientId, published } = req.body;
    const role = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can update project assignments" });
    }

    const project = await findAccessibleProject(req, id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update fields
    if (name) project.name = name;
    if (description) project.description = description;
    if (client) project.client = client;
    
    if (customClientId && customClientId !== project.customClientId) {
      const clientUser = await User.findOne({ customId: customClientId, role: 'client' });
      if (!clientUser) {
        return res.status(404).json({ message: `Client with ID "${customClientId}" not found.` });
      }
      project.customClientId = customClientId;
      project.clientId = clientUser._id;
    }

    const previousAssignedDevId = project.assignedDevId ? String(project.assignedDevId) : "";
    const previousClientId = project.clientId ? String(project.clientId) : "";

    if (assignedDevId !== undefined) project.assignedDevId = assignedDevId || null;
    if (clientEmail !== undefined) project.clientEmail = clientEmail;
    if (clientPhone !== undefined) project.clientPhone = clientPhone;
    if (clientCompany !== undefined) project.clientCompany = clientCompany;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (projectType) project.projectType = projectType;
    if (startDate) project.startDate = new Date(startDate);
    if (endDate) project.endDate = new Date(endDate);
    if (req.body.expectedCompletionDate !== undefined) {
      project.expectedCompletionDate = req.body.expectedCompletionDate ? new Date(req.body.expectedCompletionDate) : null;
    }
    if (budget !== undefined) project.budget = budget;
    if (published !== undefined) project.published = Boolean(published);

    project.activityLog.push({
      action: "Project updated",
      user: userId,
      timestamp: new Date()
    });

    await project.save();

    await project.populate("clientId", "name email");
    await project.populate("assignedDevId", "name email");

    const nextAssignedDevId = project.assignedDevId?._id
      ? String(project.assignedDevId._id)
      : project.assignedDevId
        ? String(project.assignedDevId)
        : "";
    const nextClientId = project.clientId?._id ? String(project.clientId._id) : String(project.clientId || "");

    if (previousAssignedDevId !== nextAssignedDevId || previousClientId !== nextClientId) {
      await createClientAssignmentNotification(project);
    }

    res.json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = (req as any).user?.role;

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete projects" });
    }

    const project = await Project.findOneAndDelete({ _id: id, userId });
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
};

// ============================================================
// STATUS DASHBOARD METHODS (NEW)
// ============================================================

// Update project progress (card #4)
export const updateProgress = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { progress } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Progress must be between 0 and 100" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.progress = progress;
    
    // Auto-update status based on progress
    if (progress === 100) {
      project.status = "completed";
    } else if (progress > 0 && project.status === "pending") {
      project.status = "in-progress";
    }
    
    project.activityLog.push({
      action: `Progress updated to ${progress}%`,
      user: userId,
      timestamp: new Date()
    });

    project.statusUpdates.push({
      status: project.status,
      progress,
      note: "Progress updated",
      updatedBy: userId as any,
      createdAt: new Date()
    });

    await project.save();

    await project.populate("clientId", "name email");
    await project.populate("assignedDevId", "name email");

    res.json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({ message: "Failed to update progress" });
  }
};

// Add message to conversation (card #5 - Q&A)
export const addMessage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { sender, senderName, message } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!message || !sender) {
      return res.status(400).json({ message: "Message and sender are required" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.messages.push({
      sender,
      senderName: senderName || (sender === "client" ? project.client : "Team"),
      message,
      timestamp: new Date(),
      isRead: false
    });

    await project.save();

    res.json({ success: true, data: project.messages });
  } catch (error) {
    console.error("Add message error:", error);
    res.status(500).json({ message: "Failed to add message" });
  }
};

// Get all messages for a project
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Mark messages as read
    project.messages.forEach(msg => { msg.isRead = true; });
    await project.save();

    res.json({ success: true, data: project.messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

// Add feedback (card #6)
export const addFeedback = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { rating, comment, clientName } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.feedback.push({
      rating,
      comment: comment || "",
      date: new Date(),
      clientName: clientName || project.client
    });

    await project.save();

    res.json({ success: true, data: project.feedback });
  } catch (error) {
    console.error("Add feedback error:", error);
    res.status(500).json({ message: "Failed to add feedback" });
  }
};

// Get all feedback for a project
export const getFeedback = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ success: true, data: project.feedback });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ message: "Failed to get feedback" });
  }
};

export const updateProjectStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const role = (req as any).user?.role;
    const { id } = req.params;
    const { status, note, progress } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["developer", "admin"].includes(role)) {
      return res.status(403).json({ message: "Only admins and developers can update project status" });
    }

    const project = await findAccessibleProject(req, id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (status) {
      project.status = status;
    }

    if (typeof progress === "number") {
      project.progress = progress;
    } else if (status === "completed") {
      project.progress = 100;
    } else if (status === "in-progress" && project.progress === 0) {
      project.progress = 25;
    }

    project.statusUpdates.push({
      status: project.status,
      progress: project.progress,
      note: note || "Status updated",
      updatedBy: userId as any,
      createdAt: new Date()
    });

    project.activityLog.push({
      action: `Status changed to ${project.status}`,
      user: userId,
      timestamp: new Date()
    });

    await project.save();

    const recipients = [project.clientId, project.assignedDevId].filter(Boolean);
    if (recipients.length > 0) {
      await Notification.insertMany(
        recipients.map((recipientId) => ({
          recipientId,
          senderId: userId,
          type: "project_status_changed",
          message: `${project.name} is now ${project.status.replace("-", " ")}`,
          metadata: { projectId: project._id, status: project.status, progress: project.progress },
        }))
      );
    }

    await project.populate("clientId", "name email");
    await project.populate("assignedDevId", "name email");

    res.json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Update project status error:", error);
    res.status(500).json({ message: "Failed to update project status" });
  }
};

// Update customization (card #7)
export const updateCustomization = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { buttonColor, theme, headerImage, logoImage } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (buttonColor) project.customization.buttonColor = buttonColor;
    if (theme) project.customization.theme = theme;
    if (headerImage) project.customization.headerImage = headerImage;
    if (logoImage) project.customization.logoImage = logoImage;

    await project.save();

    res.json({ success: true, data: project.customization });
  } catch (error) {
    console.error("Update customization error:", error);
    res.status(500).json({ message: "Failed to update customization" });
  }
};

// Get project status summary (all 8 cards data)
export const getProjectStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findAccessibleProject(req, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Prepare data for 8 cards
    const statusData = {
      clientInfo: {
        name: project.client,
        email: project.clientEmail || "",
        phone: project.clientPhone || "",
        company: project.clientCompany || ""
      },
      projectType: {
        type: project.projectType,
        displayName: project.projectTypeDisplay,
        description: project.description
      },
      timeline: {
        startDate: project.startDate,
        endDate: project.endDate,
        daysRemaining: project.daysRemaining,
        totalDays: project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) : null
      },
      progress: {
        percentage: project.progress,
        status: project.statusDisplay,
        budgetUsed: project.budgetUsed,
        budgetTotal: project.budget
      },
      messages: project.messages,
      feedback: project.feedback,
      statusUpdates: project.statusUpdates,
      customization: project.customization,
      statusOverview: {
        currentStatus: project.status,
        priority: project.priority,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    };

    res.json({ success: true, data: statusData });
  } catch (error) {
    console.error("Get project status error:", error);
    res.status(500).json({ message: "Failed to get project status" });
  }
};

// Get all projects with status summary (for status page list)
export const getAllProjectsStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = getProjectScopeQuery(req);

    if (!scope) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projects = await Project.find(scope).sort({ updatedAt: -1 });
    
    const statusSummaries = projects.map(project => ({
      _id: project._id,
      name: project.name,
      client: project.client,
      projectType: project.projectTypeDisplay,
      progress: project.progress,
      status: project.statusDisplay,
      daysRemaining: project.daysRemaining,
      lastMessage: project.messages.length > 0 ? project.messages[project.messages.length - 1].message : null,
      averageRating: project.feedback.length > 0 
        ? project.feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / project.feedback.length 
        : null
    }));

    res.json({ success: true, data: statusSummaries });
  } catch (error) {
    console.error("Get all projects status error:", error);
    res.status(500).json({ message: "Failed to get projects status" });
  }
};

export const getPublishedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({ published: true, status: { $ne: "on-hold" } })
      .select("name description client progress status projectType expectedCompletionDate published")
      .sort({ updatedAt: -1 })
      .limit(12);

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error("Get published projects error:", error);
    res.status(500).json({ message: "Failed to fetch public projects" });
  }
};

// Bulk update project statuses (for Kanban drag-and-drop)
export const bulkUpdateProjectStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const role = (req as any).user?.role;
    const { updates } = req.body; // [{ id, status, progress }]

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!role || !["admin", "developer"].includes(role)) {
      return res.status(403).json({ message: "Only admins and developers can bulk update projects" });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    const results = [];
    for (const update of updates) {
      const project = await findAccessibleProject(req, update.id);
      if (!project) continue;

      if (update.status) {
        project.status = update.status;
      }
      if (typeof update.progress === "number") {
        project.progress = update.progress;
      }

      project.statusUpdates.push({
        status: project.status,
        progress: project.progress,
        note: "Status updated via Kanban",
        updatedBy: userId as any,
        createdAt: new Date()
      });

      await project.save();
      results.push({ id: update.id, success: true });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Bulk update projects error:", error);
    res.status(500).json({ message: "Failed to bulk update projects" });
  }
};

// Toggle project publish status
export const togglePublish = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: id, userId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.published = published;
    await project.save();

    res.json({ success: true, data: mapProjectResponse(project) });
  } catch (error) {
    console.error("Toggle publish error:", error);
    res.status(500).json({ success: false, message: "Failed to update publish status" });
  }
};
