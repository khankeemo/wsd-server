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
import User from "../models/User";

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
    let totalDevelopers = 0;
    let completedTasks = 0;
    let activeProjects = 0;
    let recentActivity: Array<{ id: string; type: string; title: string; timestamp: Date }> = [];

    if (user.role === "admin") {
      totalProjects = await Project.countDocuments({ userId });
      activeProjects = await Project.countDocuments({ userId, status: { $in: ["pending", "in-progress"] } });
      totalClients = await Client.countDocuments({ adminId: userId });
      totalDevelopers = await User.countDocuments({ role: "developer" });
      pendingTasks = await Task.countDocuments({ userId, status: { $in: ["pending", "in-progress"] } });
      completedTasks = await Task.countDocuments({ userId, status: "completed" });
      const payments = await Payment.find({ userId, status: "completed" });
      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const [projects, tasks, clients] = await Promise.all([
        Project.find({ userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt"),
        Task.find({ userId, status: "completed" }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt"),
        Client.find({ adminId: userId }).sort({ createdAt: -1 }).limit(4).select("name createdAt"),
      ]);
      recentActivity = [
        ...projects.map((project) => ({ id: String(project._id), type: "project", title: `Project updated: ${project.name}`, timestamp: project.updatedAt })),
        ...tasks.map((task) => ({ id: String(task._id), type: "task", title: `Task completed: ${task.title}`, timestamp: task.updatedAt })),
        ...clients.map((client) => ({ id: String(client._id), type: "client", title: `Client added: ${client.name}`, timestamp: client.createdAt })),
      ]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 8);
    } else if (user.role === "client") {
      totalProjects = await Project.countDocuments({ clientId: userId });
      totalClients = 1;
      activeProjects = await Project.countDocuments({ clientId: userId, status: { $in: ["pending", "in-progress"] } });
      pendingTasks = await Task.countDocuments({ clientId: userId, status: { $in: ["pending", "in-progress"] } });
      completedTasks = await Task.countDocuments({ clientId: userId, status: "completed" });
      const payments = await Payment.find({ clientId: userId, status: "completed" });
      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const [projects, tasks, tickets] = await Promise.all([
        Project.find({ clientId: userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt status"),
        Task.find({ clientId: userId, status: "completed" }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt"),
        Ticket.find({ clientId: userId }).sort({ updatedAt: -1 }).limit(4).select("subject updatedAt status"),
      ]);
      recentActivity = [
        ...projects.map((project) => ({ id: String(project._id), type: "project", title: `Project ${project.name} is ${project.status}`, timestamp: project.updatedAt })),
        ...tasks.map((task) => ({ id: String(task._id), type: "task", title: `Task completed: ${task.title}`, timestamp: task.updatedAt })),
        ...tickets.map((ticket) => ({ id: String(ticket._id), type: "query", title: `Query ${ticket.subject} is ${ticket.status}`, timestamp: ticket.updatedAt })),
      ]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 8);
    } else if (user.role === "developer") {
      totalProjects = await Project.countDocuments({ assignedDevId: userId });
      totalClients = await Project.distinct("clientId", { assignedDevId: userId }).then((ids) => ids.filter(Boolean).length);
      activeProjects = await Project.countDocuments({ assignedDevId: userId, status: { $in: ["pending", "in-progress"] } });
      pendingTasks = await Task.countDocuments({ developerId: userId, status: { $in: ["pending", "in-progress"] } });
      completedTasks = await Task.countDocuments({ developerId: userId, status: "completed" });
      totalRevenue = 0;
      const [projects, tasks, tickets] = await Promise.all([
        Project.find({ assignedDevId: userId }).sort({ updatedAt: -1 }).limit(4).select("name updatedAt status"),
        Task.find({ developerId: userId }).sort({ updatedAt: -1 }).limit(4).select("title updatedAt status"),
        Ticket.find({ developerId: userId }).sort({ updatedAt: -1 }).limit(4).select("subject updatedAt status"),
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
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics",
      error: (error as Error).message 
    });
  }
};
