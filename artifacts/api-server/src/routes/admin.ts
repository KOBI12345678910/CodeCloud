import { Router, type IRouter } from "express";
import { db, usersTable, projectsTable, deploymentsTable, auditLogTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);
  const [deployCount] = await db.select({ count: count() }).from(deploymentsTable);

  const recentUsers = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    username: usersTable.username,
    plan: usersTable.plan,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(10);

  res.json({
    totalUsers: userCount?.count ?? 0,
    totalProjects: projectCount?.count ?? 0,
    totalDeployments: deployCount?.count ?? 0,
    recentUsers,
  });
});

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const search = req.query.search as string | undefined;

  let query = db.select({
    id: usersTable.id,
    email: usersTable.email,
    username: usersTable.username,
    displayName: usersTable.displayName,
    plan: usersTable.plan,
    storageUsedBytes: usersTable.storageUsedBytes,
    createdAt: usersTable.createdAt,
    lastLoginAt: usersTable.lastLoginAt,
  }).from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const users = await query;
  const [total] = await db.select({ count: count() }).from(usersTable);

  res.json({ users, total: total?.count ?? 0 });
});

router.get("/admin/projects", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;

  const projects = await db.select({
    id: projectsTable.id,
    name: projectsTable.name,
    slug: projectsTable.slug,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    containerStatus: projectsTable.containerStatus,
    ownerName: usersTable.displayName,
    ownerEmail: usersTable.email,
    createdAt: projectsTable.createdAt,
  }).from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .orderBy(desc(projectsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(projectsTable);

  res.json({ projects, total: total?.count ?? 0 });
});

router.get("/admin/audit-log", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;

  const logs = await db.select({
    id: auditLogTable.id,
    userId: auditLogTable.userId,
    action: auditLogTable.action,
    resourceType: auditLogTable.resourceType,
    resourceId: auditLogTable.resourceId,
    metadata: auditLogTable.metadata,
    ipAddress: auditLogTable.ipAddress,
    createdAt: auditLogTable.createdAt,
    username: usersTable.username,
  }).from(auditLogTable)
    .leftJoin(usersTable, eq(auditLogTable.userId, usersTable.id))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(logs);
});

router.patch("/admin/users/:id/plan", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { plan } = req.body;

  if (!["free", "pro", "team"].includes(plan)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ plan })
    .where(eq(usersTable.id, targetId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

export default router;
