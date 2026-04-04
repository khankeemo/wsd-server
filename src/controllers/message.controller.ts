import { Request, Response } from "express";
import { User } from "../models/User";

// Get current logged-in user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - user is added by auth middleware
    const user = await User.findById(req.userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};