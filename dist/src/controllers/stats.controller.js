"use strict";
// PATH: C:\wsd-server\src\controllers\stats.controller.ts
// PURPOSE: Dashboard statistics - Returns counts for projects, clients, tasks, revenue
// IMPACT: Dashboard shows real data instead of placeholders
// FEATURES: Real-time counts from database
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeveloperStats = exports.getDashboardStats = void 0;
const Project_1 = require("../models/Project");
const Client_1 = require("../models/Client");
const Task_1 = require("../models/Task");
const Payment_1 = __importDefault(require("../models/Payment"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.userId;
        const user = req.user;
        if (!userId || !user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - No user ID found"
            });
        }
        let totalProjects = 0;
        let totalClients = 0;
        let pendingTasks = 0;
        let totalRevenue = 0;
        let totalDevelopers = 0;
        let completedTasks = 0;
        let activeProjects = 0;
        let recentActivity = [];
        if (user.role === "admin") {
            totalProjects = await Project_1.Project.countDocuments({ userId });
            activeProjects = await Project_1.Project.countDocuments({ userId, status: { $in: ["pending", "in-progress"] } });
            totalClients = await Client_1.Client.countDocuments({ adminId: userId });
            totalDevelopers = await User_1.default.countDocuments({ role: "developer" });
            pendingTasks = await Task_1.Task.countDocuments({ userId, status: { $in: ["pending", "in-progress"] } });
            completedTasks = await Task_1.Task.countDocuments({ userId, status: "completed" });
            const payments = await Payment_1.default.find({ userId, status: "completed" });
            totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const [projects, tasks, clients] = await Promise.all([
                Project_1.Project.find({ userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt"),
                Task_1.Task.find({ userId, status: "completed" }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt"),
                Client_1.Client.find({ adminId: userId }).sort({ createdAt: -1 }).limit(4).select("name createdAt"),
            ]);
            recentActivity = [
                ...projects.map((project) => ({ id: String(project._id), type: "project", title: `Project updated: ${project.name}`, timestamp: project.updatedAt })),
                ...tasks.map((task) => ({ id: String(task._id), type: "task", title: `Task completed: ${task.title}`, timestamp: task.updatedAt })),
                ...clients.map((client) => ({ id: String(client._id), type: "client", title: `Client added: ${client.name}`, timestamp: client.createdAt })),
            ]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 8);
        }
        else if (user.role === "client") {
            totalProjects = await Project_1.Project.countDocuments({ clientId: userId });
            totalClients = 1;
            activeProjects = await Project_1.Project.countDocuments({ clientId: userId, status: { $in: ["pending", "in-progress"] } });
            pendingTasks = await Task_1.Task.countDocuments({ clientId: userId, status: { $in: ["pending", "in-progress"] } });
            completedTasks = await Task_1.Task.countDocuments({ clientId: userId, status: "completed" });
            const payments = await Payment_1.default.find({ clientId: userId, status: "completed" });
            totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const [projects, tasks, tickets] = await Promise.all([
                Project_1.Project.find({ clientId: userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt status"),
                Task_1.Task.find({ clientId: userId, status: "completed" }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt"),
                Ticket_1.default.find({ clientId: userId }).sort({ updatedAt: -1 }).limit(4).select("subject updatedAt status"),
            ]);
            recentActivity = [
                ...projects.map((project) => ({ id: String(project._id), type: "project", title: `Project ${project.name} is ${project.status}`, timestamp: project.updatedAt })),
                ...tasks.map((task) => ({ id: String(task._id), type: "task", title: `Task completed: ${task.title}`, timestamp: task.updatedAt })),
                ...tickets.map((ticket) => ({ id: String(ticket._id), type: "query", title: `Query ${ticket.subject} is ${ticket.status}`, timestamp: ticket.updatedAt })),
            ]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 8);
            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const [upcomingDeadlines, overdueProjects, unreadNotifications, openQueries] = await Promise.all([
                Project_1.Project.find({
                    clientId: userId,
                    expectedCompletionDate: { $gte: now, $lte: sevenDaysFromNow },
                    status: { $ne: "completed" },
                })
                    .select("name expectedCompletionDate status progress")
                    .sort({ expectedCompletionDate: 1 }),
                Project_1.Project.find({
                    clientId: userId,
                    expectedCompletionDate: { $lt: now },
                    status: { $ne: "completed" },
                })
                    .select("name expectedCompletionDate status progress")
                    .sort({ expectedCompletionDate: 1 }),
                Notification_1.default.countDocuments({ recipientId: userId, isRead: false }),
                Ticket_1.default.countDocuments({ clientId: userId, status: { $ne: "resolved" } }),
            ]);
            return res.json({
                success: true,
                data: {
                    projects: totalProjects,
                    clients: totalClients,
                    tasks: pendingTasks,
                    revenue: totalRevenue,
                    developers: totalDevelopers,
                    completedTasks,
                    activeProjects,
                    recentActivity,
                    upcomingDeadlines,
                    overdueProjects,
                    unreadNotifications,
                    openQueries,
                }
            });
        }
        else if (user.role === "developer") {
            totalProjects = await Project_1.Project.countDocuments({ assignedDevId: userId });
            totalClients = await Project_1.Project.distinct("clientId", { assignedDevId: userId }).then((ids) => ids.filter(Boolean).length);
            activeProjects = await Project_1.Project.countDocuments({ assignedDevId: userId, status: { $in: ["pending", "in-progress"] } });
            pendingTasks = await Task_1.Task.countDocuments({ developerId: userId, status: { $in: ["pending", "in-progress"] } });
            completedTasks = await Task_1.Task.countDocuments({ developerId: userId, status: "completed" });
            totalRevenue = 0;
            const [projects, tasks, tickets] = await Promise.all([
                Project_1.Project.find({ assignedDevId: userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt status"),
                Task_1.Task.find({ developerId: userId }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt status"),
                Ticket_1.default.find({ developerId: userId }).sort({ updatedAt: -1 }).limit(4).select("subject updatedAt status"),
            ]);
            recentActivity = [
                ...projects.map((project) => ({ id: String(project._id), type: "project", title: `Project ${project.name} is ${project.status}`, timestamp: project.updatedAt })),
                ...tasks.map((task) => ({ id: String(task._id), type: "task", title: `Task ${task.title} is ${task.status}`, timestamp: task.updatedAt })),
                ...tickets.map((ticket) => ({ id: String(ticket._id), type: "query", title: `Query ${ticket.subject} is ${ticket.status}`, timestamp: ticket.updatedAt })),
            ]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 8);
        }
        res.json({
            success: true,
            data: {
                projects: totalProjects,
                clients: totalClients,
                tasks: pendingTasks,
                revenue: totalRevenue,
                developers: totalDevelopers,
                completedTasks,
                activeProjects,
                recentActivity,
            }
        });
    }
    catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message
        });
    }
};
exports.getDashboardStats = getDashboardStats;
// Developer-specific dashboard stats with detailed breakdown
const getDeveloperStats = async (req, res) => {
    try {
        const userId = req.userId;
        const user = req.user;
        if (!userId || !user || user.role !== "developer") {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Developer access required"
            });
        }
        // Fetch projects and tasks in parallel
        const [projects, tasks] = await Promise.all([
            Project_1.Project.find({ assignedDevId: userId }).select("name status progress endDate"),
            Task_1.Task.find({ developerId: userId }).select("title status priority dueDate projectId createdAt").populate("projectId", "name status")
        ]);
        // Calculate task statistics
        const tasksByStatus = {
            pending: tasks.filter(t => t.status === "pending").length,
            inProgress: tasks.filter(t => t.status === "in-progress").length,
            review: tasks.filter(t => t.status === "review").length,
            completed: tasks.filter(t => t.status === "completed").length,
        };
        const tasksByPriority = {
            high: tasks.filter(t => t.priority === "high").length,
            medium: tasks.filter(t => t.priority === "medium").length,
            low: tasks.filter(t => t.priority === "low").length,
        };
        // Calculate deadlines
        const now = new Date();
        const upcomingDeadlines = tasks.filter(t => {
            if (!t.dueDate || t.status === "completed")
                return false;
            const dueDate = new Date(t.dueDate);
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysLeft <= 7 && daysLeft >= 0;
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        const overdueTasks = tasks.filter(t => {
            if (!t.dueDate || t.status === "completed")
                return false;
            return new Date(t.dueDate) < now;
        });
        // Generate recent activity
        const recentActivity = [
            ...projects.map(project => ({
                id: String(project._id),
                type: "project",
                title: `Project ${project.name} is ${project.status}`,
                timestamp: project.updatedAt || project.createdAt
            })),
            ...tasks.map(task => ({
                id: String(task._id),
                type: "task",
                title: `Task "${task.title}" is ${task.status}`,
                timestamp: task.createdAt
            }))
        ]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);
        const stats = {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === "in-progress").length,
            completedProjects: projects.filter(p => p.status === "completed").length,
            totalTasks: tasks.length,
            tasksByStatus,
            tasksByPriority,
            upcomingDeadlines: upcomingDeadlines.length,
            overdueTasks: overdueTasks.length,
            upcomingDeadlineTasks: upcomingDeadlines,
            overdueTaskList: overdueTasks,
            recentActivity
        };
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error("Get developer stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch developer stats",
            error: error.message
        });
    }
};
exports.getDeveloperStats = getDeveloperStats;
