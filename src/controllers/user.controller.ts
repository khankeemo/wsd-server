// PATH: C:\wsd-server\src\controllers\user.controller.ts
// PURPOSE: User profile management - Get profile, update, change password
// IMPACT: User can view and edit their profile information
// FEATURES: Profile CRUD, password change with validation

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import Notification from "../models/Notification";
import { sendEmail, isEmailConfigured, escapeHtml } from "../services/email.service";

const buildUserResponse = (user: any) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  company: user.company || "",
  role: user.role || "client",
  avatar: user.avatar || "",
  customId: user.customId || "",
  published: user.published || false,
  headline: user.headline || "",
  bio: user.bio || "",
  skills: user.skills || [],
  status: user.status || "active",
  experienceYears: user.experienceYears || 0,
  joinedAt: user.joinedAt || null,
  isTemporaryPassword: user.isTemporaryPassword,
  setupCompleted: user.setupCompleted,
  preferences: user.preferences || { theme: "light", notifications: { email: true, push: true } },
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const developerCustomId = async () => {
  let next = await User.countDocuments({ role: "developer" });
  while (true) {
    next += 1;
    const candidate = `DEV-${String(next).padStart(4, "0")}`;
    const exists = await User.exists({ customId: candidate });
    if (!exists) return candidate;
  }
};

const isAdmin = (user: any) => user?.role === 'admin';
const isSuperAdmin = (user: any) => isAdmin(user) && (user.adminLevel || 'super') === 'super';

const normalizeManagedUserPayload = (body: Record<string, unknown>) => ({
  name: String(body.name || '').trim(),
  email: String(body.email || '').trim().toLowerCase(),
  phone: String(body.phone || '').trim(),
  company: String(body.company || '').trim(),
});

export class UserController {
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized - Please login again" });
        return;
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ success: false, message: "Server error - Could not fetch user profile" });
    }
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   * Requires: Authentication token
   * Body: { name?, email?, phone?, company?, avatar?, preferences? }
   */
  async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { name, email, phone, company, preferences, avatar, headline, bio, skills } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(company !== undefined ? { company } : {}),
          ...(preferences !== undefined ? { preferences } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(headline !== undefined ? { headline } : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(skills !== undefined ? { skills } : {}),
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      ).select("-password");

      if (!updatedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: buildUserResponse(updatedUser),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ success: false, message: "Server error - Could not update profile" });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: "Please provide both current and new password" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ success: false, message: "Current password is incorrect" });
        return;
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.isTemporaryPassword = false;
      await user.save();

      res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ success: false, message: "Server error - Could not change password" });
    }
  }

  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.params;
      const users = await User.find({ role }).select("-password").sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: users.map(buildUserResponse) });
    } catch (error) {
      console.error("Get users by role error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  }

  async getDevelopers(_req: Request, res: Response): Promise<void> {
    try {
      const developers = await User.find({ role: "developer" }).select("-password").sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: developers.map(buildUserResponse) });
    } catch (error) {
      console.error("Get developers error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch developers" });
    }
  }

  async createDeveloper(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        phone,
        company,
        skills = [],
        headline = "",
        bio = "",
        experienceYears = 0,
        status = "active",
        joinedAt,
        published = false,
      } = req.body;

      if (!name || !email) {
        res.status(400).json({ success: false, message: "Name and email are required" });
        return;
      }

      const existing = await User.findOne({ email: String(email).toLowerCase() });
      if (existing) {
        res.status(409).json({ success: false, message: "A user with this email already exists" });
        return;
      }

      const tempPassword = crypto.randomBytes(4).toString("hex");
      const developer = await User.create({
        name,
        email: String(email).toLowerCase(),
        password: await bcrypt.hash(tempPassword, 10),
        phone: phone || "",
        company: company || "",
        role: "developer",
        customId: await developerCustomId(),
        isTemporaryPassword: true,
        setupCompleted: false,
        skills,
        headline,
        bio,
        experienceYears: Number(experienceYears) || 0,
        status,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
        published: Boolean(published),
      });

      if (isEmailConfigured()) {
        await sendEmail(
          developer.email,
          "Your Websmith developer account",
          `Developer ID: ${developer.customId}\nTemporary Password: ${tempPassword}`,
          `<p>Your Websmith developer account is ready.</p><p><strong>Developer ID:</strong> ${developer.customId}</p><p><strong>Temporary Password:</strong> ${tempPassword}</p>`
        );
      }

      res.status(201).json({
        success: true,
        data: buildUserResponse(developer),
        temporaryPassword: isEmailConfigured() ? undefined : tempPassword,
      });
    } catch (error) {
      console.error("Create developer error:", error);
      res.status(500).json({ success: false, message: "Failed to create developer" });
    }
  }

  async updateDeveloper(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await User.findOneAndUpdate(
        { _id: id, role: "developer" },
        {
          ...(req.body.name !== undefined ? { name: req.body.name } : {}),
          ...(req.body.email !== undefined ? { email: String(req.body.email).toLowerCase() } : {}),
          ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
          ...(req.body.company !== undefined ? { company: req.body.company } : {}),
          ...(req.body.skills !== undefined ? { skills: req.body.skills } : {}),
          ...(req.body.headline !== undefined ? { headline: req.body.headline } : {}),
          ...(req.body.bio !== undefined ? { bio: req.body.bio } : {}),
          ...(req.body.experienceYears !== undefined ? { experienceYears: Number(req.body.experienceYears) || 0 } : {}),
          ...(req.body.status !== undefined ? { status: req.body.status } : {}),
          ...(req.body.joinedAt !== undefined ? { joinedAt: req.body.joinedAt ? new Date(req.body.joinedAt) : null } : {}),
          ...(req.body.published !== undefined ? { published: Boolean(req.body.published) } : {}),
        },
        { new: true, runValidators: true }
      ).select("-password");

      if (!updated) {
        res.status(404).json({ success: false, message: "Developer not found" });
        return;
      }

      res.status(200).json({ success: true, data: buildUserResponse(updated) });
    } catch (error) {
      console.error("Update developer error:", error);
      res.status(500).json({ success: false, message: "Failed to update developer" });
    }
  }

  async deleteDeveloper(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await User.findOneAndDelete({ _id: id, role: "developer" });
      if (!deleted) {
        res.status(404).json({ success: false, message: "Developer not found" });
        return;
      }
      res.status(200).json({ success: true, message: "Developer deleted successfully" });
    } catch (error) {
      console.error("Delete developer error:", error);
      res.status(500).json({ success: false, message: "Failed to delete developer" });
    }
  }

  async getPublishedDevelopers(_req: Request, res: Response): Promise<void> {
    try {
      const developers = await User.find({ role: "developer", published: true, status: "active" })
        .select("-password")
        .sort({ updatedAt: -1 });
      res.status(200).json({ success: true, data: developers.map(buildUserResponse) });
    } catch (error) {
      console.error("Get published developers error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch developers" });
    }
  }

  async getMyNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const notifications = await Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(50);

      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      console.error('Get my notifications error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  }

  async markAllNotificationsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { isRead: true }
      );
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ success: false, message: "Failed to update notifications" });
    }
  }

  async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientId: userId },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found" });
        return;
      }
      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ success: false, message: "Failed to update notification" });
    }
  }

  async createManagedUser(req: Request, res: Response): Promise<void> {
    try {
      const requester = (req as any).user;
      const { role } = req.body;
      const { name, email, phone, company } = normalizeManagedUserPayload(req.body);

      if (!isAdmin(requester)) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      if (!['admin', 'developer'].includes(role)) {
        res.status(400).json({ success: false, message: 'Only admin and developer accounts can be created here' });
        return;
      }

      if (role === 'admin' && !isSuperAdmin(requester)) {
        res.status(403).json({ success: false, message: 'Only super admin can add another admin' });
        return;
      }

      if (!name || !email) {
        res.status(400).json({ success: false, message: 'Missing required fields: name, email' });
        return;
      }

      if (!isEmailConfigured()) {
        res.status(500).json({
          success: false,
          message:
            'Account email is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the backend deployment environment.',
        });
        return;
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'A user with this email already exists' });
        return;
      }

      const generatedPassword = crypto.randomBytes(5).toString('hex');
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        company,
        role,
        adminLevel: role === 'admin' ? 'sub' : null,
        isTemporaryPassword: false,
        isApproved: true,
        setupCompleted: true,
      });

      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      const accountLabel = role === 'admin' ? 'Admin' : 'Developer';
      const emailSubject = `Your Websmith ${accountLabel} Account Credentials`;
      const emailText = `
        Hello ${name},

        Your Websmith ${accountLabel.toLowerCase()} account has been created.

        Email: ${email}
        Password: ${generatedPassword}

        Login here: ${loginUrl}
      `;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5ea; border-radius: 12px;">
          <h2 style="color: #007AFF;">Welcome to Websmith</h2>
          <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
          <p>Your ${escapeHtml(accountLabel.toLowerCase())} account is ready.</p>
          <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 0;"><strong>Password:</strong> <code style="background-color: #e5e5ea; padding: 2px 4px; border-radius: 4px;">${generatedPassword}</code></p>
          </div>
          <a href="${loginUrl}" style="display: inline-block; background-color: #007AFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Log In</a>
        </div>
      `;

      try {
        await sendEmail(email, emailSubject, emailText, emailHtml);
      } catch (emailError) {
        await User.findByIdAndDelete(user._id);
        throw emailError;
      }

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          company: user.company || '',
          role: user.role,
          adminLevel: user.role === 'admin' ? (user.adminLevel || 'super') : null,
        },
      });
    } catch (error: any) {
      console.error('Create managed user error:', error);
      const message = error?.message || 'Failed to create user';
      res.status(500).json({ success: false, message });
    }
  }

  async deleteManagedUser(req: Request, res: Response): Promise<void> {
    try {
      const requester = (req as any).user;
      const requesterId = String((req as any).userId || '');
      const { id } = req.params;

      if (!isAdmin(requester)) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      if (!['admin', 'developer'].includes(targetUser.role)) {
        res.status(400).json({ success: false, message: 'Only admin and developer accounts can be deleted here' });
        return;
      }

      if (String(targetUser._id) === requesterId) {
        res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        return;
      }

      if (targetUser.role === 'admin' && !isSuperAdmin(requester)) {
        res.status(403).json({ success: false, message: 'Only super admin can remove an admin' });
        return;
      }

      if (targetUser.role === 'admin' && (targetUser.adminLevel || 'super') === 'super') {
        res.status(403).json({ success: false, message: 'Super admin account cannot be deleted here' });
        return;
      }

      await User.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete managed user error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
  }
}

export default new UserController();
