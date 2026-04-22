import { Router, type IRouter } from "express";
import { db, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import {
  startMigration,
  getMigration,
  getProjectMigrations,
  cancelMigration,
  getAvailableHosts,
} from "../services/live-migration";

const router: IRouter = Router();

router.get("/migrations/hosts", requireAuth, (_req, res): void => {
  res.json({ hosts: getAvailableHosts() });
});

router.post("/projects/:projectId/migrations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  const { targetHost } = req.body;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const job = startMigration(projectId as string, targetHost);
    res.status(201).json({ migration: job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Migration failed";
    res.status(409).json({ error: message });
  }
});

router.get("/projects/:projectId/migrations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const migrations = getProjectMigrations(projectId as string);
  res.json({ migrations });
});

router.get("/migrations/:migrationId", requireAuth, (req, res): void => {
  const { migrationId } = req.params;
  const migration = getMigration(migrationId as string);
  if (!migration) {
    res.status(404).json({ error: "Migration not found" });
    return;
  }
  res.json({ migration });
});

router.post("/migrations/:migrationId/cancel", requireAuth, (req, res): void => {
  const { migrationId } = req.params;
  const migration = cancelMigration(migrationId as string);
  if (!migration) {
    res.status(404).json({ error: "Migration not found" });
    return;
  }
  res.json({ migration });
});

export default router;
