import { Router, Request, Response } from "express";
import { projectSnapshotsService } from "../services/project-snapshots";
const router = Router();
router.get("/project-snapshots/:projectId", (req: Request, res: Response): void => { res.json(projectSnapshotsService.list(req.params.projectId as string)); });
router.post("/project-snapshots", (req: Request, res: Response): void => { res.status(201).json(projectSnapshotsService.create(req.body)); });
router.get("/project-snapshots/snapshot/:id", (req: Request, res: Response): void => { const s = projectSnapshotsService.get(req.params.id as string); s ? res.json(s) : res.status(404).json({ error: "Not found" }); });
router.post("/project-snapshots/:id/restore", (req: Request, res: Response): void => { const r = projectSnapshotsService.restore(req.params.id as string); r ? res.json(r) : res.status(404).json({ error: "Not found" }); });
router.delete("/project-snapshots/:id", (req: Request, res: Response): void => { projectSnapshotsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
