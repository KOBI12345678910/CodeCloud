import type { Request, Response, NextFunction } from "express";
import { db, usersTable, userSessionsTable, orgMembersTable, orgPoliciesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { verifyAccessToken } from "../services/token";
import type { AuthenticatedRequest } from "../types";

async function checkOrgPolicies(req: Request, res: Response, user: { id: string; twoFactorEnabled: boolean | null }): Promise<boolean> {
  const memberships = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, user.id));
  for (const membership of memberships) {
    const [policy] = await db.select().from(orgPoliciesTable).where(eq(orgPoliciesTable.orgId, membership.orgId));
    if (policy) {
      if (policy.require2fa && !user.twoFactorEnabled) {
        res.status(403).json({
          error: "Two-factor authentication is required by your organization",
          code: "2FA_REQUIRED",
          orgId: membership.orgId,
        });
        return false;
      }
      if (policy.apiAccessEnabled === false && req.headers["x-api-key"]) {
        res.status(403).json({
          error: "API key access is disabled by your organization",
          code: "API_ACCESS_DISABLED",
          orgId: membership.orgId,
        });
        return false;
      }
    }
  }
  return true;
}

async function checkSessionTimeout(res: Response, userId: string): Promise<boolean> {
  const sessions = await db
    .select()
    .from(userSessionsTable)
    .where(and(
      eq(userSessionsTable.userId, userId),
      eq(userSessionsTable.active, true)
    ));

  if (sessions.length === 0) return true;

  const mostRecent = sessions.reduce((a, b) =>
    new Date(a.lastActivity).getTime() > new Date(b.lastActivity).getTime() ? a : b
  );

  const memberships = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  for (const membership of memberships) {
    const [policy] = await db.select().from(orgPoliciesTable).where(eq(orgPoliciesTable.orgId, membership.orgId));
    if (policy?.sessionTimeoutMinutes) {
      const timeoutMs = parseInt(policy.sessionTimeoutMinutes as string, 10) * 60 * 1000;
      if (timeoutMs > 0 && mostRecent.lastActivity) {
        const idle = Date.now() - new Date(mostRecent.lastActivity).getTime();
        if (idle > timeoutMs) {
          await db.update(userSessionsTable)
            .set({ active: false })
            .where(eq(userSessionsTable.id, mostRecent.id));
          res.status(401).json({ error: "Session expired due to inactivity", code: "SESSION_TIMEOUT" });
          return false;
        }
      }
    }
  }

  await db.update(userSessionsTable)
    .set({ lastActivity: new Date() })
    .where(eq(userSessionsTable.id, mostRecent.id));

  return true;
}

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

    if (!(await checkSessionTimeout(res, user.id))) return;
    if (!(await checkOrgPolicies(req, res, user))) return;

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
  }

  next();
};
