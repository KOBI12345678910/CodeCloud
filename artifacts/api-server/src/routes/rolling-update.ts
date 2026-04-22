import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { startRollingUpdate, getUpdateStatus } from "../services/rolling-update";

const router: IRouter = Router();

router.post("/projects/:id/rolling-update", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { toVersion, config } = req.body;
  if (!toVersion) { res.status(400).json({ error: "toVersion required" }); return; }
  try { res.json(startRollingUpdate(projectId, toVersion, config)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/rolling-updates/:updateId", requireAuth, async (req, res): Promise<void> => {
  const updateId = Array.isArray(req.params.updateId) ? req.params.updateId[0] : req.params.updateId;
  try { res.json(getUpdateStatus(updateId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
