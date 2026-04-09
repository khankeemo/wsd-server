import { Request, Response } from "express";
import User from "../models/User";
import Notification from "../models/Notification";

// Get all clients for admin management (including approval status)
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const clients = await User.find({ role: "client" }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error("Get all clients error:", error);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
};

// Approve a client account
export const approveClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user || user.role !== "client") {
      return res.status(404).json({ message: "Client not found" });
    }

    user.isApproved = true;
    await user.save();

    res.json({ success: true, message: "Client approved successfully", data: user });
  } catch (error) {
    console.error("Approve client error:", error);
    res.status(500).json({ message: "Failed to approve client" });
  }
};

// Get admin notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId || (req as any).user?.id;
    const notifications = await Notification.find({ recipientId: adminId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// Mark notification as read
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Failed to update notification" });
  }
};
