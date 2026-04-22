import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getHealingStatus, triggerManualRestart, resetCircuitBreaker } from "../services/auto-healing";

const router: IRouter = Router();

router.get("/projects/:id/auto-healing", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getHealingStatus(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/auto-healing/:deploymentId/restart", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deploymentId = Array.isArray(req.params.deploymentId) ? req.params.deploymentId[0] : req.params.deploymentId;
  try { res.json(triggerManualRestart(projectId, deploymentId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/auto-healing/:deploymentId/reset-breaker", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deploymentId = Array.isArray(req.params.deploymentId) ? req.params.deploymentId[0] : req.params.deploymentId;
  try { res.json(resetCircuitBreaker(projectId, deploymentId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
