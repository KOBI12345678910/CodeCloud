import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyAccessToken } from "../services/token";
import type { AuthenticatedRequest } from "../types";

export const requireJwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub));

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({
        error: "Account temporarily locked",
        lockedUntil: user.lockedUntil.toISOString(),
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.userId = user.id;
    authReq.user = user;
    next();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Token has been revoked"
        ? "Token has been revoked"
        : "Invalid or expired token";
    res.status(401).json({ error: message });
  }
};

export const optionalJwtAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub));

    if (user) {
      const authReq = req as AuthenticatedRequest;
      authReq.userId = user.id;
      authReq.user = user;
    }
  } catch {
    // optional — silently continue
  }

  next();
};
