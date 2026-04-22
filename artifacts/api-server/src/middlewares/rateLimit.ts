import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types";

type PlanLimits = { free: number; pro: number; team: number };

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

function createPlanAwareLimiter(windowMs: number, limits: PlanLimits, name: string) {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      const plan = authReq.user?.plan || "free";
      return limits[plan as keyof PlanLimits] || limits.free;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const plan = authReq.user?.plan || "free";
      console.warn(`[rate-limit] ${name} limit hit from ${req.ip} (plan: ${plan})`);
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
        plan,
        upgradeMessage: plan === "free" ? "Upgrade to Pro or Team for higher limits." : undefined,
      });
    },
    validate: { xForwardedForHeader: false },
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.userId || req.ip || "unknown";
    },
  });
}

export const generalLimiter = createLimiter(60 * 1000, 100, "general");

export const authLimiter = createLimiter(60 * 1000, 10, "auth");

export const aiLimiter = createPlanAwareLimiter(60 * 1000, { free: 10, pro: 60, team: 120 }, "ai");

export const uploadLimiter = createPlanAwareLimiter(60 * 1000, { free: 3, pro: 15, team: 30 }, "upload");

export const deployLimiter = createPlanAwareLimiter(60 * 1000, { free: 2, pro: 10, team: 20 }, "deploy");

export const apiKeyLimiter = createPlanAwareLimiter(60 * 1000, { free: 30, pro: 100, team: 300 }, "api-key");
