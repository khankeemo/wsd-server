// PATH: C:\wsd-server\src\controllers\stats.controller.ts
// PURPOSE: Dashboard statistics - Returns counts for projects, clients, tasks, revenue
// IMPACT: Dashboard shows real data instead of placeholders
// FEATURES: Real-time counts from database

import { Request, Response } from "express";
import { Project } from "../models/Project";
import { Client } from "../models/Client";
import { Task } from "../models/Task";
import Payment from "../models/Payment";
import Ticket from "../models/Ticket";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = (req as any).user;

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
      totalProjects = await Project.countDocuments({ userId });
      totalClients = await UserlessClientCount(userId);
      pendingTasks = await Task.countDocuments({ userId, status: "pending" });
      const payments = await Payment.find({ userId, status: "completed" });
      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    } else if (user.role === "client") {
      totalProjects = await Project.countDocuments({ clientId: userId });
      totalClients = 1;
      pendingTasks = await Ticket.countDocuments({ clientId: userId, status: { $ne: "resolved" } });
      const payments = await Payment.find({ clientId: userId, status: "completed" });
      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    } else if (user.role === "developer") {
      totalProjects = await Project.countDocuments({ assignedDevId: userId });
      totalClients = await Project.distinct("clientId", { assignedDevId: userId }).then((ids) => ids.filter(Boolean).length);
      pendingTasks = await Project.countDocuments({ assignedDevId: userId, status: { $in: ["pending", "in-progress"] } });
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
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics",
      error: (error as Error).message 
    });
  }
};

const UserlessClientCount = async (userId: string) => {
  try {
    return await Client.countDocuments({ userId });
  } catch {
    return 0;
  }
};
