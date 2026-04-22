import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types";

type PlanLimits = { free: number; pro: number; team: number };

interface TierMultiplier {
  free: number;
  pro: number;
  team: number;
}

const TIER_MULTIPLIERS: TierMultiplier = {
  free: 1,
  pro: 2,
  team: 5,
};

function getUserPlan(req: Request): keyof TierMultiplier {
  const user = (req as Record<string, unknown>).user as { plan?: string } | undefined;
  const plan = user?.plan;
  if (plan === "pro" || plan === "team") return plan;
  return "free";
}

function createLimiter(windowMs: number, baseMax: number, name: string, tiered = false) {
  return rateLimit({
    windowMs,
    max: tiered
      ? (req: Request) => {
          const plan = getUserPlan(req);
          return baseMax * TIER_MULTIPLIERS[plan];
        }
      : baseMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    handler: (_req: Request, res: Response) => {
      const plan = getUserPlan(_req);
      console.warn(`[rate-limit] ${name} limit hit from ${_req.ip} (plan: ${plan})`);
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    validate: { xForwardedForHeader: false },
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.userId || req.ip || "unknown";
    },
  });
}

export const generalLimiter = createLimiter(60 * 1000, 200, "general", true);

export const authLimiter = createLimiter(60 * 1000, 10, "auth");

export const aiLimiter = createLimiter(60 * 1000, 20, "ai", true);

export const uploadLimiter = createLimiter(60 * 1000, 5, "upload", true);

export const deployLimiter = createLimiter(60 * 1000, 3, "deploy", true);

export const billingLimiter = createLimiter(60 * 1000, 5, "billing");

export const apiKeyLimiter = createLimiter(60 * 1000, 30, "api-key", true);
