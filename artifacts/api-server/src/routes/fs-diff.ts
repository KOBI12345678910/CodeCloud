import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { listSnapshots, createSnapshot, diffSnapshots, restoreFile } from "../services/fs-diff";

const router: IRouter = Router();

router.get("/projects/:id/containers/:containerId/snapshots", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const containerId = Array.isArray(req.params.containerId) ? req.params.containerId[0] : req.params.containerId;
  try { res.json(listSnapshots(projectId, containerId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/containers/:containerId/snapshots", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const containerId = Array.isArray(req.params.containerId) ? req.params.containerId[0] : req.params.containerId;
  const { label } = req.body;
  try { res.status(201).json(createSnapshot(projectId, containerId, label || "Manual snapshot")); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/containers/:containerId/snapshots/diff", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const containerId = Array.isArray(req.params.containerId) ? req.params.containerId[0] : req.params.containerId;
  const a = req.query.a as string;
  const b = req.query.b as string;
  if (!a || !b) { res.status(400).json({ error: "Query params a and b are required" }); return; }
  try { res.json(diffSnapshots(projectId, containerId, a, b)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/containers/:containerId/snapshots/:snapshotId/restore", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const containerId = Array.isArray(req.params.containerId) ? req.params.containerId[0] : req.params.containerId;
  const snapshotId = Array.isArray(req.params.snapshotId) ? req.params.snapshotId[0] : req.params.snapshotId;
  const { filePath } = req.body;
  if (!filePath) { res.status(400).json({ error: "filePath is required" }); return; }
  try { res.json(restoreFile(projectId, containerId, snapshotId, filePath)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
