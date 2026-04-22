import type { Request, Response, NextFunction } from "express";
import { logAudit, getClientIp, getUserAgent, type AuditAction, type AuditResourceType } from "../services/audit";
import type { AuthenticatedRequest } from "../types";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SKIP_PATHS = new Set([
  "/api/health",
  "/health",
  "/api/auth/refresh",
]);

const SENSITIVE_FIELDS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "secret",
  "token",
  "refreshToken",
  "accessToken",
  "keyHash",
  "passwordHash",
  "backupCodes",
]);

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return undefined;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function extractAction(method: string, path: string): string {
  const clean = path.replace(/\/api\//, "").replace(/\//g, ".");
  return `${method.toLowerCase()}.${clean}`.replace(/\.\./g, ".");
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  const path = req.originalUrl?.split("?")[0] || req.path;
  if (SKIP_PATHS.has(path)) {
    next();
    return;
  }

  const originalEnd = res.end;
  const startTime = Date.now();

  (res as unknown as Record<string, unknown>).end = function (
    this: Response,
    ...args: Parameters<typeof originalEnd>
  ) {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId || authReq.user?.id;

    if (userId) {
      const action = extractAction(req.method, path);
      logAudit({
        userId,
        action: action as AuditAction,
        resourceType: (path.split("/")[2] || "unknown") as AuditResourceType,
        resourceId: req.params?.id || undefined,
        metadata: {
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startTime,
          body: redactBody(req.body),
        },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        correlationId: (req.headers["x-request-id"] as string) || undefined,
      });
    }

    return originalEnd.apply(this, args);
  } as typeof originalEnd;

  next();
}
