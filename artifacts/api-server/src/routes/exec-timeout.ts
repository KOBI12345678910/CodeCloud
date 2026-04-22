import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getTimeoutConfigs, getRunningExecs, getTimeoutEvents, killExec, updateTimeoutConfig } from "../services/exec-timeout";

const router: IRouter = Router();

router.get("/projects/:id/exec-timeout/configs", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getTimeoutConfigs(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/exec-timeout/running", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getRunningExecs(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/exec-timeout/events", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getTimeoutEvents(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/exec-timeout/:execId/kill", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const execId = Array.isArray(req.params.execId) ? req.params.execId[0] : req.params.execId;
  try { res.json(killExec(projectId, execId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/projects/:id/exec-timeout/configs/:configId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const configId = Array.isArray(req.params.configId) ? req.params.configId[0] : req.params.configId;
  try { res.json(updateTimeoutConfig(projectId, configId, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
