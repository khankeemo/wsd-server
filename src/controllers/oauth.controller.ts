// C:\wsd-server\src\controllers\oauth.controller.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

// OAuth registration/login handler
export const oauthRegister = async (req: Request, res: Response) => {
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
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user for OAuth
      user = await User.create({
        name: name,
        email: email,
        provider: provider,
        providerId: providerId || `${provider}_${Date.now()}`,
        password: Math.random().toString(36).slice(-16), // Random password for OAuth users
        isOAuthUser: true,
      });
      console.log("New OAuth user created:", user.email);
    } else {
      console.log("Existing OAuth user found:", user.email);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('OAuth registration error:', error);
    res.status(500).json({ message: 'OAuth registration failed. Please try again.' });
  }
};

// Verify OAuth token from provider
export const verifyOAuthToken = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Token verification failed' });
  }
};