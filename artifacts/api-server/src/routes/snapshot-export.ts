import { Router, Request, Response } from "express";
import { snapshotExportService } from "../services/snapshot-export";

const router = Router();

router.post("/snapshots/export", (req: Request, res: Response): void => {
  const { containerId, name, description, createdBy } = req.body;
  if (!containerId || !name) { res.status(400).json({ error: "containerId and name required" }); return; }
  res.status(201).json(snapshotExportService.export(containerId, name, description || "", createdBy || "system"));
});

router.get("/snapshots", (_req: Request, res: Response): void => {
  res.json({ snapshots: snapshotExportService.list() });
});

router.get("/snapshots/marketplace", (_req: Request, res: Response): void => {
  res.json({ snapshots: snapshotExportService.marketplace() });
});

router.get("/snapshots/:id", (req: Request, res: Response): void => {
  const s = snapshotExportService.get(req.params.id as string);
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.post("/snapshots/:id/import", (req: Request, res: Response): void => {
  const { targetContainerId } = req.body;
  res.json(snapshotExportService.import(req.params.id as string, targetContainerId));
});

router.post("/snapshots/:id/share", (req: Request, res: Response): void => {
  if (!snapshotExportService.share(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.delete("/snapshots/:id", (req: Request, res: Response): void => {
  if (!snapshotExportService.delete(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
