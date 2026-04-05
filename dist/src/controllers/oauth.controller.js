"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOAuthToken = exports.oauthRegister = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// OAuth registration/login handler
const oauthRegister = async (req, res) => {
    try {
        const { provider, email, name, providerId } = req.body;
        console.log("OAuth Register request:", { provider, email, name, providerId });
        // Validate required fields
        if (!provider || !email || !name) {
            return res.status(400).json({
                message: 'Missing required fields: provider, email, name are required'
            });
        }
        // Check if user already exists with this email
        let user = await User_1.default.findOne({ email });
        if (!user) {
            // Create new user for OAuth
            user = await User_1.default.create({
                name: name,
                email: email,
                provider: provider,
                providerId: providerId || `${provider}_${Date.now()}`,
                password: Math.random().toString(36).slice(-16), // Random password for OAuth users
                isOAuthUser: true,
            });
            console.log("New OAuth user created:", user.email);
        }
        else {
            console.log("Existing OAuth user found:", user.email);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key-change-this', { expiresIn: '7d' });
        // Return success response
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('OAuth registration error:', error);
        res.status(500).json({ message: 'OAuth registration failed. Please try again.' });
    }
};
exports.oauthRegister = oauthRegister;
// Verify OAuth token from provider
const verifyOAuthToken = async (req, res) => {
    try {
        const { provider, token } = req.body;
        console.log("Verify OAuth token request:", { provider, token: token?.substring(0, 20) + "..." });
        if (!provider || !token) {
            return res.status(400).json({ message: 'Provider and token are required' });
        }
        // For real OAuth, you would verify the token with Google/Yahoo APIs
        // This is a placeholder - when you add real credentials, implement proper verification
        return res.status(501).json({
            message: 'OAuth verification not configured. Please add Google/Yahoo credentials.'
        });
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ message: 'Token verification failed' });
    }
};
exports.verifyOAuthToken = verifyOAuthToken;
