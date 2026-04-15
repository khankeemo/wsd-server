// PATH: C:\wsd-server\src\controllers\auth.controller.ts
// Auth Controller - Handles user registration and login

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Notification from "../models/Notification";
import {
  getPasswordValidationMessage,
  isStrongPassword,
  isValidEmail,
} from "../utils/validation";

// REGISTER - Creates new user and returns token
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // Check if user already exists
    if (!String(name || "").trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: getPasswordValidationMessage() });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashed,
      role: role || "client",
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Return token and user data
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role,
        adminLevel: user.role === "admin" ? (user.adminLevel || "super") : null,
      } 
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN - Authenticates user and returns token
export const login = async (req: Request, res: Response) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = String(identifier || email || "").trim();
    const normalizedLoginId = loginId.toLowerCase();

    if (!loginId) {
      return res.status(400).json({ message: "Email or Client ID is required" });
    }

    // Find user by email OR customId (Client ID)
    const user = await User.findOne({
      $or: [
        { email: normalizedLoginId },
        { customId: loginId }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Check if client is approved
    if (user.role === "client" && !user.isApproved && !user.isTemporaryPassword) {
      return res.status(403).json({ 
        message: "Your account is awaiting admin approval. Please check back later." 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Return token and user data
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role,
        adminLevel: user.role === "admin" ? (user.adminLevel || "super") : null,
        isTemporaryPassword: user.isTemporaryPassword,
        setupCompleted: user.setupCompleted,
        isApproved: user.isApproved
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CHANGE PASSWORD - For clients to update temporary password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    const { newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!newPassword || !isStrongPassword(newPassword)) {
      return res.status(400).json({ message: getPasswordValidationMessage() });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.isTemporaryPassword = false;
    user.isApproved = true;         // Approve client upon first-login completion
    user.setupCompleted = true;
    await user.save();

    // Create notification for admin
    try {
      const admin = await User.findOne({ role: "admin" });
      if (admin) {
        await Notification.create({
          recipientId: admin._id,
          senderId: user._id,
          type: 'client_setup_complete',
          message: `Client ${user.name} (${user.customId}) has successfully changed their password and completed the first-login setup.`,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to create admin notification:", notifyErr);
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
