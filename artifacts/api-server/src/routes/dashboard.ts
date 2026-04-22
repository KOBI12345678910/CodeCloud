import { Router, type IRouter } from "express";
import { db, projectsTable, deploymentsTable, usersTable } from "@workspace/db";
import { eq, desc, count, sql, and } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetLanguageBreakdownResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const [projectCount] = await db.select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId));

  const [deploymentCount] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.deployedBy, userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const recentProjects = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    runCommand: projectsTable.runCommand,
    entryFile: projectsTable.entryFile,
    containerStatus: projectsTable.containerStatus,
    gpuEnabled: projectsTable.gpuEnabled,
    deployedUrl: projectsTable.deployedUrl,
    lastAccessedAt: projectsTable.lastAccessedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
    ownerName: usersTable.displayName,
  })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.ownerId, userId))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(5);

  const [runningCount] = await db.select({ count: count() })
    .from(projectsTable)
    .where(and(eq(projectsTable.containerStatus, "running"), eq(projectsTable.ownerId, userId)));

  res.json(GetDashboardStatsResponse.parse({
    totalProjects: projectCount?.count ?? 0,
    totalDeployments: deploymentCount?.count ?? 0,
    storageUsedBytes: user?.storageUsedBytes ?? 0,
    activeContainers: runningCount?.count ?? 0,
    recentProjects,
  }));
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = params.success ? params.data.limit : 10;

  const recentProjects = await db.select()
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(limit ?? 10);

  const activities = recentProjects.map((p, i) => ({
    id: `activity-${p.id}-${i}`,
    type: "project_created" as const,
    projectId: p.id,
    projectName: p.name,
    description: `Created project "${p.name}" (${p.language})`,
    createdAt: p.createdAt,
  }));

  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/language-breakdown", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const breakdown = await db.select({
    language: projectsTable.language,
    count: count(),
  })
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, userId))
    .groupBy(projectsTable.language);

  res.json(GetLanguageBreakdownResponse.parse(breakdown));
});

export default router;
