import { Router, Request, Response } from "express";
import { memoryProfilerService } from "../services/memory-profiler";

const router = Router();

router.post("/memory-profiler/snapshot", (req: Request, res: Response): void => {
  const { containerId, heapUsedMB, heapTotalMB, rssMB, externalMB, arrayBuffersMB, gcCount, gcPauseMs } = req.body;
  if (!containerId) { res.status(400).json({ error: "containerId required" }); return; }
  const snapshot = memoryProfilerService.takeSnapshot(containerId, { containerId, heapUsedMB: heapUsedMB || 0, heapTotalMB: heapTotalMB || 0, rssMB: rssMB || 0, externalMB: externalMB || 0, arrayBuffersMB: arrayBuffersMB || 0, gcCount: gcCount || 0, gcPauseMs: gcPauseMs || 0 });
  res.status(201).json(snapshot);
});

router.get("/memory-profiler/:containerId/snapshots", (req: Request, res: Response): void => {
  const limit = parseInt((req.query.limit as string) || "50", 10);
  res.json({ snapshots: memoryProfilerService.getSnapshots(req.params.containerId as string, limit) });
});

router.post("/memory-profiler/compare", (req: Request, res: Response): void => {
  const { snapshotId1, snapshotId2 } = req.body;
  const result = memoryProfilerService.compareSnapshots(snapshotId1, snapshotId2);
  if (!result) { res.status(404).json({ error: "Snapshot not found" }); return; }
  res.json(result);
});

router.get("/memory-profiler/:containerId/leaks", (req: Request, res: Response): void => {
  res.json({ leaks: memoryProfilerService.getLeaks(req.params.containerId as string) });
});

router.get("/memory-profiler/:containerId/gc", (req: Request, res: Response): void => {
  res.json(memoryProfilerService.getGCMetrics(req.params.containerId as string));
});

export default router;
