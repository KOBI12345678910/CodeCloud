import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { logShippingService } from "../services/log-shipping";

const router: IRouter = Router();

router.get("/projects/:projectId/log-shipping", requireAuth, async (req, res): Promise<void> => {
  const configs = await logShippingService.listConfigs(req.params.projectId as string);
  res.json(configs);
});

router.get("/projects/:projectId/log-shipping/:id", requireAuth, async (req, res): Promise<void> => {
  const cfg = await logShippingService.getConfig(req.params.id as string);
  if (!cfg) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cfg);
});

router.post("/projects/:projectId/log-shipping", requireAuth, async (req, res): Promise<void> => {
  const cfg = await logShippingService.createConfig(req.params.projectId as string, req.body);
  res.json(cfg);
});

router.put("/projects/:projectId/log-shipping/:id", requireAuth, async (req, res): Promise<void> => {
  const cfg = await logShippingService.updateConfig(req.params.id as string, req.body);
  if (!cfg) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cfg);
});

router.delete("/projects/:projectId/log-shipping/:id", requireAuth, async (req, res): Promise<void> => {
  const ok = await logShippingService.deleteConfig(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/projects/:projectId/log-shipping/:id/test", requireAuth, async (req, res): Promise<void> => {
  const result = await logShippingService.testConnection(req.params.id as string);
  res.json(result);
});

export default router;
