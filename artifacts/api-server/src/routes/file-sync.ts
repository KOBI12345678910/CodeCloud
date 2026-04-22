import { Router, Request, Response } from "express";
import { fileSyncService } from "../services/file-sync";

const router = Router();

router.post("/file-sync", (req: Request, res: Response): void => {
  const { containerId, projectId } = req.body;
  if (!containerId || !projectId) { res.status(400).json({ error: "containerId and projectId required" }); return; }
  res.status(201).json(fileSyncService.create(containerId, projectId));
});

router.get("/file-sync", (_req: Request, res: Response): void => {
  res.json({ states: fileSyncService.list() });
});

router.get("/file-sync/:id", (req: Request, res: Response): void => {
  const s = fileSyncService.get(req.params.id as string);
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.post("/file-sync/:id/sync", (req: Request, res: Response): void => {
  const s = fileSyncService.sync(req.params.id as string);
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.post("/file-sync/:id/resolve", (req: Request, res: Response): void => {
  const { file, resolution } = req.body;
  if (!fileSyncService.resolveConflict(req.params.id as string, file, resolution)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
