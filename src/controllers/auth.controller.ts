// PATH: C:\wsd-server\src\controllers\auth.controller.ts
// Auth Controller - Handles user registration and login

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";  // ✅ FIXED: default import, not named import

// REGISTER - Creates new user and returns token
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Return token and user data
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
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
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    // Return token and user data
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};