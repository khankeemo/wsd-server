"use strict";
// PATH: C:\wsd-server\src\middleware\auth.middleware.ts
// Authentication Middleware - Verify JWT token
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ success: false, message: 'No token, authorization denied' });
        return;
    }
    try {
        // ✅ FIXED: Match the token structure from auth.controller (uses { id, ... })
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User_1.default.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }
        req.userId = decoded.id;
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};
exports.authMiddleware = authMiddleware;
