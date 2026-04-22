import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types";

const SLOW_REQUEST_THRESHOLD_MS = 2000;

const SKIP_PATHS = new Set(["/api/healthz", "/api/health"]);

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();
  const correlationId = (req.headers["x-request-id"] as string) || "unknown";

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const path = req.originalUrl?.split("?")[0] || req.path;

    if (SKIP_PATHS.has(path)) return;

    const userId = (req as AuthenticatedRequest).userId || null;
    const ip = getIp(req);
    const statusCode = res.statusCode;

    const logData = {
      correlationId,
      method: req.method,
      path,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId,
      ip,
      contentLength: res.getHeader("content-length") || 0,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    if (statusCode >= 500) {
      logger.error(logData, `${req.method} ${path} ${statusCode} ${durationMs.toFixed(0)}ms`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `${req.method} ${path} ${statusCode} ${durationMs.toFixed(0)}ms`);
    } else if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn({ ...logData, slow: true }, `SLOW ${req.method} ${path} ${statusCode} ${durationMs.toFixed(0)}ms`);
    } else {
      logger.info(logData, `${req.method} ${path} ${statusCode} ${durationMs.toFixed(0)}ms`);
    }
  });

  next();
};

function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.ip || "unknown";
}
