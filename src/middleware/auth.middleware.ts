// PATH: C:\wsd-server\src\middleware\auth.middleware.ts
// Authentication Middleware - Verify JWT token

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ success: false, message: 'No token, authorization denied' });
    return;
  }
  
  try {
    // ✅ FIXED: Match the token structure from auth.controller (uses { id, ... })
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};