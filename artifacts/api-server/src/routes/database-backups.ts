import { Router, Request, Response } from "express";
import { databaseBackupsService } from "../services/database-backups";
const router = Router();
router.get("/database-backups/project/:projectId", (req: Request, res: Response): void => { res.json(databaseBackupsService.listByProject(req.params.projectId as string)); });
router.post("/database-backups/:projectId", (req: Request, res: Response): void => { res.status(201).json(databaseBackupsService.create(req.params.projectId as string, req.body.type)); });
router.get("/database-backups/:id", (req: Request, res: Response): void => { const b = databaseBackupsService.get(req.params.id as string); b ? res.json(b) : res.status(404).json({ error: "Not found" }); });
router.post("/database-backups/:id/restore", (req: Request, res: Response): void => { res.json(databaseBackupsService.restore(req.params.id as string)); });
router.delete("/database-backups/:id", (req: Request, res: Response): void => { databaseBackupsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
