import type { Request, Response, NextFunction } from "express";
import { validateApiKeyFromHeader, hasRequiredScope } from "../services/api-keys";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";

export function requireApiKeyScope(requiredLevel: "read" | "write" | "admin") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers["x-api-key"] as string | undefined;
    if (!apiKey) {
      next();
      return;
    }

    try {
      const key = await validateApiKeyFromHeader(apiKey);
      if (!key) {
        res.status(401).json({ error: "Invalid or expired API key" });
        return;
      }

      if (!hasRequiredScope(key, requiredLevel)) {
        res.status(403).json({
          error: `Insufficient API key scope. Required: ${requiredLevel}`,
        });
        return;
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, key.userId));

      if (!user) {
        res.status(401).json({ error: "API key owner not found" });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      authReq.userId = user.id;
      authReq.user = user;
      (authReq as Record<string, unknown>).apiKeyId = key.id;
      (authReq as Record<string, unknown>).apiKeyScope = requiredLevel;
      next();
    } catch {
      res.status(401).json({ error: "API key validation failed" });
    }
  };
}
