import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  createSnapshot,
  restoreSnapshot,
  getProjectSnapshots,
  getSnapshot,
  deleteSnapshot,
  getSnapshotFiles,
  compareSnapshots,
  getSnapshotCount,
} from "../services/snapshots";

const router = Router();

router.get("/api/projects/:projectId/snapshots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const limit = parseInt(req.query.limit as string) || 20;
  const snapshots = await getProjectSnapshots(projectId, limit);
  const total = await getSnapshotCount(projectId);
  res.json({ snapshots, total });
});

router.get("/api/snapshots/:snapshotId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const snapshotId = req.params.snapshotId as string;
  const snap = await getSnapshot(snapshotId);
  if (!snap) { res.status(404).json({ error: "Snapshot not found" }); return; }
  const { fileSnapshot, envSnapshot, ...safe } = snap;
  res.json({ ...safe, hasFiles: !!fileSnapshot, hasEnv: !!envSnapshot });
});

router.post("/api/projects/:projectId/snapshots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const { name, description, trigger } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" }); return;
  }
  const validTriggers = ["manual", "auto", "pre_deploy", "scheduled"];
  const t = validTriggers.includes(trigger) ? trigger : "manual";
  try {
    const snapshot = await createSnapshot(projectId, name, t, (req as any).userId, description);
    const { fileSnapshot, envSnapshot, ...safe } = snapshot;
    res.status(201).json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/snapshots/:snapshotId/restore", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const snapshotId = req.params.snapshotId as string;
  try {
    const restored = await restoreSnapshot(snapshotId);
    const { fileSnapshot, envSnapshot, ...safe } = restored;
    res.json(safe);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/api/snapshots/:snapshotId/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const snapshotId = req.params.snapshotId as string;
  try {
    const files = await getSnapshotFiles(snapshotId);
    res.json(files.map(f => ({ path: f.path, name: f.name, language: f.language, isDirectory: f.isDirectory })));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/api/snapshots/compare/:fromId/:toId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const fromId = req.params.fromId as string;
  const toId = req.params.toId as string;
  try {
    const diff = await compareSnapshots(fromId, toId);
    res.json(diff);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/api/snapshots/:snapshotId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const snapshotId = req.params.snapshotId as string;
  try {
    await deleteSnapshot(snapshotId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
