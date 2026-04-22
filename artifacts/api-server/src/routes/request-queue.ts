import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requestQueueService } from "../services/request-queue";

const router: IRouter = Router();

router.get("/projects/:projectId/deployments/:deploymentId/queue", requireAuth, async (req, res): Promise<void> => {
  const q = await requestQueueService.getQueue(req.params.projectId as string, req.params.deploymentId as string);
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  res.json(q);
});

router.put("/projects/:projectId/deployments/:deploymentId/queue/config", requireAuth, async (req, res): Promise<void> => {
  const q = await requestQueueService.updateConfig(req.params.projectId as string, req.params.deploymentId as string, req.body);
  res.json(q);
});

router.post("/projects/:projectId/deployments/:deploymentId/queue/start", requireAuth, async (req, res): Promise<void> => {
  const q = await requestQueueService.startQueuing(req.params.projectId as string, req.params.deploymentId as string);
  res.json(q);
});

router.post("/projects/:projectId/deployments/:deploymentId/queue/replay", requireAuth, async (req, res): Promise<void> => {
  const q = await requestQueueService.startReplay(req.params.projectId as string, req.params.deploymentId as string);
  res.json(q);
});

router.post("/projects/:projectId/deployments/:deploymentId/queue/drain", requireAuth, async (req, res): Promise<void> => {
  const q = await requestQueueService.drain(req.params.projectId as string, req.params.deploymentId as string);
  res.json(q);
});

router.get("/projects/:projectId/deployments/:deploymentId/queue/stats", requireAuth, async (req, res): Promise<void> => {
  const stats = await requestQueueService.getStats(req.params.projectId as string, req.params.deploymentId as string);
  res.json(stats);
});

export default router;
