import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { deployWebSocketService } from "../services/deploy-websocket";

const router: IRouter = Router();

router.get("/projects/:projectId/websockets", requireAuth, async (req, res): Promise<void> => {
  const deploymentId = req.query.deploymentId as string | undefined;
  const eps = await deployWebSocketService.listEndpoints(req.params.projectId as string, deploymentId);
  res.json(eps);
});

router.get("/projects/:projectId/websockets/:id", requireAuth, async (req, res): Promise<void> => {
  const ep = await deployWebSocketService.getEndpoint(req.params.id as string);
  if (!ep) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ep);
});

router.post("/projects/:projectId/websockets", requireAuth, async (req, res): Promise<void> => {
  const ep = await deployWebSocketService.createEndpoint(req.params.projectId as string, req.body);
  res.json(ep);
});

router.put("/projects/:projectId/websockets/:id", requireAuth, async (req, res): Promise<void> => {
  const ep = await deployWebSocketService.updateEndpoint(req.params.id as string, req.body);
  if (!ep) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ep);
});

router.delete("/projects/:projectId/websockets/:id", requireAuth, async (req, res): Promise<void> => {
  const ok = await deployWebSocketService.deleteEndpoint(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/projects/:projectId/websockets/:id/metrics", requireAuth, async (req, res): Promise<void> => {
  const metrics = await deployWebSocketService.getMetrics(req.params.id as string);
  if (!metrics) { res.status(404).json({ error: "Not found" }); return; }
  res.json(metrics);
});

router.post("/projects/:projectId/websockets/:id/metrics/reset", requireAuth, async (req, res): Promise<void> => {
  const ok = await deployWebSocketService.resetMetrics(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
