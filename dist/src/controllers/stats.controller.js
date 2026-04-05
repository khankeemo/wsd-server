"use strict";
// PATH: C:\wsd-server\src\controllers\stats.controller.ts
// PURPOSE: Dashboard statistics - Returns counts for projects, clients, tasks, revenue
// IMPACT: Dashboard shows real data instead of placeholders
// FEATURES: Real-time counts from database
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const Project_1 = require("../models/Project");
const Client_1 = require("../models/Client");
const Task_1 = require("../models/Task");
const Payment_1 = __importDefault(require("../models/Payment"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
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
        if (user.role === "admin") {
            totalProjects = await Project_1.Project.countDocuments({ userId });
            totalClients = await UserlessClientCount(userId);
            pendingTasks = await Task_1.Task.countDocuments({ userId, status: "pending" });
            const payments = await Payment_1.default.find({ userId, status: "completed" });
            totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
        }
        else if (user.role === "client") {
            totalProjects = await Project_1.Project.countDocuments({ clientId: userId });
            totalClients = 1;
            pendingTasks = await Ticket_1.default.countDocuments({ clientId: userId, status: { $ne: "resolved" } });
            const payments = await Payment_1.default.find({ clientId: userId, status: "completed" });
            totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
        }
        else if (user.role === "developer") {
            totalProjects = await Project_1.Project.countDocuments({ assignedDevId: userId });
            totalClients = await Project_1.Project.distinct("clientId", { assignedDevId: userId }).then((ids) => ids.filter(Boolean).length);
            pendingTasks = await Project_1.Project.countDocuments({ assignedDevId: userId, status: { $in: ["pending", "in-progress"] } });
            totalRevenue = 0;
        }
        res.json({
            success: true,
            data: {
                projects: totalProjects,
                clients: totalClients,
                tasks: pendingTasks,
                revenue: totalRevenue
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
const UserlessClientCount = async (userId) => {
    try {
        return await Client_1.Client.countDocuments({ userId });
    }
    catch {
        return 0;
    }
};
