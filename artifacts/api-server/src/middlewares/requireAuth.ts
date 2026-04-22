import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, projectsTable, collaboratorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));

  if (!user) {
    const sessionClaims = (auth as Record<string, unknown>).sessionClaims as Record<string, string> | undefined;
    const email = sessionClaims?.email || `${clerkUserId}@user.local`;
    const username = clerkUserId.replace(/^user_/, "").slice(0, 20);
    [user] = await db.insert(usersTable).values({
      clerkId: clerkUserId,
      email,
      username,
    }).onConflictDoNothing().returning();

    if (!user) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));
    }
  }

  if (!user) {
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  authReq.userId = user.id;
  authReq.user = user;
  next();
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    next();
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));
  if (user) {
    const authReq = req as AuthenticatedRequest;
    authReq.userId = user.id;
    authReq.user = user;
  }
  next();
};

export const requireProjectAccess = (requiredRole?: "viewer" | "editor" | "admin") => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawId = req.params.id || req.params.projectId;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!projectId) {
      res.status(400).json({ error: "Missing project ID" });
      return;
    }

    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (project.ownerId === userId) {
      authReq.project = project;
      authReq.projectRole = "admin";
      next();
      return;
    }

    const [collab] = await db.select().from(collaboratorsTable)
      .where(and(
        eq(collaboratorsTable.projectId, projectId),
        eq(collaboratorsTable.userId, userId),
      ));

    if (collab) {
      if (requiredRole === "admin" && collab.role !== "admin") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      if (requiredRole === "editor" && collab.role === "viewer") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      authReq.project = project;
      authReq.projectRole = collab.role as "viewer" | "editor" | "admin";
      next();
      return;
    }

    if (project.isPublic && (!requiredRole || requiredRole === "viewer")) {
      authReq.project = project;
      authReq.projectRole = "viewer";
      next();
      return;
    }

    res.status(403).json({ error: "Access denied" });
  };
};
