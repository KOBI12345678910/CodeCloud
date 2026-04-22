import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function createLimiter(windowMs: number, max: number, name: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    handler: (_req: Request, res: Response) => {
      console.warn(`[rate-limit] ${name} limit hit from ${_req.ip}`);
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    validate: { xForwardedForHeader: false },
  });
}

export const generalLimiter = createLimiter(60 * 1000, 100, "general");

export const authLimiter = createLimiter(60 * 1000, 10, "auth");

export const aiLimiter = createLimiter(60 * 1000, 20, "ai");

export const uploadLimiter = createLimiter(60 * 1000, 5, "upload");

export const deployLimiter = createLimiter(60 * 1000, 3, "deploy");
