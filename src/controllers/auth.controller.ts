// PATH: C:\wsd-server\src\controllers\auth.controller.ts
// Auth Controller - Handles user registration and login

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Notification from "../models/Notification";
import { escapeHtml, sendEmail } from "../services/email.service";
import {
  getPasswordValidationMessage,
  isStrongPassword,
  isValidEmail,
} from "../utils/validation";

const OTP_EXPIRY_MINUTES = 10;
const createOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;
const hashOtp = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

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

export const requestForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isOAuthUser) {
      return res.status(400).json({ 
        message: "This account is linked with Google. Please log in using the Google button." 
      });
    }

    const otp = createOtp();
    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.passwordResetOtpVerified = false;
    await user.save();

    await sendEmail(
      user.email,
      "OTP for password reset",
      `Hello ${user.name},\n\nYour OTP is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
      `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5ea; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #007AFF; margin-top: 0;">OTP Verification</h2>
          <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Use this OTP to reset your password:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0; color: #111827;">${otp}</p>
          <p style="font-size: 13px; color: #6b7280;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        </div>
      `
    );

    return res.json({ success: true, message: "OTP has been sent to your registered email." });
  } catch (err: any) {
    console.error("Request forgot password OTP error details:", {
      message: err.message,
      stack: err.stack,
      email: req.body?.email
    });
    return res.status(500).json({ 
      message: "Failed to send OTP. This is likely an email service configuration issue. Please contact support." 
    });
  }
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();

    if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP is incorrect or expired. Please try again." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (
      !user ||
      !user.passwordResetOtpHash ||
      user.passwordResetOtpHash !== hashOtp(otp) ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "OTP is incorrect or expired. Please try again." });
    }

    user.passwordResetOtpVerified = true;
    await user.save();

    return res.json({ success: true, message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify forgot password OTP error:", err);
    return res.status(500).json({ message: "Failed to verify OTP. Please try again." });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: getPasswordValidationMessage() });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "Email not found. Please register first." });
    }

    if (!user.passwordResetOtpVerified || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP is incorrect or expired. Please try again." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtpHash = "";
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpVerified = false;
    user.isTemporaryPassword = false;
    await user.save();

    await sendEmail(
      user.email,
      "Password changed successfully",
      `Hello ${user.name},\n\nYour password has been changed successfully.`,
      `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5ea; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #007AFF; margin-top: 0;">Password Updated</h2>
          <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Your password has been changed successfully.</p>
        </div>
      `
    );

    return res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password with OTP error:", err);
    return res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};
