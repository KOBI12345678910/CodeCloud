import { Router, type IRouter } from "express";
import { db, architecturePlansTable, projectsTable, filesTable, collaboratorsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { aiArchitectService } from "../services/ai-architect";

const router: IRouter = Router();

async function ensureProjectAccess(projectId: string, userId: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return { ok: false, status: 404, error: "Project not found" };
  if (project.ownerId === userId) return { ok: true };
  const [collab] = await db.select().from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)));
  if (collab) return { ok: true };
  if (project.isPublic) return { ok: true };
  return { ok: false, status: 403, error: "Access denied" };
}

router.post("/ai-architect/plan", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { description, projectId, save } = req.body ?? {};
  if (!description || typeof description !== "string") {
    res.status(400).json({ error: "description is required" });
    return;
  }

  if (projectId) {
    const access = await ensureProjectAccess(projectId, userId);
    if (!access.ok) { res.status(access.status!).json({ error: access.error }); return; }
  }

  const plan = aiArchitectService.plan(description);

  if (save) {
    const [stored] = await db.insert(architecturePlansTable).values({
      userId,
      projectId: projectId || null,
      title: plan.title,
      description: plan.description,
      techStack: plan.techStack,
      fileTree: plan.fileTree,
      schema: plan.schema,
      endpoints: plan.endpoints,
      components: plan.components,
    }).returning();
    res.status(201).json(stored);
    return;
  }

  res.json({ id: null, ...plan, scaffolded: { done: false, fileCount: 0 } });
});

router.get("/ai-architect/plans", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = req.query.projectId as string | undefined;
  const conditions = [eq(architecturePlansTable.userId, userId)];
  if (projectId) conditions.push(eq(architecturePlansTable.projectId, projectId));
  const plans = await db.select().from(architecturePlansTable)
    .where(and(...conditions))
    .orderBy(desc(architecturePlansTable.updatedAt))
    .limit(100);
  res.json(plans);
});

router.get("/ai-architect/plans/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [plan] = await db.select().from(architecturePlansTable)
    .where(and(eq(architecturePlansTable.id, id), eq(architecturePlansTable.userId, userId)));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(plan);
});

router.delete("/ai-architect/plans/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(architecturePlansTable)
    .where(and(eq(architecturePlansTable.id, id), eq(architecturePlansTable.userId, userId)));
  res.sendStatus(204);
});

router.post("/ai-architect/plans/:id/scaffold", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetProjectId = (req.body?.projectId as string | undefined);

  const [plan] = await db.select().from(architecturePlansTable)
    .where(and(eq(architecturePlansTable.id, id), eq(architecturePlansTable.userId, userId)));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const projectId = targetProjectId || plan.projectId;
  if (!projectId) { res.status(400).json({ error: "projectId is required to scaffold" }); return; }

  const access = await ensureProjectAccess(projectId, userId);
  if (!access.ok) { res.status(access.status!).json({ error: access.error }); return; }

  const flat = aiArchitectService.flattenFiles(plan.fileTree as Parameters<typeof aiArchitectService.flattenFiles>[0]);
  const existing = await db.select({ path: filesTable.path }).from(filesTable).where(eq(filesTable.projectId, projectId));
  const existingPaths = new Set(existing.map(e => e.path));

  let created = 0;
  for (const node of flat) {
    if (existingPaths.has(node.path)) continue;
    const name = node.path.split("/").pop() || node.path;
    await db.insert(filesTable).values({
      projectId,
      path: node.path,
      name,
      isDirectory: node.isDirectory,
      content: node.isDirectory ? null : node.content,
      sizeBytes: node.isDirectory ? 0 : Buffer.byteLength(node.content, "utf8"),
    });
    created++;
  }

  const scaffolded = { done: true, fileCount: created, scaffoldedAt: new Date().toISOString(), projectId };
  await db.update(architecturePlansTable)
    .set({ scaffolded, projectId })
    .where(eq(architecturePlansTable.id, id));

  res.json({ ok: true, created, projectId });
});

export default router;
