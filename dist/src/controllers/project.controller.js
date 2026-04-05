"use strict";
// C:\wsd-server\src\controllers\project.controller.ts
// Project Controller - Full CRUD operations for projects
// Features: Create, Read, Update, Delete with user authentication
// ADDED: Status dashboard methods (progress, messages, feedback, customization)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProjectsStatus = exports.getProjectStatus = exports.updateCustomization = exports.updateProjectStatus = exports.getFeedback = exports.addFeedback = exports.getMessages = exports.addMessage = exports.updateProgress = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getProjects = void 0;
const Project_1 = require("../models/Project");
// Helper to get userId from request (set by auth middleware)
const getUserId = (req) => {
    return req.userId || req.user?.id;
};
const getProjectScopeQuery = (req) => {
    const userId = getUserId(req);
    const role = req.user?.role;
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
const findAccessibleProject = (req, id) => {
    const scope = getProjectScopeQuery(req);
    if (!scope) {
        return null;
    }
    return Project_1.Project.findOne({ _id: id, ...scope });
};
const mapProjectResponse = (project) => ({
    ...project.toObject(),
    assignedDeveloperName: project.assignedDevId?.name || "",
    assignedDeveloperEmail: project.assignedDevId?.email || "",
    clientUserName: project.clientId?.name || project.client,
    clientUserEmail: project.clientId?.email || project.clientEmail,
});
// ============================================================
// BASIC CRUD FUNCTIONS
// ============================================================
// Get all projects for the authenticated user
const getProjects = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const scope = getProjectScopeQuery(req);
        if (!scope) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const projects = await Project_1.Project.find(scope)
            .populate("clientId", "name email")
            .populate("assignedDevId", "name email")
            .sort({ createdAt: -1 });
        res.json({ success: true, data: projects.map(mapProjectResponse) });
    }
    catch (error) {
        console.error("Get projects error:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
    }
};
exports.getProjects = getProjects;
// Get single project by ID
const getProjectById = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get project error:", error);
        res.status(500).json({ message: "Failed to fetch project" });
    }
};
exports.getProjectById = getProjectById;
// Create new project
const createProject = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { name, description, client, clientId, assignedDevId, status, priority, startDate, endDate, budget, projectType, clientEmail, clientPhone, clientCompany } = req.body;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (role !== "admin") {
            return res.status(403).json({ message: "Only admins can create projects" });
        }
        // Validate required fields
        if (!name || !description || !client || !startDate) {
            return res.status(400).json({ message: "Missing required fields: name, description, client, startDate" });
        }
        const project = await Project_1.Project.create({
            userId,
            clientId: clientId || null,
            assignedDevId: assignedDevId || null,
            name,
            description,
            client,
            clientEmail: clientEmail || "",
            clientPhone: clientPhone || "",
            clientCompany: clientCompany || "",
            status: status || "pending",
            priority: priority || "medium",
            projectType: projectType || "other",
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            budget: budget || 0,
            progress: 0,
            messages: [],
            feedback: [],
            customization: { buttonColor: "#007AFF", theme: "light" },
            activityLog: [{ action: "Project created", user: userId, timestamp: new Date() }],
            statusUpdates: [{
                    status: status || "pending",
                    progress: 0,
                    note: "Project created",
                    updatedBy: userId,
                    createdAt: new Date()
                }]
        });
        await project.populate("clientId", "name email");
        await project.populate("assignedDevId", "name email");
        res.status(201).json({ success: true, data: mapProjectResponse(project) });
    }
    catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Failed to create project" });
    }
};
exports.createProject = createProject;
// Update project
const updateProject = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { name, description, client, clientId, assignedDevId, status, priority, startDate, endDate, budget, projectType, clientEmail, clientPhone, clientCompany } = req.body;
        const role = req.user?.role;
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
        if (name)
            project.name = name;
        if (description)
            project.description = description;
        if (client)
            project.client = client;
        if (clientId !== undefined)
            project.clientId = clientId || null;
        if (assignedDevId !== undefined)
            project.assignedDevId = assignedDevId || null;
        if (clientEmail !== undefined)
            project.clientEmail = clientEmail;
        if (clientPhone !== undefined)
            project.clientPhone = clientPhone;
        if (clientCompany !== undefined)
            project.clientCompany = clientCompany;
        if (status)
            project.status = status;
        if (priority)
            project.priority = priority;
        if (projectType)
            project.projectType = projectType;
        if (startDate)
            project.startDate = new Date(startDate);
        if (endDate)
            project.endDate = new Date(endDate);
        if (budget !== undefined)
            project.budget = budget;
        project.activityLog.push({
            action: "Project updated",
            user: userId,
            timestamp: new Date()
        });
        await project.save();
        await project.populate("clientId", "name email");
        await project.populate("assignedDevId", "name email");
        res.json({ success: true, data: mapProjectResponse(project) });
    }
    catch (error) {
        console.error("Update project error:", error);
        res.status(500).json({ message: "Failed to update project" });
    }
};
exports.updateProject = updateProject;
// Delete project
const deleteProject = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const role = req.user?.role;
        if (role !== "admin") {
            return res.status(403).json({ message: "Only admins can delete projects" });
        }
        const project = await Project_1.Project.findOneAndDelete({ _id: id, userId });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.json({ success: true, message: "Project deleted successfully" });
    }
    catch (error) {
        console.error("Delete project error:", error);
        res.status(500).json({ message: "Failed to delete project" });
    }
};
exports.deleteProject = deleteProject;
// ============================================================
// STATUS DASHBOARD METHODS (NEW)
// ============================================================
// Update project progress (card #4)
const updateProgress = async (req, res) => {
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
        }
        else if (progress > 0 && project.status === "pending") {
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
            updatedBy: userId,
            createdAt: new Date()
        });
        await project.save();
        await project.populate("clientId", "name email");
        await project.populate("assignedDevId", "name email");
        res.json({ success: true, data: mapProjectResponse(project) });
    }
    catch (error) {
        console.error("Update progress error:", error);
        res.status(500).json({ message: "Failed to update progress" });
    }
};
exports.updateProgress = updateProgress;
// Add message to conversation (card #5 - Q&A)
const addMessage = async (req, res) => {
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
    }
    catch (error) {
        console.error("Add message error:", error);
        res.status(500).json({ message: "Failed to add message" });
    }
};
exports.addMessage = addMessage;
// Get all messages for a project
const getMessages = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Failed to get messages" });
    }
};
exports.getMessages = getMessages;
// Add feedback (card #6)
const addFeedback = async (req, res) => {
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
    }
    catch (error) {
        console.error("Add feedback error:", error);
        res.status(500).json({ message: "Failed to add feedback" });
    }
};
exports.addFeedback = addFeedback;
// Get all feedback for a project
const getFeedback = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get feedback error:", error);
        res.status(500).json({ message: "Failed to get feedback" });
    }
};
exports.getFeedback = getFeedback;
const updateProjectStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        const role = req.user?.role;
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
        }
        else if (status === "completed") {
            project.progress = 100;
        }
        else if (status === "in-progress" && project.progress === 0) {
            project.progress = 25;
        }
        project.statusUpdates.push({
            status: project.status,
            progress: project.progress,
            note: note || "Status updated",
            updatedBy: userId,
            createdAt: new Date()
        });
        project.activityLog.push({
            action: `Status changed to ${project.status}`,
            user: userId,
            timestamp: new Date()
        });
        await project.save();
        await project.populate("clientId", "name email");
        await project.populate("assignedDevId", "name email");
        res.json({ success: true, data: mapProjectResponse(project) });
    }
    catch (error) {
        console.error("Update project status error:", error);
        res.status(500).json({ message: "Failed to update project status" });
    }
};
exports.updateProjectStatus = updateProjectStatus;
// Update customization (card #7)
const updateCustomization = async (req, res) => {
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
        if (buttonColor)
            project.customization.buttonColor = buttonColor;
        if (theme)
            project.customization.theme = theme;
        if (headerImage)
            project.customization.headerImage = headerImage;
        if (logoImage)
            project.customization.logoImage = logoImage;
        await project.save();
        res.json({ success: true, data: project.customization });
    }
    catch (error) {
        console.error("Update customization error:", error);
        res.status(500).json({ message: "Failed to update customization" });
    }
};
exports.updateCustomization = updateCustomization;
// Get project status summary (all 8 cards data)
const getProjectStatus = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get project status error:", error);
        res.status(500).json({ message: "Failed to get project status" });
    }
};
exports.getProjectStatus = getProjectStatus;
// Get all projects with status summary (for status page list)
const getAllProjectsStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const scope = getProjectScopeQuery(req);
        if (!scope) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const projects = await Project_1.Project.find(scope).sort({ updatedAt: -1 });
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
                ? project.feedback.reduce((sum, f) => sum + f.rating, 0) / project.feedback.length
                : null
        }));
        res.json({ success: true, data: statusSummaries });
    }
    catch (error) {
        console.error("Get all projects status error:", error);
        res.status(500).json({ message: "Failed to get projects status" });
    }
};
exports.getAllProjectsStatus = getAllProjectsStatus;
