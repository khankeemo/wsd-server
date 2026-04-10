"use strict";
// PATH: C:\wsd-server\src\controllers\user.controller.ts
// PURPOSE: User profile management - Get profile, update, change password
// IMPACT: User can view and edit their profile information
// FEATURES: Profile CRUD, password change with validation
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const email_service_1 = require("../services/email.service");
const isAdmin = (user) => user?.role === 'admin';
const isSuperAdmin = (user) => isAdmin(user) && (user.adminLevel || 'super') === 'super';
const normalizeManagedUserPayload = (body) => ({
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    phone: String(body.phone || '').trim(),
    company: String(body.company || '').trim(),
});
class UserController {
    /**
     * Get current user profile
     * GET /api/users/me
     * Requires: Authentication token
     * Returns: User object (without password)
     */
    async getCurrentUser(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized - Please login again'
                });
                return;
            }
            const user = await User_1.default.findById(userId).select('-password');
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    company: user.company || '',
                    role: user.role || 'client',
                    adminLevel: user.role === 'admin' ? (user.adminLevel || 'super') : null,
                    avatar: user.avatar || '',
                    preferences: user.preferences || { theme: 'light', notifications: { email: true, push: true } },
                    createdAt: user.createdAt,
                }
            });
        }
        catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error - Could not fetch user profile'
            });
        }
    }
    /**
     * Update user profile
     * PUT /api/users/profile
     * Requires: Authentication token
     * Body: { name?, email?, phone?, company?, avatar?, preferences? }
     */
    async updateUserProfile(req, res) {
        try {
            const userId = req.userId;
            const { name, email, phone, company, avatar, preferences } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
                return;
            }
            const updateData = {};
            if (name)
                updateData.name = name;
            if (email)
                updateData.email = email;
            if (phone)
                updateData.phone = phone;
            if (company)
                updateData.company = company;
            if (avatar)
                updateData.avatar = avatar;
            if (preferences)
                updateData.preferences = preferences;
            const updatedUser = await User_1.default.findByIdAndUpdate(userId, { ...updateData, updatedAt: new Date() }, { new: true, runValidators: true }).select('-password');
            if (!updatedUser) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });
        }
        catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error - Could not update profile'
            });
        }
    }
    /**
     * Change user password
     * PUT /api/users/change-password
     * Requires: Authentication token
     * Body: { currentPassword, newPassword }
     */
    async changePassword(req, res) {
        try {
            const userId = req.userId;
            const { currentPassword, newPassword } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
                return;
            }
            if (!currentPassword || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Please provide both current and new password'
                });
                return;
            }
            if (newPassword.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters'
                });
                return;
            }
            const user = await User_1.default.findById(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            // Verify current password
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
                return;
            }
            // Hash and save new password
            const salt = await bcryptjs_1.default.genSalt(10);
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
            user.password = hashedPassword;
            await user.save();
            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        }
        catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error - Could not change password'
            });
        }
    }
    async getUsersByRole(req, res) {
        try {
            const requester = req.user;
            const { role } = req.params;
            if (!requester) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            if (requester.role !== 'admin') {
                res.status(403).json({ success: false, message: 'Forbidden' });
                return;
            }
            if (role === 'admin' && !isSuperAdmin(requester)) {
                res.status(403).json({ success: false, message: 'Only super admin can view admins' });
                return;
            }
            const users = await User_1.default.find({ role }).select('_id name email role company adminLevel');
            res.status(200).json({
                success: true,
                data: users,
            });
        }
        catch (error) {
            console.error('Get users by role error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch users' });
        }
    }
    async getMyNotifications(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const notifications = await Notification_1.default.find({ recipientId: userId })
                .sort({ createdAt: -1 })
                .limit(50);
            res.status(200).json({ success: true, data: notifications });
        }
        catch (error) {
            console.error('Get my notifications error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    }
    async markMyNotificationRead(req, res) {
        try {
            const userId = req.userId;
            const { id } = req.params;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            await Notification_1.default.findOneAndUpdate({ _id: id, recipientId: userId }, { isRead: true });
            res.status(200).json({ success: true, message: 'Notification marked as read' });
        }
        catch (error) {
            console.error('Mark my notification read error:', error);
            res.status(500).json({ success: false, message: 'Failed to update notification' });
        }
    }
    async createManagedUser(req, res) {
        try {
            const requester = req.user;
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
            if (!(0, email_service_1.isEmailConfigured)()) {
                res.status(500).json({
                    success: false,
                    message: 'Account email is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the backend deployment environment.',
                });
                return;
            }
            const existingUser = await User_1.default.findOne({ email });
            if (existingUser) {
                res.status(409).json({ success: false, message: 'A user with this email already exists' });
                return;
            }
            const generatedPassword = crypto_1.default.randomBytes(5).toString('hex');
            const hashedPassword = await bcryptjs_1.default.hash(generatedPassword, 10);
            const user = await User_1.default.create({
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
          <p>Hello <strong>${(0, email_service_1.escapeHtml)(name)}</strong>,</p>
          <p>Your ${(0, email_service_1.escapeHtml)(accountLabel.toLowerCase())} account is ready.</p>
          <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${(0, email_service_1.escapeHtml)(email)}</p>
            <p style="margin: 0;"><strong>Password:</strong> <code style="background-color: #e5e5ea; padding: 2px 4px; border-radius: 4px;">${generatedPassword}</code></p>
          </div>
          <a href="${loginUrl}" style="display: inline-block; background-color: #007AFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Log In</a>
        </div>
      `;
            try {
                await (0, email_service_1.sendEmail)(email, emailSubject, emailText, emailHtml);
            }
            catch (emailError) {
                await User_1.default.findByIdAndDelete(user._id);
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
        }
        catch (error) {
            console.error('Create managed user error:', error);
            const message = error?.message || 'Failed to create user';
            res.status(500).json({ success: false, message });
        }
    }
    async deleteManagedUser(req, res) {
        try {
            const requester = req.user;
            const requesterId = String(req.userId || '');
            const { id } = req.params;
            if (!isAdmin(requester)) {
                res.status(403).json({ success: false, message: 'Forbidden' });
                return;
            }
            const targetUser = await User_1.default.findById(id);
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
            await User_1.default.findByIdAndDelete(id);
            res.status(200).json({ success: true, message: 'User deleted successfully' });
        }
        catch (error) {
            console.error('Delete managed user error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete user' });
        }
    }
}
exports.UserController = UserController;
exports.default = new UserController();
