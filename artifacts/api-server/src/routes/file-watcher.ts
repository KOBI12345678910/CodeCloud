import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { fileWatcher } from "../services/file-watcher";
import type { ChangeSource, FileChangeType } from "../services/file-watcher";

const router = Router();

router.get("/file-watcher/active", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const watchers = fileWatcher.getActiveWatchers();
  res.json(watchers);
});

router.post("/file-watcher/:projectId/start", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = req.body.config;
  const state = fileWatcher.startWatching(projectId, config);
  res.json(state);
});

router.post("/file-watcher/:projectId/stop", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const stopped = fileWatcher.stopWatching(projectId);
  res.json({ stopped });
});

router.get("/file-watcher/:projectId/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const state = fileWatcher.getWatcherState(projectId);
  if (!state) {
    res.json({ active: false, projectId });
    return;
  }
  res.json(state);
});

router.post("/file-watcher/:projectId/change", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const { filePath, changeType, source, oldPath, content, sizeBytes } = req.body;

  if (!filePath || !changeType) {
    res.status(400).json({ error: "filePath and changeType are required" });
    return;
  }

  const contentHash = content ? fileWatcher.computeContentHash(content) : undefined;
  const change = fileWatcher.reportChange({
    projectId,
    filePath,
    changeType: changeType as FileChangeType,
    source: (source as ChangeSource) || "filesystem",
    oldPath,
    contentHash,
    sizeBytes,
    userId: (req as any).userId,
  });

  if (!change) {
    res.json({ ignored: true });
    return;
  }
  res.json(change);
});

router.post("/file-watcher/:projectId/changes/batch", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const { changes } = req.body;

  if (!Array.isArray(changes)) {
    res.status(400).json({ error: "changes must be an array" });
    return;
  }

  const results = changes.map((c: any) => {
    const contentHash = c.content ? fileWatcher.computeContentHash(c.content) : undefined;
    return fileWatcher.reportChange({
      projectId,
      filePath: c.filePath,
      changeType: c.changeType,
      source: c.source || "filesystem",
      oldPath: c.oldPath,
      contentHash,
      sizeBytes: c.sizeBytes,
      userId: (req as any).userId,
    });
  });

  res.json({ processed: results.filter(Boolean).length, ignored: results.filter((r) => !r).length });
});

router.get("/file-watcher/:projectId/conflicts", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const includeResolved = req.query.includeResolved === "true";
  const conflicts = fileWatcher.getConflicts(projectId, includeResolved);
  res.json(conflicts);
});

router.post("/file-watcher/:projectId/conflicts/:conflictId/resolve", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const conflictId = req.params.conflictId as string;
  const { resolution } = req.body;

  if (!resolution || !["local", "remote", "merge", "skip"].includes(resolution)) {
    res.status(400).json({ error: "resolution must be one of: local, remote, merge, skip" });
    return;
  }

  const conflict = fileWatcher.resolveConflict(projectId, conflictId, resolution, (req as any).userId);
  if (!conflict) {
    res.status(404).json({ error: "Conflict not found or already resolved" });
    return;
  }
  res.json(conflict);
});

router.get("/file-watcher/:projectId/changes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const changes = fileWatcher.getRecentChanges(projectId, limit);
  res.json(changes);
});

router.put("/file-watcher/:projectId/config", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = req.body;
  const updated = fileWatcher.updateConfig(projectId, config);
  if (!updated) {
    res.status(404).json({ error: "No active watcher for this project" });
    return;
  }
  res.json(updated);
});

export default router;
