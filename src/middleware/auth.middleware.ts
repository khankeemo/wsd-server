// PATH: C:\wsd-server\src\middleware\auth.middleware.ts
// Authentication Middleware - Verify JWT token

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { connectDB } from '../config/dbConnection';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  
  if (!token) {
    res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_MISSING',
      message: 'No token, authorization denied',
    });
    return;
  }
  
  try {
    await connectDB();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; role?: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    (req as any).userId = decoded.id;
    (req as any).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_INVALID',
        message: 'Token is not valid',
      });
      return;
    }

    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      code: 'AUTH_SESSION_CHECK_FAILED',
      message: 'Unable to validate session right now',
    });
  }
};
