import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { lockFile, unlockFile, getFileLocks } from "../services/file-locking";

const router: IRouter = Router();

router.get("/projects/:id/locks", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getFileLocks(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/locks", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { filePath, reason } = req.body;
  try { res.json(lockFile(projectId, filePath, (req as any).auth?.userId || "user", reason)); } catch (err: any) { res.status(409).json({ error: err.message }); }
});

router.delete("/projects/:id/locks", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { filePath, force } = req.body;
  try { res.json(unlockFile(projectId, filePath, (req as any).auth?.userId || "user", force)); } catch (err: any) { res.status(403).json({ error: err.message }); }
});

export default router;
