"use strict";
// PATH: C:\wsd-server\src\controllers\stats.controller.ts
// PURPOSE: Dashboard statistics - Returns counts for projects, clients, tasks, revenue
// IMPACT: Dashboard shows real data instead of placeholders
// FEATURES: Real-time counts from database
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const Project_1 = require("../models/Project");
const getDashboardStats = async (req, res) => {
    try {
        // Get user ID from auth middleware (attached as userId)
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - No user ID found"
            });
        }
        // Get real counts from database
        const totalProjects = await Project_1.Project.countDocuments({ userId });
        // TODO: Add these when models are created:
        // const totalClients = await Client.countDocuments({ userId });
        // const pendingTasks = await Task.countDocuments({ userId, status: 'pending' });
        // const totalRevenue = await Payment.aggregate([...]);
        // Current placeholders (will show 0 until modules are built)
        const totalClients = 0;
        const pendingTasks = 0;
        const totalRevenue = 0;
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
