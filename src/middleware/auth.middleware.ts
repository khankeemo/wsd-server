// PATH: C:\wsd-server\src\middleware\auth.middleware.ts
// Authentication Middleware - Verify JWT token

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ success: false, message: 'No token, authorization denied' });
    return;
  }
  
  try {
    // ✅ FIXED: Match the token structure from auth.controller (uses { id, ... })
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; role?: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    (req as any).userId = decoded.id;
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};
