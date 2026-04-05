import { Request, Response, NextFunction } from "express";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const requestStore = new Map<string, number[]>();

export const leadRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (requestStore.get(key) || []).filter((timestamp) => timestamp > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: "Too many lead submissions from this connection. Please try again later.",
    });
  }

  timestamps.push(now);
  requestStore.set(key, timestamps);
  next();
};
