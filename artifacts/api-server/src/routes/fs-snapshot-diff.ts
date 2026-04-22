import { Router, Request, Response } from "express";
import { fsSnapshotDiffService } from "../services/fs-snapshot-diff";
const router = Router();
router.post("/fs-snapshot-diff/capture", (req: Request, res: Response): void => { res.status(201).json(fsSnapshotDiffService.capture(req.body.containerId, req.body.files || [])); });
router.get("/fs-snapshot-diff", (req: Request, res: Response): void => { res.json(fsSnapshotDiffService.list(req.query.containerId as string)); });
router.get("/fs-snapshot-diff/:id", (req: Request, res: Response): void => { const s = fsSnapshotDiffService.get(req.params.id as string); s ? res.json(s) : res.status(404).json({ error: "Not found" }); });
router.post("/fs-snapshot-diff/diff", (req: Request, res: Response): void => { const d = fsSnapshotDiffService.diff(req.body.id1, req.body.id2); d ? res.json(d) : res.status(404).json({ error: "Snapshots not found" }); });
router.delete("/fs-snapshot-diff/:id", (req: Request, res: Response): void => { fsSnapshotDiffService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
