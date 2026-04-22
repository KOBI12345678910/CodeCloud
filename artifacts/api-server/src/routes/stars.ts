import { Router, type IRouter } from "express";
import { db, starsTable, projectsTable, usersTable, collaboratorsTable } from "@workspace/db";
import { eq, and, count, desc, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

async function canAccessProject(projectId: string, userId?: string): Promise<boolean> {
  const [project] = await db.select({ isPublic: projectsTable.isPublic, ownerId: projectsTable.ownerId })
    .from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return false;
  if (project.isPublic) return true;
  if (!userId) return false;
  if (project.ownerId === userId) return true;
  const [collab] = await db.select().from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)));
  return !!collab;
}

router.post("/projects/:id/star", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!(await canAccessProject(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [existing] = await db.select().from(starsTable)
    .where(and(eq(starsTable.userId, userId), eq(starsTable.projectId, projectId)));

  if (existing) {
    await db.delete(starsTable).where(eq(starsTable.id, existing.id));
    res.json({ starred: false });
    return;
  }

  await db.insert(starsTable).values({ userId, projectId });
  res.json({ starred: true });
});

router.get("/projects/:id/stars", async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [project] = await db.select({ isPublic: projectsTable.isPublic })
    .from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project || !project.isPublic) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [result] = await db.select({ count: count() }).from(starsTable)
    .where(eq(starsTable.projectId, projectId));
  res.json({ count: result?.count ?? 0 });
});

router.get("/user/starred", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const starred = await db.select({
    id: projectsTable.id,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    ownerName: usersTable.displayName,
    starredAt: starsTable.createdAt,
  })
    .from(starsTable)
    .innerJoin(projectsTable, eq(starsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(starsTable.userId, userId))
    .orderBy(desc(starsTable.createdAt));

  res.json(starred);
});

export default router;
