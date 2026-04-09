"use strict";
// PATH: C:\wsd-server\src\controllers\auth.controller.ts
// Auth Controller - Handles user registration and login
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
// REGISTER - Creates new user and returns token
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Check if user already exists
        const existing = await User_1.default.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Hash password
        const hashed = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await User_1.default.create({
            name,
            email,
            password: hashed,
            role: role || "client",
        });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
        // Return token and user data
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.register = register;
// LOGIN - Authenticates user and returns token
const login = async (req, res) => {
    try {
        const { email, identifier, password } = req.body;
        const loginId = identifier || email;
        if (!loginId) {
            return res.status(400).json({ message: "Email or Client ID is required" });
        }
        // Find user by email OR customId (Client ID)
        const user = await User_1.default.findOne({
            $or: [
                { email: loginId.toLowerCase() },
                { customId: loginId }
            ]
        });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        // Compare password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
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
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
        // Return token and user data
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isTemporaryPassword: user.isTemporaryPassword,
                setupCompleted: user.setupCompleted,
                isApproved: user.isApproved
            }
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
// CHANGE PASSWORD - For clients to update temporary password
const changePassword = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashed;
        user.isTemporaryPassword = false;
        user.isApproved = true; // Approve client upon first-login completion
        user.setupCompleted = true;
        await user.save();
        // Create notification for admin
        try {
            const admin = await User_1.default.findOne({ role: "admin" });
            if (admin) {
                await Notification_1.default.create({
                    recipientId: admin._id,
                    senderId: user._id,
                    type: 'client_setup_complete',
                    message: `Client ${user.name} (${user.customId}) has successfully changed their password and completed the first-login setup.`,
                });
            }
        }
        catch (notifyErr) {
            console.error("Failed to create admin notification:", notifyErr);
        }
        res.json({ success: true, message: "Password updated successfully" });
    }
    catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.changePassword = changePassword;
