import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { originFailoverService } from "../services/origin-failover";

const router: IRouter = Router();

router.get("/projects/:projectId/deployments/:deploymentId/failover", requireAuth, async (req, res): Promise<void> => {
  const cfg = await originFailoverService.getConfig(req.params.projectId as string, req.params.deploymentId as string);
  if (!cfg) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cfg);
});

router.put("/projects/:projectId/deployments/:deploymentId/failover", requireAuth, async (req, res): Promise<void> => {
  const cfg = await originFailoverService.updateConfig(req.params.projectId as string, req.params.deploymentId as string, req.body);
  res.json(cfg);
});

router.post("/projects/:projectId/deployments/:deploymentId/failover/origins", requireAuth, async (req, res): Promise<void> => {
  const cfg = await originFailoverService.addOrigin(req.params.projectId as string, req.params.deploymentId as string, req.body);
  res.json(cfg);
});

router.delete("/projects/:projectId/failover/origins/:originId", requireAuth, async (req, res): Promise<void> => {
  const ok = await originFailoverService.removeOrigin(req.params.projectId as string, req.params.originId as string);
  if (!ok) { res.status(404).json({ error: "Origin not found" }); return; }
  res.json({ success: true });
});

router.post("/projects/:projectId/failover/trigger", requireAuth, async (req, res): Promise<void> => {
  const cfg = await originFailoverService.triggerFailover(req.params.projectId as string, req.body.targetOriginId);
  res.json(cfg);
});

router.post("/projects/:projectId/failover/notifications/:notificationId/ack", requireAuth, async (req, res): Promise<void> => {
  const ok = await originFailoverService.acknowledgeNotification(req.params.projectId as string, req.params.notificationId as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
