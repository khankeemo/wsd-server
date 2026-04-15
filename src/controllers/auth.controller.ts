// PATH: C:\wsd-server\src\controllers\auth.controller.ts
// Auth Controller - Handles user registration and login

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Notification from "../models/Notification";
import { escapeHtml, getFrontendBaseUrl, sendEmail } from "../services/email.service";
import {
  getPasswordValidationMessage,
  isStrongPassword,
  isValidEmail,
} from "../utils/validation";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const VERIFIED_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

const hashValue = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

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

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ message: "New password cannot be the same as your temporary password" });
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

    const user = await User.findOne({ email: normalizedEmail, role: "client" });
    if (!user) {
      return res.json({ success: true, message: "If the account is eligible, an OTP has been sent." });
    }

    const otp = generateOtp();
    user.passwordResetOtpHash = hashValue(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.passwordResetVerifiedTokenHash = "";
    user.passwordResetVerifiedTokenExpiresAt = null;
    await user.save();

    await sendEmail(
      user.email,
      "Your Websmith OTP for password reset",
      `Hello ${user.name},\n\nYour OTP for password reset is: ${otp}\nThis OTP expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
      `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5ea; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #007AFF; margin-top: 0;">Password Reset OTP</h2>
          <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Use this OTP to continue resetting your password:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0; color: #111827;">${otp}</p>
          <p style="font-size: 13px; color: #6b7280; margin: 0;">This OTP expires in 10 minutes.</p>
        </div>
      `
    );

    return res.json({ success: true, message: "If the account is eligible, an OTP has been sent." });
  } catch (err) {
    console.error("Request forgot password OTP error:", err);
    return res.status(500).json({ message: "Failed to process forgot password request." });
  }
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();

    if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP is incorrect or expired. Please try again." });
    }

    const user = await User.findOne({ email: normalizedEmail, role: "client" });
    const otpHash = hashValue(otp);
    const now = new Date();

    if (
      !user ||
      !user.passwordResetOtpHash ||
      user.passwordResetOtpHash !== otpHash ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt.getTime() < now.getTime()
    ) {
      return res.status(400).json({ message: "OTP is incorrect or expired. Please try again." });
    }

    const verificationToken = crypto.randomBytes(24).toString("hex");
    user.passwordResetVerifiedTokenHash = hashValue(verificationToken);
    user.passwordResetVerifiedTokenExpiresAt = new Date(Date.now() + VERIFIED_TOKEN_EXPIRY_MS);
    user.passwordResetOtpHash = "";
    user.passwordResetOtpExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: "OTP verified successfully.",
      verificationToken,
    });
  } catch (err) {
    console.error("Verify forgot password OTP error:", err);
    return res.status(500).json({ message: "Failed to verify OTP." });
  }
};

export const issueTemporaryPasswordAfterOtp = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const verificationToken = String(req.body?.verificationToken || "").trim();

    if (!isValidEmail(normalizedEmail) || !verificationToken) {
      return res.status(400).json({ message: "Invalid password reset request." });
    }

    const user = await User.findOne({ email: normalizedEmail, role: "client" });
    const now = new Date();
    if (
      !user ||
      !user.passwordResetVerifiedTokenHash ||
      user.passwordResetVerifiedTokenHash !== hashValue(verificationToken) ||
      !user.passwordResetVerifiedTokenExpiresAt ||
      user.passwordResetVerifiedTokenExpiresAt.getTime() < now.getTime()
    ) {
      return res.status(400).json({ message: "OTP verification is missing or expired. Please verify OTP again." });
    }

    const tempPassword = crypto.randomBytes(4).toString("hex");
    user.password = await bcrypt.hash(tempPassword, 10);
    user.isTemporaryPassword = true;
    user.setupCompleted = false;
    user.passwordResetVerifiedTokenHash = "";
    user.passwordResetVerifiedTokenExpiresAt = null;
    await user.save();

    const loginUrl = `${getFrontendBaseUrl()}/login`;
    await sendEmail(
      user.email,
      "Your Websmith temporary login password",
      `Hello ${user.name},

Your temporary password has been issued after OTP verification.

Client ID: ${user.customId || "N/A"}
Temporary Password: ${tempPassword}

Log in to dashboard: ${loginUrl}`,
      `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5ea; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #007AFF; margin-top: 0;">Temporary Password Issued</h2>
          <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Your OTP is verified. Use the credentials below to sign in:</p>
          <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Client ID:</strong> ${escapeHtml(user.customId || "N/A")}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background-color: #e5e5ea; padding: 2px 6px; border-radius: 4px;">${escapeHtml(tempPassword)}</code></p>
          </div>
          <p style="margin: 16px 0 10px 0;"><strong>Log in to your dashboard:</strong></p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
            <tr>
              <td align="center" style="border-radius: 8px; background-color: #007AFF;">
                <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px;">Log in to dashboard</a>
              </td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 13px; color: #5f6368;">For security, you must update this temporary password immediately after signing in.</p>
        </div>
      `
    );

    return res.json({
      success: true,
      message: "Temporary password sent. Please sign in and update your password immediately.",
    });
  } catch (err) {
    console.error("Issue temporary password after OTP error:", err);
    return res.status(500).json({ message: "Failed to issue temporary password." });
  }
};
