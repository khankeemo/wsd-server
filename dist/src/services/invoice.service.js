"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.getCurrentUser = void 0;
const User_1 = __importDefault(require("../models/User"));
// Get current logged-in user
const getCurrentUser = async (req, res) => {
    try {
        // @ts-ignore - user is added by auth middleware
        const user = await User_1.default.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getCurrentUser = getCurrentUser;
// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.find().select("-password");
        res.json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllUsers = getAllUsers;
