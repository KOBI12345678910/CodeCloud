import { Router, Request, Response } from "express";
import { databaseBackupsService } from "../services/database-backups";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/database-backups/project/:projectId", requireAuth, (req: Request, res: Response): void => {
  res.json(databaseBackupsService.listByProject(req.params.projectId as string));
});

router.post("/database-backups/:projectId", requireAuth, (req: Request, res: Response): void => {
  const { type = "manual", name } = req.body || {};
  res.status(201).json(databaseBackupsService.create(req.params.projectId as string, type, name));
});

router.get("/database-backups/:id", requireAuth, (req: Request, res: Response): void => {
  const b = databaseBackupsService.get(req.params.id as string);
  b ? res.json(b) : res.status(404).json({ error: "Not found" });
});

router.post("/database-backups/:id/restore", requireAuth, (req: Request, res: Response): void => {
  res.json(databaseBackupsService.restore(req.params.id as string));
});

router.delete("/database-backups/:id", requireAuth, (req: Request, res: Response): void => {
  databaseBackupsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" });
});

router.get("/database-backups/project/:projectId/retention", requireAuth, (req: Request, res: Response): void => {
  res.json(databaseBackupsService.getRetentionPolicy(req.params.projectId as string));
});

router.get("/database-backups/project/:projectId/storage", requireAuth, (req: Request, res: Response): void => {
  res.json(databaseBackupsService.getStorageUsage(req.params.projectId as string));
});

export default router;
